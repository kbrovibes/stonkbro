"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type MoreLink = { title: string; description: string; href: string; emoji: string };
export type MoreGroup = { label: string; icon: ReactNode; links: MoreLink[]; requiresPortfolio?: boolean };

/** Filter MORE_GROUPS for the current user's access level. */
export function getVisibleMoreGroups(hasPortfolioAccess: boolean): MoreGroup[] {
  return MORE_GROUPS.filter((g) => !g.requiresPortfolio || hasPortfolioAccess);
}

export const MORE_GROUPS: MoreGroup[] = [
  {
    label: "Discover",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    links: [
      { emoji: "🔬", title: "Research", description: "AI-powered ticker research", href: "/research" },
      { emoji: "📡", title: "Sector Discovery", description: "Browse stocks by sector theme", href: "/sectors" },
      { emoji: "💥", title: "Explosive Finder", description: "AI search for 10x stocks", href: "/explosive" },
      { emoji: "📅", title: "Earnings Calendar", description: "Earnings plays this week", href: "/earnings" },
      { emoji: "⭐", title: "Watchlists", description: "Organize tickers", href: "/watchlists" },
      { emoji: "🎓", title: "Learn", description: "Options & strategy lessons", href: "/learn" },
    ],
  },
  {
    label: "Options",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    links: [
      { emoji: "💡", title: "Suggestions", description: "CSP, CC, PMCC ideas", href: "/suggestions" },
      { emoji: "🎯", title: "PMCC Picks", description: "Top-ranked PMCC setups", href: "/pmcc-picks" },
      { emoji: "🔎", title: "PMCC Scanner", description: "Scan PMCC opportunities", href: "/scanner" },
      { emoji: "📞", title: "Covered Calls", description: "Find optimal CCs", href: "/covered-calls" },
      { emoji: "🔄", title: "The Wheel", description: "Track wheel income", href: "/wheel" },
      { emoji: "🚦", title: "Trade Signals", description: "Roll/close alerts", href: "/signals" },
      { emoji: "🎣", title: "CSP Hunter", description: "Juicy cash-secured puts", href: "/csp-hunter" },
    ],
  },
  {
    label: "Portfolio",
    requiresPortfolio: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    links: [
      { emoji: "📊", title: "Portfolio", description: "Live P&L tracking", href: "/portfolio" },
      { emoji: "⏰", title: "Time Machine", description: "What-if portfolio simulator", href: "/time-machine" },
      { emoji: "💰", title: "Income", description: "Premium income & P&L", href: "/income" },
      { emoji: "⚠️", title: "Risk", description: "Greeks & concentration", href: "/risk" },
    ],
  },
  {
    label: "Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.28c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    links: [
      { emoji: "⚙️", title: "Settings", description: "Alerts & preferences", href: "/settings" },
    ],
  },
];

/** Square tile used on the /more page grid. */
export function MoreTile({ link, onClick }: { link: MoreLink; onClick?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className="aspect-square rounded-xl border border-stone-200 bg-white p-2 flex flex-col items-center justify-center gap-1 text-center hover:border-sky-300 hover:bg-sky-50 active:bg-sky-100 transition-colors min-w-0"
    >
      <span className="text-2xl leading-none">{link.emoji}</span>
      <span className="text-[11px] font-bold text-stone-900 leading-tight line-clamp-2 w-full">{link.title}</span>
    </Link>
  );
}
