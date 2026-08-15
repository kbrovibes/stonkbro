/**
 * Registry of known job kinds. `cancellable` means the job cooperatively
 * checks its cancel flag between units of work — cancelling anything else
 * only flags the row (a serverless function can't be killed mid-flight).
 * `href` is where the action's output lives; rows on /actions link there.
 */
export interface JobKindInfo {
  label: string;
  cancellable: boolean;
  href?: string;
}

export const JOB_KINDS: Record<string, JobKindInfo> = {
  "chain-scan":            { label: "Option Chain Scan",        cancellable: true,  href: "/portfolio" },
  "time-machine-backfill": { label: "Hindsight Backfill",       cancellable: true,  href: "/time-machine" },
  "research":              { label: "AI Research",              cancellable: false, href: "/research" },
  "explosive-scan":        { label: "Explosive Stock Finder",   cancellable: false, href: "/explosive" },
  "bloodbath-scan":        { label: "Bloodbath Scan",           cancellable: false, href: "/bloodbath" },
  "csp-hunter-scan":       { label: "CSP Hunter Scan",          cancellable: false, href: "/plays" },
  "pmcc-scan":             { label: "PMCC Scan",                cancellable: false, href: "/pmcc-picks" },
  "portfolio-manager-scan":{ label: "Portfolio Manager Scan",   cancellable: false, href: "/portfolio-manager" },
  "market-monitor":        { label: "Market Monitor",           cancellable: false },
  "daily-briefing":        { label: "Daily Briefing",           cancellable: false },
  "recommendations":       { label: "Daily Recommendations",    cancellable: false, href: "/suggestions" },
  "tax-equity-sync":       { label: "Tax Center Stock Sync",    cancellable: true,  href: "/taxes" },
};

export function jobKindInfo(kind: string): JobKindInfo {
  return JOB_KINDS[kind] ?? { label: kind, cancellable: false };
}
