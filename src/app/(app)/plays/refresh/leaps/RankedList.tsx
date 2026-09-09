"use client";

import { DataRow, MonoNumber } from "@/components/refresh";
import { structureLine, type LeapsPick } from "./lab-data";

interface RankedListProps {
  picks: LeapsPick[];
  pinned: Set<string>;
  selected: string | null;
  onSelect: (symbol: string) => void;
}

/** The scan's top LEAPS, one compact row each. Rank 1 leads; the open one is amber-bordered. */
export default function RankedList({ picks, pinned, selected, onSelect }: RankedListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {picks.map((pick, i) => {
        const open = pick.symbol === selected;
        return (
          <DataRow
            key={`${pick.symbol}-${pick.expiry}`}
            index={i}
            ticker={pick.symbol}
            badges={[
              { label: `#${i + 1}`, tone: "fact" },
              ...(pinned.has(pick.symbol) ? [{ label: "PINNED", tone: "info" as const }] : []),
            ]}
            caption={structureLine(pick)}
            value={
              <MonoNumber
                value={pick.score}
                size={22}
                weight={600}
                decimals={0}
                color={open ? "var(--accent)" : "var(--text-primary)"}
                letterSpacing="-0.02em"
                countUp={false}
              />
            }
            subValue={
              <span className="refresh-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-dim)" }}>
                SCORE
              </span>
            }
            onPress={() => onSelect(pick.symbol)}
            style={open ? { borderColor: "var(--accent-border-strong)", background: "var(--gradient-emphasis)" } : undefined}
          />
        );
      })}
    </div>
  );
}
