/**
 * Daily audio briefing — shared types.
 * The DB row shape (daily_briefings table) and the JSON contract the AI
 * script generator must return. Frontend and backend both import from here.
 */

export type BriefingMood = "up" | "down" | "mixed" | "quiet";

export type BriefingHighlight = {
  symbol: string;
  /** Percent move driving the mention (null when not price-driven, e.g. news-only). */
  changePct: number | null;
  direction: "up" | "down" | "flat";
  /** One plain-English sentence: what happened and why it matters to the portfolio. */
  note: string;
};

export type BriefingAction = {
  kind: "close" | "open" | "roll" | "watch" | "hold";
  symbol: string;
  /** One sentence: the concrete suggestion and the reason. */
  detail: string;
};

/** What the AI generator must return (JSON). */
export type BriefingScript = {
  /** Short punchy headline for the card, e.g. "NVDA rips, roll your SOFI puts". Max ~60 chars. */
  title: string;
  /** 1–2 sentence teaser shown on the home card. */
  summary: string;
  /** Full spoken script, plain prose, no markdown/headers, ~350–500 words. */
  transcript: string;
  highlights: BriefingHighlight[];
  actions: BriefingAction[];
  mood: BriefingMood;
};

export type BriefingStatus = "running" | "completed" | "failed";
export type BriefingTrigger = "cron" | "manual";

/** Three episodes per trading day. */
export type BriefingSession = "premarket" | "midday" | "close";

export const BRIEFING_SESSIONS: Record<BriefingSession, { label: string; focus: string }> = {
  premarket: {
    label: "Pre-market",
    focus:
      "Pre-open setup: overnight futures and index tone, pre-market movers among their names, today's earnings/news to watch, and what to do at the open.",
  },
  midday: {
    label: "Market open",
    focus:
      "The first hour is done: how the open actually went versus the pre-market read, biggest moves among their names since the bell, whether any open positions need intraday action, and what to watch into the afternoon.",
  },
  close: {
    label: "After close",
    focus:
      "The day is done: how the session closed, their portfolio's biggest winners and losers on the day, after-hours movers and earnings reactions among their names, and the setup for tomorrow.",
  },
};

export function isBriefingSession(v: unknown): v is BriefingSession {
  return v === "premarket" || v === "midday" || v === "close";
}

/** Row in daily_briefings. */
export type DailyBriefing = {
  id: string;
  /** Market date, YYYY-MM-DD in America/New_York. */
  briefing_date: string;
  status: BriefingStatus;
  trigger: BriefingTrigger;
  /** Which of the day's three episodes this is; old rows default to premarket. */
  session: BriefingSession | null;
  title: string | null;
  summary: string | null;
  transcript: string | null;
  highlights: BriefingHighlight[] | null;
  actions: BriefingAction[] | null;
  mood: BriefingMood | null;
  /** Seed for the deterministic generated cover art. */
  art_seed: number | null;
  /** Path inside the private "briefings" storage bucket, null if TTS failed. */
  audio_path: string | null;
  audio_bytes: number | null;
  audio_duration_s: number | null;
  voice: string | null;
  error_message: string | null;
  created_at: string;
};

/** GET /api/briefing response: latest completed-or-running row per date, newest first. */
export type BriefingListResponse = {
  briefings: DailyBriefing[];
};

/** Audio for briefing `id` streams from GET /api/briefing/audio/[id] (auth-gated). */
export const BRIEFING_AUDIO_ROUTE = (id: string) => `/api/briefing/audio/${id}`;

/** Voice + prosody used for TTS (Microsoft Edge neural voice, free endpoint). */
export const BRIEFING_VOICE = "en-US-AndrewNeural";
export const BRIEFING_RATE = "+10%";
/** 24 kHz / 48 kbps mono MP3 ≈ 6 KB per second — a 3-min briefing is ~1 MB. */
export const BRIEFING_AUDIO_KBPS = 48;

export const BRIEFING_HISTORY_DAYS = 7;
export const BRIEFING_BUCKET = "briefings";
