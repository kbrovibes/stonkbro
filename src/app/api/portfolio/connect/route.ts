import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { hasApprovedPortfolioAccess } from "@/lib/portfolio-access";
import { getUserSnapTradeCredentials } from "@/lib/db/user-snaptrade-credentials";
import { getConnectPortalUrl } from "@/lib/snaptrade/client";

export const dynamic = "force-dynamic";

/**
 * Portal link for an APPROVED non-owner user to link their own brokerage —
 * the self-serve counterpart to `/api/portfolio/connections` (which is the
 * owner's single-identity version). Never touches the owner's SnapTrade
 * identity or any other user's.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasApprovedPortfolioAccess(user.id, user.email))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const creds = await getUserSnapTradeCredentials(user.id);
    if (!creds) {
      return NextResponse.json({ error: "No SnapTrade identity on file yet — try again in a moment" }, { status: 409 });
    }
    const body = await req.json().catch(() => ({}));
    const url = await getConnectPortalUrl(
      {
        broker: typeof body.broker === "string" ? body.broker : undefined,
        reconnect: typeof body.reconnect === "string" ? body.reconnect : undefined,
      },
      creds
    );
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Portal link generation failed (approved user):", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate portal link" },
      { status: 500 }
    );
  }
}
