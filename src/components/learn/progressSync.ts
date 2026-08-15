"use client";

/**
 * Reliable lesson-progress persistence.
 *
 * The old implementation used one debounced timer + one payload slot for
 * everything, so a scroll event or navigation scheduled AFTER reaching the
 * bottom silently replaced the pending `completed: true` save — completions
 * only stuck if you idled 3s at the bottom. This module fixes that:
 *
 * - Critical saves (completed, quiz results) POST immediately with
 *   `keepalive` so they survive navigation/unmount.
 * - Non-critical saves (scroll, time spent) MERGE into a pending payload
 *   per lesson and flush on debounce, lesson switch, or pagehide.
 * - Offline (or failed) critical saves queue in localStorage and re-send
 *   on the next `online` event or module load.
 */

const QUEUE_KEY = "learn-progress-queue-v1";
const DEBOUNCE_MS = 2500;

type ProgressPayload = {
  moduleId: string;
  lessonId: string;
  completed?: boolean;
  quizScore?: number;
  quizAnswers?: Record<string, number>;
  scrollPosition?: number;
  timeSpentSeconds?: number;
};

async function post(payload: ProgressPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function readQueue(): ProgressPayload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(q: ProgressPayload[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    // storage full/unavailable — drop silently
  }
}

function enqueue(payload: ProgressPayload) {
  writeQueue([...readQueue(), payload]);
}

/** Re-send any queued saves (offline completions, failed posts). */
export async function flushQueue(): Promise<void> {
  const q = readQueue();
  if (q.length === 0) return;
  writeQueue([]);
  for (const p of q) {
    const ok = await post(p);
    if (!ok) enqueue(p); // keep for next attempt
  }
}

/**
 * Completion / quiz results: send NOW. If offline or the request fails,
 * queue for retry so the completion is never lost.
 */
export async function saveCritical(payload: ProgressPayload): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(payload);
    return;
  }
  const ok = await post(payload);
  if (!ok) enqueue(payload);
}

/** Debounced, merged saver for scroll/time — one instance per lesson mount. */
export function createSoftSaver(moduleId: string, lessonId: string) {
  let pending: ProgressPayload | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending) return;
    const p = pending;
    pending = null;
    if (typeof navigator !== "undefined" && !navigator.onLine) return; // soft data — skip offline
    void post(p);
  };

  const save = (patch: Partial<ProgressPayload>) => {
    pending = { ...(pending ?? { moduleId, lessonId }), ...patch };
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };

  return { save, flush };
}
