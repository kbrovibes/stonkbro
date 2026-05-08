/**
 * Earnings calendar — fetches upcoming earnings dates for tracked symbols.
 *
 * Tries the Tradier fundamentals/calendars beta endpoint first.
 * Falls back to a deterministic mock based on typical quarterly reporting patterns.
 */

export type EarningsEvent = {
  symbol: string;
  name: string;
  earningsDate: string; // ISO date YYYY-MM-DD
  daysUntil: number;
  timing: "before_market" | "after_market" | "unknown";
  category: "this_week" | "next_week" | "later";
};

// ---------------------------------------------------------------------------
// Alpha Vantage EARNINGS_CALENDAR (free, no key required for demo tier)
// Returns upcoming earnings for the broad market as CSV
// ---------------------------------------------------------------------------

async function fetchFromAlphaVantage(
  symbols: string[]
): Promise<EarningsEvent[] | null> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_KEY ?? "demo";
    const res = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&horizon=3month&apikey=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    // header: symbol,name,reportDate,fiscalDateEnding,estimate,currency
    if (lines.length < 2) return null;

    const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const events: EarningsEvent[] = [];

    for (const line of lines.slice(1)) {
      const [symbol, name, reportDate] = line.split(",");
      const sym = symbol?.trim().toUpperCase();
      if (!sym || !reportDate?.trim()) continue;
      if (!symbolSet.has(sym)) continue;

      const d = new Date(reportDate.trim());
      if (isNaN(d.getTime())) continue;

      const daysUntil = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0 || daysUntil > 60) continue;

      events.push({
        symbol: sym,
        name: name?.trim() || TICKER_NAMES[sym] || sym,
        earningsDate: reportDate.trim(),
        daysUntil,
        timing: "unknown", // Alpha Vantage doesn't provide BMO/AMC
        category: categorize(daysUntil, now),
      });
    }

    return events.length > 0 ? events : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — deterministic plausible earnings dates
// ---------------------------------------------------------------------------

/**
 * Known reporting patterns (approximate week within each quarter's reporting month).
 * Big tech: late Jan / late Apr / late Jul / late Oct
 * Finance: mid Jan / mid Apr / mid Jul / mid Oct
 * Retail:  mid Mar / mid Jun / mid Sep / mid Dec
 * Others:  early-to-mid of reporting month
 */
const REPORTING_PATTERNS: Record<string, { months: number[]; week: number; timing: "before_market" | "after_market" | "unknown" }> = {
  // Mega-cap tech — late in month, after market
  AAPL:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  MSFT:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  GOOGL: { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  AMZN:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  META:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  NVDA:  { months: [2, 5, 8, 11], week: 4, timing: "after_market" },
  TSLA:  { months: [1, 4, 7, 10], week: 3, timing: "after_market" },
  NFLX:  { months: [1, 4, 7, 10], week: 3, timing: "after_market" },

  // Semis — mid-to-late month
  AMD:   { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  AVGO:  { months: [3, 6, 9, 12], week: 2, timing: "after_market" },
  MU:    { months: [3, 6, 9, 12], week: 4, timing: "after_market" },
  QCOM:  { months: [1, 4, 7, 10], week: 5, timing: "after_market" },
  MRVL:  { months: [3, 6, 8, 12], week: 1, timing: "after_market" },
  AMAT:  { months: [2, 5, 8, 11], week: 3, timing: "after_market" },
  LRCX:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  ARM:   { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  SMCI:  { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  ASML:  { months: [1, 4, 7, 10], week: 3, timing: "before_market" },

  // Growth / SaaS
  PLTR:  { months: [2, 5, 8, 11], week: 1, timing: "before_market" },
  CRWD:  { months: [3, 6, 9, 12], week: 1, timing: "after_market" },
  SNOW:  { months: [3, 5, 8, 11], week: 4, timing: "after_market" },
  DDOG:  { months: [2, 5, 8, 11], week: 2, timing: "before_market" },
  NET:   { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  COIN:  { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  SQ:    { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  SHOP:  { months: [2, 5, 8, 11], week: 2, timing: "before_market" },
  UBER:  { months: [2, 5, 8, 11], week: 1, timing: "before_market" },
  RKLB:  { months: [2, 5, 8, 11], week: 3, timing: "after_market" },

  // Finance — mid month
  JPM:   { months: [1, 4, 7, 10], week: 2, timing: "before_market" },
  GS:    { months: [1, 4, 7, 10], week: 2, timing: "before_market" },
  MS:    { months: [1, 4, 7, 10], week: 2, timing: "before_market" },
  V:     { months: [1, 4, 7, 10], week: 4, timing: "after_market" },
  MA:    { months: [1, 4, 7, 10], week: 4, timing: "before_market" },

  // Fintech
  SOFI:  { months: [1, 4, 7, 10], week: 5, timing: "after_market" },
  AFRM:  { months: [2, 5, 8, 11], week: 2, timing: "after_market" },
  HOOD:  { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  NU:    { months: [2, 5, 8, 11], week: 3, timing: "after_market" },
  UPST:  { months: [2, 5, 8, 11], week: 1, timing: "after_market" },

  // Retail — off-cycle
  COST:  { months: [3, 6, 9, 12], week: 3, timing: "after_market" },
  WMT:   { months: [2, 5, 8, 11], week: 3, timing: "before_market" },
  TGT:   { months: [3, 6, 8, 11], week: 3, timing: "before_market" },
  LULU:  { months: [3, 6, 9, 12], week: 4, timing: "after_market" },

  // Health
  UNH:   { months: [1, 4, 7, 10], week: 2, timing: "before_market" },
  LLY:   { months: [1, 4, 7, 10], week: 4, timing: "before_market" },
  ABBV:  { months: [1, 4, 7, 10], week: 4, timing: "before_market" },

  // Industrial
  CAT:   { months: [1, 4, 7, 10], week: 4, timing: "before_market" },
  GE:    { months: [1, 4, 7, 10], week: 3, timing: "before_market" },
  RTX:   { months: [1, 4, 7, 10], week: 3, timing: "before_market" },
  LMT:   { months: [1, 4, 7, 10], week: 3, timing: "before_market" },
  BA:    { months: [1, 4, 7, 10], week: 4, timing: "before_market" },

  // Energy
  XOM:   { months: [1, 4, 7, 10], week: 5, timing: "before_market" },
  CVX:   { months: [1, 4, 7, 10], week: 5, timing: "before_market" },

  // Travel
  ABNB:  { months: [2, 5, 8, 11], week: 1, timing: "after_market" },
  BKNG:  { months: [2, 5, 8, 11], week: 4, timing: "after_market" },
  UAL:   { months: [1, 4, 7, 10], week: 3, timing: "after_market" },
  DAL:   { months: [1, 4, 7, 10], week: 2, timing: "before_market" },
  AAL:   { months: [1, 4, 7, 10], week: 4, timing: "before_market" },

  // Biotech
  MRNA:  { months: [2, 5, 8, 11], week: 1, timing: "before_market" },
  BNTX:  { months: [2, 5, 8, 11], week: 1, timing: "before_market" },
  HIMS:  { months: [2, 5, 8, 11], week: 1, timing: "after_market" },

  // Media
  DIS:   { months: [2, 5, 8, 11], week: 2, timing: "after_market" },
};

/** Map ticker to a friendly name for display. */
const TICKER_NAMES: Record<string, string> = {
  AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
  META: "Meta Platforms", NVDA: "NVIDIA", TSLA: "Tesla", NFLX: "Netflix",
  AMD: "AMD", AVGO: "Broadcom", MU: "Micron", QCOM: "Qualcomm",
  MRVL: "Marvell", AMAT: "Applied Materials", LRCX: "Lam Research",
  ARM: "Arm Holdings", SMCI: "Super Micro", ASML: "ASML",
  PLTR: "Palantir", CRWD: "CrowdStrike", SNOW: "Snowflake",
  DDOG: "Datadog", NET: "Cloudflare", COIN: "Coinbase", SQ: "Block",
  SHOP: "Shopify", UBER: "Uber", RKLB: "Rocket Lab",
  JPM: "JPMorgan", GS: "Goldman Sachs", MS: "Morgan Stanley",
  V: "Visa", MA: "Mastercard",
  SOFI: "SoFi", AFRM: "Affirm", HOOD: "Robinhood", NU: "Nu Holdings",
  UPST: "Upstart",
  COST: "Costco", WMT: "Walmart", TGT: "Target", LULU: "Lululemon",
  UNH: "UnitedHealth", LLY: "Eli Lilly", ABBV: "AbbVie",
  CAT: "Caterpillar", GE: "GE Aerospace", RTX: "RTX Corp", LMT: "Lockheed Martin",
  BA: "Boeing", XOM: "ExxonMobil", CVX: "Chevron",
  ABNB: "Airbnb", BKNG: "Booking", UAL: "United Airlines",
  DAL: "Delta Air", AAL: "American Airlines",
  MRNA: "Moderna", BNTX: "BioNTech", HIMS: "Hims & Hers",
  DIS: "Walt Disney",
  OKLO: "Oklo", SMR: "NuScale", NNE: "Nano Nuclear", LEU: "Centrus",
  CCJ: "Cameco", VST: "Vistra", CEG: "Constellation Energy",
  IONQ: "IonQ", RGTI: "Rigetti", QBTS: "D-Wave Quantum",
  RIVN: "Rivian", LCID: "Lucid", GM: "General Motors", F: "Ford",
  EXPE: "Expedia", CAR: "Avis Budget",
  RXRX: "Recursion", CRSP: "CRISPR Therapeutics",
  PARA: "Paramount", WBD: "Warner Bros Discovery",
  MSTR: "MicroStrategy", RDDT: "Reddit", CELH: "Celsius",
  ASTS: "AST SpaceMobile", LUNR: "Intuitive Machines",
};

/**
 * For a given symbol, produce the next upcoming earnings date (mock).
 * Uses a stable hash based on symbol to spread dates within the reporting week.
 */
function mockEarningsDate(
  symbol: string,
  now: Date
): { earningsDate: string; timing: "before_market" | "after_market" | "unknown" } | null {
  const pattern = REPORTING_PATTERNS[symbol];
  if (!pattern) {
    // Unknown ticker — assign a generic pattern: next month, week 2
    return generateGenericDate(symbol, now);
  }

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Find the next reporting month
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const year = currentYear + yearOffset;
    for (const month of pattern.months) {
      if (year === currentYear && month < currentMonth) continue;

      // The "week" translates to day-of-month approximately
      // week 1 = ~5th, week 2 = ~12th, week 3 = ~19th, week 4 = ~26th, week 5 = ~30th
      const dayBase = [0, 5, 12, 19, 26, 30][pattern.week] ?? 15;

      // Add a small deterministic offset from the symbol hash (0-3 days)
      const hash = symbolHash(symbol);
      const day = Math.min(dayBase + (hash % 4), 28); // cap at 28 to be safe

      // Skip past dates
      const d = new Date(year, month - 1, day);
      // Ensure it's a weekday
      const dow = d.getDay();
      if (dow === 0) d.setDate(d.getDate() + 1); // Sun -> Mon
      if (dow === 6) d.setDate(d.getDate() - 1); // Sat -> Fri

      const daysUntil = Math.ceil(
        (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil < 0) continue;
      if (daysUntil > 90) return null; // too far out

      return {
        earningsDate: d.toISOString().split("T")[0],
        timing: pattern.timing,
      };
    }
  }

  return null;
}

function generateGenericDate(
  symbol: string,
  now: Date
): { earningsDate: string; timing: "before_market" | "after_market" | "unknown" } | null {
  // Pick a date 10-45 days from now based on symbol hash
  const hash = symbolHash(symbol);
  const daysOut = 10 + (hash % 36);
  const d = new Date(now);
  d.setDate(d.getDate() + daysOut);
  // Weekday adjust
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  if (dow === 6) d.setDate(d.getDate() - 1);

  return {
    earningsDate: d.toISOString().split("T")[0],
    timing: hash % 2 === 0 ? "after_market" : "before_market",
  };
}

function symbolHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Categorization helper
// ---------------------------------------------------------------------------

function categorize(
  daysUntil: number,
  now: Date
): "this_week" | "next_week" | "later" {
  // "This week" = through end of current week (Sunday)
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToEndOfWeek = 7 - dayOfWeek;
  if (daysUntil <= daysToEndOfWeek) return "this_week";
  if (daysUntil <= daysToEndOfWeek + 7) return "next_week";
  return "later";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getEarningsCalendar(
  symbols: string[]
): Promise<EarningsEvent[]> {
  // Try Alpha Vantage live data first
  const liveResult = await fetchFromAlphaVantage(symbols);
  if (liveResult && liveResult.length > 0) {
    return liveResult.map((e) => ({
      ...e,
      name: TICKER_NAMES[e.symbol] || e.name || e.symbol,
    }));
  }

  // Mock fallback
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const events: EarningsEvent[] = [];

  for (const symbol of symbols) {
    const result = mockEarningsDate(symbol, now);
    if (!result) continue;

    const d = new Date(result.earningsDate);
    const daysUntil = Math.ceil(
      (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    events.push({
      symbol,
      name: TICKER_NAMES[symbol] || symbol,
      earningsDate: result.earningsDate,
      daysUntil,
      timing: result.timing,
      category: categorize(daysUntil, now),
    });
  }

  // Sort by date ascending
  events.sort((a, b) => a.daysUntil - b.daysUntil);

  return events;
}
