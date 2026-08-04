import { NextResponse } from "next/server";
import { CURRICULUM } from "@/lib/learn/curriculum";

export const dynamic = "force-dynamic";

/**
 * Paths the service worker should precache so the knowledge base works fully
 * offline (airplane mode). Lesson content renders server-side (RSC), so every
 * individual lesson page must be cached — not just the module indexes.
 */
export async function GET() {
  const paths = [
    "/learn",
    ...CURRICULUM.flatMap((m) => [
      `/learn/${m.id}`,
      ...m.lessons.map((l) => `/learn/${m.id}/${l.id}`),
    ]),
  ];
  return NextResponse.json({ paths, version: paths.length });
}
