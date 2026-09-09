"use client";

/**
 * The pinned-ticker row: amber outlined chips, then `+ Pin`, which opens a
 * mono symbol input in place. A pinned chip is selected when its ticker is
 * the one open in the panel below.
 */

import { useState } from "react";
import { ChipRow } from "@/components/refresh";
import type { LeapsPin } from "./lab-data";

const ADD_KEY = "__add";

interface PinChipsProps {
  pins: LeapsPin[];
  selected: string | null;
  onSelect: (symbol: string) => void;
  onPin: (symbol: string) => Promise<boolean>;
  gutter: number;
}

const INPUT: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 44,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid var(--hairline-strong)",
  background: "var(--surface-1)",
  color: "var(--text-primary)",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  outline: "none",
};

const BUTTON: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  flex: "none",
};

export default function PinChips({ pins, selected, onSelect, onPin, gutter }: PinChipsProps) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const chips = [
    ...pins.map((p) => ({ key: p.symbol, label: p.symbol })),
    { key: ADD_KEY, label: "+ Pin" },
  ];
  const active = pins.some((p) => p.symbol === selected) ? selected : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!/^[A-Z][A-Z.\-]{0,6}$/.test(symbol) || busy) return;
    setBusy(true);
    const ok = await onPin(symbol);
    setBusy(false);
    if (ok) {
      setValue("");
      setAdding(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <ChipRow
        chips={chips}
        active={active}
        variant="outlined"
        gutter={gutter}
        aria-label="Pinned tickers"
        onChange={(key) => (key === ADD_KEY ? setAdding(true) : onSelect(key))}
      />
      {adding && (
        <form onSubmit={submit} style={{ display: "flex", gap: 8, padding: `0 ${gutter}px` }}>
          <input
            className="refresh-mono"
            style={INPUT}
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="TICKER"
            maxLength={7}
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Ticker to pin"
            disabled={busy}
          />
          <button
            type="submit"
            className="refresh-pressable"
            style={{ ...BUTTON, background: "var(--accent)", color: "var(--surface-0)", opacity: busy ? 0.6 : 1 }}
            disabled={busy || !value.trim()}
          >
            {busy ? "Pricing…" : "Pin"}
          </button>
          <button
            type="button"
            className="refresh-pressable"
            style={{ ...BUTTON, background: "var(--control)", color: "var(--text-primary)", fontWeight: 500 }}
            onClick={() => {
              setAdding(false);
              setValue("");
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
