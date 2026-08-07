"use client";

import { useEffect, useRef, useState } from "react";

/**
 * In-app PIN prompt. Used to unlock private info (and reusable anywhere a
 * code entry is needed). Renders as a centered modal over a backdrop.
 */
export default function PinModal({
  title,
  subtitle,
  onSubmit,
  onClose,
}: {
  title: string;
  subtitle?: string;
  /** Returns an error message to display, or null to close. */
  onSubmit: (code: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit() {
    if (busy || code.length < 4) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit(code);
    setBusy(false);
    if (err) {
      setError(err);
      setCode("");
      inputRef.current?.focus();
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-xs rounded-2xl bg-surface-elevated border border-border-default shadow-2xl p-5">
        <div className="text-center mb-4">
          <div className="text-2xl mb-1">🔒</div>
          <h3 className="text-sm font-bold text-text">{title}</h3>
          {subtitle && <p className="text-[11px] text-text-faint mt-1">{subtitle}</p>}
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-border-default bg-surface px-3 py-2.5 text-text focus:outline-none focus:border-accent"
          placeholder="••••"
        />

        {error && (
          <p className="text-[11px] text-loss text-center mt-2">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={busy || code.length < 4}
          className="mt-4 w-full rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}
