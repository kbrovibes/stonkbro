/**
 * Upcoming Tech IPO Pipeline
 *
 * Curated list of notable upcoming tech IPOs sorted by hype score.
 * Update this file manually as the IPO landscape evolves.
 *
 * Platforms:
 *   Hiive    — hiive.com (pre-IPO secondary marketplace)
 *   Forge    — forgeglobal.com
 *   EquityZen — equityzen.com
 */

export type IPOPlatform = "Hiive" | "Forge" | "EquityZen";

export type IPOStatus = "rumored" | "filed" | "priced" | "roadshow";

export type IPOEntry = {
  name: string;
  ticker?: string;        // expected / reserved ticker
  sector: string;
  description: string;
  expectedDate: string;   // e.g. "Q3 2025", "H2 2025", "TBD"
  valuation?: string;     // last known private valuation
  hype: 1 | 2 | 3 | 4 | 5;
  status: IPOStatus;
  platforms: IPOPlatform[];
};

export const UPCOMING_IPOS: IPOEntry[] = [
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
    ticker: "DBX2",
    sector: "AI / Data",
    description: "Unified analytics and AI platform powering enterprise ML",
    expectedDate: "2025",
    valuation: "~$62B",
    hype: 5,
    status: "rumored",
    platforms: ["Hiive", "Forge", "EquityZen"],
  },
  {
    name: "xAI",
    sector: "AI",
    description: "Elon Musk's AI company behind the Grok LLM",
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
    description: "Largest US neobank with 20M+ customers and no-fee banking",
    expectedDate: "H2 2025",
    valuation: "~$25B",
    hype: 4,
    status: "rumored",
    platforms: ["Hiive", "Forge", "EquityZen"],
  },
  {
    name: "Perplexity AI",
    sector: "AI",
    description: "AI-powered search and answer engine growing virally",
    expectedDate: "TBD",
    valuation: "~$9B",
    hype: 4,
    status: "rumored",
    platforms: ["Hiive"],
  },
  {
    name: "Anduril Industries",
    sector: "Defense Tech",
    description: "Next-gen defense tech — autonomous drones, AI-powered border systems",
    expectedDate: "2025–2026",
    valuation: "~$28B",
    hype: 4,
    status: "rumored",
    platforms: ["Forge", "EquityZen"],
  },
  {
    name: "Figma",
    sector: "SaaS / Design",
    description: "Collaborative design platform; Adobe acquisition blocked by regulators",
    expectedDate: "H2 2025",
    valuation: "~$12B",
    hype: 3,
    status: "rumored",
    platforms: ["Hiive", "Forge", "EquityZen"],
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

/** Returns IPOs sorted by hype descending */
export function getUpcomingIPOs(): IPOEntry[] {
  return [...UPCOMING_IPOS].sort((a, b) => b.hype - a.hype);
}

export const PLATFORM_COLORS: Record<IPOPlatform, string> = {
  Hiive: "bg-violet-50 text-violet-700 border-violet-200",
  Forge: "bg-blue-50 text-blue-700 border-blue-200",
  EquityZen: "bg-teal-50 text-teal-700 border-teal-200",
};
