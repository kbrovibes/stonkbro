/**
 * The full set of destinations a user can pick for the bottom nav's 4
 * customizable middle slots (Settings → Bottom nav) — built from
 * `MORE_GROUPS` (`src/components/more-nav-data.tsx`) plus the two
 * destinations that only exist today as hardcoded bottom-nav tabs and never
 * appear in the More menu itself (Options, Learn). Server-safe, no "use
 * client" — read from both the layout (server) and the Settings API route.
 */
import { MORE_GROUPS } from "@/components/more-nav-data";

export interface NavDestination {
  href: string;
  title: string;
  emoji: string;
  requiresPortfolio?: boolean;
}

const EXTRA_DESTINATIONS: NavDestination[] = [
  { href: "/plays", title: "Options", emoji: "📈" },
  { href: "/learn", title: "Learn", emoji: "🎓" },
];

export const NAV_DESTINATIONS: NavDestination[] = [
  ...EXTRA_DESTINATIONS,
  ...MORE_GROUPS.flatMap((group) =>
    group.links.map((link) => ({
      href: link.href,
      title: link.title,
      emoji: link.emoji,
      requiresPortfolio: group.requiresPortfolio,
    }))
  ),
];

/** Today's hardcoded bottom-nav middle tabs — the fallback when a user has never customized. */
export const DEFAULT_BOTTOM_NAV_TABS = ["/plays", "/paper", "/portfolio", "/learn"];

export function availableNavDestinations(hasPortfolio: boolean): NavDestination[] {
  return NAV_DESTINATIONS.filter((d) => !d.requiresPortfolio || hasPortfolio);
}

export function findNavDestination(href: string): NavDestination | undefined {
  return NAV_DESTINATIONS.find((d) => d.href === href);
}
