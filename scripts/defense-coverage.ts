// Coverage check: every case-study lesson (except the playbook's) must carry
// a generated defense block, identified by its `<lessonId>-defense-q` quiz.
import { CASE_STUDY_MODULES } from "@/lib/learn/content/case-studies";

let lessons = 0;
let covered = 0;
const missing: string[] = [];
for (const mod of CASE_STUDY_MODULES) {
  if (mod.id === "cs-defense-playbook") continue;
  for (const lesson of mod.lessons) {
    lessons++;
    const has = lesson.sections.some(
      (s) =>
        s.type === "quiz" &&
        s.questions.some((q) => q.id === `${lesson.id}-defense-q`)
    );
    if (has) covered++;
    else missing.push(`${mod.id}/${lesson.id}`);
  }
}
console.log(`${covered}/${lessons} studies carry a defense block.`);
if (missing.length) console.log("MISSING:", missing);

// Print two representative generated blocks for eyeballing.
for (const [modId, lessonId] of [
  ["cs-sndk", "stop-through-the-whipsaw"],
  ["cs-iwm", "the-aroc-with-no-bid"],
  ["cs-nvda", "right-for-eight-days"],
] as const) {
  const mod = CASE_STUDY_MODULES.find((m) => m.id === modId)!;
  const lesson = mod.lessons.find((l) => l.id === lessonId)!;
  const tail = lesson.sections.slice(-4);
  console.log(`\n########## ${modId}/${lessonId} ##########`);
  for (const s of tail) {
    if (s.type === "text" || s.type === "callout") console.log("\n--\n" + s.content);
    if (s.type === "quiz") console.log("\n--QUIZ--\n" + JSON.stringify(s.questions[0], null, 1));
  }
}
