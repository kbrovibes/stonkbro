import { getAccessRequest } from "@/lib/db/portfolio-access-requests";

/**
 * Single source of truth for who can see Time Machine, Taxes, Daily
 * Briefing, and ticker research. All four share this allow-list so they
 * never drift.
 *
 * To grant access to another user, add their email here and redeploy.
 * (No DB lookup — kept intentionally lightweight while the user base is
 * tiny; revisit if the list grows past a handful.)
 *
 * Portfolio itself no longer uses this list — see `hasApprovedPortfolioAccess`
 * below, which layers a real request/approve flow on top of it.
 */

export const PORTFOLIO_ALLOWED_EMAILS = [
  "k4rthikr@gmail.com",
  // Karthik's second account. NOTE: SnapTrade is a single app-wide identity —
  // every email here sees the same (real) portfolio, briefings, and taxes.
  "chinnunchunni@gmail.com",
] as const;

export function hasPortfolioAccess(email: string | null | undefined): boolean {
  if (!email) return false;
  return (PORTFOLIO_ALLOWED_EMAILS as readonly string[]).includes(email);
}

/**
 * Portfolio-specific gate: the hardcoded owner emails above always pass
 * (zero-friction, no DB round-trip), and everyone else needs an `approved`
 * row in `portfolio_access_requests` (see `src/lib/db/portfolio-access-requests.ts`,
 * granted via the alert-banner or Settings approve/deny flow).
 */
export async function hasApprovedPortfolioAccess(
  userId: string,
  email: string | null | undefined
): Promise<boolean> {
  if (hasPortfolioAccess(email)) return true;
  const request = await getAccessRequest(userId);
  return request?.status === "approved";
}
