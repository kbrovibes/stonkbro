import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentReports, getSuggestions } from "@/lib/db/research";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [reports, suggestions] = await Promise.all([
      getRecentReports(user.id, 20),
      getSuggestions(user.id),
    ]);

    // Attach suggestions to their reports
    const enriched = (reports || []).map((r: { id: string; trigger: string; symbols_analyzed: string[]; report: string; created_at: string }) => ({
      id: r.id,
      trigger: r.trigger,
      symbols: r.symbols_analyzed,
      report: r.report,
      createdAt: r.created_at,
      suggestions: (suggestions || []).filter((s: { report_id: string | null }) => s.report_id === r.id),
    }));

    return NextResponse.json({ reports: enriched });
  } catch (e) {
    console.error("Research history error:", e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
