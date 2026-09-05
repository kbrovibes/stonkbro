import type { ReactNode } from "react";

export interface StatTileProps {
  /** Mono eyebrow. Uppercased by CSS — pass it in natural case. */
  label: string;
  /** Usually a `<MonoNumber />`. A plain string or number is wrapped in mono. */
  value: ReactNode;
  /**
   * Amber variant — accent border, accent label and value. Exactly one tile
   * in a row should ever use it (collateral locked, on Portfolio).
   */
  accent?: boolean;
  /** Overrides the value colour. Ignored when `accent` is set. */
  color?: string;
  /** Flex weight, so a row can be `1 / 1 / 1.6`. Default 1. */
  flex?: number | string;
  className?: string;
}

/**
 * A labelled number in a bordered tile. The unit the stat rows are built from.
 *
 * `surface-1`, hairline, 14px radius, 11×12 padding: a 9px mono eyebrow above
 * a 17/600 value with 3px between them.
 */
export default function StatTile({
  label,
  value,
  accent = false,
  color,
  flex = 1,
  className = "",
}: StatTileProps) {
  const valueColor = accent ? "var(--accent)" : color ?? "var(--text)";
  return (
    <div
      className={`refresh-stat ${accent ? "refresh-stat-accent" : ""} ${className}`}
      style={{ flex }}
    >
      <span className="refresh-eyebrow" style={accent ? { color: "var(--accent)" } : undefined}>
        {label}
      </span>
      {typeof value === "string" || typeof value === "number" ? (
        <span
          className="refresh-mono"
          style={{ fontSize: 17, fontWeight: 600, color: valueColor }}
        >
          {value}
        </span>
      ) : (
        <span style={{ color: valueColor }}>{value}</span>
      )}
    </div>
  );
}
