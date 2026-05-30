import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentScans } from "@/lib/db/portfolio-manager-scans";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

  const history = await getRecentScans(limit);
  return NextResponse.json({ history });
}
