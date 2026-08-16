"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BriefingArt from "./BriefingArt";
import {
  BRIEFING_AUDIO_ROUTE,
  type BriefingAction,
  type DailyBriefing,
} from "@/lib/briefing/types";

const AUDIO_CACHE = "briefing-audio";
const SPEEDS = [1, 1.25, 1.5];

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
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrls = useRef<Map<string, string>>(new Map());

  const selected = briefings.find((b) => b.id === selectedId) ?? briefings[0] ?? null;

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

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), audio.duration);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedIdx((i) => {
      const next = (i + 1) % SPEEDS.length;
      if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
      return next;
    });
  }, []);

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

  return (
    <div className="flex flex-col gap-5">
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />

      {/* Cover + meta */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-xl shadow-stone-300/40 dark:shadow-black/40">
          <BriefingArt seed={artSeed(selected)} mood={mood} className="w-full h-full" />
        </div>
        <div className="text-center px-2">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint">
            {fmtDate(selected.briefing_date)}
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
          <div className="flex items-center justify-center gap-6 mt-1">
            <button
              type="button"
              onClick={cycleSpeed}
              className="w-12 text-xs font-bold text-stone-600 dark:text-text-subtle tabular-nums"
            >
              {SPEEDS[speedIdx]}x
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
                <svg viewBox="0 0 24 24" className="w-7 h-7 translate-x-0.5" fill="currentColor">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
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
              onClick={download}
              aria-label="Download for offline"
              className={`w-12 text-lg ${downloaded.has(selected.id) ? "text-emerald-500 dark:text-gain" : "text-stone-500 dark:text-text-subtle"}`}
            >
              {downloaded.has(selected.id) ? "✓" : "⤓"}
            </button>
          </div>
          {downloaded.has(selected.id) && (
            <p className="text-center text-[10px] text-stone-400 dark:text-text-faint">Saved for offline</p>
          )}
        </div>
      ) : (
        <div className="mx-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-950/40 px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Audio unavailable for this briefing — transcript below.
          </p>
        </div>
      )}

      {error && <p className="text-center text-xs text-rose-600 dark:text-loss px-2">{error}</p>}

      {/* Highlights */}
      {selected.highlights && selected.highlights.length > 0 && (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {selected.highlights.map((h, i) => (
              <div
                key={i}
                className="w-44 flex-shrink-0 bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl px-3 py-2.5"
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

      {/* Actions */}
      {selected.actions && selected.actions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint px-1">
            Today&apos;s moves
          </h3>
          {selected.actions.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl px-3.5 py-3"
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

      {/* Transcript */}
      {selected.transcript && (
        <div className="bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-stone-900 dark:text-text"
          >
            Transcript
            <span className="text-stone-400 dark:text-text-faint">{showTranscript ? "−" : "+"}</span>
          </button>
          {showTranscript && (
            <p className="px-4 pb-4 text-[13px] leading-relaxed text-stone-600 dark:text-text-muted whitespace-pre-line">
              {selected.transcript}
            </p>
          )}
        </div>
      )}

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

      {/* History */}
      {briefings.length > 1 && (
        <div className="flex flex-col gap-2 pb-4">
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-stone-400 dark:text-text-faint px-1">
            Previous briefings
          </h3>
          {briefings
            .filter((b) => b.id !== selected.id)
            .map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => select(b)}
                className="flex items-center gap-3 bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-xl px-3 py-2.5 text-left hover:border-stone-200 dark:hover:border-border-default transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <BriefingArt seed={artSeed(b)} mood={b.mood ?? "quiet"} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 dark:text-text truncate">
                    {b.title ?? "Daily briefing"}
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-text-faint">
                    {fmtDate(b.briefing_date)}
                    {b.audio_duration_s ? ` · ${fmtTime(b.audio_duration_s)}` : ""}
                  </p>
                </div>
                {downloaded.has(b.id) && (
                  <span className="text-[10px] text-emerald-500 dark:text-gain flex-shrink-0">✓ saved</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
