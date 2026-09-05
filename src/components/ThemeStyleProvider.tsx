"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyThemeStyle,
  getStoredThemeStyle,
  isThemeStyle,
  DEFAULT_THEME_STYLE,
  THEME_STYLE_ATTR,
  THEME_STYLE_EVENT,
  type ThemeStyle,
} from "@/lib/theme-style";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_STYLE_EVENT, onChange);
  return () => window.removeEventListener(THEME_STYLE_EVENT, onChange);
}

/** The DOM attribute is the source of truth — the pre-paint script sets it. */
function getSnapshot(): ThemeStyle {
  const attr = document.documentElement.getAttribute(THEME_STYLE_ATTR);
  return isThemeStyle(attr) ? attr : "classic";
}

function getServerSnapshot(): ThemeStyle {
  return DEFAULT_THEME_STYLE;
}

/**
 * Read the active theme style from any client component.
 *
 * Prefer plain `hood-*` / `refresh-*` marker classes (styled in `hood.css` /
 * `refresh.css`) over this hook:
 * marker classes work in Server Components and never flash. Reach for the
 * hook only when the difference genuinely needs JavaScript — e.g. the
 * Settings selector, or motion that has to be skipped outright.
 */
export function useThemeStyle(): ThemeStyle {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Re-applies the stored theme style on mount (in case the pre-paint script
 * missed) and keeps the PWA status-bar colour in sync. No render output.
 */
export default function ThemeStyleProvider() {
  useEffect(() => {
    applyThemeStyle(getStoredThemeStyle());
  }, []);
  return null;
}
