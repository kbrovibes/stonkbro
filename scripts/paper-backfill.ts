#!/usr/bin/env tsx
/**
 * Replay the paper-trading desk over a past window and write the result to
 * disk for the report builder.
 *
 * Daily bars are fetched once from Tradier and cached, because the fetch is
 * the slow part and the simulation is deterministic given the same bars.
 *
 * Run: npx tsx scripts/paper-backfill.ts 2026-08-01 2026-08-31
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getHistory, type DailyBar } from "../src/lib/market/history";
import { runBackfill, type BarMap } from "../src/lib/paper/backfill";
import { PROFILES, allQuoteSymbols } from "../src/lib/paper/profiles";

/** tsx does not read .env.local the way `next` does. */
function loadEnv(file = ".env.local"): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

loadEnv();

const BAR_CACHE = ".cache/paper-bars.json";
const DAYS = 420;

async function loadBars(symbols: string[]): Promise<BarMap> {
  const cache: Record<string, DailyBar[]> = existsSync(BAR_CACHE)
    ? JSON.parse(readFileSync(BAR_CACHE, "utf8"))
    : {};
  const missing = symbols.filter((s) => !cache[s]?.length);
  if (missing.length > 0) {
    console.log(`Fetching ${missing.length} symbols from Tradier…`);
    for (let i = 0; i < missing.length; i += 5) {
      const batch = missing.slice(i, i + 5);
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            const bars = await getHistory(symbol, DAYS);
            cache[symbol] = bars;
            process.stdout.write(bars.length > 0 ? "." : "x");
          } catch {
            cache[symbol] = [];
            process.stdout.write("!");
          }
        }),
      );
      if (i + 5 < missing.length) await new Promise((r) => setTimeout(r, 2500));
    }
    process.stdout.write("\n");
    mkdirSync(dirname(BAR_CACHE), { recursive: true });
    writeFileSync(BAR_CACHE, JSON.stringify(cache));
  }
  const map: BarMap = new Map();
  for (const symbol of symbols) if (cache[symbol]?.length) map.set(symbol, cache[symbol]);
  return map;
}

async function main(): Promise<void> {
  const from = process.argv[2] ?? "2026-08-01";
  const to = process.argv[3] ?? "2026-08-31";
  if (!process.env.TRADIER_API_TOKEN) {
    console.error("TRADIER_API_TOKEN is not set — the backfill would run on mock prices. Refusing.");
    process.exit(1);
  }

  const symbols = allQuoteSymbols();
  console.log(`${symbols.length} symbols, ${PROFILES.length} profiles, ${from} → ${to}`);
  const bars = await loadBars(symbols);
  console.log(`${bars.size} symbols with bars.`);

  const started = Date.now();
  const result = await runBackfill({
    from,
    to,
    bars,
    profiles: PROFILES,
    quoteSymbols: [...bars.keys()],
    onDay: (date, i, total) => console.log(`  ${date}  (${i + 1}/${total})`),
  });
  console.log(`Simulated ${result.days.length} sessions in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  const out = {
    from,
    to,
    days: result.days,
    missing: result.missing,
    generatedAt: new Date().toISOString(),
    profiles: [...result.ledgers.values()].map((l) => ({
      id: l.profile.id,
      name: l.profile.name,
      tagline: l.profile.tagline,
      style: l.profile.style,
      plan: l.profile.plan,
      margin: l.profile.margin,
      account: l.account,
      snapshots: l.snapshots,
      trades: l.trades,
      notes: l.notes,
      memories: l.memories,
      positions: l.positions,
    })),
  };
  const path = `.cache/paper-backfill-${from}-${to}.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out));
  console.log(`Wrote ${path}`);

  for (const p of out.profiles) {
    const last = p.snapshots[p.snapshots.length - 1];
    const equity = last?.equity ?? 100000;
    const trades = p.trades.filter((t) => t.status === "filled").length;
    console.log(
      `  ${p.name.padEnd(22)} $${Math.round(equity).toLocaleString().padStart(9)}  ` +
        `${(((equity - 100000) / 100000) * 100).toFixed(2).padStart(7)}%  ${String(trades).padStart(4)} trades`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
