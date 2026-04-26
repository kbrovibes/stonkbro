import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentReports, markReportOpened, getReportById } from "@/lib/db/research";
import { getSuggestions } from "@/lib/db/research";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");

  // If specific report ID, return that report's status
  if (reportId) {
    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let suggestions: unknown[] = [];
    if (report.status === "completed") {
      suggestions = (await getSuggestions(user.id)).filter(
        (s: { report_id: string | null }) => s.report_id === reportId
      );
    }

    return NextResponse.json({ report, suggestions });
  }

  // Return last 5 research runs
  const reports = await getRecentReports(user.id, 5);
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await request.json();
  if (reportId) {
    await markReportOpened(reportId);
  }

  return NextResponse.json({ ok: true });
}
