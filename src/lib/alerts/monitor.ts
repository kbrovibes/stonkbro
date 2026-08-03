import { tradierGetQuotes } from "@/lib/market/tradier";
import { analyzeTechnicals } from "@/lib/analysis/technicals";
import { getPortfolio } from "@/lib/snaptrade/client";
import { getLatestChainScan } from "@/lib/db/portfolio-chain-scans";
import { insertAlerts, markPushed, type NewAlert, type AlertSeverity } from "@/lib/db/alerts";
import { sendPushToAll } from "@/lib/notifications/push";
import { supabaseAdmin } from "@/lib/supabase";
import type { QuoteData } from "@/lib/market/types";

// Thresholds (intraday % vs prior close)
const PORTFOLIO_CRITICAL_DROP = -5;
const PORTFOLIO_WARNING_DROP = -3;
const PORTFOLIO_SURGE = 5;
const WATCHLIST_DROP = -4;
const WATCHLIST_SURGE = 8;
const MARKET_CRITICAL_DROP = -2;   // SPY
const MARKET_WARNING_DROP = -1.25; // SPY

// Cap pushes per run — on a true bloodbath day everything trips at once and a
// notification storm gets swiped away; one summary beats twelve pings.
const MAX_PUSHES_PER_RUN = 5;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getWatchlistSymbols(): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("watchlist_items").select("symbol");
  if (error) return [];
  return [...new Set((data as { symbol: string }[]).map((d) => d.symbol))];
}

/**
 * Symbols the user actually holds: equity positions + underlyings of open
 * option chains. Live portfolio call is shallow (positions/balances, no
 * activities walk) and safe hourly; the chains cache is the fallback.
 */
async function getPortfolioSymbols(): Promise<Set<string>> {
  const symbols = new Set<string>();
  try {
    const p = await getPortfolio();
    for (const pos of p.positions) if (pos.symbol && pos.symbol !== "UNKNOWN") symbols.add(pos.symbol);
    for (const opt of p.options) if (opt.underlying && opt.underlying !== "UNKNOWN") symbols.add(opt.underlying);
  } catch (e) {
    console.error("[MarketMonitor] live portfolio fetch failed, using chains cache:", e);
    try {
      const cached = await getLatestChainScan(96);
      for (const c of cached?.chains ?? []) if (c.status === "OPEN") symbols.add(c.underlying);
    } catch {
      // no portfolio symbols this run — watchlist + market checks still run
    }
  }
  return symbols;
}

/**
 * Compute concrete stop-loss guidance for a falling holding: stop just above
 * the nearest support (or today's low if support already broke), limit a
 * touch below the stop so the order actually fills in a fast market.
 */
async function stopSuggestion(symbol: string, quote: QuoteData): Promise<string | null> {
  try {
    const t = await analyzeTechnicals(symbol, quote);
    const supportHolds = t.nearestSupport < quote.price;
    const stop = supportHolds ? t.nearestSupport * 0.995 : quote.price * 0.97;
    const limit = stop * 0.995;
    const downsideCapPct = ((quote.price - stop) / quote.price) * 100;
    return supportHolds
      ? `Consider a stop-limit in Fidelity: stop $${fmt(stop)}, limit $${fmt(limit)} — just under the $${fmt(t.nearestSupport)} support level. Caps further downside at ~${downsideCapPct.toFixed(1)}% from here.`
      : `No clean support below — if you want protection, a stop-limit at stop $${fmt(stop)} / limit $${fmt(limit)} (~3% below current) caps the damage while giving normal volatility room.`;
  } catch {
    return null;
  }
}

export type MonitorResult = {
  symbolsChecked: number;
  alertsNew: number;
  pushesSent: number;
};

export async function runMarketMonitor(): Promise<MonitorResult> {
  const [portfolioSymbols, watchlistSymbols] = await Promise.all([
    getPortfolioSymbols(),
    getWatchlistSymbols(),
  ]);

  const allSymbols = [...new Set(["SPY", "QQQ", ...portfolioSymbols, ...watchlistSymbols])];
  const quotes = await tradierGetQuotes(allSymbols);
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  const d = today();
  const candidates: NewAlert[] = [];

  // ---- Market-wide check (SPY) ----
  const spy = bySymbol.get("SPY");
  if (spy && spy.changePct <= MARKET_WARNING_DROP) {
    const critical = spy.changePct <= MARKET_CRITICAL_DROP;
    const sev: AlertSeverity = critical ? "critical" : "warning";
    candidates.push({
      severity: sev,
      kind: "market_drop",
      symbol: "SPY",
      title: critical ? `🩸 Market selling off — SPY ${spy.changePct.toFixed(1)}%` : `Market red — SPY ${spy.changePct.toFixed(1)}%`,
      body: critical
        ? `SPY is down ${Math.abs(spy.changePct).toFixed(1)}% today — broad, not stock-specific. Open Bloodbath to see which of your names are bleeding worst and whether any stops should go in before this compounds.`
        : `SPY is down ${Math.abs(spy.changePct).toFixed(1)}% today. Not panic territory, but worth a glance at your open short puts — a slide from here moves them toward their strikes.`,
      action: critical ? "Review open positions and consider protective stops on the biggest losers." : null,
      url: "/bloodbath",
      dedupe_key: `market_drop:${sev}:${d}`,
    });
  }

  // ---- Per-symbol checks ----
  for (const sym of allSymbols) {
    if (sym === "SPY" || sym === "QQQ") continue;
    const q = bySymbol.get(sym);
    if (!q || !isFinite(q.changePct)) continue;
    const inPortfolio = portfolioSymbols.has(sym);

    if (inPortfolio && q.changePct <= PORTFOLIO_WARNING_DROP) {
      const critical = q.changePct <= PORTFOLIO_CRITICAL_DROP;
      const sev: AlertSeverity = critical ? "critical" : "warning";
      const action = critical ? await stopSuggestion(sym, q) : null;
      candidates.push({
        severity: sev,
        kind: "position_drop",
        symbol: sym,
        title: `${critical ? "🚨" : "⚠️"} ${sym} ${q.changePct.toFixed(1)}% — you hold this`,
        body: `${q.name} dropped to $${fmt(q.price)} (${q.changePct.toFixed(1)}% today) and it's in your portfolio. ${
          critical
            ? "This is a big enough move that doing nothing is also a decision — check whether the story changed or the market is just repricing it."
            : "Keep an eye on it — if the slide continues past −5% you'll get a critical alert with stop levels."
        }`,
        action,
        url: "/portfolio",
        dedupe_key: `position_drop:${sev}:${sym}:${d}`,
      });
    } else if (inPortfolio && q.changePct >= PORTFOLIO_SURGE) {
      candidates.push({
        severity: "warning",
        kind: "position_surge",
        symbol: sym,
        title: `📈 ${sym} +${q.changePct.toFixed(1)}% — you hold this`,
        body: `${q.name} jumped to $${fmt(q.price)} (+${q.changePct.toFixed(1)}% today). Strength like this is when covered calls pay best — premium is richest while the move is fresh. Worth checking the chain if you have 100+ shares uncovered.`,
        action: null,
        url: `/ticker/${sym}`,
        dedupe_key: `position_surge:${sym}:${d}`,
      });
    } else if (!inPortfolio && (q.changePct <= WATCHLIST_DROP || q.changePct >= WATCHLIST_SURGE)) {
      const dropping = q.changePct < 0;
      candidates.push({
        severity: "warning",
        kind: "watchlist_move",
        symbol: sym,
        title: `${dropping ? "🔻" : "🚀"} ${sym} ${q.changePct > 0 ? "+" : ""}${q.changePct.toFixed(1)}% (watchlist)`,
        body: dropping
          ? `${q.name} fell to $${fmt(q.price)} (${q.changePct.toFixed(1)}% today). If you've been waiting for an entry, check whether it's landing on support or slicing through it before catching the knife.`
          : `${q.name} ripped to $${fmt(q.price)} (+${q.changePct.toFixed(1)}% today). Chasing is usually a losing trade — but the options flow and IV pop are worth a look.`,
        action: null,
        url: `/ticker/${sym}`,
        dedupe_key: `watchlist_move:${sym}:${d}`,
      });
    }
  }

  // ---- Persist (dedupe) and push ----
  const inserted = await insertAlerts(candidates);
  const pushable = inserted.filter((a) => a.severity === "critical" || a.severity === "warning");
  // Criticals first, then most-negative movers
  pushable.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));

  let pushesSent = 0;
  const pushedIds: string[] = [];
  if (pushable.length > MAX_PUSHES_PER_RUN) {
    const criticals = pushable.filter((a) => a.severity === "critical").length;
    const { sent } = await sendPushToAll({
      title: `🩸 ${pushable.length} alerts — market is moving`,
      body: `${criticals} critical. Open stonkbro for the full list with actions.`,
      url: "/today",
      tag: "market-monitor-summary",
    });
    pushesSent = sent > 0 ? 1 : 0;
    if (sent > 0) pushedIds.push(...pushable.map((a) => a.id));
  } else {
    for (const a of pushable) {
      const { sent } = await sendPushToAll({
        title: a.title,
        body: a.action ? `${a.body}\n\n${a.action}` : a.body,
        url: a.url,
        tag: `alert-${a.kind}-${a.symbol ?? "mkt"}`,
      });
      if (sent > 0) {
        pushesSent++;
        pushedIds.push(a.id);
      }
    }
  }
  await markPushed(pushedIds);

  return { symbolsChecked: allSymbols.length, alertsNew: inserted.length, pushesSent };
}
