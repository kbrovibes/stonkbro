"use client";

import { useTransition, useState } from "react";
import { updateStatusAction, closePositionAction } from "../actions";

export default function StatusActions({
  positionId,
  currentStatus,
}: {
  positionId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  function handleStatus(status: "active" | "closed" | "rolled") {
    startTransition(async () => {
      if (status === "closed") {
        await closePositionAction(positionId);
      } else {
        await updateStatusAction(positionId, status);
      }
      setShowConfirm(null);
    });
  }

  if (currentStatus === "closed") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleStatus("active")}
          disabled={isPending}
          className="w-full text-xs font-semibold text-stone-600 dark:text-text-muted bg-stone-100 dark:bg-surface-muted hover:bg-stone-200 dark:hover:bg-surface-sunken disabled:opacity-50 px-4 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? "Updating..." : "Reopen Position"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {showConfirm && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 p-4 mb-1">
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
            {showConfirm === "closed"
              ? "Close this position? This marks it as completed."
              : "Mark this position as rolled?"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(null)}
              className="flex-1 text-xs font-semibold text-stone-600 dark:text-text-muted bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default px-3 py-2 rounded-lg transition-colors hover:bg-stone-50 dark:hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handleStatus(showConfirm as "closed" | "rolled")
              }
              disabled={isPending}
              className="flex-1 text-xs font-semibold text-white bg-stone-900 dark:bg-surface-elevated hover:bg-stone-800 dark:hover:bg-surface-muted disabled:bg-stone-300 px-3 py-2 rounded-lg transition-colors"
            >
              {isPending ? "Updating..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {!showConfirm && (
        <>
          <button
            onClick={() => setShowConfirm("rolled")}
            className="w-full text-xs font-semibold text-stone-700 dark:text-text-muted bg-sky-50 dark:bg-accent-bg hover:bg-sky-100 px-4 py-2.5 rounded-lg transition-colors"
          >
            Mark as Rolled
          </button>
          <button
            onClick={() => setShowConfirm("closed")}
            className="w-full text-xs font-semibold text-stone-600 dark:text-text-muted bg-stone-100 dark:bg-surface-muted hover:bg-stone-200 dark:hover:bg-surface-sunken px-4 py-2.5 rounded-lg transition-colors"
          >
            Close Position
          </button>
        </>
      )}
    </div>
  );
}
