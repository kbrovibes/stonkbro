"use client";

import { useEffect, useState } from "react";
import { Group, Row, Toggle } from "./ui";
import {
  isBiometricAvailable,
  getBiometricConfig,
  enrollBiometric,
  verifyBiometric,
  clearBiometric,
} from "@/lib/biometric";
import { BIOMETRIC_LOCK_ENABLED } from "@/lib/feature-flags";

/**
 * Face ID app lock — device-local, only rendered on hardware with a
 * user-verifying platform authenticator (iPhone Face ID, Mac Touch ID).
 */
export default function BiometricSection() {
  // Kill switch: section disappears entirely while the feature is off.
  if (!BIOMETRIC_LOCK_ENABLED) return null;
  return <BiometricSectionInner />;
}

function BiometricSectionInner() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    isBiometricAvailable().then((ok) => {
      setAvailable(ok);
      if (ok) setEnabled(!!getBiometricConfig());
    });
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (!enabled) {
        const ok = await enrollBiometric();
        if (!ok) {
          setError("Face ID setup was cancelled or failed — the lock stays off.");
          return;
        }
        setEnabled(true);
      } else {
        const res = await verifyBiometric();
        if (res === "ok" || res === "credential-gone") {
          clearBiometric();
          setEnabled(false);
        } else {
          setError("Face ID is required to turn the lock off.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <Group
      header="Security"
      footer={
        <>
          Applies to this device only: opening the app (or returning after a minute in the
          background) requires Face ID. Wealth values are additionally protected by the Privacy
          Lock PIN. If Face ID is removed from the phone, the lock disables itself.
        </>
      }
    >
      <Row label="Require Face ID" sub={enabled ? "On for this device" : undefined}>
        <Toggle on={enabled} busy={busy} onChange={() => void toggle()} />
      </Row>
      {error && <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{error}</p>}
    </Group>
  );
}
