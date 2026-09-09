#!/usr/bin/env tsx
/**
 * Print the safety invariants for a backfill run and exit non-zero on any
 * failure. The checks themselves live in src/lib/paper/invariants.ts so the
 * report renders exactly what this asserts.
 *
 * Run: npx tsx scripts/validate-paper-invariants.ts .cache/paper-backfill-2026-08-01-2026-08-31.json
 */
import { readFileSync } from "node:fs";
import { checkInvariants, type CheckedProfile } from "../src/lib/paper/invariants";

const path = process.argv[2] ?? ".cache/paper-backfill-2026-08-01-2026-08-31.json";
const file = JSON.parse(readFileSync(path, "utf8")) as { profiles: CheckedProfile[]; days: string[] };
const groups = checkInvariants(file.profiles, file.days.length);

let failures = 0;
for (const g of groups) {
  console.log(`\n${g.ok ? "PASS" : "FAIL"}  ${g.title}`);
  console.log(`      ${g.claim}`);
  for (const line of g.lines) {
    if (!line.ok) failures++;
    console.log(`  ${line.ok ? "ok  " : "FAIL"}  ${line.text}`);
  }
}
console.log(failures === 0 ? "\nAll invariants hold.\n" : `\n${failures} invariant failure(s).\n`);
process.exit(failures === 0 ? 0 : 1);
