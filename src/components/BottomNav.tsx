"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getVisibleMoreGroups } from "@/components/MoreNav";

const tabs = [
  {
    name: "Home",
    href: "/home",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    name: "Plays",
    href: "/today",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    name: "Options",
    href: "/csp-hunter",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.696 1.16 5.242 0l.879-.659M9 8.818l.879-.659c1.546-1.16 3.696-1.16 5.242 0l.879.659M12 6V4m0 16v-2" />
      </svg>
    ),
  },
];

// Portfolio + Time Machine — only rendered when showPortfolio is true.
const portfolioTabs = [
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    name: "Time Machine",
    href: "/time-machine",
    icon: (active: boolean) => (
      // Clock face with hour-hand at 9 (pointing back) — "look back in time".
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l-3.5 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5 7 7" />
      </svg>
    ),
  },
];

const moreIcon = (active: boolean) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  </svg>
);

// Guest tabs: Plays, Options, Research (research stays addressable for guests)
const guestTabs = [
  tabs.find((t) => t.href === "/today")!,
  tabs.find((t) => t.href === "/csp-hunter")!,
  {
    name: "Research",
    href: "/research",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
      </svg>
    ),
  },
];

export default function BottomNav({
  isGuest = false,
  showPortfolio = false,
}: {
  showPortfolio?: boolean;
  isGuest?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleTabs = isGuest
    ? guestTabs
    : showPortfolio
      ? [...tabs, ...portfolioTabs]
      : tabs;
  const moreGroups = getVisibleMoreGroups(showPortfolio);

  // Close popup whenever the route changes
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Lock body scroll while popup is open
  useEffect(() => {
    if (moreOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [moreOpen]);

  return (
    <>
      {/* More popup (bottom sheet) */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-stone-900/40"
          />
          {/* Drop-up: anchored above the More button, width = longest entry */}
          <div className="fixed bottom-[60px] right-2 z-50 bg-white border border-stone-200 rounded-xl shadow-2xl max-h-[75vh] w-max max-w-[min(85vw,368px)] flex flex-col">
            <div className="overflow-y-auto py-1.5 px-1 min-h-0">
              {moreGroups.map((group) => (
                <section key={group.label} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5">
                    <span className="text-stone-400">{group.icon}</span>
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap">{group.label}</span>
                  </div>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-stone-50 active:bg-sky-50 transition-colors whitespace-nowrap"
                        >
                          <span className="text-sm leading-none w-5 text-center">{link.emoji}</span>
                          <span className="text-[13px] font-medium text-stone-800">{link.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Sticky footer — sits below the scroll area in flex flow */}
            <div className="border-t border-stone-200 p-1 shrink-0">
              <Link
                href="/more"
                onClick={() => setMoreOpen(false)}
                className="block text-center text-[12px] font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 py-2 rounded-md whitespace-nowrap"
              >
                View All &rarr;
              </Link>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-100">
        <div className="max-w-2xl mx-auto flex">
          {visibleTabs.map((tab) => {
            const active = tab.href === "/home"
              ? pathname === "/home"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors active:bg-stone-100 ${
                  active ? "text-sky-600" : "text-stone-400"
                }`}
              >
                {tab.icon(active)}
                {tab.name}
              </Link>
            );
          })}
          {!isGuest && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label="More"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors active:bg-stone-100 ${
                moreOpen || pathname.startsWith("/more") ? "text-sky-600" : "text-stone-400"
              }`}
            >
              {moreIcon(moreOpen)}
              More
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
