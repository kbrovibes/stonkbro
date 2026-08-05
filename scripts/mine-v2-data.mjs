// Mine src/lib/learn/v2-data/*.json for real case-study setups (spec 56).
// Usage: node scripts/mine-v2-data.mjs [outDir]
// Emits one <SYM>.mined.json per ticker plus summary.md — every candidate
// setup is traceable to a snapshot row or price bar in the dataset.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src/lib/learn/v2-data");
const outDir = process.argv[2] || join(root, ".mined");
mkdirSync(outDir, { recursive: true });

const index = JSON.parse(readFileSync(join(dataDir, "index.json"), "utf8"));
const symbols = [...index.traded, ...index.opportunity];

const r2 = (x) => Math.round(x * 100) / 100;

function barOn(prices, date) {
  return prices.find((p) => p.date === date);
}
function barsBetween(prices, start, end) {
  return prices.filter((p) => p.date >= start && p.date <= end);
}

function mine(sym) {
  const d = JSON.parse(readFileSync(join(dataDir, `${sym}.json`), "utf8"));
  const { prices, snapshots } = d;

  // ---- price structure -----------------------------------------------------
  let peak = prices[0], ddFrac = 0, maxDD = { pct: 0 };
  for (const bar of prices) {
    if (bar.close > peak.close) peak = bar;
    const frac = (bar.close - peak.close) / peak.close;
    if (frac < ddFrac) {
      ddFrac = frac;
      maxDD = { pct: r2(frac * 100), from: peak.date, to: bar.date, peakClose: peak.close, troughClose: bar.close };
    }
  }
  let trough = prices[0], ripFrac = 0, maxRip = { pct: 0 };
  for (const bar of prices) {
    if (bar.close < trough.close) trough = bar;
    const frac = (bar.close - trough.close) / trough.close;
    if (frac > ripFrac) {
      ripFrac = frac;
      maxRip = { pct: r2(frac * 100), from: trough.date, to: bar.date, troughClose: trough.close, peakClose: bar.close };
    }
  }
  const bigDays = prices
    .map((b, i) => (i === 0 ? null : { date: b.date, pct: r2(((b.close - prices[i - 1].close) / prices[i - 1].close) * 100), close: b.close }))
    .filter((x) => x && Math.abs(x.pct) >= 4)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8);

  // ---- flatten option rows, dedupe (date, side, strike, expiry) ------------
  const rows = [];
  for (const s of snapshots) {
    for (const side of ["puts", "calls", "leaps"]) {
      for (const o of s[side] || []) {
        rows.push({ date: s.date, side: side === "leaps" ? "leap" : side.slice(0, -1), ...o });
      }
    }
  }
  const seen = new Set();
  const uniq = rows.filter((r) => {
    const k = `${r.date}|${r.side}|${r.strike}|${r.expiry}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const puts = uniq.filter((r) => r.side === "put");
  const lastBar = prices[prices.length - 1];

  // ---- archetype 1/5: puts whose strike got breached before expiry ---------
  const breached = [];
  for (const p of puts) {
    const path = barsBetween(prices, p.date, p.expiry < lastBar.date ? p.expiry : lastBar.date);
    if (path.length < 2) continue;
    const worst = path.reduce((a, b) => (b.low < a.low ? b : a));
    if (worst.low >= p.strike) continue;
    const firstBreach = path.find((b) => b.low < p.strike);
    const expiryBar = p.expiry <= lastBar.date ? path[path.length - 1] : null;
    breached.push({
      entry: p,
      entryClose: barOn(prices, p.date)?.close,
      firstBreach: { date: firstBreach.date, low: firstBreach.low, close: firstBreach.close },
      worst: { date: worst.date, low: worst.low, intrinsicAtWorst: r2(p.strike - worst.low) },
      atExpiry: expiryBar ? { date: expiryBar.date, close: expiryBar.close, itm: expiryBar.close < p.strike, intrinsic: r2(Math.max(0, p.strike - expiryBar.close)) } : null,
      // real later observations of the same contract = the premium actually blowing out
      laterMarks: uniq
        .filter((q) => q.side === "put" && q.strike === p.strike && q.expiry === p.expiry && q.date > p.date)
        .map((q) => ({ date: q.date, bid: q.bid, ask: q.ask, mid: q.mid, iv: q.iv, delta: q.delta })),
      // roll candidates seen on/after the breach day: same-ish strike, later expiry
      rollCandidates: uniq
        .filter((q) => q.side === "put" && q.date >= firstBreach.date && q.expiry > p.expiry && Math.abs(q.strike - p.strike) <= p.strike * 0.05)
        .slice(0, 6)
        .map((q) => ({ date: q.date, strike: q.strike, expiry: q.expiry, mid: q.mid, delta: q.delta })),
    });
  }
  breached.sort((a, b) => b.worst.intrinsicAtWorst - a.worst.intrinsicAtWorst);

  // ---- archetype 4: high-juiciness puts that expired OTM in-window ---------
  const winners = puts
    .filter((p) => p.expiry <= lastBar.date && (p.juiciness ?? 0) >= 40)
    .map((p) => {
      const path = barsBetween(prices, p.date, p.expiry);
      if (!path.length) return null;
      const minLow = Math.min(...path.map((b) => b.low));
      const expiryBar = path[path.length - 1];
      if (expiryBar.close < p.strike) return null;
      return {
        entry: p,
        entryClose: barOn(prices, p.date)?.close,
        minLow: r2(minLow),
        closestPct: r2(((minLow - p.strike) / p.strike) * 100),
        expiryClose: expiryBar.close,
        stressed: minLow < p.strike, // dipped through intraday but closed OTM at expiry
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.entry.juiciness ?? 0) - (a.entry.juiciness ?? 0))
    .slice(0, 12);

  // ---- archetype 2: wide spreads / archetype 3: bad entries ----------------
  const wideSpreads = uniq
    .filter((r) => r.mid > 0.2 && (r.ask - r.bid) / r.mid >= 0.12)
    .map((r) => ({ ...r, spreadPct: r2(((r.ask - r.bid) / r.mid) * 100) }))
    .sort((a, b) => b.spreadPct - a.spreadPct)
    .slice(0, 12);
  const illiquid = uniq.filter((r) => (r.volume ?? 0) <= 3 && r.mid > 0.3).slice(0, 10);
  const highDelta = puts.filter((p) => Math.abs(p.delta) >= 0.45).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
  const lowAroc = puts.filter((p) => (p.aroc ?? 99) < 12).sort((a, b) => a.aroc - b.aroc).slice(0, 8);
  const catalystEntries = puts.filter((p) => /earnings in [0-3]d/i.test(p.catalyst || "")).slice(0, 8);

  // ---- archetype 7: comparable-contract time series (decay/IV drift) -------
  const byContract = new Map();
  for (const r of uniq) {
    const k = `${r.side}|${r.strike}|${r.expiry}`;
    if (!byContract.has(k)) byContract.set(k, []);
    byContract.get(k).push(r);
  }
  const decaySeries = [...byContract.entries()]
    .map(([k, list]) => ({ contract: k, n: list.length, series: list.sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ date: r.date, dte: r.dte, mid: r.mid, iv: r.iv, delta: r.delta, theta: r.theta })) }))
    .filter((x) => x.n >= 5)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  // ---- archetype 6: covered-call strike regret (calls before rips) ---------
  const calls = uniq.filter((r) => r.side === "call");
  const ccRegret = calls
    .map((c) => {
      const path = barsBetween(prices, c.date, c.expiry <= lastBar.date ? c.expiry : lastBar.date);
      if (path.length < 2) return null;
      const maxClose = Math.max(...path.map((b) => b.close));
      if (maxClose <= c.strike * 1.03) return null;
      return { entry: c, entryClose: barOn(prices, c.date)?.close, maxClose: r2(maxClose), cappedPct: r2(((maxClose - c.strike) / c.strike) * 100) };
    })
    .filter(Boolean)
    .sort((a, b) => b.cappedPct - a.cappedPct)
    .slice(0, 8);

  return {
    symbol: sym, universe: d.universe,
    price: { first: prices[0], last: lastBar, maxDrawdown: maxDD, maxRip, bigDays },
    counts: { optionRows: uniq.length, puts: puts.length, calls: calls.length },
    breachedPuts: breached.slice(0, 10),
    otmWinners: winners,
    wideSpreads, illiquid, highDelta, lowAroc, catalystEntries,
    decaySeries, ccRegret,
  };
}

const lines = ["# v2-data mining summary", ""];
for (const sym of symbols) {
  const m = mine(sym);
  writeFileSync(join(outDir, `${sym}.mined.json`), JSON.stringify(m, null, 1));
  lines.push(
    `- **${sym}** (${m.universe}): rows=${m.counts.optionRows} | maxDD ${m.price.maxDrawdown.pct}% (${m.price.maxDrawdown.from}→${m.price.maxDrawdown.to}) | maxRip ${m.price.maxRip.pct}% | breachedPuts=${m.breachedPuts.length} | otmWinners=${m.otmWinners.length} | wideSpreads=${m.wideSpreads.length} | decaySeries=${m.decaySeries.length} | ccRegret=${m.ccRegret.length}`
  );
}
writeFileSync(join(outDir, "summary.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
