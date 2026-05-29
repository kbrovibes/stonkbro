/**
 * Single source of truth for who can see Portfolio and Time Machine
 * features. Both feature sets share this allow-list so they never drift.
 *
 * To grant access to another user, add their email here and redeploy.
 * (No DB lookup — kept intentionally lightweight while the user base is
 * tiny; revisit if the list grows past a handful.)
 */

export const PORTFOLIO_ALLOWED_EMAILS = [
  "k4rthikr@gmail.com",
] as const;

export function hasPortfolioAccess(email: string | null | undefined): boolean {
  if (!email) return false;
  return (PORTFOLIO_ALLOWED_EMAILS as readonly string[]).includes(email);
}
