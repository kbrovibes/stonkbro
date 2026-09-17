import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentAlerts, acknowledgeAlert, acknowledgeAllAlerts } from "@/lib/db/alerts";
import { isAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unacked = searchParams.get("unacked") === "1";
  const hours = Math.min(Number(searchParams.get("hours") ?? 48) || 48, 24 * 14);

  try {
    const alerts = await getRecentAlerts(hours, unacked);
    // access_request alerts name a requester's email — the alerts table's
    // RLS lets any signed-in user read every row, so this is the only gate
    // keeping "so-and-so wants Portfolio access" admin-only.
    const admin = await isAdmin(user.id);
    const visible = admin ? alerts : alerts.filter((a) => a.kind !== "access_request");
    return NextResponse.json({ alerts: visible });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    if (body.all === true) await acknowledgeAllAlerts();
    else if (typeof body.id === "string") await acknowledgeAlert(body.id);
    else return NextResponse.json({ error: "id or all required" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to acknowledge" },
      { status: 500 }
    );
  }
}
