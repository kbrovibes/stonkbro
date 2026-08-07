import { redirect } from "next/navigation";

// /csp-hunter merged into /plays (CSPs/Calls/LEAPS/Weekly tabs) — v0.26.1.
export default function CspHunterRedirect() {
  redirect("/plays");
}
