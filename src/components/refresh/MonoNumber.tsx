"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { easeRefresh, isInViewport, prefersReducedMotion, subscribeRaf } from "./raf";

const COUNT_MS = 600;
const FLASH_MS = 300;

/** `useLayoutEffect` that does not warn during SSR. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface MonoNumberProps {
  /** The number to render. Everything else is presentation. */
  value: number;
  /** Font size in px (a string is passed through as a CSS length). */
  size?: number | string;
  weight?: 400 | 500 | 600 | 700;
  /** Resting colour. Any CSS colour; usually `var(--up)` / `var(--text)`. */
  color?: string;
  /** Rendered at full size, before the digits. */
  prefix?: string;
  /** Rendered after the digits — `%`, `×`, `s`. */
  suffix?: string;
  /**
   * Suffix size as a fraction of `size`. Hero numbers set a unit at roughly
   * half the size of the digits, inline: pass `0.55`.
   */
  suffixScale?: number;
  /** Fixed decimal places. Defaults to 0 for integers, 2 otherwise. */
  decimals?: number;
  /** Full formatting override. Receives the live value during count-up. */
  format?: (n: number) => string;
  /** Privacy mask. Renders bullets at exactly the value's width. */
  mask?: boolean;
  letterSpacing?: string;
  /** Count up 0 → value on mount. Default true. */
  countUp?: boolean;
  /** Flash changed digits on update. Default true. */
  flash?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function defaultFormat(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Every number in the refresh design, in IBM Plex Mono with tabular figures.
 *
 * Two motions live here and nowhere else:
 *
 * - **Count-up**, 0 → value over 600ms on the refresh easing curve, once per
 *   mount. Not on scroll into view: a number that re-counts every time it
 *   scrolls past reads as a bug.
 * - **Digit flash**, 300ms, on only the digits that actually changed —
 *   `up` for an increase, `down` for a decrease. Tabular figures guarantee
 *   the rest of the number does not move.
 *
 * Both run off the single shared rAF loop in `raf.ts`, only while the element
 * is on screen, and neither runs under `prefers-reduced-motion` — there the
 * value simply appears.
 */
export default function MonoNumber({
  value,
  size = 15,
  weight = 600,
  color = "var(--text)",
  prefix = "",
  suffix = "",
  suffixScale = 1,
  decimals,
  format,
  mask = false,
  letterSpacing,
  countUp = true,
  flash = true,
  className = "",
  style,
}: MonoNumberProps) {
  const places = decimals ?? (Number.isInteger(value) ? 0 : 2);
  const fmt = useMemo(
    () => format ?? ((n: number) => defaultFormat(n, places)),
    [format, places],
  );

  const target = useMemo(() => fmt(value), [fmt, value]);

  const ref = useRef<HTMLSpanElement>(null);
  // Server and first client render agree on the final value — the count-up
  // rewinds to 0 in a layout effect, before the browser paints.
  const [display, setDisplay] = useState(target);
  const [flashState, setFlashState] = useState<{ dir: "up" | "down"; at: Set<number> } | null>(null);

  const prevValue = useRef(value);
  const prevTarget = useRef(target);
  const mounted = useRef(false);

  /* -- count-up, once, on mount --------------------------------------- */
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!countUp || !el || prefersReducedMotion() || value === 0) return;
    // Offscreen at mount means no animation at all. It deliberately does not
    // start later when scrolled into view.
    if (!isInViewport(el)) return;

    setDisplay(fmt(0));
    const start = performance.now();
    let stopVisibility: (() => void) | undefined;

    const stop = subscribeRaf((now) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      setDisplay(t >= 1 ? target : fmt(value * easeRefresh(t)));
      if (t >= 1) finish();
    });

    function finish() {
      stop();
      stopVisibility?.();
      setDisplay(target);
    }

    // Scrolling away mid-flight snaps to the value rather than burning frames.
    if (typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) finish();
      });
      io.observe(el);
      stopVisibility = () => io.disconnect();
    }

    // Mount only, by design: a number that re-counts on every scroll-past
    // reads as a bug, so `value` is deliberately not a dependency.
    return finish;
  }, []);

  /* -- digit flash on update ------------------------------------------ */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevValue.current = value;
      prevTarget.current = target;
      return;
    }
    const previous = prevTarget.current;
    const previousValue = prevValue.current;
    prevValue.current = value;
    prevTarget.current = target;

    setDisplay(target);
    if (!flash || value === previousValue || prefersReducedMotion()) return;

    const at = new Set<number>();
    for (let i = 0; i < target.length; i++) {
      if (target[i] !== previous[previous.length - target.length + i]) at.add(i);
    }
    if (at.size === 0) return;

    setFlashState({ dir: value > previousValue ? "up" : "down", at });
    const timer = setTimeout(() => setFlashState(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [value, target, flash]);

  /* -- render ----------------------------------------------------------- */
  const fontSize = typeof size === "number" ? `${size}px` : size;
  const suffixSize =
    typeof size === "number" ? `${Math.round(size * suffixScale)}px` : `calc(${size} * ${suffixScale})`;

  // Pad to the final width so a count-up never reflows its row. In a
  // monospaced face with `white-space: pre` a space is exactly a digit wide.
  const body = mask ? "•".repeat(target.length) : display.padStart(target.length, " ");

  return (
    <span
      ref={ref}
      className={`refresh-number ${className}`}
      style={{
        fontSize,
        fontWeight: weight,
        color,
        letterSpacing,
        ["--refresh-rest" as string]: color,
        ...style,
      }}
      aria-label={`${prefix}${mask ? "hidden" : target}${suffix}`}
    >
      {/* Keyed on `mask` so toggling privacy replays the 140ms cross-fade.
          Width is unchanged either way, so nothing around it moves. */}
      <span key={mask ? "masked" : "value"} className="refresh-mask-fade" aria-hidden="true">
        {prefix}
        {flashState && !mask
          ? Array.from(body).map((char, i) => (
              <span
                key={i}
                className={flashState.at.has(i) ? `refresh-flash-${flashState.dir}` : undefined}
              >
                {char}
              </span>
            ))
          : body}
        {suffix ? <span style={{ fontSize: suffixSize }}>{suffix}</span> : null}
      </span>
    </span>
  );
}
