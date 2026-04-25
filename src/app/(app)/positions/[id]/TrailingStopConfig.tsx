"use client";

import { useTransition, useState } from "react";
import {
  setTrailingStopAction,
  removeTrailingStopAction,
} from "../actions";

type TrailingStopConfigProps = {
  positionId: string;
  symbol: string;
  currentPrice: number;
  trailingStopPct: number | null;
  peakPrice: number | null;
  entryPricePerShare: number | null;
};

const PRESET_STOPS = [5, 10, 15, 20];

export default function TrailingStopConfig({
  positionId,
  symbol,
  currentPrice,
  trailingStopPct,
  peakPrice,
  entryPricePerShare,
}: TrailingStopConfigProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedPct, setSelectedPct] = useState(10);
  const [customPct, setCustomPct] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const isActive = trailingStopPct !== null && peakPrice !== null;

  // Calculations for active stop
  const drawdownFromPeak =
    isActive && peakPrice > 0
      ? ((peakPrice - currentPrice) / peakPrice) * 100
      : 0;
  const gainFromEntry =
    isActive && entryPricePerShare && entryPricePerShare > 0
      ? ((currentPrice - entryPricePerShare) / entryPricePerShare) * 100
      : 0;
  const stopTriggerPrice =
    isActive ? peakPrice * (1 - trailingStopPct / 100) : 0;
  const isTriggered = isActive && currentPrice <= stopTriggerPrice;
  const isWarning =
    isActive &&
    !isTriggered &&
    drawdownFromPeak >= trailingStopPct / 2;

  function handleActivate() {
    const pct = useCustom ? parseFloat(customPct) : selectedPct;
    if (!pct || pct <= 0 || pct > 50) return;

    startTransition(async () => {
      await setTrailingStopAction(positionId, pct, currentPrice);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeTrailingStopAction(positionId);
      setShowRemoveConfirm(false);
    });
  }

  if (isActive) {
    return (
      <div
        className={`rounded-xl border p-4 ${
          isTriggered
            ? "border-red-300 bg-red-50"
            : isWarning
              ? "border-amber-300 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Trailing Stop
          </h3>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isTriggered
                ? "bg-red-100 text-red-700"
                : isWarning
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isTriggered ? "TRIGGERED" : isWarning ? "WARNING" : "ACTIVE"}
          </span>
        </div>

        {isTriggered && (
          <div className="rounded-lg bg-red-100 border border-red-200 p-3 mb-3">
            <p className="text-xs font-semibold text-red-800">
              Stop triggered! {symbol} has dropped {drawdownFromPeak.toFixed(1)}%
              from peak -- consider closing position.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-stone-400">Current Price</p>
            <p className="text-sm font-bold text-stone-900">
              ${currentPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-400">Peak Price</p>
            <p className="text-sm font-bold text-stone-900">
              ${peakPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-400">Gain from Entry</p>
            <p
              className={`text-sm font-bold ${
                gainFromEntry >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {gainFromEntry >= 0 ? "+" : ""}
              {gainFromEntry.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-stone-400">Drawdown from Peak</p>
            <p
              className={`text-sm font-bold ${
                isTriggered
                  ? "text-red-600"
                  : isWarning
                    ? "text-amber-600"
                    : "text-stone-600"
              }`}
            >
              -{drawdownFromPeak.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs border-t border-stone-200/50 pt-3 mb-3">
          <span className="text-stone-500">
            Stop: {trailingStopPct}% from peak (${stopTriggerPrice.toFixed(2)})
          </span>
        </div>

        {showRemoveConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="flex-1 text-xs font-semibold text-stone-600 bg-white border border-stone-200 px-3 py-2 rounded-lg transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-stone-300 px-3 py-2 rounded-lg transition-colors"
            >
              {isPending ? "Removing..." : "Confirm Remove"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="w-full text-xs font-semibold text-stone-500 bg-white/60 hover:bg-white border border-stone-200/50 px-4 py-2 rounded-lg transition-colors"
          >
            Remove Stop
          </button>
        )}
      </div>
    );
  }

  // Not active -- show setup form
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
        Trailing Stop
      </h3>
      <p className="text-xs text-stone-500 mb-4">
        Set a trailing stop to automatically alert when {symbol} drops a set
        percentage from its peak price. Locks in gains while letting winners run.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESET_STOPS.map((pct) => (
          <button
            key={pct}
            onClick={() => {
              setSelectedPct(pct);
              setUseCustom(false);
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              !useCustom && selectedPct === pct
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {pct}%
          </button>
        ))}
        <button
          onClick={() => setUseCustom(true)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            useCustom
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Custom
        </button>
      </div>

      {useCustom && (
        <div className="mb-3">
          <input
            type="number"
            min="1"
            max="50"
            step="0.5"
            value={customPct}
            onChange={(e) => setCustomPct(e.target.value)}
            placeholder="Enter %"
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      )}

      <div className="text-xs text-stone-400 mb-4">
        Current price: ${currentPrice.toFixed(2)} -- alert if drops{" "}
        {useCustom ? (customPct || "?") : selectedPct}% from peak
      </div>

      <button
        onClick={handleActivate}
        disabled={isPending || (useCustom && !customPct)}
        className="w-full text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 px-4 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Activating..." : "Activate Trailing Stop"}
      </button>
    </div>
  );
}
