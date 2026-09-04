export interface MetricBarProps {
  /** 0–1. Clamped. */
  value: number;
  /** `progress` is 4px with a 2px radius; `roc` is 5px with a 3px radius. */
  variant?: "progress" | "roc";
  /**
   * `accent` — scan progress. `up` — premium captured. `gradient` — the
   * metric gradient, amber running to green, for ROC. Defaults to `accent`
   * for progress and `gradient` for roc.
   */
  fill?: "accent" | "up" | "down" | "gradient";
  className?: string;
  "aria-label"?: string;
}

const FILLS: Record<string, string> = {
  accent: "var(--accent)",
  up: "var(--up)",
  down: "var(--down)",
  gradient: "var(--gradient-metric)",
};

/**
 * A single-value bar on a `surface-3` trough.
 *
 * Width is the one property in the refresh motion layer allowed to animate
 * besides transform and opacity — it is a small element with no siblings
 * depending on its size. Height and layout never animate.
 */
export default function MetricBar({
  value,
  variant = "progress",
  fill,
  className = "",
  "aria-label": ariaLabel,
}: MetricBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const height = variant === "roc" ? 5 : 4;
  const radius = variant === "roc" ? 3 : 2;
  const background = FILLS[fill ?? (variant === "roc" ? "gradient" : "accent")];

  return (
    <div
      className={`refresh-metric ${className}`}
      style={{ height, borderRadius: radius }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="refresh-metric-fill"
        style={{ width: `${pct}%`, background, borderRadius: radius }}
      />
    </div>
  );
}

export interface SplitBarProps {
  /** Advancing count (or any positive weight). */
  up: number;
  /** Declining count. */
  down: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Market breadth: two segments filling a `chart-dim` track, up then down,
 * 8px tall, no gap. Two numbers, one shape.
 */
export function SplitBar({ up, down, className = "", "aria-label": ariaLabel }: SplitBarProps) {
  const total = up + down;
  const upPct = total > 0 ? (up / total) * 100 : 0;
  return (
    <div className={`refresh-splitbar ${className}`} role="img" aria-label={ariaLabel}>
      <div style={{ width: `${upPct}%`, background: "var(--up)" }} />
      <div style={{ width: `${100 - upPct}%`, background: "var(--down)" }} />
    </div>
  );
}

export type BarTone = "neutral" | "up" | "down" | "accent";

export interface SeriesBar {
  value: number;
  /** Defaults to `neutral`. Highlight the current or notable bar only. */
  tone?: BarTone;
}

export interface BarSeriesProps {
  bars: readonly SeriesBar[];
  /** Track height in px. 44 for monthly premium, 46 for earnings history. */
  height?: number;
  /** Gap between bars. 4px for the monthly series, 6px for earnings. */
  gap?: number;
  radius?: number;
  /** Denominator for the percentage heights. Defaults to the largest value. */
  max?: number;
  /** Bars grow scaleY(0→1) with a 40ms stagger, on mount only. */
  animate?: boolean;
  className?: string;
  "aria-label"?: string;
}

const TONES: Record<BarTone, string> = {
  neutral: "var(--neutral-bar)",
  up: "var(--up)",
  down: "var(--down)",
  accent: "var(--accent)",
};

/**
 * A row of bars — monthly premium, earnings history.
 *
 * Growth is `scaleY` from a bottom origin, never a height animation: heights
 * are laid out once and the transform is composited.
 */
export function BarSeries({
  bars,
  height = 44,
  gap = 4,
  radius = 2,
  max,
  animate = true,
  className = "",
  "aria-label": ariaLabel,
}: BarSeriesProps) {
  const ceiling = max ?? Math.max(...bars.map((b) => b.value), 0);
  return (
    <div
      className={`refresh-barseries ${className}`}
      style={{ height, gap }}
      role="img"
      aria-label={ariaLabel}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          className={animate ? "refresh-bar-grow" : undefined}
          style={{
            flex: 1,
            height: `${ceiling > 0 ? Math.max(0, (bar.value / ceiling) * 100) : 0}%`,
            borderRadius: radius,
            background: TONES[bar.tone ?? "neutral"],
            ["--refresh-i" as string]: i,
          }}
        />
      ))}
    </div>
  );
}
