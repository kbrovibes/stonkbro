"use client";

import { useEffect, useState } from "react";
import { Group, Row } from "./ui";
import { DEFAULT_BOTTOM_NAV_TABS } from "@/lib/nav-destinations";
import type { NavDestination } from "@/lib/nav-destinations";

const SLOT_COUNT = 4;

/**
 * Pick which 4 pages fill the bottom nav's customizable middle slots
 * (Home and More stay fixed). Fetches its own destination list from
 * `/api/settings` (`navOptions`, already filtered for portfolio access) —
 * that route already generically upserts `bottom_nav_tabs`, so saving here
 * is just another POST to it, same as every other Settings field.
 */
export default function BottomNavSection() {
  const [options, setOptions] = useState<NavDestination[] | null>(null);
  const [tabs, setTabs] = useState<string[]>(DEFAULT_BOTTOM_NAV_TABS);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setOptions(d.navOptions ?? []);
        const saved = d.settings?.bottom_nav_tabs;
        if (Array.isArray(saved) && saved.length > 0) setTabs(saved);
      })
      .catch(() => setError("Couldn't load nav options"));
  }, []);

  async function save(next: string[]) {
    setTabs(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bottom_nav_tabs: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to save");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  function pick(slot: number, href: string) {
    const next = [...tabs];
    next[slot] = href;
    setOpenSlot(null);
    void save(next);
  }

  function resetDefault() {
    setOpenSlot(null);
    void save(DEFAULT_BOTTOM_NAV_TABS);
  }

  if (!options) return null;

  const findDest = (href: string) => options.find((o) => o.href === href);

  return (
    <Group
      header="Bottom nav"
      footer={
        <>
          {error ? <span className="text-red-500 dark:text-loss">{error}</span> : "Home and More stay fixed — pick what fills the 4 slots between them."}
        </>
      }
    >
      {Array.from({ length: SLOT_COUNT }, (_, slot) => {
        const href = tabs[slot];
        const dest = href ? findDest(href) : undefined;
        const isOpen = openSlot === slot;
        return (
          <div key={slot}>
            <Row label={`Slot ${slot + 1}`}>
              <button
                type="button"
                onClick={() => setOpenSlot(isOpen ? null : slot)}
                disabled={saving}
                className="flex items-center gap-1.5 text-[15px] text-stone-900 dark:text-text disabled:opacity-40"
              >
                <span>{dest?.emoji ?? "—"}</span>
                <span>{dest?.title ?? "Choose…"}</span>
                <span className="text-stone-400 dark:text-text-faint text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>
            </Row>
            {isOpen && (
              <div className="max-h-64 overflow-y-auto bg-stone-50 dark:bg-surface-muted border-t border-stone-100 dark:border-border-subtle">
                {options.map((opt) => {
                  const usedElsewhere = tabs.some((t, i) => t === opt.href && i !== slot);
                  return (
                    <button
                      key={opt.href}
                      type="button"
                      onClick={() => pick(slot, opt.href)}
                      disabled={usedElsewhere}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] text-stone-700 dark:text-text-muted disabled:opacity-30 active:bg-stone-100 dark:active:bg-surface-elevated"
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <Row label="Reset">
        <button
          type="button"
          onClick={resetDefault}
          disabled={saving}
          className="text-[13px] font-semibold text-sky-600 dark:text-accent disabled:opacity-40"
        >
          Reset to default
        </button>
      </Row>
    </Group>
  );
}
