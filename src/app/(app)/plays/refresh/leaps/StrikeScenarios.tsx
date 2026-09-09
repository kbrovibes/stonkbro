"use client";

/**
 * Strike scenarios: the chips (first = primary), the compare select, and
 * the add-strike form. Chips and their × are sibling buttons — a remove
 * control nested inside a chip button would be invalid markup.
 */

import { useState } from "react";
import { fmtStrike, type PricedStrike, type StrikeChip } from "./lab-data";

interface StrikeScenariosProps {
  chips: StrikeChip[];
  primary: number | null;
  compare: number | null;
  priced: Map<number, PricedStrike>;
  listedStrikes: number[];
  busy: boolean;
  onPrimary: (strike: number) => void;
  onCompare: (strike: number | null) => void;
  onAddStrike: (strike: number) => Promise<void>;
  onRemoveStrike: (strike: number) => Promise<void>;
  onRetry: () => void;
}

const FIELD: React.CSSProperties = {
  height: 44,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid var(--hairline-strong)",
  background: "var(--surface-1)",
  color: "var(--text-primary)",
  fontSize: 14,
  fontWeight: 600,
  outline: "none",
};

const REMOVE: React.CSSProperties = {
  width: 44,
  height: 44,
  marginLeft: -10,
  border: "none",
  background: "none",
  color: "var(--text-dim)",
  fontSize: 16,
  flex: "none",
};

export default function StrikeScenarios({
  chips,
  primary,
  compare,
  priced,
  listedStrikes,
  busy,
  onPrimary,
  onCompare,
  onAddStrike,
  onRemoveStrike,
  onRetry,
}: StrikeScenariosProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const draftValue = Number(draft);
  const draftValid = Number.isFinite(draftValue) && draftValue > 0;
  const draftListed = listedStrikes.length === 0 || listedStrikes.includes(draftValue);
  const draftDuplicate = chips.some((c) => c.strike === draftValue);

  const unavailable = chips
    .filter((c) => c.strike === primary || c.strike === compare)
    .map((c) => priced.get(c.strike))
    .filter((p): p is Extract<PricedStrike, { unavailable: true }> => !!p && p.unavailable);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftValid || draftDuplicate || saving) return;
    setSaving(true);
    await onAddStrike(draftValue);
    setSaving(false);
    setDraft("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="refresh-eyebrow">Strike scenarios</span>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 8px", margin: "-6px 0" }}>
        {chips.map((chip) => {
          const on = chip.strike === primary;
          return (
            <span key={chip.strike} style={{ display: "inline-flex", alignItems: "center" }}>
              <button
                type="button"
                className="refresh-chip-hit"
                aria-pressed={on}
                onClick={() => onPrimary(chip.strike)}
                style={{ minWidth: 0 }}
              >
                <span
                  className={`refresh-chip refresh-chip-outlined ${on ? "refresh-chip-on" : "refresh-chip-off"}`}
                >
                  {chip.label}{" "}
                  <span className="refresh-mono" style={{ fontWeight: 600 }}>
                    {fmtStrike(chip.strike)}
                  </span>
                </span>
              </button>
              {chip.kind === "user" && (
                <button
                  type="button"
                  style={REMOVE}
                  aria-label={`Remove ${fmtStrike(chip.strike)}`}
                  onClick={() => onRemoveStrike(chip.strike)}
                  disabled={busy}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>

      {unavailable.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--hairline-strong)",
          }}
        >
          <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--text-secondary)" }}>
            {unavailable.map((u) => `${fmtStrike(u.strike)} unavailable — ${u.reason.toLowerCase()}`).join(". ")}
          </span>
          <button
            type="button"
            className="refresh-mono refresh-pressable"
            onClick={onRetry}
            style={{
              flex: "none",
              minHeight: 44,
              padding: "0 10px",
              border: "none",
              background: "none",
              color: "var(--accent)",
              fontSize: 11,
              letterSpacing: "0.08em",
            }}
          >
            RETRY
          </button>
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: "none" }}>Compare with</span>
        <select
          className="refresh-mono"
          value={compare ?? ""}
          onChange={(e) => onCompare(e.target.value === "" ? null : Number(e.target.value))}
          disabled={busy}
          style={{ ...FIELD, flex: 1, minWidth: 0, appearance: "auto" }}
          aria-label="Compare strike"
        >
          <option value="">None</option>
          {chips
            .filter((c) => c.strike !== primary)
            .map((c) => (
              <option key={c.strike} value={c.strike}>
                {c.label} {fmtStrike(c.strike)}
              </option>
            ))}
        </select>
      </label>

      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="refresh-mono"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add another listed strike"
            aria-label="Add a strike"
            disabled={saving || busy}
            style={{ ...FIELD, flex: 1, minWidth: 0 }}
          />
          <button
            type="submit"
            className="refresh-pressable"
            disabled={!draftValid || draftDuplicate || saving || busy}
            style={{
              ...FIELD,
              flex: "none",
              padding: "0 16px",
              border: "none",
              background: "var(--accent)",
              color: "var(--surface-0)",
              opacity: !draftValid || draftDuplicate || saving ? 0.5 : 1,
            }}
          >
            {saving ? "Saving…" : "Save strike"}
          </button>
        </div>
        {draftValid && draftDuplicate && (
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{fmtStrike(draftValue)} is already a scenario.</span>
        )}
        {draftValid && !draftDuplicate && !draftListed && (
          <span style={{ fontSize: 11, color: "var(--warn-orange)" }}>
            {fmtStrike(draftValue)} is not listed for this expiry — it will save as unavailable.
          </span>
        )}
      </form>
    </div>
  );
}
