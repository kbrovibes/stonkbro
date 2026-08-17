import { applyTheme, getStoredTheme } from "./theme";

/**
 * "Theme style" is an orthogonal axis to light/dark mode.
 *
 * - `classic` — the original stonkBRO look. Renders pixel-identically to
 *   before this file existed: no attribute is set on <html> at all.
 * - `hood`    — the HOOD design system. Sets `data-theme-style="hood"` on
 *   <html>; every visual difference lives in CSS (`hood.css` /
 *   `hood-motion.css`) scoped under that attribute, so both light and dark
 *   modes keep working.
 *
 * Persistence mirrors the font-theme pattern in `theme-fonts.ts`:
 * localStorage + an `applyX()` side-effect helper + an inline pre-paint
 * script so there is no flash of the wrong canvas.
 */
export type ThemeStyle = "classic" | "hood";

export const THEME_STYLE_STORAGE_KEY = "stonkbro-theme-style";
export const THEME_STYLE_ATTR = "data-theme-style";
export const THEME_STYLE_EVENT = "stonkbro:theme-style-change";

/** Never change this — Classic is the guaranteed-unchanged default. */
export const DEFAULT_THEME_STYLE: ThemeStyle = "classic";

export interface ThemeStyleOption {
  key: ThemeStyle;
  label: string;
  hint: string;
}

export const THEME_STYLES: ThemeStyleOption[] = [
  { key: "classic", label: "Classic", hint: "The original stonkBRO look. Set per device." },
  { key: "hood", label: "HOOD", hint: "True-black canvas, oversized money, pill controls. Set per device." },
];

export function isThemeStyle(v: unknown): v is ThemeStyle {
  return v === "classic" || v === "hood";
}

export function getStoredThemeStyle(): ThemeStyle {
  if (typeof window === "undefined") return DEFAULT_THEME_STYLE;
  try {
    const v = localStorage.getItem(THEME_STYLE_STORAGE_KEY);
    if (isThemeStyle(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_STYLE;
}

/** Reflect the style on <html>. Classic removes the attribute entirely. */
export function applyThemeStyle(style: ThemeStyle): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (style === "hood") root.setAttribute(THEME_STYLE_ATTR, "hood");
  else root.removeAttribute(THEME_STYLE_ATTR);
  // HOOD swaps the canvas (#000 / #FFF), so the PWA status-bar colour has to
  // be recomputed. applyTheme() reads the attribute we just set.
  applyTheme(getStoredTheme());
}

export function setThemeStyle(style: ThemeStyle): void {
  try {
    localStorage.setItem(THEME_STYLE_STORAGE_KEY, style);
  } catch {
    /* ignore */
  }
  applyThemeStyle(style);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_STYLE_EVENT, { detail: style }));
  }
}

/** Inline pre-paint script source. Injected into <head> to prevent FOUC. */
export const PRE_PAINT_THEME_STYLE_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STYLE_STORAGE_KEY}');if(s==='hood')document.documentElement.setAttribute('${THEME_STYLE_ATTR}','hood');}catch(e){}})();`;
