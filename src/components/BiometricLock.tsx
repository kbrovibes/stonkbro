"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getBiometricConfig, verifyBiometric, clearBiometric } from "@/lib/biometric";
import { BIOMETRIC_LOCK_ENABLED } from "@/lib/feature-flags";

/** Re-lock after the app sits in the background this long. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Full-app Face ID gate.
 *
 * Flash-prevention works in two layers: an inline script in the app layout
 * adds `bio-locked` to <html> BEFORE first paint when the device-local lock
 * is enabled (CSS hides #bio-shell), and this component then mounts the
 * opaque overlay and runs the WebAuthn assertion. Children stay in the tree
 * (hydration-safe); the overlay + pre-paint CSS keep them invisible until
 * unlock. Lock state is in-memory, so a reload re-locks.
 */
export default function BiometricLock({ children }: { children: React.ReactNode }) {
  if (!BIOMETRIC_LOCK_ENABLED) return <BiometricLockDisabled>{children}</BiometricLockDisabled>;
  return <BiometricLockActive>{children}</BiometricLockActive>;
}

/** Kill-switch path: never lock, and unhide any shell the pre-paint script of a stale build hid. */
function BiometricLockDisabled({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("bio-locked");
  }, []);
  return <div id="bio-shell" style={{ display: "contents" }}>{children}</div>;
}

function BiometricLockActive({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false); // matches server render; real check in layout effect
  const [verifying, setVerifying] = useState(false);
  const [credGone, setCredGone] = useState(false);
  const hiddenAtRef = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (verifying) return;
    setVerifying(true);
    const res = await verifyBiometric();
    setVerifying(false);
    if (res === "ok") {
      document.documentElement.classList.remove("bio-locked");
      setLocked(false);
      setCredGone(false);
    } else if (res === "credential-gone") {
      setCredGone(true);
    }
  }, [verifying]);

  // Immediately after hydration: honor the device-local flag (the pre-paint
  // script has already hidden the shell, so there is no content flash).
  useLayoutEffect(() => {
    if (getBiometricConfig()) {
      setLocked(true);
      void unlock(); // auto-fire the Face ID sheet; button remains as fallback
    } else {
      document.documentElement.classList.remove("bio-locked");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-lock after backgrounding.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (
        hiddenAt !== null &&
        Date.now() - hiddenAt > RELOCK_AFTER_MS &&
        getBiometricConfig()
      ) {
        document.documentElement.classList.add("bio-locked");
        setLocked(true);
        void unlock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [unlock]);

  return (
    <>
      {locked && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-surface flex flex-col items-center justify-center gap-6 px-8" style={{ visibility: "visible" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 dark:bg-surface-elevated flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-stone-900 dark:text-text">stonkbro</h1>
            <p className="text-sm text-stone-500 dark:text-text-subtle text-center">
              {credGone
                ? "Face ID setup was removed from this device."
                : "Unlock with Face ID to continue"}
            </p>
          </div>

          {credGone ? (
            // Fail-open on a destroyed credential: the alternative is an
            // unusable app with no recovery path. The Supabase session and
            // the privacy PIN still protect the data underneath.
            <button
              onClick={() => {
                clearBiometric();
                document.documentElement.classList.remove("bio-locked");
                setLocked(false);
              }}
              className="px-6 py-3 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold"
            >
              Disable lock and continue
            </button>
          ) : (
            <button
              onClick={() => void unlock()}
              disabled={verifying}
              className="px-6 py-3 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
            >
              {verifying && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {verifying ? "Waiting for Face ID…" : "Unlock with Face ID"}
            </button>
          )}
        </div>
      )}

      {/* display:contents keeps the flex layout of body intact while giving
          the pre-paint CSS one node to hide (visibility inherits). */}
      <div id="bio-shell" style={{ display: "contents" }}>
        {children}
      </div>
    </>
  );
}
