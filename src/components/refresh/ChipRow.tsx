"use client";

export interface Chip<T extends string = string> {
  key: T;
  label: string;
  disabled?: boolean;
}

export interface ChipRowProps<T extends string = string> {
  chips: readonly Chip<T>[];
  /** The selected key, or null when the row allows no selection. */
  active: T | null;
  onChange: (key: T) => void;
  /**
   * `filled` — amber fill, near-black label. Portfolio and Options filters.
   * `outlined` — amber tint and border, amber label. Sector row, Hindsight
   * view switcher.
   */
  variant?: "filled" | "outlined";
  /** Screen gutter in px. Also becomes the trailing gutter. Default 22. */
  gutter?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * A horizontally scrolling row of single-choice chips.
 *
 * Scrollbar hidden, gutter-aligned, with a trailing gutter so the last chip
 * never clips. Each chip's hit area is a 44pt button; the coloured pill is a
 * span inside it, which is how the visual stays 6×13 while the touch target
 * stays legal.
 */
export default function ChipRow<T extends string = string>({
  chips,
  active,
  onChange,
  variant = "filled",
  gutter = 22,
  className = "",
  "aria-label": ariaLabel,
}: ChipRowProps<T>) {
  return (
    <div
      className={`refresh-chiprow ${className}`}
      role="group"
      aria-label={ariaLabel}
      style={{
        gap: variant === "filled" ? 7 : 8,
        paddingLeft: gutter,
        ["--refresh-gutter" as string]: `${gutter}px`,
      }}
    >
      {chips.map((chip) => {
        const on = chip.key === active;
        return (
          <button
            key={chip.key}
            type="button"
            className="refresh-chip-hit"
            aria-pressed={on}
            disabled={chip.disabled}
            onClick={() => onChange(chip.key)}
          >
            <span
              className={`refresh-chip refresh-chip-${variant} ${on ? "refresh-chip-on" : "refresh-chip-off"}`}
            >
              {chip.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentedSwitchProps<T extends string = string> {
  segments: readonly Chip<T>[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * The equal-width variant of `ChipRow` — CSP · CC · PMCC · LEAPS · WKLY.
 *
 * Five destinations collapsed into one control: switching re-queries, it does
 * not navigate, so the caller keeps its sector filter and scroll position.
 */
export function SegmentedSwitch<T extends string = string>({
  segments,
  active,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: SegmentedSwitchProps<T>) {
  return (
    <div className={`refresh-seg-track ${className}`} role="tablist" aria-label={ariaLabel}>
      {segments.map((seg) => {
        const on = seg.key === active;
        return (
          <button
            key={seg.key}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={seg.disabled}
            className={`refresh-seg ${on ? "refresh-seg-on" : ""}`}
            onClick={() => onChange(seg.key)}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
