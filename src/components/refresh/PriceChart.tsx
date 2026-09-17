"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import ChipRow from "./ChipRow";
import MonoNumber from "./MonoNumber";

type TimeFrame = "1D" | "1W" | "1M" | "3M" | "1Y" | "YTD";

const TIMEFRAMES: { key: TimeFrame; label: string; days: number }[] = [
  { key: "1D", label: "1D", days: 1 },
  { key: "1W", label: "1W", days: 5 },
  { key: "1M", label: "1M", days: 22 },
  { key: "3M", label: "3M", days: 66 },
  { key: "1Y", label: "1Y", days: 252 },
  { key: "YTD", label: "YTD", days: 0 }, // calculated dynamically
];

function getYTDDays(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string, tf: TimeFrame): string {
  const d = new Date(dateStr + "T12:00:00");
  if (tf === "1D" || tf === "1W") {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  if (tf === "1M" || tf === "3M") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

interface Bar {
  date: string;
  close: number;
}

const W = 400;
const H = 130;
const PAD_Y = 8;

/**
 * Price history for the ticker screen — the "which chart is this" widget:
 * a timeframe row (1D/1W/1M/3M/1Y/YTD) over a hoverable close-price line,
 * each point priced and dated. Separate from the IV/IVR/RSI/VOL snapshot
 * card, which stays reachable as the other segment of the switch above it.
 */
export default function PriceChart({ symbol, currentPrice, changePct }: { symbol: string; currentPrice: number; changePct: number }) {
  const [tf, setTf] = useState<TimeFrame>("1M");
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();

  const days = tf === "YTD" ? getYTDDays() : TIMEFRAMES.find((t) => t.key === tf)!.days;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHoverIdx(null);

    fetch(`/api/history?symbol=${symbol}&days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.bars) setBars(data.bars);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, days]);

  const closes = bars.map((b) => b.close);
  const min = closes.length > 0 ? Math.min(...closes) : 0;
  const max = closes.length > 0 ? Math.max(...closes) : 1;
  const range = max - min || 1;

  const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : changePct >= 0;
  const stroke = isUp ? "var(--gain)" : "var(--loss)";

  const points = closes.map((v, i) => {
    const x = (i / Math.max(closes.length - 1, 1)) * W;
    const y = PAD_Y + (1 - (v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = points.length > 0 ? `${linePath} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z` : "";

  const getIdxFromEvent = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!svgRef.current || closes.length === 0) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const relX = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, relX / rect.width));
      return Math.round(pct * (closes.length - 1));
    },
    [closes.length]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const idx = getIdxFromEvent(e);
      if (idx !== null) setHoverIdx(idx);
    },
    [getIdxFromEvent]
  );

  const handleLeave = useCallback(() => setHoverIdx(null), []);

  const hoverBar = hoverIdx !== null && bars[hoverIdx] ? bars[hoverIdx] : null;
  const hoverPoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const hoverPrice = hoverBar?.close ?? currentPrice;
  const hoverChangePct = closes.length > 0 ? ((hoverPrice - closes[0]) / closes[0]) * 100 : changePct;
  const headlinePrice = hoverBar ? hoverPrice : currentPrice;
  const headlineChangePct = hoverBar
    ? hoverChangePct
    : closes.length >= 2
    ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
    : changePct;
  const headlineColor = headlineChangePct >= 0 ? "var(--gain)" : "var(--loss)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
        <MonoNumber value={headlinePrice} size={19} weight={600} decimals={2} prefix="$" color="var(--text-primary)" />
        <MonoNumber
          value={headlineChangePct}
          size={12}
          weight={600}
          decimals={2}
          prefix={headlineChangePct >= 0 ? "+" : ""}
          suffix="%"
          color={headlineColor}
        />
        {hoverBar && (
          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{formatDate(hoverBar.date, tf)}</span>
        )}
      </div>

      {loading ? (
        <div style={{ height: H, borderRadius: 12, background: "var(--chart-dim)", opacity: 0.45 }} />
      ) : closes.length < 2 ? (
        <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-faint)" }}>
          No chart data
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: H, cursor: "crosshair", touchAction: "pan-y" }}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onTouchMove={handleMove}
          onTouchEnd={handleLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity="var(--chart-area-from)" />
              <stop offset="1" stopColor={stroke} stopOpacity="var(--chart-area-to)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {hoverPoint && (
            <>
              <line
                x1={hoverPoint.x}
                y1={PAD_Y}
                x2={hoverPoint.x}
                y2={H - PAD_Y}
                stroke="var(--text-faint)"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
              <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3.5" fill="var(--surface-1)" stroke={stroke} strokeWidth="2" />
            </>
          )}
        </svg>
      )}

      <div style={{ marginTop: 8 }}>
        <ChipRow chips={TIMEFRAMES} active={tf} onChange={setTf} variant="filled" gutter={0} aria-label="Timeframe" />
      </div>
    </div>
  );
}
