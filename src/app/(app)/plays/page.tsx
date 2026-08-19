"use client";

import { useState } from "react";
import OfflineGate from "@/components/OfflineGate";
import MarketTab from "./MarketTab";
import ScannerTabs, { type ScannerTab } from "./ScannerTabs";
import PMCCContent from "../pmcc-picks/PMCCContent";

type PlaysTab = "market" | "pmcc" | ScannerTab;

const TABS: { id: PlaysTab; label: string; activeClass: string }[] = [
  { id: "market", label: "Market", activeClass: "text-stone-900 dark:text-text border-stone-900 dark:border-text" },
  { id: "csp", label: "CSPs", activeClass: "text-emerald-600 dark:text-gain border-emerald-600" },
  { id: "calls", label: "Calls", activeClass: "text-sky-600 dark:text-accent border-sky-600" },
  { id: "leaps", label: "LEAPS", activeClass: "text-violet-600 dark:text-violet-300 border-violet-600" },
  { id: "pmcc", label: "PMCC", activeClass: "text-indigo-600 dark:text-indigo-300 border-indigo-600" },
  { id: "weekly", label: "Weekly", activeClass: "text-amber-600 dark:text-amber-300 border-amber-600" },
];

export default function PlaysPage() {
  return (
    <OfflineGate label="Plays">
      <PlaysView />
    </OfflineGate>
  );
}

function PlaysView() {
  const [tab, setTab] = useState<PlaysTab>("market");

  return (
    <div className="flex flex-col flex-1">
      {/* Top-level tab bar — Market pulse + the options scanner views */}
      <div className="sticky top-0 z-20 flex bg-white/90 dark:bg-surface-elevated/90 backdrop-blur border-b border-stone-200 dark:border-border-default">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition border-b-2 ${
              tab === t.id
                ? t.activeClass
                : "border-transparent text-stone-400 dark:text-text-faint hover:text-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Both sections stay mounted so a running scan or loaded market data
          survives tab switches; visibility is CSS-only. */}
      <div className={tab === "market" ? "flex flex-col flex-1" : "hidden"}>
        <MarketTab />
      </div>
      <div className={tab === "pmcc" ? "flex flex-col flex-1" : "hidden"}>
        <PMCCContent />
      </div>
      <div className={tab === "market" || tab === "pmcc" ? "hidden" : "flex flex-col flex-1"}>
        <ScannerTabs tab={tab === "market" || tab === "pmcc" ? "csp" : tab} />
      </div>
    </div>
  );
}
