#!/usr/bin/env tsx
/**
 * Warm the daily-bar cache the backfill runs on. Separate from the backfill
 * itself so the slow network pass happens once and re-runs are instant.
 *
 * Run: npx tsx scripts/paper-fetch-bars.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getHistory, type DailyBar } from "../src/lib/market/history";
import { allQuoteSymbols } from "../src/lib/paper/profiles";

const BAR_CACHE = ".cache/paper-bars.json";
const DAYS = 420;

function loadEnv(file = ".env.local"): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.TRADIER_API_TOKEN) {
    console.error("TRADIER_API_TOKEN is not set — refusing to cache mock bars.");
    process.exit(1);
  }
  const cache: Record<string, DailyBar[]> = existsSync(BAR_CACHE) ? JSON.parse(readFileSync(BAR_CACHE, "utf8")) : {};
  const symbols = allQuoteSymbols();
  const missing = symbols.filter((s) => !cache[s]?.length);
  console.log(`${symbols.length} symbols, ${missing.length} to fetch.`);

  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(
      missing.slice(i, i + 5).map(async (symbol) => {
        try {
          cache[symbol] = await getHistory(symbol, DAYS);
          process.stdout.write(cache[symbol].length > 0 ? "." : "x");
        } catch {
          cache[symbol] = [];
          process.stdout.write("!");
        }
      }),
    );
    if (i + 5 < missing.length) await new Promise((r) => setTimeout(r, 2200));
  }
  process.stdout.write("\n");
  mkdirSync(".cache", { recursive: true });
  writeFileSync(BAR_CACHE, JSON.stringify(cache));

  const withBars = symbols.filter((s) => cache[s]?.length);
  const spy = cache["SPY"] ?? [];
  const august = spy.filter((b) => b.date >= "2026-08-01" && b.date <= "2026-08-31");
  console.log(`Cached ${withBars.length}/${symbols.length} symbols.`);
  console.log(`SPY: ${spy.length} bars, ${spy[0]?.date} → ${spy[spy.length - 1]?.date}`);
  console.log(`August 2026 trading days in SPY: ${august.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
