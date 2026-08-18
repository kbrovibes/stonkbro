/**
 * Build-time feature kill switches. Plain module (no "use client") so both
 * server and client components can import the constants.
 */

/**
 * Face ID / Touch ID app lock (spec: v0.33.0). Temporarily disabled for all
 * devices on 2026-08-18 while the feature is debugged. Flipping this back to
 * true restores the lock everywhere — enrolled devices keep their
 * localStorage credential config while the switch is off, nothing is wiped.
 */
export const BIOMETRIC_LOCK_ENABLED = false;
