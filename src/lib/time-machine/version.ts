/**
 * Single source of truth for the Hindsight payload schema version.
 * Kept in its own module so client components can import the constant
 * without dragging in the simulator's server-only dependencies
 * (SnapTrade SDK, Supabase admin, Tradier client, etc.).
 *
 * Bump whenever the cached payload shape or core math changes —
 * the UI compares against this to prompt for a regeneration.
 */
export const PAYLOAD_VERSION = 2;
