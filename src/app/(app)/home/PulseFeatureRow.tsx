"use client";

import Link from "next/link";
import type { PulseFeature } from "./pulse-types";

/** One row of monochrome tiles: an icon in an inset circle over a mono label. */
export default function PulseFeatureRow({ features }: { features: PulseFeature[] }) {
  if (features.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 8, padding: "0 var(--gutter)" }}>
      {features.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          className="refresh-pressable"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            padding: "10px 4px 9px",
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-block)",
            color: "var(--text-secondary)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--inset)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
            </svg>
          </span>
          <span
            className="refresh-mono"
            style={{
              fontSize: 11,
              lineHeight: "13px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {f.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
