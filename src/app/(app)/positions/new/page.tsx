"use client";

import { Suspense, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPositionAction } from "../actions";
import QuickLog from "./QuickLog";

type Strategy = "PMCC" | "Covered Call" | "Cash-Secured Put" | "The Wheel";

type LegInput = {
  type: string;
  strike: string;
  expiry: string;
  entry_price: string;
  quantity: string;
};

const strategies: { value: Strategy; label: string; description: string }[] = [
  {
    value: "PMCC",
    label: "PMCC",
    description: "Poor Man's Covered Call — LEAPS + short calls",
  },
  {
    value: "Covered Call",
    label: "Covered Call",
    description: "Own shares + sell calls against them",
  },
  {
    value: "Cash-Secured Put",
    label: "Cash-Secured Put",
    description: "Sell puts with cash to cover assignment",
  },
  {
    value: "The Wheel",
    label: "The Wheel",
    description: "Sell puts, get assigned, sell calls, repeat",
  },
];

const validStrategies: string[] = strategies.map((s) => s.value);

function defaultLegs(strategy: Strategy): LegInput[] {
  switch (strategy) {
    case "PMCC":
      return [
        { type: "leaps_call", strike: "", expiry: "", entry_price: "", quantity: "1" },
        { type: "short_call", strike: "", expiry: "", entry_price: "", quantity: "1" },
      ];
    case "Covered Call":
      return [
        { type: "shares", strike: "", expiry: "", entry_price: "", quantity: "100" },
        { type: "short_call", strike: "", expiry: "", entry_price: "", quantity: "1" },
      ];
    case "Cash-Secured Put":
    case "The Wheel":
      return [
        { type: "short_put", strike: "", expiry: "", entry_price: "", quantity: "1" },
      ];
  }
}

function legTypeLabel(type: string) {
  const map: Record<string, string> = {
    leaps_call: "LEAPS Call",
    short_call: "Short Call",
    short_put: "Short Put",
    shares: "Shares",
    long_put: "Long Put",
  };
  return map[type] ?? type;
}

type QuickLogLeg = {
  type: string;
  strike: number;
  expiry: string;
  price: number;
  quantity?: number;
};

/**
 * Parse query params into pre-fill data.
 * Supports two formats:
 *   Simple: ?symbol=AVIS&strategy=Cash-Secured Put&strike=200&expiry=2026-05-30&premium=8.50
 *   PMCC:   ?symbol=NVDA&strategy=PMCC&leaps_strike=180&leaps_expiry=2027-01-15&leaps_price=42.50&short_strike=220&short_expiry=2026-06-20&short_price=3.20
 */
function parseQueryParams(searchParams: URLSearchParams): {
  symbol: string | null;
  strategy: Strategy | null;
  legs: QuickLogLeg[];
  quantity: number;
  hasAllRequired: boolean;
} {
  const symbol = searchParams.get("symbol")?.toUpperCase() || null;
  const strategyRaw = searchParams.get("strategy");
  const strategy =
    strategyRaw && validStrategies.includes(strategyRaw)
      ? (strategyRaw as Strategy)
      : null;
  const quantity = parseInt(searchParams.get("quantity") || "1") || 1;

  const legs: QuickLogLeg[] = [];

  if (strategy === "PMCC") {
    // Multi-leg format
    const leapsStrike = parseFloat(searchParams.get("leaps_strike") || "");
    const leapsExpiry = searchParams.get("leaps_expiry") || "";
    const leapsPrice = parseFloat(searchParams.get("leaps_price") || "");
    const shortStrike = parseFloat(searchParams.get("short_strike") || "");
    const shortExpiry = searchParams.get("short_expiry") || "";
    const shortPrice = parseFloat(searchParams.get("short_price") || "");

    if (!isNaN(leapsStrike) && leapsExpiry && !isNaN(leapsPrice)) {
      legs.push({
        type: "leaps_call",
        strike: leapsStrike,
        expiry: leapsExpiry,
        price: leapsPrice,
        quantity,
      });
    }
    if (!isNaN(shortStrike) && shortExpiry && !isNaN(shortPrice)) {
      legs.push({
        type: "short_call",
        strike: shortStrike,
        expiry: shortExpiry,
        price: shortPrice,
        quantity,
      });
    }
  } else if (strategy === "Covered Call") {
    const strike = parseFloat(searchParams.get("strike") || "");
    const expiry = searchParams.get("expiry") || "";
    const premium = parseFloat(searchParams.get("premium") || "");
    const costBasis = parseFloat(searchParams.get("cost_basis") || "");

    if (!isNaN(costBasis)) {
      legs.push({
        type: "shares",
        strike: 0,
        expiry: "",
        price: costBasis,
        quantity: quantity * 100,
      });
    }
    if (!isNaN(strike) && expiry && !isNaN(premium)) {
      legs.push({
        type: "short_call",
        strike,
        expiry,
        price: premium,
        quantity,
      });
    }
  } else if (strategy === "Cash-Secured Put" || strategy === "The Wheel") {
    const strike = parseFloat(searchParams.get("strike") || "");
    const expiry = searchParams.get("expiry") || "";
    const premium = parseFloat(searchParams.get("premium") || "");

    if (!isNaN(strike) && expiry && !isNaN(premium)) {
      legs.push({
        type: "short_put",
        strike,
        expiry,
        price: premium,
        quantity,
      });
    }
  }

  const hasAllRequired = !!symbol && !!strategy && legs.length > 0;

  return { symbol, strategy, legs, quantity, hasAllRequired };
}

/** Convert QuickLog legs back to form LegInputs */
function quickLegsToFormLegs(legs: QuickLogLeg[]): LegInput[] {
  return legs.map((leg) => ({
    type: leg.type,
    strike: leg.strike ? String(leg.strike) : "",
    expiry: leg.expiry || "",
    entry_price: leg.price ? String(leg.price) : "",
    quantity: String(leg.quantity ?? 1),
  }));
}

function NewPositionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const parsed = parseQueryParams(searchParams);

  const [mode, setMode] = useState<"quick" | "form">(
    parsed.hasAllRequired ? "quick" : "form"
  );
  const [step, setStep] = useState(1);
  const [symbol, setSymbol] = useState(parsed.symbol ?? "");
  const [strategy, setStrategy] = useState<Strategy | null>(parsed.strategy);
  const [legs, setLegs] = useState<LegInput[]>(
    parsed.legs.length > 0
      ? quickLegsToFormLegs(parsed.legs)
      : parsed.strategy
        ? defaultLegs(parsed.strategy)
        : []
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // If we have pre-filled data but not enough for quick log, skip to appropriate step
  useEffect(() => {
    if (mode === "form" && parsed.symbol && parsed.strategy) {
      if (parsed.legs.length > 0) {
        setStep(3); // go to review
      } else {
        setStep(2); // go to leg entry
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEditFromQuickLog() {
    setMode("form");
    setStep(3); // Jump to review/notes step since all data is filled
  }

  // Quick Log mode
  if (mode === "quick" && parsed.hasAllRequired) {
    return (
      <QuickLog
        symbol={parsed.symbol!}
        strategy={parsed.strategy!}
        legs={parsed.legs}
        onEdit={handleEditFromQuickLog}
      />
    );
  }

  // Full form mode below
  function selectStrategy(s: Strategy) {
    setStrategy(s);
    setLegs(defaultLegs(s));
    setStep(2);
  }

  function updateLeg(index: number, field: keyof LegInput, value: string) {
    setLegs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function canProceedStep2() {
    return legs.every((leg) => {
      if (leg.type === "shares") {
        return leg.entry_price.trim() !== "" && leg.quantity.trim() !== "";
      }
      return (
        leg.strike.trim() !== "" &&
        leg.expiry.trim() !== "" &&
        leg.entry_price.trim() !== ""
      );
    });
  }

  function handleSubmit() {
    if (!strategy) return;

    setError("");

    const formData = new FormData();
    formData.set("symbol", symbol.trim().toUpperCase());
    formData.set("strategy", strategy);
    if (notes.trim()) formData.set("notes", notes.trim());

    const parsedLegs = legs.map((leg) => ({
      type: leg.type,
      strike: parseFloat(leg.strike) || 0,
      expiry: leg.expiry || new Date().toISOString().split("T")[0],
      entry_price: parseFloat(leg.entry_price) || 0,
      quantity: parseInt(leg.quantity) || 1,
    }));
    formData.set("legs", JSON.stringify(parsedLegs));

    startTransition(async () => {
      try {
        await createPositionAction(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create position");
      }
    });
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/positions"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors"
        >
          <svg
            className="w-4 h-4 text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <h2 className="text-lg font-bold text-stone-900">New Position</h2>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-400"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-colors ${
                  step > s ? "bg-stone-900" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Symbol + Strategy */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Ticker Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors"
              autoFocus
              maxLength={5}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Strategy
            </label>
            <div className="flex flex-col gap-2">
              {strategies.map((s) => (
                <button
                  key={s.value}
                  onClick={() => selectStrategy(s.value)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    strategy === s.value
                      ? "border-stone-900 bg-stone-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <p className="text-sm font-bold text-stone-900">{s.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {s.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {symbol.trim() && !strategy && (
            <p className="text-xs text-stone-400 text-center">
              Select a strategy to continue
            </p>
          )}
        </div>
      )}

      {/* Step 2: Leg Inputs */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-stone-900">{symbol}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {strategy}
            </span>
          </div>

          {legs.map((leg, i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <p className="text-xs font-bold text-stone-700 mb-3">
                {legTypeLabel(leg.type)}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {leg.type !== "shares" && (
                  <div>
                    <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                      Strike
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                        $
                      </span>
                      <input
                        type="number"
                        value={leg.strike}
                        onChange={(e) => updateLeg(i, "strike", e.target.value)}
                        placeholder="0.00"
                        step="0.5"
                        className="w-full pl-7 pr-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {leg.type !== "shares" && (
                  <div>
                    <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                      Expiry
                    </label>
                    <input
                      type="date"
                      value={leg.expiry}
                      onChange={(e) => updateLeg(i, "expiry", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                    {leg.type === "shares" ? "Cost Basis" : "Premium"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={leg.entry_price}
                      onChange={(e) =>
                        updateLeg(i, "entry_price", e.target.value)
                      }
                      placeholder="0.00"
                      step="0.01"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                    {leg.type === "shares" ? "Shares" : "Contracts"}
                  </label>
                  <input
                    type="number"
                    value={leg.quantity}
                    onChange={(e) => updateLeg(i, "quantity", e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-4 py-2.5 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2()}
              className="flex-1 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Notes + Submit */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          {/* Summary */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-stone-900">{symbol}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {strategy}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {legs.map((leg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-stone-500">
                    {legTypeLabel(leg.type)}
                    {leg.type !== "shares" && ` $${leg.strike}`}
                    {leg.expiry &&
                      ` exp ${new Date(leg.expiry).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}`}
                  </span>
                  <span className="font-medium text-stone-600">
                    ${leg.entry_price} x {leg.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Notes{" "}
              <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thesis, target exit, risk notes..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 px-4 py-2.5 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-colors"
            >
              {isPending ? "Creating..." : "Create Position"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewPositionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 px-4 py-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-stone-100 animate-pulse" />
            <div className="h-5 w-28 rounded bg-stone-100 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-10 rounded-lg bg-stone-100 animate-pulse" />
            <div className="h-24 rounded-xl bg-stone-100 animate-pulse" />
          </div>
        </div>
      }
    >
      <NewPositionForm />
    </Suspense>
  );
}
