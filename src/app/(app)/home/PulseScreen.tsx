"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DataRow, MonoNumber, Sparkline, SplitBar, prefersReducedMotion } from "@/components/refresh";
import type { RowBadge } from "@/components/refresh";
import {
  easternDateLabel,
  getMarketStatus,
  marketStatusLabel,
  type MarketStatus,
} from "@/lib/market/market-status";

/* -- props -------------------------------------------------------------- */

export type PulseTile = {
  symbol: string;
  changePct: number;
  points: number[];
};

export type PulseMover = {
  symbol: string;
  price: number;
  changePct: number;
  /** Derived cause. Null when nothing was derivable — never invented. */
  badge: string | null;
  caption: string | null;
  points: number[];
  held: boolean;
  atRisk: boolean;
};

export type PulseScreenProps = {
  /** `FRI SEP 4`, computed server-side so SSR and hydration agree. */
  dateLabel: string;
  status: MarketStatus;
  hero: { name: string; level: number; changePct: number } | null;
  breadth: { advancing: number; declining: number };
  tiles: PulseTile[];
  movers: PulseMover[];
  /** Everything that cleared the mover filter, not just what is listed. */
  moverTotal: number;
};

/* -- helpers ------------------------------------------------------------ */

/** `+0.62` / `−0.62`, with a real minus sign so the columns stay even. */
function signed(n: number, places: number): string {
  const v = Number(n.toFixed(places));
  return `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(places)}`;
}

const toneOf = (changePct: number) => (changePct >= 0 ? "var(--up)" : "var(--down)");

/** How many rows are in the document before the sentinel grows the list. */
const WINDOW = 20;
const FLIP_MS = 240;

/* -- the screen --------------------------------------------------------- */

export default function PulseScreen({
  dateLabel,
  status,
  hero,
  breadth,
  tiles,
  movers,
  moverTotal,
}: PulseScreenProps) {
  const router = useRouter();

  /* Market status is a clock reading, not fetched data, so the header keeps
     itself honest on a timer instead of waiting for the next navigation. */
  const [clock, setClock] = useState({ dateLabel, status });
  useEffect(() => {
    const id = setInterval(() => {
      const next = { dateLabel: easternDateLabel(), status: getMarketStatus() };
      setClock((prev) =>
        prev.dateLabel === next.dateLabel && prev.status === next.status ? prev : next,
      );
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  /* Pull-to-refresh (the app shell's) spins the dot until new data lands.
     Busy is derived rather than stored: the state is the movers array that
     was on screen when the pull started, and a server render replaces that
     array with a new one — so "done" needs no effect to notice it. */
  const [refreshingFrom, setRefreshingFrom] = useState<readonly PulseMover[] | null>(null);
  const busy = refreshingFrom !== null && refreshingFrom === movers;

  useEffect(() => {
    const onRefresh = () => setRefreshingFrom(movers);
    window.addEventListener("pwa:refresh", onRefresh);
    return () => window.removeEventListener("pwa:refresh", onRefresh);
  }, [movers]);

  useEffect(() => {
    if (!busy) return;
    // Matches the shell's own pull-to-refresh window, so a request that
    // never resolves still lands the dot back on its resting state.
    const id = setTimeout(() => setRefreshingFrom(null), 1600);
    return () => clearTimeout(id);
  }, [busy]);

  /* The list virtualises past ~20 rows. */
  const [visible, setVisible] = useState(WINDOW);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= movers.length || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + WINDOW);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, movers.length]);

  useFlip(movers);

  const shown = movers.slice(0, visible);
  const dotTone =
    clock.status === "OPEN" ? "var(--up)" : clock.status === "CLOSED" ? "var(--text-dim)" : "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingBottom: 24 }}>
      {/* ---- header ---- */}
      <header style={{ padding: "12px var(--gutter) 0" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Pulse
        </h1>
        <div
          className="refresh-mono"
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--text-dim)",
          }}
        >
          <span>{clock.dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span
            className={`refresh-status-dot ${busy ? "refresh-status-dot-busy" : clock.status === "CLOSED" ? "" : "refresh-status-dot-live"}`}
            style={{ color: dotTone }}
            aria-hidden="true"
          />
          <span>{marketStatusLabel(clock.status)}</span>
        </div>
      </header>

      {/* ---- index hero ---- */}
      {hero ? (
        <section style={{ padding: "20px var(--gutter) 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <MonoNumber
              value={hero.changePct}
              size={60}
              weight={600}
              letterSpacing="-0.04em"
              color={toneOf(hero.changePct)}
              format={(n) => signed(n, 2)}
              suffix="%"
              suffixScale={0.533}
              style={{ lineHeight: 0.9 }}
            />
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.35,
                color: "var(--text-subtle)",
                paddingBottom: 6,
              }}
            >
              <div>{hero.name}</div>
              <MonoNumber
                value={hero.level}
                size={13}
                weight={400}
                color="var(--text-subtle)"
                decimals={2}
              />
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="refresh-mono"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-dim)",
              }}
            >
              <span>BREADTH {breadth.advancing} ADV</span>
              <span>{breadth.declining} DEC</span>
            </div>
            <SplitBar
              up={breadth.advancing}
              down={breadth.declining}
              aria-label={`${breadth.advancing} advancing, ${breadth.declining} declining`}
            />
          </div>
        </section>
      ) : null}

      {/* ---- index tiles ---- */}
      {tiles.length > 0 ? (
        <div style={{ display: "flex", gap: 10, padding: "0 var(--gutter) 20px" }}>
          {tiles.map((tile) => (
            <div
              key={tile.symbol}
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--surface-1)",
                border: "1px solid var(--hairline)",
                borderRadius: 14,
                padding: "12px 12px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <span className="refresh-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                  {tile.symbol}
                </span>
                <MonoNumber
                  value={tile.changePct}
                  size={11}
                  weight={400}
                  color={toneOf(tile.changePct)}
                  format={(n) => signed(n, 1)}
                  suffix="%"
                />
              </div>
              <Sparkline
                points={tile.points}
                width={80}
                height={22}
                strokeWidth={1.6}
                color={toneOf(tile.changePct)}
                fluid
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* A feed outage leaves nothing to show and no spinner to show it
          with — the render is complete, the data simply is not there. One
          line says so rather than an orphaned heading over empty space. */}
      {!hero && tiles.length === 0 && movers.length === 0 ? (
        <p style={{ padding: "8px var(--gutter)", fontSize: 13, color: "var(--text-secondary)" }}>
          Market data is unavailable right now.
        </p>
      ) : null}

      {/* ---- movers ---- */}
      {movers.length === 0 ? null : (
      <div
        style={{
          padding: "0 var(--gutter) 12px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 className="refresh-heading">Explosive movers</h2>
        {moverTotal > 0 ? (
          <Link
            href="/explosive"
            className="refresh-mono refresh-pressable"
            style={{
              display: "inline-block",
              fontSize: 11,
              lineHeight: "14px",
              color: "var(--accent)",
              // The label is 11px type; the hit area is 44pt regardless.
              padding: "15px 0 15px 15px",
              margin: "-15px 0",
            }}
          >
            ALL {moverTotal}
          </Link>
        ) : null}
      </div>
      )}

      <div data-flip-list style={{ padding: "0 var(--gutter)", display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((mover, i) => (
          <div key={mover.symbol} data-flip-key={mover.symbol}>
            <DataRow
              ticker={mover.symbol}
              badges={badgesFor(mover)}
              caption={mover.caption ?? undefined}
              risk={mover.atRisk}
              index={i}
              onPress={() => router.push(`/ticker/${mover.symbol}`)}
              sparkline={
                mover.points.length > 1 ? (
                  <Sparkline points={mover.points} color={toneOf(mover.changePct)} />
                ) : undefined
              }
              value={
                <MonoNumber
                  value={mover.changePct}
                  size={18}
                  weight={600}
                  color={toneOf(mover.changePct)}
                  format={(n) => signed(n, 1)}
                  suffix="%"
                />
              }
              subValue={
                <MonoNumber
                  value={mover.price}
                  size={11}
                  weight={400}
                  color="var(--text-dim)"
                  decimals={2}
                />
              }
            />
          </div>
        ))}
        {visible < movers.length ? <div ref={sentinel} style={{ height: 1 }} /> : null}
      </div>
    </div>
  );
}

/**
 * At most one tag per row, risk first — a row that is both held and
 * threatened is telling you about the threat, and two badges would push the
 * ticker out of the head.
 */
function badgesFor(mover: PulseMover): RowBadge[] {
  if (mover.atRisk) return [{ label: "POSITION AT RISK", tone: "risk" }];
  if (mover.held) return [{ label: "HELD", tone: "info" }];
  if (mover.badge) return [{ label: mover.badge, tone: "info" }];
  return [];
}

/**
 * FLIP on the movers list: measure where every row was, let React reorder
 * them, then invert each row to its old position and play it home over
 * 240ms. Transform only, and skipped entirely under reduced motion — there
 * the rows simply appear in their new order.
 */
function useFlip(movers: readonly PulseMover[]) {
  const previous = useRef(new Map<string, number>());

  const measure = useCallback(() => {
    const rows = document.querySelectorAll<HTMLElement>("[data-flip-list] [data-flip-key]");
    const next = new Map<string, number>();
    const reduced = prefersReducedMotion();

    for (const row of rows) {
      const key = row.dataset.flipKey;
      if (!key) continue;
      const top = row.getBoundingClientRect().top;
      next.set(key, top);

      const was = previous.current.get(key);
      if (reduced || was === undefined) continue;
      const delta = was - top;
      if (Math.abs(delta) < 1) continue;
      row.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
        { duration: FLIP_MS, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
      );
    }
    previous.current = next;
  }, []);

  useLayoutEffect(measure, [movers, measure]);
}
