import Link from "next/link";

const links = [
  {
    title: "Sector Discovery",
    description: "Browse stocks by sector theme.",
    href: "/sectors",
  },
  {
    title: "Explosive Finder",
    description: "AI-powered search for 10x stocks.",
    href: "/explosive",
  },
  {
    title: "Watchlists",
    description: "Organize tickers into custom watchlists for tracking.",
    href: "/watchlists",
  },
  {
    title: "Earnings Calendar",
    description: "See who reports this week and find earnings plays.",
    href: "/earnings",
  },
  {
    title: "Trade Signals",
    description: "Live roll/close alerts based on your active positions.",
    href: "/signals",
  },
  {
    title: "Suggestions",
    description: "On-demand CSP, CC, PMCC recommendations for any ticker.",
    href: "/suggestions",
  },
  {
    title: "PMCC Picks",
    description: "Auto-ranked best PMCC setups for income.",
    href: "/pmcc-picks",
  },
  {
    title: "PMCC Scanner",
    description: "Scan for Poor Man's Covered Call opportunities.",
    href: "/scanner",
  },
  {
    title: "Covered Calls",
    description: "Find optimal covered call opportunities on your holdings.",
    href: "/covered-calls",
  },
  {
    title: "The Wheel",
    description: "Track your wheel strategy positions and income.",
    href: "/wheel",
  },
  {
    title: "Income Dashboard",
    description: "View premium income, P&L, and performance over time.",
    href: "/income",
  },
  {
    title: "Portfolio",
    description: "Live P&L with gain tracking, drawdowns, and trailing stops.",
    href: "/portfolio",
  },
  {
    title: "Risk Dashboard",
    description: "Monitor portfolio risk, Greeks exposure, and concentration.",
    href: "/risk",
  },
  {
    title: "Settings",
    description: "Configure alerts, scoring weights, and account preferences.",
    href: "/settings",
  },
];

export default function MorePage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <h2 className="text-lg font-bold text-stone-900 mb-4">More</h2>

      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-colors"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-stone-900">
                {link.title}
              </h3>
              <p className="mt-0.5 text-xs text-stone-500">{link.description}</p>
            </div>
            <svg
              className="w-4 h-4 text-stone-300 shrink-0 ml-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
