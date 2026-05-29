"use client";

import { useEffect } from "react";
import { applyThemeFont, DEFAULT_THEME_FONT_KEY, THEME_FONT_STORAGE_KEY } from "@/lib/theme-fonts";

/**
 * Hydrates the user's chosen Theme font on mount. Runs once globally.
 * No render output — purely a side-effect provider.
 */
export default function ThemeFontProvider() {
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_FONT_STORAGE_KEY); } catch { /* ignore */ }
    applyThemeFont(saved || DEFAULT_THEME_FONT_KEY);
  }, []);
  return null;
}
