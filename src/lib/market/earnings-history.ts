/**
 * Past earnings reports (date + EPS surprise) from Nasdaq's public
 * earnings-surprise endpoint. Unofficial and best-effort: returns [] on any
 * failure so callers can fall back to an estimate.
 */

export interface PastEarning {
  reportDate: string;
  fiscalQuarter: string;
  eps: number | null;
  consensus: number | null;
  surprisePct: number | null;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { ts: number; rows: PastEarning[] }>();

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function isoFromUs(d: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim());
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

export async function getPastEarnings(symbol: string): Promise<PastEarning[]> {
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.rows;
  try {
    const res = await fetch(`https://api.nasdaq.com/api/company/${encodeURIComponent(key)}/earnings-surprise`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Origin: "https://www.nasdaq.com",
        Referer: "https://www.nasdaq.com/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: { earningsSurpriseTable?: { rows?: Array<Record<string, unknown>> } } };
    const rows = (body.data?.earningsSurpriseTable?.rows ?? [])
      .map((r): PastEarning | null => {
        const reportDate = isoFromUs(String(r.dateReported ?? ""));
        if (!reportDate) return null;
        return {
          reportDate,
          fiscalQuarter: String(r.fiscalQtrEnd ?? ""),
          eps: num(r.eps),
          consensus: num(r.consensusForecast),
          surprisePct: num(r.percentageSurprise),
        };
      })
      .filter((r): r is PastEarning => r != null)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    cache.set(key, { ts: Date.now(), rows });
    return rows;
  } catch {
    cache.set(key, { ts: Date.now(), rows: [] });
    return [];
  }
}
