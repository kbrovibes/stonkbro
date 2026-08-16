// Spot-check: print computed defense numbers for three ticker studies and
// scan every case-study module's generated text for NaN/undefined leaks.
// Run: npx tsx scripts/defense-spotcheck.ts

import sndkRaw from "@/lib/learn/v2-data/SNDK.json";
import metaRaw from "@/lib/learn/v2-data/META.json";
import { findPut, findCall, type V2Ticker } from "@/lib/learn/v2";
import { shortOptionDefense, stockStopDefense } from "@/lib/learn/defense";
import { CASE_STUDY_MODULES } from "@/lib/learn/content/case-studies";

const sndk = sndkRaw as V2Ticker;
const meta = metaRaw as V2Ticker;

function show(label: string, obj: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(obj, null, 2));
}

// 1 — SNDK $1800 put (July 1), the whipsaw study.
const sndk1800 = findPut(sndk, "2026-07-01", 1800, "2026-07-17");
show(
  "SNDK 7/17 $1800P — entry 2026-07-01, credit " + sndk1800.mid,
  shortOptionDefense(sndk, {
    side: "put",
    strike: 1800,
    expiry: "2026-07-17",
    entryDate: "2026-07-01",
    credit: sndk1800.mid,
    support: 1895, // June 29 swing low
  })
);

// 2 — META $600 put (June 3), the gap study (premium stop lags).
const meta600 = findPut(meta, "2026-06-03", 600, "2026-06-12");
show(
  "META 6/12 $600P — entry 2026-06-03, credit " + meta600.mid,
  shortOptionDefense(meta, {
    side: "put",
    strike: 600,
    expiry: "2026-06-12",
    entryDate: "2026-06-03",
    credit: meta600.mid,
    support: 596.35, // placeholder printed below against the real bar
  })
);
console.log("June 1 low (real support used by the study):",
  meta.prices.find((b) => b.date === "2026-06-01")?.low);

// 3 — META covered call (May 27 $630C 8/21): stock-side stop.
const metaCC = findCall(meta, "2026-05-27", 630, "2026-08-21");
show(
  "META shares under the 5/27 $630C (credit " + metaCC.mid + ") — stock stop",
  stockStopDefense(meta, "2026-05-27")
);

// 4 — leak scan across every generated section of every module.
let sections = 0;
let bad = 0;
for (const mod of CASE_STUDY_MODULES) {
  for (const lesson of mod.lessons) {
    for (const s of lesson.sections) {
      sections++;
      const text = JSON.stringify(s);
      if (/NaN|undefined|Infinity/.test(text)) {
        bad++;
        console.error(`LEAK in ${mod.id}/${lesson.id}:`, text.slice(0, 300));
      }
    }
  }
}
console.log(`\nScanned ${sections} sections across ${CASE_STUDY_MODULES.length} modules — ${bad} leaks.`);
if (bad > 0) process.exit(1);
