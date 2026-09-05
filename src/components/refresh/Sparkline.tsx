"use client";

import { useId } from "react";

/**
 * Maps a series to `<polyline>` points inside a `width × height` box.
 *
 * `pad` keeps the stroke off the edges. A flat series sits on the centre line
 * rather than collapsing to the floor.
 */
function toPoints(
  series: readonly number[],
  width: number,
  height: number,
  pad: number,
): string {
  const n = series.length;
  if (n === 0) return "";
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const inner = height - pad * 2;
  const step = n > 1 ? width / (n - 1) : 0;
  return series
    .map((v, i) => {
      const x = i * step;
      const y = span === 0 ? height / 2 : pad + inner * (1 - (v - min) / span);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Green when the series ends at or above where it started, red otherwise. */
function directionColor(series: readonly number[]): string {
  if (series.length < 2) return "var(--up)";
  return series[series.length - 1] >= series[0] ? "var(--up)" : "var(--down)";
}

export interface SparklineProps {
  points: readonly number[];
  /** viewBox width. 60 in a `DataRow`, 80 in an index tile. */
  width?: number;
  /** Rendered height in px. 26 in a row, 22 in an index tile. */
  height?: number;
  /** Defaults to direction. Pass a token to override. */
  color?: string;
  strokeWidth?: number;
  /** Stretch to the container instead of the fixed `width`. */
  fluid?: boolean;
  className?: string;
}

/**
 * The row sparkline: one `<polyline>`, no dots, no axes, no library.
 *
 * `preserveAspectRatio="none"` lets the same 8–10 points fill whatever box
 * it is given — which is why the vertical scale is meaningless here and the
 * shape is the only thing being read.
 */
export default function Sparkline({
  points,
  width = 60,
  height = 26,
  color,
  strokeWidth = 1.8,
  fluid = false,
  className = "",
}: SparklineProps) {
  if (points.length === 0) return null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: fluid ? "100%" : width, height, flex: "none" }}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={toPoints(points, width, height, strokeWidth)}
        fill="none"
        stroke={color ?? directionColor(points)}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface HeroChartProps {
  points: readonly number[];
  /** 96–110px. Default 110, the ticker-detail chart card. */
  height?: number;
  color?: string;
  /** Vertical ramp under the line, 0.26 alpha to nothing. Default true. */
  area?: boolean;
  /** Draw the line once on mount via stroke-dashoffset. Default true. */
  animate?: boolean;
  className?: string;
}

const HERO_VIEW_WIDTH = 360;

/**
 * The full-width chart at the top of a ticker detail: a `<polyline>` plus a
 * closed `<path>` for the area fill.
 *
 * A live tick should update the last segment by re-rendering with a new final
 * point — do not redraw the whole path, and do not re-run the mount draw.
 */
export function HeroChart({
  points,
  height = 110,
  color,
  area = true,
  animate = true,
  className = "",
}: HeroChartProps) {
  const gradientId = useId();
  if (points.length === 0) return null;

  const stroke = color ?? directionColor(points);
  const strokeWidth = 2.2;
  const pts = toPoints(points, HERO_VIEW_WIDTH, height, strokeWidth);
  const areaPath = `M${pts.split(" ").join(" L")} L${HERO_VIEW_WIDTH},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${HERO_VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height }}
      className={className}
      aria-hidden="true"
    >
      {area ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity="var(--chart-area-from)" />
              <stop offset="1" stopColor={stroke} stopOpacity="var(--chart-area-to)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <polyline
        points={pts}
        pathLength={1}
        className={animate ? "refresh-draw" : undefined}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
}
