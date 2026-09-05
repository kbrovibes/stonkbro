"use client";

/**
 * FLIP re-sort for the results list.
 *
 * When a re-scan ranks a setup above ones already on screen, the card has to
 * be seen travelling to its new position — a list that silently rearranges
 * between frames reads as a glitch. Measure before, reorder, invert with a
 * transform, play at 240ms.
 *
 * Only `transform` animates, only the top rows animate (everything below the
 * cap snaps), and under `prefers-reduced-motion` nothing moves at all.
 */

import { useCallback, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "@/components/refresh";

const FLIP_MS = 240;
const EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
/** Matches the list-entry stagger cap in `refresh-primitives.css`. */
const CAP = 12;

export function useFlipList(order: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const previous = useRef(new Map<string, number>());

  // One stable callback per key: a fresh closure every render would detach
  // and re-attach every card's ref on every render.
  const callbacks = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const register = useCallback((key: string) => {
    let cb = callbacks.current.get(key);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) nodes.current.set(key, el);
        else nodes.current.delete(key);
      };
      callbacks.current.set(key, cb);
    }
    return cb;
  }, []);

  // Runs after every commit: FLIP has to re-measure whatever is on screen to
  // have a position to travel from next time the order changes.
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const animate = !prefersReducedMotion();

    order.slice(0, CAP).forEach((key) => {
      const el = nodes.current.get(key);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      next.set(key, top);

      const before = previous.current.get(key);
      if (!animate || before === undefined) return;
      const delta = before - top;
      if (Math.abs(delta) < 1) return;

      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      // Read forces the inverted position to commit before the play frame.
      void el.offsetHeight;
      el.style.transition = `transform ${FLIP_MS}ms ${EASE}`;
      el.style.transform = "";
      const clear = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", clear);
      };
      el.addEventListener("transitionend", clear);
    });

    // Rows past the cap still get measured, so that a card promoted into the
    // top twelve later has a position to travel from.
    order.slice(CAP).forEach((key) => {
      const el = nodes.current.get(key);
      if (el) next.set(key, el.getBoundingClientRect().top);
    });

    previous.current = next;
  }, [order]);

  return register;
}
