import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getScanById } from "@/lib/db/portfolio-manager-scans";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scan_id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scan_id } = await params;
  if (!scan_id) {
    return NextResponse.json({ error: "scan_id required" }, { status: 400 });
  }

  const scan = await getScanById(scan_id);
  if (!scan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ scan });
}
