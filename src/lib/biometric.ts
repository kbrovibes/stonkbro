"use client";

/**
 * Device-local Face ID / Touch ID app lock via the WebAuthn platform
 * authenticator (works in installed PWAs on iOS 16+).
 *
 * Threat model: this is a privacy gate for someone holding the unlocked
 * phone — the same class of protection as the privacy-PIN mask, layered on
 * top of it. It is NOT an auth boundary: the Supabase session remains the
 * real auth, and the assertion is not verified server-side. Everything is
 * per-device in localStorage, so enabling on the iPhone never locks the
 * desktop.
 */

const STORAGE_KEY = "biometric-lock-v1";

type BiometricConfig = {
  enabled: boolean;
  credentialId: string; // base64url rawId
};

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export function getBiometricConfig(): BiometricConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as BiometricConfig;
    return cfg.enabled && cfg.credentialId ? cfg : null;
  } catch {
    return null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Enroll: create a platform credential (fires the Face ID sheet). Must be
 * called from a user gesture (Safari requires it for create()).
 */
export async function enrollBiometric(): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rp: { id: location.hostname, name: "stonkbro" },
        user: { id: userId.buffer as ArrayBuffer, name: "stonkbro-device", displayName: "This device" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "discouraged",
        },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    const cfg: BiometricConfig = { enabled: true, credentialId: b64url(cred.rawId) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return true;
  } catch {
    // NotAllowedError = user cancelled the Face ID sheet — not an error state.
    return false;
  }
}

export type VerifyResult = "ok" | "cancelled" | "credential-gone";

/** Assert with the enrolled credential (fires the Face ID sheet). */
export async function verifyBiometric(): Promise<VerifyResult> {
  const cfg = getBiometricConfig();
  if (!cfg) return "credential-gone";
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer as ArrayBuffer,
        rpId: location.hostname,
        allowCredentials: [
          { type: "public-key", id: fromB64url(cfg.credentialId).buffer as ArrayBuffer },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return assertion ? "ok" : "cancelled";
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    // InvalidStateError / NotFoundError: the enrolled credential no longer
    // exists on this device (Face ID reset, credential removed).
    if (name === "InvalidStateError" || name === "NotFoundError") return "credential-gone";
    return "cancelled";
  }
}

/** Turn the lock off (caller must have passed verifyBiometric first). */
export function clearBiometric(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
