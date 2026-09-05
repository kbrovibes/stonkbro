"use client";

/**
 * The scan status block — determinate, always.
 *
 * A spinner tells you nothing on a scan that legitimately takes half a
 * minute. This block always shows a bar with a position and a clock that is
 * really running. What it will not do is print a chain count it does not
 * have: where the underlying job reports only a phase, the label drops the
 * `n /` and says `EST`, and the bar is honestly an estimate against how long
 * past runs of the same scan took.
 *
 * It is also the control. Tapping it starts a scan, or re-runs the last one.
 */

import { MetricBar } from "@/components/refresh";
import { fmtElapsed, type ScanTelemetry } from "./useScanTelemetry";

export type ScanState = "idle" | "scanning" | "done" | "error";

interface ScanStatusBlockProps {
  state: ScanState;
  telemetry: ScanTelemetry;
  /** Results currently on screen. */
  setupCount: number;
  /** What those results are called — `SETUPS`, or `PICKS` for the recap. */
  noun?: string;
  /** How long the last completed scan took, in ms. */
  lastDurationMs: number | null;
  /** Age of the data on screen, already worded ("14m ago"). */
  dataAge: string | null;
  /** Null while a scan cannot be started (nothing to run for this strategy). */
  onScan: (() => void) | null;
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.1em",
  lineHeight: "16px",
};

function scanningLabel(t: ScanTelemetry): string {
  if (t.scanned != null && t.total != null) return `SCANNING · ${t.scanned} / ${t.total} CHAINS`;
  if (t.total != null) return `SCANNING · ${t.total} CHAINS · EST`;
  return "SCANNING · EST";
}

export default function ScanStatusBlock({
  state,
  telemetry,
  setupCount,
  noun = "SETUPS",
  lastDurationMs,
  dataAge,
  onScan,
}: ScanStatusBlockProps) {
  const scanning = state === "scanning";

  let left: string;
  let leftColor = "var(--text-dim)";
  let right: string;

  if (scanning) {
    left = scanningLabel(telemetry);
    leftColor = "var(--accent)";
    right = fmtElapsed(telemetry.elapsedMs);
  } else if (state === "error") {
    left = "SCAN FAILED";
    leftColor = "var(--down)";
    right = "TAP TO RETRY";
  } else if (state === "done") {
    const chains = telemetry.total != null ? ` · ${telemetry.total} CHAINS` : "";
    const secs = lastDurationMs != null ? ` · ${Math.max(1, Math.round(lastDurationMs / 1000))}S` : "";
    left = `${setupCount} ${noun}${chains}${secs}`;
    right = "TAP TO RESCAN";
  } else {
    left = setupCount > 0 ? `${setupCount} ${noun}${dataAge ? ` · ${dataAge}` : ""}` : "NO RESULTS YET";
    right = onScan ? "TAP TO SCAN" : dataAge ?? "";
  }

  const inner = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span className="refresh-mono" style={{ ...LABEL, color: leftColor }}>
          {left}
        </span>
        <span className="refresh-mono" style={{ ...LABEL, color: "var(--text-dim)", flex: "none" }}>
          {right}
        </span>
      </div>
      {/* Kept mounted at zero opacity once the scan lands: fading it out is
          the spec, and unmounting it would shift everything below by 14px. */}
      <div style={{ opacity: scanning ? 1 : 0, transition: "opacity 200ms linear" }}>
        <MetricBar
          value={scanning ? telemetry.fraction : 1}
          variant="progress"
          fill="accent"
          aria-label={telemetry.estimated ? "Scan progress, estimated" : "Scan progress"}
        />
      </div>
    </>
  );

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    textAlign: "left",
    padding: "14px 15px",
    background: "var(--surface-1)",
    border: "1px solid var(--hairline)",
    borderRadius: 16,
    color: "inherit",
    font: "inherit",
  };

  if (!onScan || scanning) {
    return (
      <div style={style} aria-busy={scanning}>
        {inner}
      </div>
    );
  }

  return (
    <button type="button" className="refresh-pressable" style={style} onClick={onScan}>
      {inner}
    </button>
  );
}
