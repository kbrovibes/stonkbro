/**
 * Registry of known job kinds. `cancellable` means the job cooperatively
 * checks its cancel flag between units of work — cancelling anything else
 * only flags the row (a serverless function can't be killed mid-flight).
 */
export interface JobKindInfo {
  label: string;
  cancellable: boolean;
}

export const JOB_KINDS: Record<string, JobKindInfo> = {
  "chain-scan":            { label: "Option Chain Scan",        cancellable: true },
  "time-machine-backfill": { label: "Hindsight Backfill",       cancellable: true },
  "research":              { label: "AI Research",              cancellable: false },
  "explosive-scan":        { label: "Explosive Stock Finder",   cancellable: false },
  "bloodbath-scan":        { label: "Bloodbath Scan",           cancellable: false },
  "csp-hunter-scan":       { label: "CSP Hunter Scan",          cancellable: false },
  "pmcc-scan":             { label: "PMCC Scan",                cancellable: false },
  "portfolio-manager-scan":{ label: "Portfolio Manager Scan",   cancellable: false },
  "market-monitor":        { label: "Market Monitor",           cancellable: false },
  "daily-briefing":        { label: "Daily Briefing",           cancellable: false },
  "recommendations":       { label: "Daily Recommendations",    cancellable: false },
};

export function jobKindInfo(kind: string): JobKindInfo {
  return JOB_KINDS[kind] ?? { label: kind, cancellable: false };
}
