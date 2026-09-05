/**
 * The five primitives of the refresh design, plus the two SVG helpers.
 *
 * Every refresh screen is these plus layout. Styling lives in
 * `src/app/refresh-primitives.css`; tokens live in `src/app/refresh.css`.
 * If a screen needs a value that is not in a token, that is a signal the
 * token set is wrong — say so rather than hardcoding it locally.
 */

export { default as MonoNumber } from "./MonoNumber";
export type { MonoNumberProps } from "./MonoNumber";

export { default as StatTile } from "./StatTile";
export type { StatTileProps } from "./StatTile";

export { default as ChipRow, SegmentedSwitch } from "./ChipRow";
export type { Chip, ChipRowProps, SegmentedSwitchProps } from "./ChipRow";

export { default as MetricBar, SplitBar, BarSeries } from "./MetricBar";
export type {
  BarSeriesProps,
  BarTone,
  MetricBarProps,
  SeriesBar,
  SplitBarProps,
} from "./MetricBar";

export { default as DataRow, Badge, DataRowSkeleton } from "./DataRow";
export type {
  BadgeTone,
  DataRowProps,
  DataRowSkeletonProps,
  RowBadge,
} from "./DataRow";

export { default as Sparkline, HeroChart } from "./Sparkline";
export type { HeroChartProps, SparklineProps } from "./Sparkline";

export { prefersReducedMotion, subscribeRaf } from "./raf";
