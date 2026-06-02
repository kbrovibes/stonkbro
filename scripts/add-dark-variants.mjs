#!/usr/bin/env node
/**
 * Adds dark: variant companions next to light-mode utility classes.
 * Idempotent: never duplicates an existing `dark:X` annotation.
 *
 * Run from repo root: node scripts/add-dark-variants.mjs [path]
 * Default path: src
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Light class → dark companion (added immediately after, separated by space)
const MAP = [
  // Neutrals — surfaces
  ["bg-white", "bg-surface-elevated"],
  ["bg-stone-50", "bg-surface"],
  ["bg-stone-100", "bg-surface-muted"],
  ["bg-stone-200", "bg-surface-sunken"],
  // bg-stone-900 in light = dark CTA button. In dark, swap to elevated
  // surface so `text-white` on it stays high-contrast (#FFF on #16191D = AAA).
  ["bg-stone-900", "bg-surface-elevated"],
  ["bg-gray-100", "bg-surface-muted"],
  ["bg-gray-200", "bg-surface-sunken"],

  // Borders
  ["border-stone-50", "border-border-subtle"],
  ["border-stone-100", "border-border-subtle"],
  ["border-stone-200", "border-border-default"],
  ["border-stone-300", "border-border-strong"],
  ["border-gray-100", "border-border-subtle"],
  ["border-gray-200", "border-border-default"],

  // Text neutrals
  ["text-stone-900", "text-text"],
  ["text-stone-800", "text-text"],
  ["text-stone-700", "text-text-muted"],
  ["text-stone-600", "text-text-muted"],
  ["text-stone-500", "text-text-subtle"],
  ["text-stone-400", "text-text-faint"],
  ["text-stone-300", "text-text-faint"],
  ["text-gray-900", "text-text"],
  ["text-gray-800", "text-text"],
  ["text-gray-700", "text-text-muted"],
  ["text-gray-600", "text-text-muted"],
  ["text-gray-500", "text-text-subtle"],
  ["text-gray-400", "text-text-faint"],

  // Divides
  ["divide-stone-100", "divide-border-subtle"],
  ["divide-stone-200", "divide-border-default"],

  // Hover/active surfaces
  ["hover:bg-stone-50", "dark:hover:bg-surface-muted"],
  ["hover:bg-stone-100", "dark:hover:bg-surface-muted"],
  ["hover:bg-stone-200", "dark:hover:bg-surface-sunken"],
  ["hover:bg-white", "dark:hover:bg-surface-elevated"],
  ["active:bg-stone-100", "dark:active:bg-surface-muted"],
  ["active:bg-stone-50", "dark:active:bg-surface-muted"],
  ["active:bg-sky-50", "dark:active:bg-accent-bg"],

  // Gain (emerald)
  ["text-emerald-600", "text-gain"],
  ["text-emerald-700", "text-gain-strong"],
  ["text-emerald-800", "text-gain-strong"],
  ["bg-emerald-50", "bg-gain-bg"],
  ["bg-emerald-100", "bg-gain-bg"],
  ["border-emerald-200", "border-gain-border"],
  ["border-emerald-100", "border-gain-border"],

  // Gain (green alias)
  ["text-green-600", "text-gain"],
  ["text-green-700", "text-gain-strong"],
  ["bg-green-50", "bg-gain-bg"],

  // Loss (red)
  ["text-red-500", "text-loss"],
  ["text-red-600", "text-loss"],
  ["text-red-700", "text-loss-strong"],
  ["text-red-800", "text-loss-strong"],
  ["bg-red-50", "bg-loss-bg"],
  ["bg-red-100", "bg-loss-bg"],
  ["border-red-200", "border-loss-border"],
  ["border-red-100", "border-loss-border"],

  // Loss (rose alias — used in some sparkline contexts)
  ["text-rose-600", "text-loss"],
  ["text-rose-700", "text-loss-strong"],
  ["bg-rose-50", "bg-loss-bg"],

  // Accent (sky)
  ["text-sky-600", "text-accent"],
  ["text-sky-700", "text-accent-hover"],
  ["text-sky-800", "text-accent-hover"],
  ["bg-sky-50", "bg-accent-bg"],
  ["bg-sky-100", "bg-accent-bg"],
  ["border-sky-200", "border-accent-border"],
  ["border-sky-100", "border-accent-border"],
  ["hover:bg-sky-50", "dark:hover:bg-accent-bg"],
];

// Find all tsx files via git (respects .gitignore)
const root = process.argv[2] || "src";
const files = execSync(`git ls-files '${root}/**/*.tsx' '${root}/**/*.ts'`, { encoding: "utf-8" })
  .split("\n")
  .filter((f) => f && (f.endsWith(".tsx") || f.endsWith(".ts")));

let touched = 0;
let totalSubs = 0;

for (const file of files) {
  const orig = readFileSync(file, "utf-8");
  let out = orig;
  let fileSubs = 0;

  for (const [light, dark] of MAP) {
    const isAlreadyDarkPrefixed = light.startsWith("dark:");
    const darkClass = dark.startsWith("dark:") ? dark : `dark:${dark}`;

    // Skip already-prefixed sources (we only annotate light-mode utilities).
    if (isAlreadyDarkPrefixed) continue;

    // Regex:
    //   - Not preceded by dark: (negative lookbehind for "dark:")
    //   - Not followed by / (skips bg-white/80 opacity modifiers)
    //   - Not followed by - or word char (so bg-stone-100 doesn't match bg-stone-1000)
    //   - Class must already be a complete token (boundary at start: whitespace/quote/{/`/start)
    const escaped = light.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?<![\\w:-])${escaped}(?![\\w/-])`,
      "g"
    );

    out = out.replace(pattern, (match, offset, source) => {
      // Check we're not about to add a duplicate dark: companion already present after this match
      const after = source.slice(offset + match.length, offset + match.length + 60);
      if (after.includes(darkClass)) return match;
      // Avoid annotating inside import paths, comments, or non-className contexts.
      // Heuristic: only annotate if within ~120 chars there's a className or class= reference
      // OR if we're inside a string literal that contains other class tokens.
      const ctx = source.slice(Math.max(0, offset - 200), offset + 200);
      if (!/className|class[A-Za-z]*\s*[=:]|cn\(|clsx\(|cva\(|tw\`|`[^`]*\bbg-|`[^`]*\btext-|`[^`]*\bborder-/i.test(ctx)) {
        // Last-resort sanity: if surrounding 30 chars look like tailwind classes (contain space-separated utility-shaped tokens), allow.
        const near = source.slice(Math.max(0, offset - 30), offset + 30);
        if (!/[\s"`'][a-z-]+-\d+|[\s"`'](flex|grid|hidden|block|inline|gap-|px-|py-|p-\d|m-\d|rounded|font-|text-|bg-|border)/.test(near)) {
          return match;
        }
      }
      fileSubs++;
      return `${match} ${darkClass}`;
    });
  }

  if (out !== orig) {
    writeFileSync(file, out);
    touched++;
    totalSubs += fileSubs;
  }
}

console.log(`Touched ${touched} files, ${totalSubs} substitutions.`);
