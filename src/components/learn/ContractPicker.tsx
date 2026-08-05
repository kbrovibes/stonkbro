"use client";

import { useState } from "react";

export type ContractCard = {
  label: string;
  date: string;
  side?: "put" | "call";
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  delta: number;
  iv: number;
  aroc?: number;
  volume?: number;
  juiciness?: number;
  note?: string;
};

interface ContractPickerProps {
  prompt?: string;
  goal?: string;
  a?: ContractCard;
  b?: ContractCard;
  correct?: "a" | "b";
  explanation?: string;
}

function Row({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-stone-400 dark:text-text-faint">{k}</span>
      <span className={warn ? "font-semibold text-rose-600 dark:text-loss" : "font-medium text-stone-700 dark:text-text-muted"}>{v}</span>
    </div>
  );
}

function Card({
  c,
  picked,
  outcome,
  onPick,
}: {
  c: ContractCard;
  picked: boolean;
  outcome: "correct" | "wrong" | null;
  onPick: () => void;
}) {
  const spreadPct = c.mid > 0 ? ((c.ask - c.bid) / c.mid) * 100 : 0;
  const ring =
    outcome === "correct"
      ? "border-emerald-400 ring-2 ring-emerald-200 dark:ring-gain-border"
      : outcome === "wrong"
        ? "border-rose-300 ring-2 ring-rose-200 dark:ring-loss-border"
        : picked
          ? "border-sky-400 ring-2 ring-sky-200"
          : "border-stone-200 dark:border-border-default hover:border-sky-300";
  return (
    <button
      onClick={onPick}
      className={`flex-1 text-left bg-white dark:bg-surface-elevated rounded-xl border ${ring} p-3 transition-all`}
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-bold text-stone-900 dark:text-text">{c.label}</span>
        {outcome === "correct" && <span className="text-emerald-500 text-sm">✓</span>}
        {outcome === "wrong" && <span className="text-rose-500 text-sm">✗</span>}
      </div>
      <p className="text-xs text-stone-500 dark:text-text-subtle mb-2">
        {c.side === "call" ? "Call" : "Put"} · ${c.strike} · {c.expiry} ({c.dte} DTE)
      </p>
      <Row k="Mid / credit" v={`$${c.mid.toFixed(2)}`} />
      <Row k="Bid–ask" v={`$${c.bid.toFixed(2)} / $${c.ask.toFixed(2)} (${spreadPct.toFixed(0)}%)`} warn={spreadPct >= 12} />
      <Row k="Delta" v={c.delta.toFixed(2)} warn={Math.abs(c.delta) >= 0.45} />
      <Row k="IV" v={`${(c.iv * 100).toFixed(0)}%`} />
      {c.aroc !== undefined && <Row k="AROC" v={`${c.aroc.toFixed(1)}%`} warn={c.aroc < 12} />}
      {c.volume !== undefined && <Row k="Day volume" v={String(c.volume)} warn={c.volume <= 3} />}
      {c.note && <p className="text-[11px] text-stone-400 dark:text-text-faint mt-1.5 italic">{c.note}</p>}
      <p className="text-[10px] text-stone-300 dark:text-text-faint mt-1.5">scanned {c.date}</p>
    </button>
  );
}

export default function ContractPicker({
  prompt = "Which contract is the better entry?",
  goal,
  a,
  b,
  correct = "a",
  explanation = "",
}: ContractPickerProps) {
  const [choice, setChoice] = useState<"a" | "b" | null>(null);
  if (!a || !b) return null;
  const decided = choice !== null;
  const gotIt = choice === correct;

  return (
    <div className="bg-stone-50 dark:bg-surface-muted rounded-xl border border-stone-100 dark:border-border-subtle p-4">
      <p className="text-sm font-semibold text-stone-800 dark:text-text">{prompt}</p>
      {goal && <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5 mb-3">Goal: {goal}</p>}
      <div className="flex gap-3 mt-2">
        <Card c={a} picked={choice === "a"} outcome={decided ? (correct === "a" ? "correct" : choice === "a" ? "wrong" : null) : null} onPick={() => !decided && setChoice("a")} />
        <Card c={b} picked={choice === "b"} outcome={decided ? (correct === "b" ? "correct" : choice === "b" ? "wrong" : null) : null} onPick={() => !decided && setChoice("b")} />
      </div>
      {decided && (
        <div className={`mt-3 rounded-lg border px-3 py-2.5 text-sm ${gotIt ? "bg-emerald-50 dark:bg-gain-bg border-emerald-200 dark:border-gain-border text-emerald-800 dark:text-gain-strong" : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200"}`}>
          <span className="font-semibold">{gotIt ? "Right call. " : "Not this one. "}</span>
          {explanation}
        </div>
      )}
    </div>
  );
}
