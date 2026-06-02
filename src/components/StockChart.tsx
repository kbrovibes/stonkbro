"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type TimeFrame = "1D" | "1W" | "1M" | "3M" | "1Y" | "YTD";

const TIMEFRAMES: { label: TimeFrame; days: number }[] = [
  { label: "1D", days: 1 },
  { label: "1W", days: 5 },
  { label: "1M", days: 22 },
  { label: "3M", days: 66 },
  { label: "1Y", days: 252 },
  { label: "YTD", days: 0 }, // calculated dynamically
];

function getYTDDays(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatPrice(price: number): string {
  return "$" + price.toFixed(2);
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

export default function StockChart({ symbol, currentPrice }: { symbol: string; currentPrice: number }) {
  const [tf, setTf] = useState<TimeFrame>("1M");
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const days = tf === "YTD" ? getYTDDays() : TIMEFRAMES.find((t) => t.label === tf)!.days;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHoverIdx(null);

    fetch(`/api/history?symbol=${symbol}&days=${days}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.bars) {
          setBars(data.bars);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol, days, tf]);

  // Chart dimensions
  const W = 360;
  const H = 140;
  const PAD_X = 0;
  const PAD_Y = 8;

  const closes = bars.map((b) => b.close);
  const min = closes.length > 0 ? Math.min(...closes) : 0;
  const max = closes.length > 0 ? Math.max(...closes) : 1;
  const range = max - min || 1;

  const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
  const strokeColor = isUp ? "#10b981" : "#ef4444";
  const fillColor = isUp ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";

  const points = closes.map((v, i) => {
    const x = PAD_X + (i / Math.max(closes.length - 1, 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (v - min) / range) * (H - PAD_Y * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = linePath + ` L${points[points.length - 1]?.x ?? W},${H} L${points[0]?.x ?? 0},${H} Z`;

  // Interactive hover/touch
  const getIdxFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current || closes.length === 0) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const relX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, relX / rect.width));
    return Math.round(pct * (closes.length - 1));
  }, [closes.length]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const idx = getIdxFromEvent(e);
    if (idx !== null) setHoverIdx(idx);
  }, [getIdxFromEvent]);

  const handleLeave = useCallback(() => {
    setHoverIdx(null);
  }, []);

  const hoverBar = hoverIdx !== null && bars[hoverIdx] ? bars[hoverIdx] : null;
  const hoverPoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : null;
  const hoverPrice = hoverBar?.close ?? currentPrice;
  const hoverChange = closes.length > 0 ? ((hoverPrice - closes[0]) / closes[0]) * 100 : 0;

  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated overflow-hidden">
      {/* Price header */}
      <div className="px-4 pt-3 pb-1">
        {hoverBar ? (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 dark:text-text">{formatPrice(hoverBar.close)}</span>
            <span className={`text-xs font-semibold ${hoverChange >= 0 ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"}`}>
              {hoverChange >= 0 ? "+" : ""}{hoverChange.toFixed(2)}%
            </span>
            <span className="text-[10px] text-stone-400 dark:text-text-faint">{formatDate(hoverBar.date, tf)}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-stone-900 dark:text-text">{formatPrice(currentPrice)}</span>
            {closes.length >= 2 && (
              <span className={`text-xs font-semibold ${isUp ? "text-emerald-600 dark:text-gain" : "text-red-500 dark:text-loss"}`}>
                {isUp ? "+" : ""}{((closes[closes.length - 1] - closes[0]) / closes[0] * 100).toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="px-2">
        {loading ? (
          <div className="flex items-center justify-center h-[140px]">
            <svg className="w-5 h-5 animate-spin text-stone-300 dark:text-text-faint" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : closes.length < 2 ? (
          <div className="flex items-center justify-center h-[140px] text-xs text-stone-400 dark:text-text-faint">
            No chart data
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[140px] cursor-crosshair"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onTouchMove={handleMove}
            onTouchEnd={handleLeave}
          >
            {/* Gradient fill */}
            <path d={areaPath} fill={fillColor} />

            {/* Line */}
            <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Hover crosshair */}
            {hoverPoint && (
              <>
                <line
                  x1={hoverPoint.x} y1={PAD_Y}
                  x2={hoverPoint.x} y2={H - PAD_Y}
                  stroke="#a8a29e" strokeWidth="0.5" strokeDasharray="3,3"
                />
                <circle cx={hoverPoint.x} cy={hoverPoint.y} r="3.5" fill="white" stroke={strokeColor} strokeWidth="2" />
              </>
            )}
          </svg>
        )}
      </div>

      {/* Timeframe tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-stone-100 dark:border-border-subtle">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.label}
            onClick={() => setTf(t.label)}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              tf === t.label
                ? "bg-stone-900 dark:bg-surface-elevated text-white"
                : "text-stone-500 dark:text-text-subtle hover:bg-stone-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
