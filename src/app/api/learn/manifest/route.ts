import { NextResponse } from "next/server";
import { CURRICULUM } from "@/lib/learn/curriculum";

export const dynamic = "force-dynamic";

/**
 * Paths the service worker should precache so the knowledge base works fully
 * offline (airplane mode). Includes every module page plus the learn index.
 */
export async function GET() {
  const paths = ["/learn", ...CURRICULUM.map((m) => `/learn/${m.id}`)];
  return NextResponse.json({ paths, version: paths.length });
}
