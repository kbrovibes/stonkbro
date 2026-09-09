"use client";

import { useEffect, useState } from "react";
import { MonoNumber, Sparkline, SplitBar } from "@/components/refresh";
import {
  easternDateLabel,
  getMarketStatus,
  marketStatusLabel,
} from "@/lib/market/market-status";
import PulseBriefingCard from "./PulseBriefingCard";
import PulseFeatureRow from "./PulseFeatureRow";
import TickerCardGrid from "./TickerCardGrid";
import type { PulseMover, PulseScreenProps, PulseTicker } from "./pulse-types";

export type {
  PulseBriefing,
  PulseFeature,
  PulseMover,
  PulseScreenProps,
  PulseTicker,
  PulseTile,
  PulseWatchlist,
} from "./pulse-types";

/* -- helpers ------------------------------------------------------------ */

/** `+0.62` / `−0.62`, with a real minus sign so the columns stay even. */
function signed(n: number, places: number): string {
  const v = Number(n.toFixed(places));
  return `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(places)}`;
}

const toneOf = (changePct: number) => (changePct >= 0 ? "var(--up)" : "var(--down)");

function avgReturn(tickers: readonly PulseTicker[]): number | undefined {
  if (tickers.length === 0) return undefined;
  return tickers.reduce((sum, t) => sum + t.changePct, 0) / tickers.length;
}

/* -- the screen --------------------------------------------------------- */

export default function PulseScreen({
  dateLabel,
  status,
  hero,
  breadth,
  tiles,
  movers,
  moverTotal,
  briefing,
  features,
  watchlists,
  winners,
  losers,
}: PulseScreenProps) {
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

  const dotTone =
    clock.status === "OPEN" ? "var(--up)" : clock.status === "CLOSED" ? "var(--text-dim)" : "var(--accent)";
  const marketDown = !hero && tiles.length === 0 && movers.length === 0;

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

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {briefing ? <PulseBriefingCard briefing={briefing} /> : null}

        <PulseFeatureRow features={features} />

        {/* A feed outage leaves nothing to show and no spinner to show it
            with — the render is complete, the data simply is not there. One
            line says so rather than an orphaned heading over empty space. */}
        {marketDown ? (
          <p style={{ padding: "0 var(--gutter)", fontSize: 13, color: "var(--text-secondary)" }}>
            Market data is unavailable right now.
          </p>
        ) : null}

        <TickerCardGrid
          title="Explosive movers"
          tickers={movers}
          action={moverTotal > 0 ? { label: `All ${moverTotal}`, href: "/explosive" } : undefined}
        />

        {watchlists.map((wl) => (
          <TickerCardGrid
            key={wl.id}
            title={wl.name}
            tickers={wl.tickers}
            avgReturn={avgReturn(wl.tickers)}
            action={{ label: "Manage", href: "/watchlists" }}
          />
        ))}

        {watchlists.length === 0 ? (
          <>
            <TickerCardGrid
              title="Today's winners"
              tickers={winners}
              avgReturn={avgReturn(winners)}
              action={{ label: "Watchlists", href: "/watchlists" }}
            />
            <TickerCardGrid title="Today's losers" tickers={losers} avgReturn={avgReturn(losers)} />
          </>
        ) : null}
      </div>
    </div>
  );
}
