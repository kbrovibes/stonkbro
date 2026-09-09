#!/usr/bin/env tsx
/**
 * Turn a backfill run into something a person can read: a self-contained
 * light-mode HTML report plus a markdown twin for the terminal.
 *
 * Everything is inlined — no CDN, no fonts to fetch, charts drawn as SVG in
 * this file — so the HTML works from a file:// URL forever.
 *
 * Run: npx tsx scripts/paper-report.ts .cache/paper-backfill-2026-08-01-2026-08-31.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { identityFor } from "../src/lib/paper/identity";
import { checkInvariants, type CheckedProfile, type CheckGroup } from "../src/lib/paper/invariants";
import type { MemoryEntry } from "../src/lib/paper/memory";
import type { Position, Snapshot, Trade } from "../src/lib/paper/types";

const START = 100_000;

interface ProfileRun {
  id: string;
  name: string;
  tagline: string;
  style: string[];
  plan: string[];
  margin: boolean;
  account: { cash: number; realizedPnl: number; fees: number; interest: number; startedOn: string };
  snapshots: Snapshot[];
  trades: Trade[];
  memories: MemoryEntry[];
  positions: Position[];
}

interface RunFile {
  from: string;
  to: string;
  days: string[];
  missing: string[];
  generatedAt: string;
  profiles: ProfileRun[];
}

/* -- numbers ----------------------------------------------------------- */

const usd = (n: number): string =>
  `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const signedUsd = (n: number): string =>
  `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const pct = (n: number, p = 2): string => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(p)}%`;
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const e of equity) {
    peak = Math.max(peak, e);
    if (peak > 0) worst = Math.min(worst, ((e - peak) / peak) * 100);
  }
  return worst;
}

/* -- per-bot statistics ------------------------------------------------ */

interface Stats {
  run: ProfileRun;
  equity: number;
  pnl: number;
  returnPct: number;
  drawdown: number;
  filled: number;
  rejected: number;
  fundingCloses: number;
  tradingDays: number;
  wins: number;
  losses: number;
  winPct: number | null;
  peakMargin: number;
  curve: number[];
  openAtEnd: number;
}

function statsFor(run: ProfileRun): Stats {
  const curve = run.snapshots.map((s) => s.equity);
  const equity = curve[curve.length - 1] ?? START;
  const filled = run.trades.filter((t) => t.status === "filled");
  const closed = run.positions.filter((p) => p.status === "closed");
  const wins = closed.filter((p) => p.realizedPnl > 0).length;
  const losses = closed.filter((p) => p.realizedPnl < 0).length;
  return {
    run,
    equity,
    pnl: equity - START,
    returnPct: ((equity - START) / START) * 100,
    drawdown: maxDrawdown(curve),
    filled: filled.length,
    rejected: run.trades.length - filled.length,
    fundingCloses: run.trades.filter((t) => t.reason.includes("free buying power")).length,
    tradingDays: new Set(filled.map((t) => t.tradeDate)).size,
    wins,
    losses,
    winPct: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
    peakMargin: Math.max(0, ...run.snapshots.map((s) => s.marginUsed)),
    curve,
    openAtEnd: run.positions.filter((p) => p.status === "open").length,
  };
}

/* -- charts ------------------------------------------------------------ */

const PALETTE = [
  "#4E79A7", "#F28E2B", "#59A14F", "#B07AA1", "#76B7B2",
  "#9C755F", "#D4A13C", "#8CA0B3", "#A0616A", "#6B8E9E",
];

interface Line {
  label: string;
  color: string;
  values: number[];
}

function lineChart(lines: Line[], days: string[], width = 900, height = 380): string {
  const pad = { top: 20, right: 126, bottom: 34, left: 66 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const all = lines.flatMap((l) => l.values);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const pad2 = span * 0.08;
  const yMin = lo - pad2;
  const yMax = hi + pad2;
  const x = (i: number) => pad.left + (i / Math.max(1, days.length - 1)) * w;
  const y = (v: number) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;

  const ticks = 5;
  const grid = Array.from({ length: ticks }, (_, k) => {
    const v = yMin + ((yMax - yMin) * k) / (ticks - 1);
    return `<line x1="${pad.left}" y1="${y(v).toFixed(1)}" x2="${pad.left + w}" y2="${y(v).toFixed(1)}" stroke="#E8E6E1"/>
      <text x="${pad.left - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" class="ax">${usd(v)}</text>`;
  }).join("");

  const baseline = `<line x1="${pad.left}" y1="${y(START).toFixed(1)}" x2="${pad.left + w}" y2="${y(START).toFixed(1)}" stroke="#B3ADA3" stroke-dasharray="4 4"/>`;

  // End labels want to sit at the line's last point, but bunched bots would
  // overprint each other. Push them apart to a minimum gap, keeping their order.
  const ends = lines
    .map((l, i) => ({ i, l, y: y(l.values[l.values.length - 1]), labelY: 0 }))
    .sort((a, b) => a.y - b.y);
  const GAP = 14;
  let cursor = -Infinity;
  for (const e of ends) {
    e.labelY = Math.max(e.y, cursor + GAP);
    cursor = e.labelY;
  }
  const overflow = cursor - (pad.top + h);
  if (overflow > 0) for (const e of ends) e.labelY -= overflow;
  const labelY = new Map(ends.map((e) => [e.i, e.labelY]));

  const paths = lines
    .map((l, i) => {
      const d = l.values.map((v, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const last = l.values[l.values.length - 1];
      const lx = pad.left + w;
      const ly = labelY.get(i) ?? y(last);
      const leader =
        Math.abs(ly - y(last)) > 2
          ? `<path d="M${lx.toFixed(1)},${y(last).toFixed(1)} L${(lx + 5).toFixed(1)},${ly.toFixed(1)}" stroke="${l.color}" stroke-width="1" fill="none" opacity="0.5"/>`
          : "";
      return `<path d="${d}" fill="none" stroke="${l.color}" stroke-width="1.9" stroke-linejoin="round"/>
        <circle cx="${x(l.values.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="2.8" fill="${l.color}"/>
        ${leader}
        <text x="${(lx + 9).toFixed(1)}" y="${(ly + 4).toFixed(1)}" class="lbl" fill="${l.color}">${esc(l.label)}</text>`;
    })
    .join("");

  const xLabels = [0, Math.floor(days.length / 2), days.length - 1]
    .map((i) => `<text x="${x(i).toFixed(1)}" y="${height - 10}" text-anchor="middle" class="ax">${days[i]?.slice(5)}</text>`)
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="Equity by bot over the month">
    ${grid}${baseline}${paths}${xLabels}
  </svg>`;
}

function sparkline(values: number[], color: string, width = 260, height = 64): string {
  const lo = Math.min(...values, START);
  const hi = Math.max(...values, START);
  const span = hi - lo || 1;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * width;
  const y = (v: number) => height - 6 - ((v - lo) / span) * (height - 12);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" class="spark" aria-hidden="true">
    <line x1="0" y1="${y(START).toFixed(1)}" x2="${width}" y2="${y(START).toFixed(1)}" stroke="#DDD9D2" stroke-dasharray="3 3"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.8"/>
  </svg>`;
}

/* -- narrative selection ----------------------------------------------- */

const ACTION_INTEREST: Record<string, number> = {
  assign: 0, called_away: 0, settle: 1, expire: 2, buy: 3, sell: 3, reject: 1, interest: 6,
};

function interestingTrades(run: ProfileRun, n = 3): Trade[] {
  return [...run.trades]
    .filter((t) => t.symbol !== "CASH")
    .sort(
      (a, b) =>
        (ACTION_INTEREST[a.action] ?? 5) - (ACTION_INTEREST[b.action] ?? 5) ||
        Math.abs(b.amount) - Math.abs(a.amount),
    )
    .slice(0, n);
}

function tradeLabel(t: Trade): string {
  const leg =
    t.kind === "call" || t.kind === "put"
      ? ` ${t.strike}${t.kind === "call" ? "C" : "P"} ${t.expiry ?? ""}`
      : "";
  const verb = t.action === "buy" ? "Bought" : t.action === "sell" ? "Sold" : t.action.replace("_", " ");
  return `${verb} ${t.qty} ${t.symbol}${leg}${t.price > 0 ? ` @ ${t.price.toFixed(2)}` : ""}`;
}

/**
 * Days where two bots took genuinely opposite sides of the same underlying.
 *
 * Only share trades count. A bot selling a covered call over stock another bot
 * just bought is not a disagreement — it is two different businesses — and
 * counting it as one would inflate this section with noise.
 */
interface Disagreement {
  date: string;
  symbol: string;
  a: { bot: string; trade: Trade };
  b: { bot: string; trade: Trade };
}

function disagreements(profiles: ProfileRun[], limit = 6): Disagreement[] {
  const byKey = new Map<string, Array<{ bot: string; trade: Trade }>>();
  for (const p of profiles) {
    for (const t of p.trades) {
      if (t.status !== "filled" || t.kind !== "stock") continue;
      const key = `${t.tradeDate}|${t.symbol}`;
      byKey.set(key, [...(byKey.get(key) ?? []), { bot: p.name, trade: t }]);
    }
  }
  const out: Disagreement[] = [];
  for (const [key, entries] of byKey) {
    const [date, symbol] = key.split("|");
    const buys = entries.filter((e) => e.trade.action === "buy");
    const sells = entries.filter((e) => e.trade.action === "sell" || e.trade.action === "called_away");
    for (const buy of buys) {
      const sell = sells.find((s) => s.bot !== buy.bot);
      if (sell) {
        out.push({ date, symbol, a: buy, b: sell });
        break;
      }
    }
  }
  return out
    .sort((x, y) => Math.abs(y.a.trade.amount) - Math.abs(x.a.trade.amount))
    .slice(0, limit);
}

/**
 * The days the desk pulled apart hardest — same tape, widest gap between the
 * best and worst bot — with what each of them actually did that day.
 */
interface DivergentDay {
  date: string;
  spread: number;
  best: { bot: string; dayPnl: number; did: string };
  worst: { bot: string; dayPnl: number; did: string };
}

function whatItDid(run: ProfileRun, date: string): string {
  const day = run.trades.filter((t) => t.tradeDate === date && t.status === "filled" && t.kind !== "cash");
  if (day.length === 0) return "Held, no trades.";
  const lead = [...day].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const rest = day.length - 1;
  return `${tradeLabel(lead)} — ${lead.reason}${rest > 0 ? ` (and ${rest} more trade${rest === 1 ? "" : "s"})` : ""}`;
}

function divergentDays(profiles: ProfileRun[], limit = 3): DivergentDay[] {
  const byDate = new Map<string, Array<{ run: ProfileRun; dayPnl: number }>>();
  for (const run of profiles) {
    for (const snap of run.snapshots) {
      byDate.set(snap.snapDate, [...(byDate.get(snap.snapDate) ?? []), { run, dayPnl: snap.dayPnl }]);
    }
  }
  const out: DivergentDay[] = [];
  for (const [date, entries] of byDate) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => b.dayPnl - a.dayPnl);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    out.push({
      date,
      spread: top.dayPnl - bottom.dayPnl,
      best: { bot: top.run.name, dayPnl: top.dayPnl, did: whatItDid(top.run, date) },
      worst: { bot: bottom.run.name, dayPnl: bottom.dayPnl, did: whatItDid(bottom.run, date) },
    });
  }
  return out.sort((a, b) => b.spread - a.spread).slice(0, limit);
}

/* -- HTML -------------------------------------------------------------- */

function safetyHtml(groups: CheckGroup[]): string {
  return groups
    .map(
      (g) => `<div class="chk ${g.ok ? "" : "bad"}">
      <h5><span class="badge">${g.ok ? "held" : "broke"}</span>${esc(g.title)}</h5>
      <p>${esc(g.claim)}</p>
      <ul>${g.lines.map((l) => `<li class="${l.ok ? "" : "neg"}">${esc(l.text)}</li>`).join("")}</ul>
    </div>`,
    )
    .join("");
}

interface Stress {
  file: RunFile;
  benchmark: number;
  rows: Array<{ name: string; role: string; returnPct: number; low: number; trades: number }>;
  floorQuotes: string[];
  broke: string[];
}

function stressHtml(stress: Stress | null): string {
  if (!stress) return "";
  const worst = [...stress.rows].sort((a, b) => a.returnPct - b.returnPct);
  return `<h2>Stress test: the worst stretch in the data</h2>
<p class="lede">August was a rising market, which flatters everything. So the same ten bots were run
again over the hardest stretch the price history contains — ${esc(stress.file.from)} to
${esc(stress.file.to)}, ${stress.file.days.length} sessions in which SPY fell ${pct(stress.benchmark)}.
Nobody was rescued; the question is whether the rules degraded safely.</p>
<table>
  <thead><tr><th>Bot</th><th>Role</th><th>Return</th><th>Lowest equity</th><th>Trades</th></tr></thead>
  <tbody>${worst
    .map(
      (r) => `<tr>
      <td class="who"><b>${esc(r.name)}</b></td>
      <td class="muted">${esc(r.role)}</td>
      <td class="num ${r.returnPct < 0 ? "neg" : "pos"}">${pct(r.returnPct)}</td>
      <td class="num muted">${usd(r.low)}</td>
      <td class="num muted">${r.trades}</td>
    </tr>`,
    )
    .join("")}</tbody>
</table>
${
  stress.floorQuotes.length > 0
    ? `<div class="dis" style="margin-top:18px">
      <h5>The equity floor did its job</h5>
      ${stress.floorQuotes.map((q) => `<div class="side"><em>${esc(q)}</em></div>`).join("")}
    </div>`
    : ""
}
${
  stress.broke.length > 0
    ? `<div class="chk bad" style="margin-top:18px">
      <h5><span class="badge">broke</span>What the stress window broke</h5>
      <p>These held every day of August and did not hold here. This is the honest cost of the
      window being harder, not a check being wrong.</p>
      <ul>${stress.broke.map((b) => `<li class="neg">${esc(b)}</li>`).join("")}</ul>
    </div>`
    : `<p class="meta" style="margin-top:16px">Every safety check that held in August also held here.</p>`
}`;
}

function html(file: RunFile, stats: Stats[], benchmark: { label: string; pct: number }[], notes: string[], safety: CheckGroup[], stress: Stress | null): string {
  const ranked = [...stats].sort((a, b) => b.returnPct - a.returnPct);
  const deskPnl = stats.reduce((s, x) => s + x.pnl, 0);
  const deskStart = START * stats.length;
  const totalTrades = stats.reduce((s, x) => s + x.filled, 0);
  const totalMemories = stats.reduce((s, x) => s + x.run.memories.length, 0);
  const lines: Line[] = ranked.map((s, i) => ({
    label: s.run.name,
    color: PALETTE[i % PALETTE.length],
    values: s.curve,
  }));
  const colorOf = new Map(ranked.map((s, i) => [s.run.id, PALETTE[i % PALETTE.length]]));
  const dis = disagreements(file.profiles);
  const div = divergentDays(file.profiles);

  const rows = ranked
    .map((s, i) => {
      const id = identityFor(s.run.id);
      return `<tr>
        <td class="rank">${String(i + 1).padStart(2, "0")}</td>
        <td class="who">
          <span class="dot" style="background:${colorOf.get(s.run.id)}"></span>
          <span><b>${esc(s.run.name)}</b><em>${esc(id.role)}</em></span>
        </td>
        <td class="num">${usd(s.equity)}</td>
        <td class="num ${s.pnl < 0 ? "neg" : "pos"}">${signedUsd(s.pnl)}</td>
        <td class="num ${s.returnPct < 0 ? "neg" : "pos"}">${pct(s.returnPct)}</td>
        <td class="num muted">${pct(s.drawdown, 1)}</td>
        <td class="num muted">${s.filled}</td>
        <td class="num muted">${s.tradingDays}</td>
        <td class="num muted">${s.winPct == null ? "—" : `${s.winPct.toFixed(0)}%`}</td>
        <td class="num muted">${s.peakMargin > 0 ? usd(s.peakMargin) : "—"}</td>
      </tr>`;
    })
    .join("");

  const cards = ranked
    .map((s) => {
      const id = identityFor(s.run.id);
      const color = colorOf.get(s.run.id) ?? PALETTE[0];
      const mems = s.run.memories
        .filter((m) => m.kind !== "creed")
        .sort((a, b) => b.weight - a.weight || b.hits - a.hits)
        .slice(0, 5);
      return `<section class="bot">
        <header>
          <span class="dot lg" style="background:${color}"></span>
          <div class="hd">
            <h3>${esc(s.run.name)}</h3>
            <p class="role">${esc(id.role)} · ${esc(s.run.tagline)}</p>
          </div>
          <div class="hdnum">
            <b class="${s.returnPct < 0 ? "neg" : "pos"}">${pct(s.returnPct)}</b>
            <em>${signedUsd(s.pnl)}</em>
          </div>
        </header>
        ${sparkline(s.curve, color)}
        <blockquote>${esc(id.creed)}</blockquote>
        <h4>What it learned</h4>
        ${mems.length === 0 ? '<p class="muted">Nothing beyond its creed this month.</p>' : `<ul class="mem">${mems
          .map((m) => `<li><span class="kind">${m.kind}</span> ${esc(m.headline)}${m.detail ? ` <em>${esc(m.detail)}</em>` : ""}</li>`)
          .join("")}</ul>`}
        <h4>Trades worth reading</h4>
        <ul class="tr">${interestingTrades(s.run)
          .map(
            (t) => `<li>
              <div class="top">
                <b><code>${t.tradeDate}</code> ${esc(tradeLabel(t))}</b>
                <span class="amt">${t.amount === 0 ? "" : `${t.amount < 0 ? "cost" : "credit"} ${usd(Math.abs(t.amount))}`}</span>
              </div>
              <em>${esc(t.reason)}</em></li>`,
          )
          .join("")}</ul>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Paper desk — August 2026</title>
<style>
  :root {
    --ink:#1A1917; --body:#3D3A35; --muted:#7A756C; --line:#E8E6E1;
    --ground:#FBFAF8; --card:#FFFFFF; --pos:#2F6F4F; --neg:#9C4A3C;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--body);
    font:15px/1.6 "Inter",system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width:1040px; margin:0 auto; padding:64px 28px 96px; }
  h1 { font-size:40px; line-height:1.1; letter-spacing:-0.028em; color:var(--ink); margin:0 0 12px; font-weight:650; }
  h2 { font-size:13px; letter-spacing:0.13em; text-transform:uppercase; color:var(--muted);
       font-weight:600; margin:64px 0 18px; }
  h3 { font-size:21px; letter-spacing:-0.018em; color:var(--ink); margin:0; font-weight:620; }
  h3.sub { font-size:16px; margin:34px 0 12px; color:var(--ink); font-weight:620; }
  h4 { font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted);
       font-weight:600; margin:22px 0 8px; }
  .lede { font-size:18px; line-height:1.55; color:var(--body); max-width:64ch; margin:0 0 8px; }
  .meta { color:var(--muted); font-size:13px; }
  .headline { display:grid; grid-template-columns:repeat(6,1fr); gap:24px 20px; margin:36px 0 8px;
    padding:26px 28px; background:var(--card); border:1px solid var(--line); border-radius:14px; }
  .headline div { min-width:0; }
  .headline b { display:block; font-size:29px; letter-spacing:-0.02em; color:var(--ink); font-weight:640; }
  .headline span { font-size:12px; letter-spacing:0.09em; text-transform:uppercase; color:var(--muted); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  thead th { text-align:right; font-size:11px; letter-spacing:0.09em; text-transform:uppercase;
    color:var(--muted); font-weight:600; padding:0 0 10px; border-bottom:1px solid var(--line); }
  thead th:nth-child(1), thead th:nth-child(2) { text-align:left; }
  tbody td { padding:13px 0; border-bottom:1px solid var(--line); vertical-align:middle; }
  .rank { color:var(--muted); font-variant-numeric:tabular-nums; width:34px; }
  .who { display:flex; align-items:center; gap:11px; }
  .who b { color:var(--ink); font-weight:600; display:block; }
  .who em { font-style:normal; color:var(--muted); font-size:12.5px; }
  .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:18px; }
  .muted { color:var(--muted); }
  .pos { color:var(--pos); } .neg { color:var(--neg); }
  .dot { width:11px; height:11px; border-radius:50%; flex:none; display:inline-block; }
  .dot.lg { width:15px; height:15px; }
  .chart { width:100%; height:auto; background:var(--card);
    border:1px solid var(--line); border-radius:14px; padding:10px; }
  .ax { font-size:11px; fill:var(--muted); font-variant-numeric:tabular-nums; }
  .lbl { font-size:12px; font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; }
  .bot { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px 24px 24px; }
  .bot header { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; }
  .bot .hd { flex:1; min-width:0; }
  .bot .role { margin:3px 0 0; font-size:13px; color:var(--muted); }
  .hdnum { text-align:right; }
  .hdnum b { display:block; font-size:19px; font-variant-numeric:tabular-nums; font-weight:640; }
  .hdnum em { font-style:normal; font-size:12.5px; color:var(--muted); font-variant-numeric:tabular-nums; }
  .spark { width:100%; height:64px; display:block; margin:4px 0 6px; }
  blockquote { margin:14px 0 0; padding-left:14px; border-left:2px solid var(--line);
    color:var(--body); font-size:14px; font-style:italic; }
  ul { margin:0; padding-left:0; list-style:none; }
  .mem li { padding:7px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
  .mem li:last-child { border-bottom:0; }
  .mem em { font-style:normal; color:var(--muted); }
  .kind { display:inline-block; font-size:10px; letter-spacing:0.08em; text-transform:uppercase;
    color:var(--muted); border:1px solid var(--line); border-radius:5px; padding:1px 6px; margin-right:7px; }
  .tr li { padding:9px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
  .tr li:last-child { border-bottom:0; }
  .tr b { color:var(--ink); font-weight:600; }
  .tr em { display:block; font-style:normal; color:var(--muted); margin-top:3px; }
  .tr code, .dis code { font:12px ui-monospace,SFMono-Regular,monospace; color:var(--muted); }
  .tr .top { display:flex; align-items:baseline; gap:10px; }
  .tr .top b { flex:1; min-width:0; }
  .amt { flex:none; font-variant-numeric:tabular-nums; font-size:12.5px; color:var(--muted); white-space:nowrap; }
  .dis { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:20px 24px; margin-bottom:16px; }
  .dis h5 { margin:0 0 12px; font-size:15px; color:var(--ink); font-weight:620; }
  .side { padding:9px 0; border-top:1px solid var(--line); font-size:13.5px; }
  .side b { color:var(--ink); }
  .side em { font-style:normal; color:var(--muted); display:block; }
  .checks { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
  .chk { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; }
  .chk.bad { border-color:#E4C6BF; background:#FFFAF9; }
  .chk h5 { margin:0 0 6px; font-size:15px; color:var(--ink); font-weight:620;
    display:flex; align-items:center; gap:9px; }
  .chk p { margin:0 0 10px; font-size:13px; color:var(--muted); line-height:1.5; }
  .chk ul li { font-size:12.5px; padding:3px 0; color:var(--body);
    font-variant-numeric:tabular-nums; }
  .badge { font-size:10px; letter-spacing:0.08em; text-transform:uppercase; font-weight:600;
    color:var(--pos); border:1px solid #C9DED2; background:#F2F8F4; border-radius:5px; padding:2px 7px; }
  .chk.bad .badge { color:var(--neg); border-color:#E4C6BF; background:#FDF3F1; }
  .caveat { background:#FFFDF7; border:1px solid #EDE4CC; border-radius:14px; padding:22px 26px; }
  .caveat li { padding:6px 0 6px 18px; position:relative; font-size:14px; }
  .caveat li::before { content:"—"; position:absolute; left:0; color:var(--muted); }
  footer { margin-top:64px; padding-top:22px; border-top:1px solid var(--line);
    color:var(--muted); font-size:12.5px; }
  @media (max-width:900px) { .headline { grid-template-columns:repeat(3,1fr); } }
  @media (max-width:640px) { .wrap { padding:36px 18px 64px; } h1 { font-size:30px; }
    .headline { grid-template-columns:repeat(2,1fr); }
    .headline b { font-size:24px; }
    table { font-size:12.5px; } .num { padding-left:10px; } }
</style></head>
<body><div class="wrap">

<h1>The paper desk in August 2026</h1>
<p class="lede">Ten rule-following bots, each handed $100,000 in cash and a $200,000 margin line on
1 August, each keeping its own ledger. Every session of every trading day was replayed against
recorded daily bars. Nobody had a discretionary opinion; they all just followed their written plan.</p>
<p class="meta">${file.days.length} trading days · ${file.from} to ${file.to} · ${totalTrades} filled trades ·
${totalMemories} memories earned · generated ${file.generatedAt.slice(0, 10)}</p>

<div class="headline">
  <div><span>Desk P&amp;L</span><b class="${deskPnl < 0 ? "neg" : "pos"}">${signedUsd(deskPnl)}</b></div>
  <div><span>On $${(deskStart / 1_000_000).toFixed(1)}M</span><b>${pct((deskPnl / deskStart) * 100)}</b></div>
  <div><span>Best</span><b>${esc(ranked[0].run.name)}</b></div>
  <div><span>Worst</span><b>${esc(ranked[ranked.length - 1].run.name)}</b></div>
  ${benchmark.map((b) => `<div><span>${esc(b.label)}</span><b>${pct(b.pct)}</b></div>`).join("")}
</div>

<h2>Standings</h2>
<table>
  <thead><tr><th></th><th>Bot</th><th>Ending equity</th><th>P&amp;L</th><th>Return</th>
  <th>Max DD</th><th>Trades</th><th>Active days</th><th>Win rate</th><th>Peak margin</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<h2>Equity, day by day</h2>
${lineChart(lines, file.days)}

<h2>Each bot</h2>
<div class="grid">${cards}</div>

<h2>Where they disagreed</h2>
<p class="lede">The same tape, the same day, opposite conclusions — because the rulebooks differ.
Only share trades count here: one bot buying while another sells the same name. Reasons are
quoted verbatim from the trade log.</p>
${
  dis.length === 0
    ? '<p class="muted">No two bots took opposite sides of the same symbol on the same day this month.</p>'
    : dis
        .map(
          (d) => `<div class="dis">
    <h5><code>${d.date}</code> &nbsp; ${esc(d.symbol)}</h5>
    <div class="side"><b>${esc(d.a.bot)} bought.</b> <em>${esc(d.a.trade.reason)}</em></div>
    <div class="side"><b>${esc(d.b.bot)} sold.</b> <em>${esc(d.b.trade.reason)}</em></div>
  </div>`,
        )
        .join("")
}

<h3 class="sub">The days the desk pulled apart</h3>
<p class="lede">Same market, widest gap between the best and worst bot, and what each was doing.</p>
${div
  .map(
    (d) => `<div class="dis">
    <h5><code>${d.date}</code> &nbsp; ${signedUsd(d.spread)} between top and bottom</h5>
    <div class="side"><b>${esc(d.best.bot)} ${signedUsd(d.best.dayPnl)}.</b> <em>${esc(d.best.did)}</em></div>
    <div class="side"><b>${esc(d.worst.bot)} ${signedUsd(d.worst.dayPnl)}.</b> <em>${esc(d.worst.did)}</em></div>
  </div>`,
  )
  .join("")}

${stressHtml(stress)}

<h2>Safety checks</h2>
<p class="lede">Every bot is supposed to make money safely, without gambling. These are the rules
that had to hold on every day of the month, checked against the ledgers rather than read off the
rulebooks. Expand nothing — if a line is not green, it broke.</p>
<div class="checks">${safetyHtml(safety)}</div>

<h2>What this does not prove</h2>
<div class="caveat"><ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>

<footer>stonkbro paper desk · simulation, not a track record · ${esc(file.generatedAt)}</footer>
</div></body></html>`;
}

/* -- markdown ---------------------------------------------------------- */

function markdown(file: RunFile, stats: Stats[], benchmark: { label: string; pct: number }[], notes: string[], safety: CheckGroup[], stress: Stress | null): string {
  const ranked = [...stats].sort((a, b) => b.returnPct - a.returnPct);
  const deskPnl = stats.reduce((s, x) => s + x.pnl, 0);
  const out: string[] = [];
  out.push(`# The paper desk in August 2026\n`);
  out.push(`Ten rule-following bots, $100,000 cash and a $200,000 margin line each, separate ledgers.`);
  out.push(`${file.days.length} trading days, ${file.from} to ${file.to}. Simulated on recorded daily bars.\n`);
  out.push(`**Desk P&L: ${signedUsd(deskPnl)}** on $${((START * stats.length) / 1_000_000).toFixed(1)}M of starting capital.`);
  out.push(benchmark.map((b) => `${b.label} ${pct(b.pct)}`).join(" · ") + "\n");
  out.push(`| # | Bot | Role | Ending equity | P&L | Return | Max DD | Trades | Days | Win rate | Peak margin |`);
  out.push(`|--:|---|---|--:|--:|--:|--:|--:|--:|--:|--:|`);
  ranked.forEach((s, i) => {
    const id = identityFor(s.run.id);
    out.push(
      `| ${i + 1} | ${s.run.name} | ${id.role} | ${usd(s.equity)} | ${signedUsd(s.pnl)} | ${pct(s.returnPct)} | ` +
        `${pct(s.drawdown, 1)} | ${s.filled} | ${s.tradingDays} | ${s.winPct == null ? "—" : `${s.winPct.toFixed(0)}%`} | ` +
        `${s.peakMargin > 0 ? usd(s.peakMargin) : "—"} |`,
    );
  });
  out.push("");
  for (const s of ranked) {
    const id = identityFor(s.run.id);
    out.push(`## ${s.run.name} — ${id.role} · ${pct(s.returnPct)} (${signedUsd(s.pnl)})\n`);
    out.push(`> ${id.creed}\n`);
    const mems = s.run.memories.filter((m) => m.kind !== "creed").slice(0, 5);
    if (mems.length > 0) {
      out.push(`**Learned:**`);
      for (const m of mems) out.push(`- _${m.kind}_ — ${m.headline}${m.detail ? ` ${m.detail}` : ""}`);
      out.push("");
    }
    out.push(`**Trades worth reading:**`);
    for (const t of interestingTrades(s.run)) {
      out.push(`- \`${t.tradeDate}\` ${tradeLabel(t)} — ${t.reason}`);
    }
    out.push("");
  }
  out.push(`## Where they disagreed\n`);
  const dis = disagreements(file.profiles);
  if (dis.length === 0) out.push(`No two bots took opposite sides of the same symbol on the same day.\n`);
  for (const d of dis) {
    out.push(`**${d.date} · ${d.symbol}**`);
    out.push(`- ${d.a.bot} bought — ${d.a.trade.reason}`);
    out.push(`- ${d.b.bot} sold — ${d.b.trade.reason}\n`);
  }
  out.push(`### The days the desk pulled apart\n`);
  for (const d of divergentDays(file.profiles)) {
    out.push(`**${d.date}** — ${signedUsd(d.spread)} between top and bottom`);
    out.push(`- ${d.best.bot} ${signedUsd(d.best.dayPnl)} — ${d.best.did}`);
    out.push(`- ${d.worst.bot} ${signedUsd(d.worst.dayPnl)} — ${d.worst.did}\n`);
  }
  if (stress) {
    out.push(`## Stress test: ${stress.file.from} to ${stress.file.to} (SPY ${pct(stress.benchmark)})\n`);
    out.push(`| Bot | Role | Return | Lowest equity | Trades |`);
    out.push(`|---|---|--:|--:|--:|`);
    for (const r of [...stress.rows].sort((a, b) => a.returnPct - b.returnPct)) {
      out.push(`| ${r.name} | ${r.role} | ${pct(r.returnPct)} | ${usd(r.low)} | ${r.trades} |`);
    }
    out.push("");
    for (const q of stress.floorQuotes) out.push(`- ${q}`);
    out.push("");
    if (stress.broke.length > 0) {
      out.push(`**What the stress window broke** (all of these held every day of August):`);
      for (const b of stress.broke) out.push(`- ${b}`);
      out.push("");
    } else {
      out.push(`Every safety check that held in August also held here.\n`);
    }
  }
  out.push(`## Safety checks\n`);
  for (const g of safety) {
    out.push(`**${g.ok ? "HELD" : "BROKE"} — ${g.title}.** ${g.claim}`);
    for (const l of g.lines) out.push(`- ${l.ok ? "" : "**FAILED** "}${l.text}`);
    out.push("");
  }
  out.push(`## What this does not prove\n`);
  for (const n of notes) out.push(`- ${n}`);
  return out.join("\n") + "\n";
}

/* -- main -------------------------------------------------------------- */

function benchmarkReturns(): { label: string; pct: number }[] {
  const path = ".cache/paper-bars.json";
  if (!existsSync(path)) return [];
  const bars: Record<string, Array<{ date: string; open: number; close: number }>> = JSON.parse(readFileSync(path, "utf8"));
  return ["SPY", "QQQ"].flatMap((s) => {
    const window = (bars[s] ?? []).filter((b) => b.date >= "2026-08-01" && b.date <= "2026-08-31");
    if (window.length < 2) return [];
    const first = window[0].open;
    const last = window[window.length - 1].close;
    return [{ label: `${s} buy & hold`, pct: ((last - first) / first) * 100 }];
  });
}

function windowReturn(symbol: string, from: string, to: string): number {
  const path = ".cache/paper-bars.json";
  if (!existsSync(path)) return 0;
  const bars: Record<string, Array<{ date: string; open: number; close: number }>> = JSON.parse(readFileSync(path, "utf8"));
  const w = (bars[symbol] ?? []).filter((b) => b.date >= from && b.date <= to);
  if (w.length < 2) return 0;
  return ((w[w.length - 1].close - w[0].open) / w[0].open) * 100;
}

function loadStress(path: string | undefined): Stress | null {
  if (!path || !existsSync(path)) return null;
  const file: RunFile = JSON.parse(readFileSync(path, "utf8"));
  const floorQuotes = [
    ...new Set(
      file.profiles.flatMap((p) =>
        p.trades.filter((t) => /floor/i.test(t.reason)).map((t) => `${p.name}: ${t.reason}`),
      ),
    ),
  ].slice(0, 3);
  const broke = checkInvariants(file.profiles as unknown as CheckedProfile[], file.days.length)
    .flatMap((g) => g.lines.filter((l) => !l.ok).map((l) => `${g.title}: ${l.text}`));
  return {
    file,
    benchmark: windowReturn("SPY", file.from, file.to),
    floorQuotes,
    broke,
    rows: file.profiles.map((p) => {
      const curve = p.snapshots.map((s) => s.equity);
      const end = curve[curve.length - 1] ?? START;
      return {
        name: p.name,
        role: identityFor(p.id).role,
        returnPct: ((end - START) / START) * 100,
        low: Math.min(...curve, START),
        trades: p.trades.filter((t) => t.status === "filled").length,
      };
    }),
  };
}

function main(): void {
  const path = process.argv[2] ?? ".cache/paper-backfill-2026-08-01-2026-08-31.json";
  const file: RunFile = JSON.parse(readFileSync(path, "utf8"));
  const stats = file.profiles.map(statsFor);
  const benchmark = benchmarkReturns();
  const stress = loadStress(process.argv[3] ?? ".cache/paper-backfill-2025-01-15-2025-04-08.json");

  const notes = [
    "This is a simulation on recorded daily bars, not a live track record. No order was ever sent to a broker.",
    "Option chains for August 2026 no longer exist to fetch, so every option price here is modelled with Black–Scholes off the underlying's own realised volatility, with a crude linear skew. Real quotes would differ, and the options bots are the ones most affected by that.",
    "A daily bar has no intraday path. The open session fills at the open and the close session at the close, which are real prices; the midday session fills at the day's high–low midpoint, which is only knowable after the close. Midday decisions therefore carry a sliver of hindsight.",
    "Fills assume the whole order trades at one price. Slippage is a quarter of the modelled bid–ask spread on options and zero on stock, and there is no market impact, no partial fill, and no gap risk between sessions.",
    "Dividends, borrow costs on shares, and early assignment on American options are not modelled. Margin interest is, at 8% APR on borrowed cash.",
    "One month is not evidence that a strategy works. August 2026 was a rising market, which flatters anything long and penalises anything hedged or in cash. The stress-test section is the partial answer to that, and it is still only one more window.",
    "Win rate counts closed positions, so a bot still holding its winners shows a lower win rate than it has earned.",
  ];

  mkdirSync("reports", { recursive: true });
  const safety = checkInvariants(file.profiles as unknown as CheckedProfile[], file.days.length);
  writeFileSync("reports/paper-august-2026.html", html(file, stats, benchmark, notes, safety, stress));
  writeFileSync("reports/paper-august-2026.md", markdown(file, stats, benchmark, notes, safety, stress));
  const broken = safety.filter((g) => !g.ok);
  console.log(broken.length === 0 ? "All safety checks held." : `${broken.length} safety check(s) BROKE: ${broken.map((g) => g.title).join("; ")}`);
  console.log("Wrote reports/paper-august-2026.html and reports/paper-august-2026.md");
}

main();
