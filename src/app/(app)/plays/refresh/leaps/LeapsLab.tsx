"use client";

/**
 * LEAPS Lab — the LEAPS segment of the scanner.
 *
 * Order on the screen: the scan's age and the rescan control, the pinned
 * tickers, the selected ticker's panel, then the ranked list. The panel sits
 * above the list on purpose — tapping a row changes the answer, and the
 * answer should be where your thumb already is, not 25 rows further down.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";
import PinChips from "./PinChips";
import RankedList from "./RankedList";
import TickerPanel, { type PinPatchBody } from "./TickerPanel";
import { ago, LEAPS_TTL_MS, LEAPS_URL, type LeapsPayload, type LeapsPin, type LeapsScanRow } from "./lab-data";

const GUTTER = 22;

const CONTROL: React.CSSProperties = {
  minHeight: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid var(--hairline)",
  background: "var(--surface-1)",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
};

export default function LeapsLab() {
  const [scan, setScan] = useState<LeapsScanRow | null>(null);
  const [pins, setPins] = useState<LeapsPin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback((fresh = false): Promise<void> => {
    if (fresh) invalidateCache(LEAPS_URL);
    return cachedFetchJson<LeapsPayload>(LEAPS_URL, { ttlMs: LEAPS_TTL_MS })
      .then((data) => {
        setScan(data.scan);
        setPins(data.pins);
        setSelected((prev) => prev ?? data.pins[0]?.symbol ?? data.scan?.leaps[0]?.symbol ?? null);
        setError(null);
      })
      .catch(() => setError("Could not load the LEAPS scan."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rescan = useCallback(async () => {
    if (rescanning) return;
    setRescanning(true);
    setError(null);
    try {
      const res = await fetch(LEAPS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      invalidateCache("/api/pmcc-income");
      await load(true);
    } catch {
      setError("Scan failed. Try again in a minute.");
    } finally {
      setRescanning(false);
    }
  }, [rescanning, load]);

  const replacePin = useCallback((pin: LeapsPin) => {
    setPins((prev) => {
      const rest = prev.filter((p) => p.symbol !== pin.symbol);
      const idx = prev.findIndex((p) => p.symbol === pin.symbol);
      if (idx === -1) return [...rest, pin];
      rest.splice(idx, 0, pin);
      return rest;
    });
    invalidateCache(LEAPS_URL);
  }, []);

  const pin = useCallback(
    async (symbol: string, expiry?: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/leaps/pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, expiry }),
        });
        const data = (await res.json()) as { pin?: LeapsPin; error?: string };
        if (!res.ok || !data.pin) {
          setError(data.error ?? "Could not pin that ticker.");
          return false;
        }
        replacePin(data.pin);
        setSelected(symbol);
        setError(null);
        return true;
      } catch {
        setError("Could not pin that ticker.");
        return false;
      }
    },
    [replacePin]
  );

  const unpin = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/leaps/pins?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setPins((prev) => prev.filter((p) => p.symbol !== symbol));
      invalidateCache(LEAPS_URL);
    } catch {
      setError("Could not unpin.");
    }
  }, []);

  const patchPin = useCallback(
    async (symbol: string, body: PinPatchBody): Promise<LeapsPin | null> => {
      try {
        const res = await fetch("/api/leaps/pins", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, ...body }),
        });
        const data = (await res.json()) as { pin?: LeapsPin; error?: string };
        if (!res.ok || !data.pin) {
          setError(data.error ?? "Could not save.");
          return null;
        }
        replacePin(data.pin);
        return data.pin;
      } catch {
        setError("Could not save.");
        return null;
      }
    },
    [replacePin]
  );

  const select = useCallback((symbol: string) => {
    setSelected(symbol);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const picks = scan?.leaps ?? [];
  const currentPick = picks.find((p) => p.symbol === selected) ?? null;
  const currentPin = pins.find((p) => p.symbol === selected) ?? null;
  const pinnedSymbols = new Set(pins.map((p) => p.symbol));
  const age = ago(scan?.created_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: `0 ${GUTTER}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span className="refresh-eyebrow" style={{ fontSize: 10 }}>
          {rescanning
            ? `SCANNING · ${scan?.universe_size ?? "~110"} CHAINS · EST 3 MIN`
            : scan
              ? `DAILY SCAN · ${age} · ${picks.length} PICKS`
              : loaded
                ? "DAILY SCAN · NOT YET RUN"
                : "DAILY SCAN · LOADING"}
        </span>
        <button
          type="button"
          className="refresh-mono refresh-pressable"
          style={{ ...CONTROL, opacity: rescanning ? 0.5 : 1 }}
          onClick={rescan}
          disabled={rescanning}
          aria-busy={rescanning}
        >
          {rescanning ? "SCANNING…" : "RESCAN"}
        </button>
      </div>

      <PinChips pins={pins} selected={selected} onSelect={select} onPin={pin} gutter={GUTTER} />

      {error && (
        <p style={{ margin: `0 ${GUTTER}px`, fontSize: 13, lineHeight: 1.5, color: "var(--down)" }}>{error}</p>
      )}

      <div ref={panelRef} style={{ padding: `0 ${GUTTER}px`, scrollMarginTop: 12 }}>
        {selected ? (
          <TickerPanel
            key={selected}
            symbol={selected}
            pick={currentPick}
            pin={currentPin}
            onPin={pin}
            onUnpin={unpin}
            onPatch={patchPin}
          />
        ) : loaded ? (
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {scan ? "Tap a pick below, or pin a ticker." : "No scan yet. Run one to rank the universe."}
          </p>
        ) : null}
      </div>

      <div style={{ padding: `4px ${GUTTER}px 0` }}>
        <h2 className="refresh-heading">Ranked by composite score</h2>
        <p style={{ marginTop: 4, fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>
          Liquidity 40 · Moderate IV 25 · Momentum 25 · 52-week 10. Tap a row to open it above.
        </p>
      </div>

      <div style={{ padding: `0 ${GUTTER}px` }}>
        <RankedList picks={picks} pinned={pinnedSymbols} selected={selected} onSelect={select} />
        {loaded && picks.length === 0 && !rescanning && (
          <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", padding: "6px 2px" }}>
            No LEAPS ranked yet. Rescan from the control above.
          </p>
        )}
      </div>
    </div>
  );
}
