import type { BriefingMood } from "@/lib/briefing/types";

/**
 * Deterministic generative cover art. Same seed + mood always renders the
 * same image, so the art is stable across the card, player, and history.
 */

type Palette = {
  base: [string, string];
  orbs: string[];
  bars: string;
  glow: string;
};

const PALETTES: Record<BriefingMood, Palette> = {
  up:    { base: ["#022c22", "#064e3b"], orbs: ["#10b981", "#14b8a6", "#34d399"], bars: "#6ee7b7", glow: "#34d399" },
  down:  { base: ["#1c0a0f", "#450a0a"], orbs: ["#f43f5e", "#ef4444", "#fb7185"], bars: "#fda4af", glow: "#fb7185" },
  mixed: { base: ["#1e1b4b", "#2e1065"], orbs: ["#8b5cf6", "#f59e0b", "#a78bfa"], bars: "#c4b5fd", glow: "#a78bfa" },
  quiet: { base: ["#0f172a", "#1e293b"], orbs: ["#38bdf8", "#64748b", "#7dd3fc"], bars: "#94a3b8", glow: "#7dd3fc" },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function BriefingArt({
  seed,
  mood,
  className = "",
}: {
  seed: number;
  mood: BriefingMood;
  className?: string;
}) {
  const p = PALETTES[mood] ?? PALETTES.quiet;
  const rnd = mulberry32(seed);
  const uid = `ba${(seed >>> 0).toString(36)}${mood}`;

  const orbs = Array.from({ length: 3 + Math.floor(rnd() * 2) }, (_, i) => ({
    cx: 40 + rnd() * 320,
    cy: 30 + rnd() * 240,
    r: 60 + rnd() * 90,
    fill: p.orbs[i % p.orbs.length],
    opacity: 0.22 + rnd() * 0.2,
  }));

  const bars = Array.from({ length: 28 }, (_, i) => {
    const h = 8 + rnd() * 70 * (0.55 + 0.45 * Math.sin((i / 27) * Math.PI));
    return { x: 24 + i * 12.6, h };
  });

  const grain = Array.from({ length: 42 }, () => ({
    cx: rnd() * 400,
    cy: rnd() * 400,
    r: 0.6 + rnd() * 1.2,
    opacity: 0.04 + rnd() * 0.1,
  }));

  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Briefing cover art">
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.base[0]} />
          <stop offset="100%" stopColor={p.base[1]} />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="400" fill={`url(#${uid}-bg)`} />
      {orbs.map((o, i) => (
        <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill={o.fill} opacity={o.opacity} filter={`url(#${uid}-blur)`} />
      ))}
      <circle cx="200" cy="330" r="160" fill={`url(#${uid}-glow)`} />

      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={340 - b.h}
          width="7"
          height={b.h}
          rx="3.5"
          fill={p.bars}
          opacity="0.75"
        />
      ))}

      {grain.map((g, i) => (
        <circle key={i} cx={g.cx} cy={g.cy} r={g.r} fill="#fff" opacity={g.opacity} />
      ))}
    </svg>
  );
}
