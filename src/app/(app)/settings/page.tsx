"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";

import { CLAUDE_MODELS, GEMINI_MODELS } from "@/lib/ai/constants";
import { THEME_FONTS, DEFAULT_THEME_FONT_KEY, THEME_FONT_STORAGE_KEY, applyThemeFont } from "@/lib/theme-fonts";

// ---------------------------------------------------------------------------
// iOS-style grouped list primitives
// ---------------------------------------------------------------------------

function Group({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      {header && (
        <h3 className="px-4 pb-1.5 text-[12px] font-semibold uppercase tracking-wider text-stone-400 dark:text-text-faint">
          {header}
        </h3>
      )}
      <div className="rounded-2xl bg-white dark:bg-surface-elevated shadow-sm overflow-hidden divide-y divide-stone-100 dark:divide-border-subtle">
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-1.5 text-[12px] leading-snug text-stone-400 dark:text-text-faint">
          {footer}
        </p>
      )}
    </section>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 min-h-[44px] py-2">
      <div className="min-w-0">
        <div className="text-[15px] text-stone-900 dark:text-text">{label}</div>
        {sub && <div className="text-[12px] text-stone-400 dark:text-text-faint">{sub}</div>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0 text-right">{children}</div>}
    </div>
  );
}

function ActionRow({
  onClick,
  disabled,
  destructive,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 min-h-[44px] py-2 text-[15px] transition-colors active:bg-stone-50 dark:active:bg-surface-muted disabled:opacity-40 ${
        destructive ? "text-red-500 dark:text-loss" : "text-sky-600 dark:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  busy,
  onChange,
}: {
  on: boolean;
  busy?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onChange}
      disabled={busy}
      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 disabled:opacity-60 ${
        on ? "bg-[#34C759] dark:bg-gain" : "bg-stone-200 dark:bg-surface-muted"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-[20px]" : ""
        }`}
      />
    </button>
  );
}

const inputClass =
  "bg-transparent text-right text-[15px] text-stone-500 dark:text-text-subtle placeholder:text-stone-300 dark:placeholder:text-text-faint focus:outline-none focus:text-stone-900 dark:focus:text-text";

const selectClass =
  "appearance-none bg-transparent text-right text-[15px] text-stone-500 dark:text-text-subtle pr-4 focus:outline-none cursor-pointer " +
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2216%22%20viewBox%3D%220%200%2010%2016%22%3E%3Cpath%20d%3D%22M1.5%206l3.5-3.5L8.5%206M1.5%2010l3.5%203.5L8.5%2010%22%20stroke%3D%22%23a8a29e%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right";

// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [startingCash, setStartingCash] = useState("20000");
  const [alertEmail, setAlertEmail] = useState("");
  const [preferredProvider, setPreferredProvider] = useState<"claude" | "gemini">("gemini");
  const [preferredModel, setPreferredModel] = useState("gemini-2.0-flash");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [pingStatus, setPingStatus] = useState<"idle" | "sending" | "done">("idle");
  const [pingResult, setPingResult] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);
  // Truth = an actual PushSubscription on this device, not just permission.
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [pushError, setPushError] = useState("");
  const [pushTest, setPushTest] = useState<"idle" | "sending" | string>("idle");
  const [healthStatus, setHealthStatus] = useState<Record<string, "idle" | "checking" | "healthy" | "error">>({});
  const [healthErrors, setHealthErrors] = useState<Record<string, string>>({});
  const [activeError, setActiveError] = useState<string | null>(null);
  const [themeFont, setThemeFont] = useState<string>(DEFAULT_THEME_FONT_KEY);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub) => setPushSubscribed(!!sub))
          .catch(() => setPushSubscribed(false));
      } else {
        setPushSubscribed(false);
      }
    } else {
      setNotifPermission("unsupported");
    }

    try {
      const saved = localStorage.getItem(THEME_FONT_STORAGE_KEY);
      if (saved) setThemeFont(saved);
    } catch { /* ignore */ }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setStartingCash(String(d.settings.starting_cash || "20000"));
          setAlertEmail(d.settings.alert_email || "");
          setPreferredProvider(d.settings.preferred_ai_provider || "gemini");
          setPreferredModel(d.settings.preferred_ai_model || "gemini-2.0-flash");
        }
      })
      .catch(() => {});
  }, []);

  // Auto-save (iOS style: no Save buttons). Pass overrides for values that
  // were just set via setState and aren't in state yet.
  async function save(overrides: Record<string, unknown> = {}) {
    setSaveError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starting_cash: Number(startingCash) || 20000,
          alert_email: alertEmail || null,
          preferred_ai_provider: preferredProvider,
          preferred_ai_model: preferredModel,
          ...overrides,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setSaveError("Network error — changes not saved");
    }
  }

  async function handleEnableNotifications() {
    setSubscribing(true);
    setPushError("");
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== "granted") {
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error(`subscribe save failed (${res.status})`);
      setPushSubscribed(true);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Subscription failed — see console");
      console.error("[push] enable failed:", e);
      setPushSubscribed(false);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleTestPush() {
    setPushTest("sending");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      setPushTest(
        data.ok
          ? `Sent to ${data.sent}/${data.subscriptions} device${data.subscriptions !== 1 ? "s" : ""} — check your phone`
          : data.reason || `Failed: sent ${data.sent}, failed ${data.failed}`
      );
    } catch {
      setPushTest("Network error");
    }
  }

  async function handleDisableNotifications() {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setNotifPermission("default");
      setPushSubscribed(false);
    } catch {
      // silent
    } finally {
      setSubscribing(false);
    }
  }

  async function handlePingEmail() {
    setPingStatus("sending");
    setPingResult("");
    try {
      const res = await fetch("/api/email/ping", { method: "POST" });
      const data = await res.json();
      setPingResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setPingResult(`Network error: ${e}`);
    } finally {
      setPingStatus("done");
    }
  }

  async function handleTestEmail() {
    setTestStatus("sending");
    setTestError("");
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTestStatus("error");
        setTestError(data.error || "Failed to send");
        return;
      }
      setTestStatus("sent");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch {
      setTestStatus("error");
      setTestError("Network error");
    }
  }

  async function checkAIHealth() {
    const allModels = [
      ...GEMINI_MODELS.map(m => ({ ...m, provider: "gemini" as const })),
      ...CLAUDE_MODELS.map(m => ({ ...m, provider: "claude" as const }))
    ];

    const initial: Record<string, "checking"> = {};
    allModels.forEach(m => initial[m.id] = "checking");
    setHealthStatus(initial);
    setHealthErrors({});

    await Promise.all(allModels.map(async (model) => {
      try {
        const res = await fetch("/api/admin/ai-health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: model.provider, model: model.id }),
        });
        const data = await res.json();
        setHealthStatus(prev => ({
          ...prev,
          [model.id]: data.ok ? "healthy" : "error"
        }));
        if (!data.ok) {
          setHealthErrors(prev => ({ ...prev, [model.id]: data.error || "Unknown error" }));
        }
      } catch (err) {
        setHealthStatus(prev => ({ ...prev, [model.id]: "error" }));
        setHealthErrors(prev => ({ ...prev, [model.id]: err instanceof Error ? err.message : "Network error" }));
      }
    }));
  }

  const checking = Object.values(healthStatus).some(s => s === "checking");
  const healthStarted = Object.keys(healthStatus).length > 0;
  const currentFont = THEME_FONTS.find((f) => f.key === themeFont) ?? THEME_FONTS[0];
  const pushOn = notifPermission === "granted" && pushSubscribed === true;

  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/more"
            className="p-1.5 -ml-1.5 rounded-lg text-stone-400 dark:text-text-faint hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-surface-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text">Settings</h2>
          <span
            className={`ml-auto text-[12px] font-medium text-stone-400 dark:text-text-faint transition-opacity duration-300 ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
        </div>

        {saveError && (
          <p className="px-4 -mt-3 text-[12px] text-red-500 dark:text-loss">{saveError}</p>
        )}

        <Group
          header="Appearance"
          footer={
            <span style={{ fontFamily: currentFont.family }}>
              stonk<span className="text-[#00C805] font-black">BRO</span> · The quick brown fox jumps over $1,234.56
            </span>
          }
        >
          <Row label="Font">
            <select
              value={themeFont}
              onChange={(e) => {
                const next = e.target.value;
                setThemeFont(next);
                applyThemeFont(next);
              }}
              className={selectClass}
            >
              {THEME_FONTS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </Row>
        </Group>

        <Group header="Account">
          <Row label="Starting Cash">
            <span className="text-[15px] text-stone-300 dark:text-text-faint">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              onBlur={() => save()}
              className={`w-24 ${inputClass}`}
              placeholder="20000"
            />
          </Row>
          <Row label="Alert Email">
            <input
              type="email"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              onBlur={() => save()}
              className={`w-48 ${inputClass}`}
              placeholder="you@example.com"
            />
          </Row>
        </Group>

        <PrivacyPinSection />

        <Group
          header="AI"
          footer="If your provider hits its rate limit, the system fails over to the other provider and notifies you."
        >
          <Row label="Provider">
            <div className="flex rounded-lg bg-stone-100 dark:bg-surface-muted p-0.5">
              {(["gemini", "claude"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const model = p === "gemini" ? GEMINI_MODELS[0].id : CLAUDE_MODELS[0].id;
                    setPreferredProvider(p);
                    setPreferredModel(model);
                    save({ preferred_ai_provider: p, preferred_ai_model: model });
                  }}
                  className={`px-3 py-1 rounded-md text-[13px] font-medium capitalize transition-colors ${
                    preferredProvider === p
                      ? "bg-white dark:bg-surface-elevated text-stone-900 dark:text-text shadow-sm"
                      : "text-stone-500 dark:text-text-subtle"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Model">
            <select
              value={preferredModel}
              onChange={(e) => {
                setPreferredModel(e.target.value);
                save({ preferred_ai_model: e.target.value });
              }}
              className={selectClass}
            >
              {(preferredProvider === "gemini" ? GEMINI_MODELS : CLAUDE_MODELS).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Row>
          <ActionRow onClick={checkAIHealth} disabled={checking}>
            {checking ? "Checking model health…" : "Check Model Health"}
          </ActionRow>
          {healthStarted &&
            [...GEMINI_MODELS, ...CLAUDE_MODELS].map((model) => {
              const status = healthStatus[model.id] || "idle";
              const isGemini = GEMINI_MODELS.some(m => m.id === model.id);
              return (
                <div key={model.id}>
                  <Row
                    label={
                      <span className="flex items-center gap-2 text-[13px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${isGemini ? "bg-sky-500" : "bg-purple-500"}`} />
                        {model.name}
                      </span>
                    }
                  >
                    {status === "checking" ? (
                      <div className="w-3.5 h-3.5 border-2 border-stone-200 dark:border-border-default border-t-stone-500 rounded-full animate-spin" />
                    ) : status === "healthy" ? (
                      <span className="text-[12px] font-medium text-emerald-600 dark:text-gain">Healthy</span>
                    ) : status === "error" ? (
                      <button
                        onClick={() => setActiveError(activeError === model.id ? null : model.id)}
                        className="text-[12px] font-medium text-red-500 dark:text-loss"
                      >
                        Failed
                      </button>
                    ) : null}
                  </Row>
                  {activeError === model.id && healthErrors[model.id] && (
                    <p className="px-4 pb-2 -mt-1 text-[11px] text-red-500 dark:text-loss leading-snug">
                      {healthErrors[model.id]}
                    </p>
                  )}
                </div>
              );
            })}
        </Group>

        <Group
          header="Notifications"
          footer={
            notifPermission === "unsupported"
              ? "Push notifications are not supported in this browser."
              : notifPermission === "denied"
              ? "Notifications are blocked. Re-enable them for this site in your browser settings."
              : notifPermission === "granted" && pushSubscribed === false
              ? "Permission granted but this device has no push subscription — toggle on to re-subscribe."
              : "Push fires when positions need action or explosive movers are detected."
          }
        >
          <Row label="Push Notifications">
            {notifPermission !== "unsupported" && notifPermission !== "denied" && (
              <Toggle
                on={pushOn}
                busy={subscribing || pushSubscribed === null}
                onChange={pushOn ? handleDisableNotifications : handleEnableNotifications}
              />
            )}
          </Row>
          {pushOn && (
            <ActionRow onClick={handleTestPush} disabled={pushTest === "sending"}>
              {pushTest === "sending" ? "Sending…" : "Send Test Push"}
            </ActionRow>
          )}
          {pushTest !== "idle" && pushTest !== "sending" && (
            <p className="px-4 py-2 text-[12px] text-stone-500 dark:text-text-subtle">{pushTest}</p>
          )}
          {pushError && <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{pushError}</p>}
          <ActionRow onClick={handleTestEmail} disabled={!alertEmail || testStatus === "sending"}>
            {testStatus === "sending"
              ? "Sending…"
              : testStatus === "sent"
              ? "Sent — check your inbox"
              : "Send Daily Summary Email"}
          </ActionRow>
          {testStatus === "error" && (
            <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{testError}</p>
          )}
          <ActionRow onClick={handlePingEmail} disabled={pingStatus === "sending"}>
            <span className="text-stone-400 dark:text-text-faint">
              {pingStatus === "sending" ? "Testing Resend…" : "Test Resend (Debug)"}
            </span>
          </ActionRow>
          {pingResult && (
            <pre className="mx-4 my-2 text-[11px] bg-stone-50 dark:bg-surface rounded-lg p-3 overflow-x-auto text-stone-700 dark:text-text-muted whitespace-pre-wrap">
              {pingResult}
            </pre>
          )}
        </Group>

        <Group header="Scoring" footer="Tune weights for the explosive stock scoring engine.">
          <Row label="Scoring Weights">
            <span className="text-[13px] text-stone-300 dark:text-text-faint">Coming soon</span>
          </Row>
        </Group>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Privacy PIN — gates the "Lock private info" feature (ProfileMenu).
// ---------------------------------------------------------------------------

function PrivacyPinSection() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setHasPin(!!d.settings?.has_privacy_pin))
      .catch(() => setHasPin(false));
  }, []);

  async function savePin() {
    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN must be 4-8 digits");
      setStatus("error");
      return;
    }
    if (pin !== confirm) {
      setError("PINs don't match");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy_pin: pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Save failed (${res.status})`);
        setStatus("error");
        return;
      }
      setStatus("saved");
      setHasPin(true);
      setPin("");
      setConfirm("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setError("Network error — check your connection");
      setStatus("error");
    }
  }

  const pinInput =
    "w-24 bg-transparent text-right text-[15px] text-stone-900 dark:text-text placeholder:text-stone-300 dark:placeholder:text-text-faint focus:outline-none tracking-widest";

  return (
    <Group
      header="Privacy"
      footer={
        <>
          Use &ldquo;Lock private info&rdquo; in the profile menu before handing your phone to
          someone — dollar values and position sizes hide everywhere until the PIN unlocks them.
          {hasPin && <span className="text-emerald-600 dark:text-gain font-medium"> A PIN is set.</span>}
        </>
      }
    >
      <Row label={hasPin ? "New PIN" : "PIN"}>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className={pinInput}
          placeholder="4-8 digits"
        />
      </Row>
      <Row label="Confirm">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          className={pinInput}
          placeholder="Repeat PIN"
        />
      </Row>
      <ActionRow onClick={savePin} disabled={status === "saving" || pin.length < 4}>
        {status === "saved" ? "Saved" : status === "saving" ? "Saving…" : hasPin ? "Change PIN" : "Set PIN"}
      </ActionRow>
      {status === "error" && (
        <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{error}</p>
      )}
    </Group>
  );
}
