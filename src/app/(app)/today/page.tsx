import { redirect } from "next/navigation";

// /today merged into /plays (Market tab) — v0.26.1 nav consolidation.
export default function TodayRedirect() {
  redirect("/plays");
}
