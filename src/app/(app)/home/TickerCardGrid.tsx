"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, MonoNumber, Sparkline } from "@/components/refresh";
import { cachedFetchJson } from "@/lib/client-cache";
import type { PulseTicker } from "./pulse-types";

const COLLAPSE_LIMIT = 8;
const FETCH_BATCH = 50;

/** `+0.6` / `−0.6`, with a real minus sign so the columns stay even. */
function signed(n: number, places: number): string {
  const v = Number(n.toFixed(places));
  return `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(places)}`;
}

const toneOf = (changePct: number) => (changePct >= 0 ? "var(--up)" : "var(--down)");

/**
 * Sparklines for the symbols the server did not supply, from the same cached
 * endpoint the classic widget uses. Batches of fifty, the route's cap.
 */
function useSparklines(symbols: readonly string[]): Record<string, number[]> {
  const [series, setSeries] = useState<Record<string, number[]>>({});
  const key = symbols.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const list = key.split(",");
    const batches: string[][] = [];
    for (let i = 0; i < list.length; i += FETCH_BATCH) batches.push(list.slice(i, i + FETCH_BATCH));

    Promise.allSettled(
      batches.map((batch) =>
        cachedFetchJson<{ sparklines?: Record<string, number[]> }>(
          `/api/sparklines?symbols=${batch.join(",")}`,
          { ttlMs: 5 * 60_000 },
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      const merged: Record<string, number[]> = {};
      for (const r of results) {
        if (r.status === "fulfilled") Object.assign(merged, r.value.sparklines ?? {});
      }
      setSeries(merged);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return series;
}

export interface TickerCardGridProps {
  title: string;
  tickers: PulseTicker[];
  /** Right-hand link in the heading row, e.g. `ALL 23` → `/explosive`. */
  action?: { label: string; href: string };
  /** Shown beside the title as a signed percentage. */
  avgReturn?: number;
}

/**
 * The dense card grid: four across, three on narrow phones, each card a
 * symbol, price, day change and a sparkline. Sections collapse after eight
 * cards behind a `+N more` toggle.
 */
export default function TickerCardGrid({ title, tickers, action, avgReturn }: TickerCardGridProps) {
  const [expanded, setExpanded] = useState(false);

  const missing = useMemo(
    () => [...new Set(tickers.filter((t) => !t.points || t.points.length < 2).map((t) => t.symbol))],
    [tickers],
  );
  const fetched = useSparklines(missing);

  if (tickers.length === 0) return null;

  const needsCollapse = tickers.length > COLLAPSE_LIMIT;
  const shown = needsCollapse && !expanded ? tickers.slice(0, COLLAPSE_LIMIT) : tickers;
  const hidden = tickers.length - COLLAPSE_LIMIT;

  return (
    <section style={{ padding: "0 var(--gutter)", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          paddingBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <h2
            className="refresh-heading"
            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {title}
          </h2>
          {avgReturn !== undefined && Number.isFinite(avgReturn) ? (
            <MonoNumber
              value={avgReturn}
              size={12}
              weight={600}
              color={toneOf(avgReturn)}
              format={(n) => signed(n, 1)}
              suffix="%"
              countUp={false}
            />
          ) : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="refresh-mono refresh-pressable"
            style={{
              flex: "none",
              display: "inline-block",
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent)",
              padding: "15px 0 15px 15px",
              margin: "-15px 0",
            }}
          >
            {action.label}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-2 grid-cols-3 min-[380px]:grid-cols-4">
        {shown.map((t, i) => (
          <TickerCard key={t.symbol} ticker={t} points={t.points ?? fetched[t.symbol]} index={i} />
        ))}
      </div>

      {needsCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="refresh-mono refresh-pressable"
          style={{
            alignSelf: "flex-start",
            fontSize: 11,
            lineHeight: "20px",
            letterSpacing: "0.08em",
            color: "var(--accent)",
            padding: "12px 12px 12px 0",
            background: "none",
            border: 0,
          }}
        >
          {expanded ? "SHOW LESS" : `+${hidden} MORE`}
        </button>
      ) : null}
    </section>
  );
}

function TickerCard({
  ticker,
  points,
  index,
}: {
  ticker: PulseTicker;
  points: number[] | undefined;
  index: number;
}) {
  const tone = toneOf(ticker.changePct);
  const border = ticker.atRisk
    ? "var(--loss-border)"
    : ticker.changePct >= 0
      ? "var(--gain-border)"
      : "var(--loss-border)";

  return (
    <Link
      href={`/ticker/${ticker.symbol}`}
      className="refresh-pressable refresh-enter"
      style={{
        ["--refresh-i" as string]: index,
        display: "flex",
        flexDirection: "column",
        gap: 5,
        minWidth: 0,
        minHeight: 44,
        padding: "9px 9px 8px",
        background: "var(--surface-1)",
        border: `1px solid ${border}`,
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            className="refresh-mono"
            style={{
              fontSize: 12,
              fontWeight: 600,
              lineHeight: "14px",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ticker.symbol}
          </span>
          <MonoNumber
            value={ticker.price}
            size={11}
            weight={400}
            color="var(--text-dim)"
            prefix="$"
            decimals={ticker.price < 1000 ? 2 : 0}
            countUp={false}
            style={{ lineHeight: "14px" }}
          />
        </div>
        {points && points.length > 1 ? (
          <div style={{ flex: "1 1 36px", minWidth: 28, maxWidth: 44, paddingTop: 1 }}>
            <Sparkline points={points} width={44} height={18} strokeWidth={1.5} color={tone} fluid />
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <MonoNumber
          value={ticker.changePct}
          size={12}
          weight={600}
          color={tone}
          format={(n) => signed(n, 1)}
          suffix="%"
          countUp={false}
        />
        {ticker.atRisk ? (
          <Badge label="RISK" tone="risk" />
        ) : ticker.held ? (
          <Badge label="HELD" tone="info" />
        ) : null}
      </div>
    </Link>
  );
}
