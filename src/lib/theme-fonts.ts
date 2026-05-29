/**
 * Single source of truth for the user-pickable "Theme" fonts.
 *
 * Each entry knows its display name, the Google-Fonts CSS URL to lazy-load
 * when first selected, and the actual `font-family` stack to set on the
 * document root via the `--app-font` CSS variable.
 *
 * Default ("jakarta") is the one bundled via next/font in the root layout,
 * so no extra network round-trip is needed for first paint.
 */
export interface ThemeFont {
  key: string;
  label: string;
  /** null when the font is bundled (no on-demand fetch). */
  googleUrl: string | null;
  family: string;
}

export const THEME_FONTS: ThemeFont[] = [
  {
    key: "jakarta",
    label: "Plus Jakarta (default)",
    googleUrl: null,
    family: "var(--font-jakarta), system-ui, sans-serif",
  },
  {
    key: "system",
    label: "System",
    googleUrl: null,
    family: "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif",
  },
  {
    key: "inter",
    label: "Inter",
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
    family: "'Inter', system-ui, sans-serif",
  },
  {
    key: "geist",
    label: "Geist",
    googleUrl: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap",
    family: "'Geist', system-ui, sans-serif",
  },
  {
    key: "sora",
    label: "Sora",
    googleUrl: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap",
    family: "'Sora', system-ui, sans-serif",
  },
  {
    key: "space",
    label: "Space Grotesk",
    googleUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
    family: "'Space Grotesk', system-ui, sans-serif",
  },
  {
    key: "manrope",
    label: "Manrope",
    googleUrl: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
    family: "'Manrope', system-ui, sans-serif",
  },
  {
    key: "bricolage",
    label: "Bricolage Grotesque",
    googleUrl: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap",
    family: "'Bricolage Grotesque', system-ui, sans-serif",
  },
  {
    key: "outfit",
    label: "Outfit",
    googleUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap",
    family: "'Outfit', system-ui, sans-serif",
  },
  {
    key: "mono",
    label: "JetBrains Mono (terminal)",
    googleUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
    family: "'JetBrains Mono', ui-monospace, monospace",
  },
];

export const THEME_FONT_STORAGE_KEY = "stonkbro-theme-font";
export const DEFAULT_THEME_FONT_KEY = "jakarta";

export function findThemeFont(key: string | null | undefined): ThemeFont {
  return THEME_FONTS.find((f) => f.key === key) ?? THEME_FONTS[0];
}

/**
 * Inject the Google-Fonts link tag for a theme (no-op if already injected
 * or if the font is bundled). Safe to call from any client component.
 */
export function ensureThemeFontLoaded(theme: ThemeFont): void {
  if (typeof document === "undefined") return;
  if (!theme.googleUrl) return;
  const id = `theme-font-${theme.key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = theme.googleUrl;
  document.head.appendChild(link);
}

/** Apply the chosen theme font to the document and persist the choice. */
export function applyThemeFont(key: string): void {
  if (typeof document === "undefined") return;
  const theme = findThemeFont(key);
  ensureThemeFontLoaded(theme);
  document.documentElement.style.setProperty("--app-font", theme.family);
  try { localStorage.setItem(THEME_FONT_STORAGE_KEY, theme.key); } catch { /* ignore */ }
}
