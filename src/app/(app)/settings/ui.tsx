"use client";

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// iOS-style grouped list primitives shared by the Settings sections
// ---------------------------------------------------------------------------

export function Group({
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

export function Row({
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

export function ActionRow({
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

export function Toggle({
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

export const inputClass =
  "bg-transparent text-right text-[15px] text-stone-500 dark:text-text-subtle placeholder:text-stone-300 dark:placeholder:text-text-faint focus:outline-none focus:text-stone-900 dark:focus:text-text";

export const selectClass =
  "appearance-none bg-transparent text-right text-[15px] text-stone-500 dark:text-text-subtle pr-4 focus:outline-none cursor-pointer " +
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2216%22%20viewBox%3D%220%200%2010%2016%22%3E%3Cpath%20d%3D%22M1.5%206l3.5-3.5L8.5%206M1.5%2010l3.5%203.5L8.5%2010%22%20stroke%3D%22%23a8a29e%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-right";
