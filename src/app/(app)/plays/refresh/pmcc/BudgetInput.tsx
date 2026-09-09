"use client";

/**
 * The capital budget: a mono `$` field. Digits only; formats with
 * thousands separators as you type, and reports the number.
 */

interface BudgetInputProps {
  value: number;
  onChange: (budget: number) => void;
}

export default function BudgetInput({ value, onChange }: BudgetInputProps) {
  const display = value > 0 ? value.toLocaleString("en-US") : "";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <span className="refresh-eyebrow">Capital budget</span>
      <span
        className="refresh-mono"
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          width: 150,
          padding: "0 12px",
          borderRadius: 12,
          border: "1px solid var(--accent-border-soft)",
          background: "var(--surface-1)",
          color: "var(--accent)",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        <span style={{ color: "var(--text-dim)", marginRight: 4 }}>$</span>
        <input
          className="refresh-mono"
          inputMode="numeric"
          pattern="[0-9,]*"
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
            onChange(digits ? Number(digits) : 0);
          }}
          placeholder="20,000"
          aria-label="Capital budget in dollars"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            background: "none",
            color: "inherit",
            font: "inherit",
            outline: "none",
            textAlign: "right",
          }}
        />
      </span>
    </label>
  );
}
