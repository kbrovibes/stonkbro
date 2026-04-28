"use client";

import { useState } from "react";
import Link from "next/link";

const GROUPS = [
  {
    label: "Discover",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    links: [
      { title: "Sector Discovery", description: "Browse stocks by sector theme.", href: "/sectors" },
      { title: "Explosive Finder", description: "AI-powered search for 10x stocks.", href: "/explosive" },
      { title: "Earnings Calendar", description: "See who reports this week and find earnings plays.", href: "/earnings" },
      { title: "Watchlists", description: "Organize tickers into custom watchlists.", href: "/watchlists" },
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
      { title: "Suggestions", description: "CSP, CC, PMCC recommendations for any ticker.", href: "/suggestions" },
      { title: "PMCC Picks", description: "Auto-ranked best PMCC setups for income.", href: "/pmcc-picks" },
      { title: "PMCC Scanner", description: "Scan for Poor Man's Covered Call opportunities.", href: "/scanner" },
      { title: "Covered Calls", description: "Find optimal covered call opportunities.", href: "/covered-calls" },
      { title: "The Wheel", description: "Track your wheel strategy positions and income.", href: "/wheel" },
      { title: "Trade Signals", description: "Live roll/close alerts based on active positions.", href: "/signals" },
    ],
  },
  {
    label: "Portfolio",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    links: [
      { title: "Portfolio", description: "Live P&L with gain tracking and trailing stops.", href: "/portfolio" },
      { title: "Income Dashboard", description: "View premium income, P&L, and performance.", href: "/income" },
      { title: "Risk Dashboard", description: "Monitor Greeks exposure and concentration.", href: "/risk" },
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
      { title: "Settings", description: "Configure alerts, scoring weights, and account preferences.", href: "/settings" },
    ],
  },
];

export default function MorePage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ Discover: true });

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-2">
      <h2 className="text-lg font-bold text-stone-900 mb-2">More</h2>

      {GROUPS.map((group) => {
        const isOpen = open[group.label] ?? false;
        return (
          <div key={group.label} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => setOpen((prev) => ({ ...prev, [group.label]: !isOpen }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-stone-500">{group.icon}</span>
                <span className="text-sm font-bold text-stone-900">{group.label}</span>
                <span className="text-[10px] text-stone-400">{group.links.length}</span>
              </div>
              <svg
                className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Links */}
            {isOpen && (
              <div className="border-t border-stone-100">
                {group.links.map((link, i) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors ${
                      i < group.links.length - 1 ? "border-b border-stone-100" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{link.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{link.description}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-stone-300 shrink-0 ml-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
