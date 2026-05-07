/**
 * Upcoming Tech IPO Pipeline
 *
 * Live data from Alpha Vantage IPO calendar (free, set ALPHA_VANTAGE_KEY or uses demo key).
 * Merged with a curated metadata list for hype scores, platform availability, descriptions.
 *
 * Live data provides accurate dates/status; curated data provides hype + pre-IPO platforms.
 *
 * Platforms:
 *   Hiive    — hiive.com (pre-IPO secondary marketplace)
 *   Forge    — forgeglobal.com
 *   EquityZen — equityzen.com
 */

export type IPOPlatform = "Hiive" | "Forge" | "EquityZen";

export type IPOStatus = "rumored" | "filed" | "priced" | "roadshow" | "upcoming";

export type IPOEntry = {
  name: string;
  ticker?: string;
  sector: string;
  description: string;
  expectedDate: string;   // ISO date from live feed, or "Q3 2025" / "TBD" from curated
  priceRange?: string;    // e.g. "$18–$21"
  valuation?: string;
  hype: 1 | 2 | 3 | 4 | 5;
  status: IPOStatus;
  platforms: IPOPlatform[];
  isLive?: boolean;       // true = date from live API
};

// ---------------------------------------------------------------------------
// Curated metadata — update when IPOs file / price / trade or are cancelled
// ---------------------------------------------------------------------------

const CURATED: IPOEntry[] = [
  {
    name: "Klarna",
    ticker: "KLAR",
    sector: "Fintech",
    description: "Buy-now-pay-later giant with 85M+ users globally",
    expectedDate: "H1 2025",
    valuation: "~$20B",
    hype: 5,
    status: "filed",
    platforms: ["Hiive", "Forge", "EquityZen"],
  },
  {
    name: "Databricks",
    sector: "AI / Data",
    description: "Unified analytics and AI platform powering enterprise ML at scale",
    expectedDate: "2025",
    valuation: "~$62B",
    hype: 5,
    status: "rumored",
    platforms: ["Hiive", "Forge", "EquityZen"],
  },
  {
    name: "xAI",
    sector: "AI",
    description: "Elon Musk's AI company behind the Grok LLM and xAI Colossus cluster",
    expectedDate: "TBD",
    valuation: "~$50B",
    hype: 5,
    status: "rumored",
    platforms: ["Hiive"],
  },
  {
    name: "Cerebras Systems",
    ticker: "CBRS",
    sector: "AI Chips",
    description: "Wafer-scale AI accelerators challenging NVIDIA for training workloads",
    expectedDate: "2025",
    valuation: "~$8B",
    hype: 4,
    status: "filed",
    platforms: ["Hiive", "Forge"],
  },
  {
    name: "Chime",
    sector: "Fintech",
    description: "Largest US neobank with 20M+ customers and zero-fee banking",
    expectedDate: "H2 2025",
    valuation: "~$25B",
    hype: 4,
    status: "rumored",
    platforms: ["Hiive", "Forge", "EquityZen"],
  },
  {
    name: "Perplexity AI",
    sector: "AI",
    description: "AI-powered search and answer engine with viral growth",
    expectedDate: "TBD",
    valuation: "~$9B",
    hype: 4,
    status: "rumored",
    platforms: ["Hiive"],
  },
  {
    name: "Anduril Industries",
    sector: "Defense Tech",
    description: "Next-gen defense tech — autonomous systems and AI-powered border security",
    expectedDate: "2025–2026",
    valuation: "~$28B",
    hype: 4,
    status: "rumored",
    platforms: ["Forge", "EquityZen"],
  },
  {
    name: "Discord",
    sector: "Social / Gaming",
    description: "Voice and chat platform with 150M+ monthly active users",
    expectedDate: "TBD",
    valuation: "~$15B",
    hype: 3,
    status: "rumored",
    platforms: ["Hiive", "EquityZen"],
  },
  {
    name: "Plaid",
    sector: "Fintech",
    description: "Financial data infrastructure powering Venmo, Robinhood, and thousands of fintechs",
    expectedDate: "TBD",
    valuation: "~$13B",
    hype: 3,
    status: "rumored",
    platforms: ["Forge", "EquityZen"],
  },
];

// ---------------------------------------------------------------------------
// Live IPO fetch — Alpha Vantage IPO_CALENDAR (free tier, CSV response)
// ---------------------------------------------------------------------------

type LiveIPO = {
  symbol: string;
  name: string;
  ipoDate: string;   // YYYY-MM-DD
  priceLow: number;
  priceHigh: number;
  exchange: string;
};

async function fetchLiveIPOs(): Promise<LiveIPO[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY ?? "demo";
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=IPO_CALENDAR&apikey=${apiKey}`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    );
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // header: symbol,name,ipoDate,priceRangeLow,priceRangeHigh,currency,exchange
    return lines.slice(1).map((line) => {
      const [symbol, name, ipoDate, priceLow, priceHigh, , exchange] = line.split(",");
      return {
        symbol: symbol?.trim() ?? "",
        name: name?.trim() ?? "",
        ipoDate: ipoDate?.trim() ?? "",
        priceLow: parseFloat(priceLow) || 0,
        priceHigh: parseFloat(priceHigh) || 0,
        exchange: exchange?.trim() ?? "",
      };
    }).filter((e) => e.name && e.ipoDate);
  } catch {
    return [];
  }
}

// Tech sector keywords for filtering live results
const TECH_KEYWORDS = [
  "tech", "software", "ai", "cloud", "data", "cyber", "digital", "platform",
  "app", "saas", "computing", "chip", "semiconductor", "fintech", "crypto",
  "biotech", "medtech", "robotics", "drone", "space", "electric", "ev",
];

function isTechish(name: string): boolean {
  const lower = name.toLowerCase();
  return TECH_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Merge live + curated
// ---------------------------------------------------------------------------

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatPriceRange(low: number, high: number): string | undefined {
  if (!low && !high) return undefined;
  if (low && high) return `$${low}–$${high}`;
  if (high) return `up to $${high}`;
  return `$${low}+`;
}

function formatDateLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return isoDate;
  }
}

export async function getUpcomingIPOs(): Promise<IPOEntry[]> {
  const live = await fetchLiveIPOs();

  // Index curated by normalized name and ticker
  const curatedByName = new Map<string, IPOEntry>();
  const curatedByTicker = new Map<string, IPOEntry>();
  for (const c of CURATED) {
    curatedByName.set(normalizeName(c.name), c);
    if (c.ticker) curatedByTicker.set(c.ticker.toUpperCase(), c);
  }

  const merged: IPOEntry[] = [];
  const usedCurated = new Set<string>();

  // Process live entries — enrich with curated metadata if we have it
  for (const l of live) {
    const curatedMatch =
      curatedByTicker.get(l.symbol.toUpperCase()) ??
      curatedByName.get(normalizeName(l.name));

    if (curatedMatch) {
      usedCurated.add(normalizeName(curatedMatch.name));
      merged.push({
        ...curatedMatch,
        ticker: l.symbol || curatedMatch.ticker,
        expectedDate: formatDateLabel(l.ipoDate),
        priceRange: formatPriceRange(l.priceLow, l.priceHigh),
        status: "upcoming",
        isLive: true,
      });
    } else if (isTechish(l.name)) {
      // New live tech IPO not in curated list — add it with default hype
      merged.push({
        name: l.name,
        ticker: l.symbol,
        sector: "Tech",
        description: `${l.exchange}-listed upcoming IPO`,
        expectedDate: formatDateLabel(l.ipoDate),
        priceRange: formatPriceRange(l.priceLow, l.priceHigh),
        hype: 2,
        status: "upcoming",
        platforms: [],
        isLive: true,
      });
    }
  }

  // Add curated entries not covered by live data (rumored / no date yet)
  for (const c of CURATED) {
    if (!usedCurated.has(normalizeName(c.name))) {
      merged.push(c);
    }
  }

  // Sort by hype desc, then live-data first within same hype
  return merged.sort((a, b) => {
    if (b.hype !== a.hype) return b.hype - a.hype;
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return 0;
  });
}

export const PLATFORM_COLORS: Record<IPOPlatform, string> = {
  Hiive: "bg-violet-50 text-violet-700 border-violet-200",
  Forge: "bg-blue-50 text-blue-700 border-blue-200",
  EquityZen: "bg-teal-50 text-teal-700 border-teal-200",
};
