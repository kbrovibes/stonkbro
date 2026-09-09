"use client";

/**
 * The selected ticker: head, why, factor bars, strike scenarios, the priced
 * tiles, and the comparison grids. Keyed by symbol in the parent, so all
 * local state (primary strike, unpinned compare, notes draft) resets when
 * the ticker changes.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetricBar, StatTile } from "@/components/refresh";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";
import ScenarioGrid from "./ScenarioGrid";
import ScoreCircle from "./ScoreCircle";
import StrikeScenarios from "./StrikeScenarios";
import {
  fmtIv,
  fmtStrike,
  hasRecommendation,
  strikeChips,
  type GridResponse,
  type LeapsPick,
  type LeapsPin,
  type PricedStrike,
} from "./lab-data";

export interface PinPatchBody {
  addStrike?: number;
  removeStrike?: number;
  compareStrike?: number | null;
  notes?: string | null;
}

interface TickerPanelProps {
  symbol: string;
  pick: LeapsPick | null;
  pin: LeapsPin | null;
  onPin: (symbol: string, expiry?: string) => Promise<boolean>;
  onUnpin: (symbol: string) => Promise<void>;
  onPatch: (symbol: string, body: PinPatchBody) => Promise<LeapsPin | null>;
}

const ACTION: React.CSSProperties = {
  textAlign: "center",
  padding: "12px 0",
  lineHeight: "20px",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  border: "none",
};

function Factors({ pick }: { pick: LeapsPick }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {pick.factors.map((f) => (
        <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{f.label}</span>
            <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {f.score} · {f.weight}%
            </span>
          </div>
          <MetricBar value={f.score / 100} variant="roc" fill="accent" aria-label={`${f.label} ${f.score} of 100`} />
        </div>
      ))}
    </div>
  );
}

function tileValue(text: string, color?: string) {
  return (
    <span className="refresh-mono" style={{ fontSize: 14, fontWeight: 600, color: color ?? "var(--text-primary)" }}>
      {text}
    </span>
  );
}

function asOfLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function TickerPanel({ symbol, pick, pin, onPin, onUnpin, onPatch }: TickerPanelProps) {
  const pinRec = pin && hasRecommendation(pin.recommended) ? pin.recommended : null;
  const expiry = pin?.expiry?.slice(0, 10) ?? pick?.expiry ?? null;
  const score = pinRec?.score ?? pick?.score ?? null;
  const why = pinRec?.why ?? pick?.why ?? null;

  const chips = useMemo(() => strikeChips(pick, pin), [pick, pin]);
  const [primaryChoice, setPrimaryChoice] = useState<number | null>(null);
  const primary = chips.some((c) => c.strike === primaryChoice) ? primaryChoice : chips[0]?.strike ?? null;

  const [localCompare, setLocalCompare] = useState<number | null>(null);
  const compare = pin ? (pin.compare_strike == null ? null : Number(pin.compare_strike)) : localCompare;
  const compareValid = compare != null && compare !== primary && chips.some((c) => c.strike === compare);

  const [notes, setNotes] = useState(pin?.notes ?? "");
  const [busy, setBusy] = useState(false);

  /* ---- grid ---------------------------------------------------------- */

  const gridUrl =
    expiry && chips.length > 0
      ? `/api/leaps/grid?symbol=${encodeURIComponent(symbol)}&expiry=${expiry}&strikes=${chips.map((c) => c.strike).join(",")}`
      : null;
  const [grid, setGrid] = useState<GridResponse | null>(null);
  const [gridError, setGridError] = useState(false);
  const gridLoading = !!gridUrl && !grid && !gridError;

  const fetchGrid = useCallback(
    (fresh = false): Promise<void> => {
      if (!gridUrl) return Promise.resolve();
      if (fresh) invalidateCache(gridUrl);
      return cachedFetchJson<GridResponse>(gridUrl, { ttlMs: 5 * 60_000 })
        .then((data) => {
          setGrid(data);
          setGridError(false);
        })
        .catch(() => setGridError(true));
    },
    [gridUrl]
  );

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  const priced = useMemo(() => {
    const map = new Map<number, PricedStrike>();
    for (const s of grid?.strikes ?? []) map.set(s.strike, s);
    return map;
  }, [grid]);

  const primaryPriced = primary != null ? priced.get(primary) ?? null : null;
  const comparePriced = compareValid ? priced.get(compare) ?? null : null;
  const primaryOk = primaryPriced && !primaryPriced.unavailable ? primaryPriced : null;
  const compareOk = comparePriced && !comparePriced.unavailable ? comparePriced : null;

  const spot = pick?.spot ?? grid?.spot ?? null;

  /* ---- actions ------------------------------------------------------- */

  const withBusy = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const ensurePinned = async (): Promise<boolean> => (pin ? true : onPin(symbol, expiry ?? undefined));

  const setCompare = (strike: number | null) => {
    if (!pin) {
      setLocalCompare(strike);
      return;
    }
    withBusy(() => onPatch(symbol, { compareStrike: strike }));
  };

  const addStrike = async (strike: number) => {
    await withBusy(async () => {
      if (await ensurePinned()) await onPatch(symbol, { addStrike: strike });
    });
  };

  const removeStrike = async (strike: number) => {
    await withBusy(() => onPatch(symbol, { removeStrike: strike }));
  };

  const saveNotes = () => {
    if (!pin || (pin.notes ?? "") === notes) return;
    withBusy(() => onPatch(symbol, { notes }));
  };

  /* ---- render -------------------------------------------------------- */

  return (
    <div
      className="refresh-enter"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: 16,
        borderRadius: "var(--radius-card)",
        background: pin ? "var(--gradient-emphasis)" : "var(--surface-1)",
        border: `1px solid ${pin ? "var(--accent-border)" : "var(--hairline)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="refresh-eyebrow">{pin ? "Pinned ticker" : "Scan pick"}</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="refresh-mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {symbol}
            </span>
            {spot != null && (
              <span className="refresh-mono" style={{ fontSize: 15, color: "var(--text-secondary)" }}>
                ${spot.toFixed(2)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>
            {pick?.name && pick.name !== symbol ? `${pick.name} · ` : ""}
            {expiry ? `LEAPS expiry ${expiry}` : "No LEAPS expiry priced"}
          </span>
        </div>
        {score != null && <ScoreCircle score={score} label="Composite score" />}
      </div>

      {why && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-body)" }}>
          <span style={{ color: "var(--text-dim)" }}>Why it ranks: </span>
          {why}
        </p>
      )}

      {pick ? (
        <Factors pick={pick} />
      ) : pinRec ? (
        <p style={{ margin: 0, fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>
          Not in today&apos;s ranked list. Recommendation captured {pinRec.capturedAt.slice(0, 10)} at $
          {pinRec.mid.toFixed(2)} mid, IV {fmtIv(pinRec.iv)}.
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="refresh-pressable"
          disabled={busy}
          onClick={() => withBusy(() => (pin ? onUnpin(symbol) : onPin(symbol, expiry ?? undefined)))}
          style={{
            ...ACTION,
            flex: 1,
            background: pin ? "var(--control)" : "var(--accent)",
            color: pin ? "var(--text-primary)" : "var(--surface-0)",
            fontWeight: pin ? 500 : 600,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {pin ? "Unpin" : "Pin"}
        </button>
        <Link
          href={`/ticker/${symbol}`}
          style={{ ...ACTION, flex: "none", width: 110, background: "var(--control)", color: "var(--text-primary)", fontWeight: 500 }}
        >
          Research
        </Link>
      </div>

      {chips.length > 0 && (
        <StrikeScenarios
          chips={chips}
          primary={primary}
          compare={compareValid ? compare : null}
          priced={priced}
          listedStrikes={grid?.listedStrikes ?? []}
          busy={busy}
          onPrimary={setPrimaryChoice}
          onCompare={setCompare}
          onAddStrike={addStrike}
          onRemoveStrike={removeStrike}
          onRetry={() => fetchGrid(true)}
        />
      )}

      {gridError && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--down)" }}>Could not price the chain. Retry above.</p>
      )}

      {grid && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <StatTile label="Primary bid / ask" value={tileValue(primaryOk ? `${primaryOk.bid.toFixed(2)} / ${primaryOk.ask.toFixed(2)}` : "unavailable")} />
            <StatTile label="Primary mid" value={tileValue(primaryOk ? `$${primaryOk.mid.toFixed(2)}` : "—")} accent={!!primaryOk} />
            <StatTile label="Primary IV" value={tileValue(primaryOk ? fmtIv(primaryOk.iv) : "—")} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <StatTile label="Compare strike" value={tileValue(compareValid ? fmtStrike(compare) : "none")} />
            <StatTile label="Compare mid" value={tileValue(compareOk ? `$${compareOk.mid.toFixed(2)}` : compareValid ? "unavailable" : "—")} />
            <StatTile label="Chain as-of" value={tileValue(asOfLabel(grid.chainAsOf), "var(--text-secondary)")} />
          </div>
        </div>
      )}

      {gridLoading && (
        <p className="refresh-mono" style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", color: "var(--text-dim)" }}>
          PRICING CHAIN…
        </p>
      )}

      <ScenarioGrid primary={primaryOk} compare={compareOk} />

      {pin && (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="refresh-eyebrow">Notes</span>
          <textarea
            rows={1}
            value={notes}
            onChange={(e) => setNotes(e.target.value.replace(/\n/g, " "))}
            onBlur={saveNotes}
            placeholder="One line — why this strike, what would change your mind."
            maxLength={500}
            style={{
              minHeight: 44,
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid var(--hairline-strong)",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              fontSize: 13,
              lineHeight: "20px",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </label>
      )}
    </div>
  );
}
