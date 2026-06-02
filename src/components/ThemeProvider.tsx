"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

/**
 * Re-applies the stored theme on mount (in case the pre-paint script missed)
 * and subscribes to OS color-scheme changes when mode is `system`.
 */
export default function ThemeProvider() {
  useEffect(() => {
    applyTheme(getStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return null;
}
