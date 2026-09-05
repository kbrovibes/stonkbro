/**
 * One requestAnimationFrame loop for the whole refresh motion layer.
 *
 * A screen can hold thirty `MonoNumber`s; thirty independent rAF loops is
 * thirty callbacks and thirty chances to miss a frame. Everything that needs
 * per-frame work subscribes here instead. The loop starts on the first
 * subscriber and stops the moment the last one leaves, so an idle screen
 * costs nothing.
 */

type Tick = (now: number) => void;

const subscribers = new Set<Tick>();
let handle = 0;

function frame(now: number): void {
  handle = 0;
  // Snapshot: a tick is allowed to unsubscribe itself mid-iteration.
  for (const tick of Array.from(subscribers)) tick(now);
  if (subscribers.size > 0) handle = requestAnimationFrame(frame);
}

/** Subscribe to the shared loop. Returns an unsubscribe function. */
export function subscribeRaf(tick: Tick): () => void {
  subscribers.add(tick);
  if (handle === 0 && typeof requestAnimationFrame === "function") {
    handle = requestAnimationFrame(frame);
  }
  return () => {
    subscribers.delete(tick);
    if (subscribers.size === 0 && handle !== 0) {
      cancelAnimationFrame(handle);
      handle = 0;
    }
  };
}

/** True when the user has asked the OS for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Cheap synchronous "is any part of this on screen right now". */
export function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = window.innerHeight || document.documentElement.clientHeight;
  const w = window.innerWidth || document.documentElement.clientWidth;
  return r.bottom > 0 && r.top < h && r.right > 0 && r.left < w;
}

/**
 * The refresh easing curve, `cubic-bezier(0.2, 0.7, 0.2, 1)`, as a function
 * of progress — CSS owns every other animation, but count-up runs in JS and
 * has to match the curve the CSS uses or the screen feels inconsistent.
 */
export function easeRefresh(t: number): number {
  return bezier(t, 0.2, 0.7, 0.2, 1);
}

function bezierComponent(t: number, a: number, b: number): number {
  // Expanded cubic Bézier with p0=0 and p3=1.
  const inv = 1 - t;
  return 3 * inv * inv * t * a + 3 * inv * t * t * b + t * t * t;
}

function bezierSlope(t: number, a: number, b: number): number {
  const inv = 1 - t;
  return 3 * inv * inv * a + 6 * inv * t * (b - a) + 3 * t * t * (1 - b);
}

function bezier(x: number, x1: number, y1: number, x2: number, y2: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Newton–Raphson, then bisection if the slope goes flat.
  let t = x;
  for (let i = 0; i < 6; i++) {
    const err = bezierComponent(t, x1, x2) - x;
    if (Math.abs(err) < 1e-5) return bezierComponent(t, y1, y2);
    const slope = bezierSlope(t, x1, x2);
    if (Math.abs(slope) < 1e-6) break;
    t -= err / slope;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 20; i++) {
    const v = bezierComponent(t, x1, x2);
    if (Math.abs(v - x) < 1e-5) break;
    if (v > x) hi = t;
    else lo = t;
    t = (lo + hi) / 2;
  }
  return bezierComponent(t, y1, y2);
}
