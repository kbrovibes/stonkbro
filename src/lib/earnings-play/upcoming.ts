import { getEarningsCalendar, knownTiming } from "@/lib/market/earnings";
import { SECTORS } from "@/lib/market/sectors";
import { getQuotes } from "@/lib/market/yahoo";
import { DEFAULT_UNIVERSE } from "@/lib/options/csp-scanner";
import { addDays, daysBetween, etToday, isWeekend, weekStart, weekday } from "@/lib/paper/dates";
import type { UpcomingEarning, UpcomingResponse } from "./types";

const EXTRAS = [
  "MU", "NKE", "ORCL", "ADBE", "FDX", "LULU", "COST", "AVGO", "CRWD", "SNOW", "MRVL", "DELL",
  "NFLX", "NVDA", "TSLA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "AMD", "PLTR", "COIN",
  "SHOP", "UBER", "DIS", "JPM", "GS", "BA", "SMCI", "ARM", "INTC", "QCOM", "WMT", "TGT", "HD",
];

/** Liquid, optionable names worth watching for a report. */
export const EARNINGS_WATCHLIST = [...new Set([...EXTRAS, ...DEFAULT_UNIVERSE, ...SECTORS.flatMap((s) => s.tickers)])];

/** On a weekend, "this week" is the week about to start. */
export function thisWeekStart(today: string): string {
  if (!isWeekend(today)) return weekStart(today);
  return addDays(today, weekday(today) === 6 ? 2 : 1);
}

export async function getUpcomingEarnings(): Promise<UpcomingResponse> {
  const today = etToday();
  const monday = thisWeekStart(today);
  const nextMonday = addDays(monday, 7);
  const end = addDays(monday, 14);

  const calendar = await getEarningsCalendar(EARNINGS_WATCHLIST);
  const inWindow = calendar.filter((e) => e.earningsDate >= today && e.earningsDate < end);
  const quotes = inWindow.length > 0 ? await getQuotes(inWindow.map((e) => e.symbol)) : [];
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  const events: UpcomingEarning[] = inWindow
    .map((e) => {
      const q = bySymbol.get(e.symbol);
      return {
        symbol: e.symbol,
        name: q?.name && q.name !== e.symbol ? q.name : e.name,
        earningsDate: e.earningsDate,
        timing: e.timing !== "unknown" ? e.timing : knownTiming(e.symbol),
        daysUntil: daysBetween(today, e.earningsDate),
        week: e.earningsDate < nextMonday ? ("this" as const) : ("next" as const),
        price: q?.price ?? null,
        changePct: q?.changePct ?? null,
      };
    })
    .sort((a, b) => a.earningsDate.localeCompare(b.earningsDate) || a.symbol.localeCompare(b.symbol));

  return { asOf: new Date().toISOString(), thisWeekOf: monday, events };
}
