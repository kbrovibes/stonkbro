export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "stonkbro-theme";

/** Default mode for users who have never set a preference. */
export const DEFAULT_THEME: ThemeMode = "dark";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    // HOOD swaps the canvas to true-black / paper-white, so the status-bar
    // colour follows the active theme style (see `theme-style.ts`).
    const hood = document.documentElement.getAttribute("data-theme-style") === "hood";
    const content = resolved === "dark"
      ? (hood ? "#000000" : "#0E1014")
      : (hood ? "#FFFFFF" : "#FAFAF9");
    meta.setAttribute("content", content);
  }
}

export function setTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("stonkbro:theme-change", { detail: mode }));
  }
}

/** Inline pre-paint script source. Injected into <head> to prevent FOUC. */
export const PRE_PAINT_THEME_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'&&t!=='system')t='${DEFAULT_THEME}';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;if(r==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
