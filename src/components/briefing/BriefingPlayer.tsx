"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BriefingArt from "./BriefingArt";
import {
  BRIEFING_AUDIO_ROUTE,
  BRIEFING_SESSIONS,
  type BriefingAction,
  type DailyBriefing,
} from "@/lib/briefing/types";

const AUDIO_CACHE = "briefing-audio";
const SPEEDS = [1, 1.25, 1.5];
const AUTOPLAY_MODE_KEY = "briefing-autoplay-mode";

/** off = stop after the current clip. same-day = continue within the day
 *  (default). across-days = keep going into earlier days too. */
type AutoplayMode = "off" | "same-day" | "across-days";
const AUTOPLAY_CYCLE: AutoplayMode[] = ["same-day", "across-days", "off"];
const AUTOPLAY_LABEL: Record<AutoplayMode, string> = {
  "same-day": "Auto-play",
  "across-days": "Auto-play (all days)",
  off: "Auto-play off",
};

const ACTION_BADGE: Record<BriefingAction["kind"], string> = {
  close: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  roll:  "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  open:  "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  watch: "bg-sky-100 dark:bg-accent-bg text-sky-700 dark:text-accent-hover",
  hold:  "bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-subtle",
};

function artSeed(b: DailyBriefing): number {
  if (b.art_seed != null) return b.art_seed;
  let h = 0;
  for (const c of b.briefing_date) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h >>> 0;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** `Wed, Sep 17` — compact date for a single-list playlist row. */
function fmtDateShort(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Generation time rounded to the nearest hour, e.g. "10 PM". */
function fmtHour(createdAt: string): string {
  const d = new Date(createdAt);
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  d.setMinutes(0);
  return d.toLocaleTimeString("en-US", { hour: "numeric" });
}

async function fetchAudioBlob(id: string): Promise<Blob> {
  const url = BRIEFING_AUDIO_ROUTE(id);
  if (typeof caches !== "undefined") {
    const cache = await caches.open(AUDIO_CACHE);
    const hit = await cache.match(url);
    if (hit) return hit.blob();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Audio fetch failed (${res.status})`);
    await cache.put(url, res.clone());
    return res.blob();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audio fetch failed (${res.status})`);
  return res.blob();
}

export default function BriefingPlayer({ initialBriefings }: { initialBriefings: DailyBriefing[] }) {
  const [briefings, setBriefings] = useState<DailyBriefing[]>(initialBriefings);
  const [selectedId, setSelectedId] = useState<string | null>(initialBriefings[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [autoplayMode, setAutoplayMode] = useState<AutoplayMode>("same-day");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrls = useRef<Map<string, string>>(new Map());
  const autoStarted = useRef(false);

  const selected = briefings.find((b) => b.id === selectedId) ?? briefings[0] ?? null;

  // Chronological (oldest first), audio-only — what auto-advance-on-end
  // walks through, since "continue playing forward" means oldest-to-newest
  // within a day (premarket -> midday -> close).
  const flatQueue = [...briefings]
    .filter((b) => b.audio_path)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Display order (newest first, same as `briefings`/the rendered playlist),
  // audio-only — what the manual prev/next buttons walk through, so "next"
  // always means "the row below this one in the list" and never flips
  // depending on how auto-advance happens to be sorted internally.
  const displayQueue = briefings.filter((b) => b.audio_path);

  // Read the saved mode after mount, not in a lazy useState initializer —
  // localStorage isn't available during SSR, and seeding state from it at
  // render time would make the server and first client render disagree
  // (the button's label). One-time read of an external, browser-only
  // source, which is what this rule's own guidance carves out.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOPLAY_MODE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "off" || saved === "same-day" || saved === "across-days") setAutoplayMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const cycleAutoplay = useCallback(() => {
    setAutoplayMode((prev) => {
      const next = AUTOPLAY_CYCLE[(AUTOPLAY_CYCLE.indexOf(prev) + 1) % AUTOPLAY_CYCLE.length];
      try {
        localStorage.setItem(AUTOPLAY_MODE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof caches === "undefined") return;
    caches
      .open(AUDIO_CACHE)
      .then((c) => c.keys())
      .then((keys) => {
        const ids = new Set<string>();
        for (const req of keys) {
          const m = req.url.match(/\/api\/briefing\/audio\/([^/?]+)/);
          if (m) ids.add(m[1]);
        }
        setDownloaded(ids);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const ensureAudioSrc = useCallback(
    async (b: DailyBriefing): Promise<string> => {
      const existing = objectUrls.current.get(b.id);
      if (existing) return existing;
      const blob = await fetchAudioBlob(b.id);
      const url = URL.createObjectURL(blob);
      objectUrls.current.set(b.id, url);
      setDownloaded((prev) => new Set(prev).add(b.id));
      return url;
    },
    []
  );

  const select = useCallback((b: DailyBriefing) => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setSelectedId(b.id);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !selected || !selected.audio_path) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      if (!audio.src || !audio.src.startsWith("blob:")) {
        setLoadingAudio(true);
        audio.src = await ensureAudioSrc(selected);
      }
      audio.playbackRate = SPEEDS[speedIdx];
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Playback failed");
    } finally {
      setLoadingAudio(false);
    }
  }, [playing, selected, speedIdx, ensureAudioSrc]);

  const playBriefing = useCallback(
    async (b: DailyBriefing, opts?: { silent?: boolean }) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      setSelectedId(b.id);
      if (!b.audio_path) {
        audio.removeAttribute("src");
        audio.load();
        return;
      }
      try {
        setLoadingAudio(true);
        audio.src = await ensureAudioSrc(b);
        audio.playbackRate = SPEEDS[speedIdx];
        await audio.play();
      } catch (e) {
        // A silent call is an autoplay-on-load attempt — browsers routinely
        // block those with no prior user gesture, which isn't a real error
        // worth surfacing; the episode is still loaded and ready to tap play.
        if (!opts?.silent) setError(e instanceof Error ? e.message : "Playback failed");
      } finally {
        setLoadingAudio(false);
      }
    },
    [ensureAudioSrc, speedIdx]
  );

  /** When an episode ends, continue with the day's next episode; stop after the day's last one. */
  const handleEnded = useCallback(() => {
    setPlaying(false);
    if (autoplayMode === "off") return;
    const cur = briefings.find((b) => b.id === selectedId) ?? briefings[0];
    if (!cur) return;
    const queue =
      autoplayMode === "across-days"
        ? flatQueue
        : flatQueue.filter((b) => b.briefing_date === cur.briefing_date);
    const i = queue.findIndex((b) => b.id === cur.id);
    const next = i >= 0 ? queue[i + 1] : undefined;
    if (next) void playBriefing(next);
    // flatQueue is derived fresh each render from `briefings`, so it's an
    // intentional omission below — including it would just re-add `briefings`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayMode, briefings, selectedId, playBriefing]);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), audio.duration);
  }, []);

  /** Manual prev/next — always walks `displayQueue`, the same newest-first
   *  order the playlist renders in, so "next" always means "the row below
   *  this one" and "prev" always means "the row above" — independent of the
   *  autoplay mode, and independent of the separate oldest-first order
   *  auto-advance-on-end uses internally. */
  const goToOffset = useCallback(
    (delta: 1 | -1) => {
      const cur = briefings.find((b) => b.id === selectedId) ?? briefings[0];
      if (!cur) return;
      const i = displayQueue.findIndex((b) => b.id === cur.id);
      const target = i >= 0 ? displayQueue[i + delta] : undefined;
      if (target) void playBriefing(target);
    },
    // displayQueue is derived fresh each render from `briefings`, so it's an
    // intentional omission — including it would just re-add `briefings`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [briefings, selectedId, playBriefing]
  );

  const setSpeed = useCallback((idx: number) => {
    setSpeedIdx(idx);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[idx];
  }, []);

  // Auto-play the newest episode as soon as the page has one to play.
  // Browsers routinely block programmatic playback with no prior user
  // gesture — that's expected here, not an error, so a rejected play() just
  // leaves the episode loaded and paused, ready for a tap.
  useEffect(() => {
    if (autoStarted.current || !selected?.audio_path) return;
    autoStarted.current = true;
    void playBriefing(selected, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const download = useCallback(async () => {
    if (!selected?.audio_path) return;
    try {
      setLoadingAudio(true);
      await ensureAudioSrc(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setLoadingAudio(false);
    }
  }, [selected, ensureAudioSrc]);

  const regenerate = useCallback(async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Generation failed (${res.status})`);
      }
      const listRes = await fetch("/api/briefing");
      if (listRes.ok) {
        const d = (await listRes.json()) as { briefings: DailyBriefing[] };
        setBriefings(d.briefings);
        if (d.briefings[0]) select(d.briefings[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setRegenerating(false);
    }
  }, [select]);

  if (!selected) {
    return (
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-lg opacity-80">
          <BriefingArt seed={7} mood="quiet" className="w-full h-full" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-text">No briefings yet</h3>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 max-w-xs">
            Your personal pre-market audio update — portfolio moves, news, and what to trade today.
          </p>
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="px-5 py-2.5 rounded-full bg-stone-900 dark:bg-accent text-white text-xs font-semibold disabled:opacity-60"
        >
          {regenerating ? "Generating… takes about a minute" : "Generate today's briefing"}
        </button>
        {error && <p className="text-xs text-rose-600 dark:text-loss">{error}</p>}
      </div>
    );
  }

  const displayDuration = duration || selected.audio_duration_s || 0;
  const mood = selected.mood ?? "quiet";

  // One continuous playlist, newest episode first — `briefings` already
  // arrives in that order from the API. Each row carries its own date/session
  // in its subtitle now that there's no per-day section header to supply it.
  const playlist = briefings;
  const canPrev = displayQueue.findIndex((b) => b.id === selected.id) > 0;
  const canNext = (() => {
    const i = displayQueue.findIndex((b) => b.id === selected.id);
    return i >= 0 && i < displayQueue.length - 1;
  })();

  return (
    <div className="flex flex-col gap-5">
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Cover + meta */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!selected.audio_path || loadingAudio}
          aria-label={playing ? "Pause" : "Play"}
          className="group relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-xl shadow-stone-300/40 dark:shadow-black/40 disabled:cursor-default"
        >
          <BriefingArt seed={artSeed(selected)} mood={mood} className="w-full h-full" />
          {selected.audio_path && (
            <span
              className={`absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 group-active:bg-black/40 transition-colors ${playing ? "" : "sm:bg-black/10"}`}
            >
              <span
                className={`w-14 h-14 rounded-full bg-white/90 text-stone-900 flex items-center justify-center shadow-lg transition-opacity ${
                  playing ? "opacity-0 group-hover:opacity-100" : "opacity-90 group-hover:opacity-100"
                }`}
              >
                {loadingAudio ? (
                  <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
                ) : playing ? (
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <polygon points="8,6.2 18,12 8,17.8" />
                  </svg>
                )}
              </span>
            </span>
          )}
        </button>
        <div className="text-center px-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
            {fmtDate(selected.briefing_date)} · {fmtHour(selected.created_at)}
            {selected.session ? ` · ${BRIEFING_SESSIONS[selected.session].label}` : ""}
            {selected.trigger === "manual" && " · regenerated"}
          </p>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text mt-0.5 leading-snug">
            {selected.title ?? "Daily briefing"}
          </h2>
          {selected.summary && (
            <p className="text-xs text-stone-500 dark:text-text-subtle mt-1">{selected.summary}</p>
          )}
        </div>
      </div>

      {/* Controls */}
      {selected.audio_path ? (
        <div className="flex flex-col gap-2 px-2">
          <input
            type="range"
            min={0}
            max={displayDuration || 1}
            step={0.1}
            value={Math.min(currentTime, displayDuration || 0)}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = t;
              setCurrentTime(t);
            }}
            className="w-full h-1 accent-stone-900 dark:accent-accent cursor-pointer"
          />
          <div className="flex justify-between text-[10px] tabular-nums text-stone-400 dark:text-text-faint">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(displayDuration)}</span>
          </div>
          {/* Three-zone row. The flanks hold one fixed w-12 control each — a wider
              flank (the old 3-pill speed group) can't shrink below its content on
              phones, which shoved the play button off-center. */}
          <div className="flex items-center mt-1">
            <div className="flex-1 flex justify-start">
              <button
                type="button"
                onClick={() => setSpeed((speedIdx + 1) % SPEEDS.length)}
                aria-label={`Playback speed ${SPEEDS[speedIdx]}x — tap to change`}
                className="w-12 h-8 rounded-full border border-stone-200 dark:border-border-subtle text-[11px] font-bold tabular-nums text-stone-600 dark:text-text-subtle"
              >
                {SPEEDS[speedIdx]}x
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => goToOffset(-1)}
                disabled={!canPrev}
                aria-label="Previous episode"
                className="text-stone-700 dark:text-text-muted disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M6 5h2v14H6zM19 5 8 12l11 7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => skip(-15)}
                aria-label="Back 15 seconds"
                className="text-stone-700 dark:text-text-muted text-sm font-semibold"
              >
                ↺15
              </button>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Pause" : "Play"}
                disabled={loadingAudio}
                className="w-16 h-16 rounded-full bg-stone-900 dark:bg-accent text-white flex items-center justify-center shadow-lg disabled:opacity-60 active:scale-95 transition-transform"
              >
                {loadingAudio ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : playing ? (
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  /* Stroke-rounded triangle whose optical center (between centroid
                     and bbox center) lands on x=12 — no CSS nudge needed. */
                  <svg
                    viewBox="0 0 24 24"
                    className="w-7 h-7"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  >
                    <polygon points="8,6.2 18,12 8,17.8" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => skip(15)}
                aria-label="Forward 15 seconds"
                className="text-stone-700 dark:text-text-muted text-sm font-semibold"
              >
                15↻
              </button>
              <button
                type="button"
                onClick={() => goToOffset(1)}
                disabled={!canNext}
                aria-label="Next episode"
                className="text-stone-700 dark:text-text-muted disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M16 5h2v14h-2zM5 5l11 7-11 7z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                type="button"
                onClick={download}
                aria-label="Download for offline"
                className={`w-12 h-8 flex items-center justify-center text-lg ${downloaded.has(selected.id) ? "text-emerald-500 dark:text-gain" : "text-stone-500 dark:text-text-subtle"}`}
              >
                {downloaded.has(selected.id) ? "✓" : "⤓"}
              </button>
            </div>
          </div>
          {downloaded.has(selected.id) && (
            <p className="text-center text-[10px] text-stone-400 dark:text-text-faint">Saved for offline</p>
          )}
          <button
            type="button"
            onClick={cycleAutoplay}
            className="mx-auto flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full border border-stone-200 dark:border-border-subtle text-[10px] font-semibold text-stone-500 dark:text-text-subtle"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            {AUTOPLAY_LABEL[autoplayMode]}
          </button>
        </div>
      ) : (
        <div className="mx-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-950/40 px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Audio unavailable for this briefing — read it under &quot;Today&apos;s moves &amp; details&quot;.
          </p>
        </div>
      )}

      {error && <p className="text-center text-xs text-rose-600 dark:text-loss px-2">{error}</p>}

      {/* Details — highlights, recommended moves, and transcript live behind one
          expander so the page defaults to a playlist view. */}
      {((selected.highlights?.length ?? 0) > 0 ||
        (selected.actions?.length ?? 0) > 0 ||
        selected.transcript) && (
        <div className="bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-stone-900 dark:text-text"
          >
            Today&apos;s moves & details
            <span className="text-stone-400 dark:text-text-faint">{showDetails ? "−" : "+"}</span>
          </button>

          {showDetails && (
            <div className="flex flex-col gap-4 px-4 pb-4">
              {selected.highlights && selected.highlights.length > 0 && (
                <div className="-mx-4 px-4 overflow-x-auto">
                  <div className="flex gap-2 w-max">
                    {selected.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="w-44 flex-shrink-0 bg-stone-50 dark:bg-surface-muted border border-stone-100 dark:border-border-subtle rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-stone-900 dark:text-text">{h.symbol}</span>
                          {h.changePct != null && (
                            <span
                              className={`text-[11px] font-semibold tabular-nums ${
                                h.direction === "down" ? "text-rose-600 dark:text-loss" : h.direction === "up" ? "text-emerald-600 dark:text-gain" : "text-stone-500 dark:text-text-subtle"
                              }`}
                            >
                              {h.changePct >= 0 ? "+" : ""}
                              {h.changePct.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-snug text-stone-500 dark:text-text-subtle mt-1 line-clamp-2">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.actions && selected.actions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
                    Today&apos;s moves
                  </h3>
                  {selected.actions.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 bg-stone-50 dark:bg-surface-muted border border-stone-100 dark:border-border-subtle rounded-xl px-3.5 py-3"
                    >
                      <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${ACTION_BADGE[a.kind] ?? ACTION_BADGE.hold}`}>
                        {a.kind}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-stone-900 dark:text-text">{a.symbol}</span>
                        <p className="text-xs text-stone-500 dark:text-text-subtle leading-snug mt-0.5">{a.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selected.transcript && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTranscript((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-bold text-stone-900 dark:text-text"
                  >
                    Transcript
                    <span className="text-stone-400 dark:text-text-faint">{showTranscript ? "−" : "+"}</span>
                  </button>
                  {showTranscript && (
                    <p className="mt-2 text-[13px] leading-relaxed text-stone-600 dark:text-text-muted whitespace-pre-line">
                      {selected.transcript}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Playlist — one continuous list, newest first. Each row carries its
          own date since there's no per-day section header anymore; auto-play
          and the prev/next buttons walk it in chronological (oldest-first)
          order via flatQueue. */}
      <div className="flex flex-col gap-1.5 pb-4">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint px-1">
          Playlist
        </h3>
        {playlist.map((b) => {
          const isCurrent = b.id === selected.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => (isCurrent ? togglePlay() : playBriefing(b))}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                isCurrent
                  ? "bg-stone-50 dark:bg-surface-muted border-stone-300 dark:border-border-default"
                  : "bg-white dark:bg-surface-elevated border-stone-100 dark:border-border-subtle hover:border-stone-200 dark:hover:border-border-default"
              }`}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <BriefingArt seed={artSeed(b)} mood={b.mood ?? "quiet"} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-stone-900 dark:text-text truncate">
                  {b.title ?? "Daily briefing"}
                </p>
                <p className="text-[10px] text-stone-400 dark:text-text-faint">
                  {fmtDateShort(b.briefing_date)}
                  {b.session ? ` · ${BRIEFING_SESSIONS[b.session].label}` : ""} · {fmtHour(b.created_at)}
                  {b.audio_duration_s ? ` · ${fmtTime(b.audio_duration_s)}` : ""}
                  {downloaded.has(b.id) ? " · ✓ saved" : ""}
                  {!b.audio_path ? " · no audio" : ""}
                </p>
              </div>
              {isCurrent ? (
                <span className="text-[10px] font-bold text-stone-900 dark:text-text flex-shrink-0">
                  {playing ? "❚❚" : "▶"}
                </span>
              ) : (
                <span className="text-[10px] text-stone-300 dark:text-text-faint flex-shrink-0">
                  {b.audio_path ? "▶" : "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Regenerate */}
      <button
        type="button"
        onClick={regenerate}
        disabled={regenerating}
        className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-full border border-stone-200 dark:border-border-default text-xs font-semibold text-stone-600 dark:text-text-subtle disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        {regenerating ? "Regenerating… takes about a minute" : "Regenerate today's briefing"}
      </button>
    </div>
  );
}
