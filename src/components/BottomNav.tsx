"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getVisibleMoreGroups } from "@/components/more-nav-data";

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
    name: "Options",
    href: "/plays",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
];

const learnTab = {
  name: "Learn",
  href: "/learn",
  icon: (active: boolean) => (
    // Graduation cap
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
};

// Portfolio — only rendered when showPortfolio is true. (Hindsight lives
// inside the Portfolio page header now, not the bottom nav.)
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
];

const moreIcon = (active: boolean) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
  </svg>
);

// Guest tabs: Plays, Research (research stays addressable for guests)
const guestTabs = [
  tabs.find((t) => t.href === "/plays")!,
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
  // Order: Home · Options · Portfolio (center) · Learn · More
  const visibleTabs = isGuest
    ? guestTabs
    : showPortfolio
      ? [...tabs, ...portfolioTabs, learnTab]
      : [...tabs, learnTab];
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
            className="fixed inset-0 z-40 bg-black/40"
          />
          {/* Drop-up: anchored above the More button — wraps in the same
              max-w-2xl container as the nav itself so the popup stays
              glued to the More tab on screens wider than the nav. */}
          <div className="fixed bottom-[60px] left-0 right-0 z-50 pointer-events-none">
            <div className="max-w-2xl mx-auto px-2 flex justify-end">
              <div className="hood-card pointer-events-auto bg-surface-elevated border border-border-default rounded-xl shadow-2xl max-h-[75vh] w-fit max-w-[88vw] flex flex-col">
                <div className="overflow-y-auto py-1.5 px-2 min-h-0">
              {moreGroups.map((group) => (
                <section key={group.label} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5">
                    <span className="text-text-faint">{group.icon}</span>
                    <span className="hood-micro text-[9px] font-bold text-text-subtle uppercase tracking-wide whitespace-nowrap">{group.label}</span>
                  </div>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-2.5 pl-2 pr-6 py-1.5 rounded-md hover:bg-surface-muted active:bg-accent-bg transition-colors whitespace-nowrap"
                        >
                          <span className="text-sm leading-none w-5 text-center">{link.emoji}</span>
                          <span className="text-[13px] font-medium text-text">{link.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

                {/* Sticky footer — sits below the scroll area in flex flow */}
                <div className="border-t border-border-default p-1 shrink-0">
                  <Link
                    href="/more"
                    onClick={() => setMoreOpen(false)}
                    className="hood-cta block text-center text-[12px] font-semibold text-white bg-accent hover:bg-accent-hover active:opacity-90 py-2 rounded-md whitespace-nowrap"
                  >
                    View All &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <nav className="hood-chrome fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border-subtle">
        <div className="max-w-2xl mx-auto flex">
          {visibleTabs.map((tab) => {
            const active = tab.href === "/home"
              ? pathname === "/home"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`hood-navtab flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors active:bg-surface-muted ${
                  active ? "hood-navtab-active text-accent" : "text-text-faint"
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
              className={`hood-navtab flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors active:bg-surface-muted ${
                moreOpen || pathname.startsWith("/more")
                  ? "hood-navtab-active text-accent"
                  : "text-text-faint"
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
