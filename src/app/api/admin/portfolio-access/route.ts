import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/db/admin";
import { decideAccessRequest, listPendingRequests } from "@/lib/db/portfolio-access-requests";
import { registerSnapTradeUser } from "@/lib/snaptrade/client";
import { storeUserSnapTradeCredentials } from "@/lib/db/user-snaptrade-credentials";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await isAdmin(user.id))) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

/** Pending Portfolio access requests, with the requester's email attached. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const pending = await listPendingRequests();
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const emailById = new Map((data?.users ?? []).map((u) => [u.id, u.email ?? "unknown"]));
    return NextResponse.json({
      requests: pending.map((r) => ({ ...r, email: emailById.get(r.user_id) ?? "unknown" })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load requests" },
      { status: 500 }
    );
  }
}

/**
 * Approve or deny a pending request. Approval also registers the requester
 * as a brand-new SnapTrade end-user and stores their (encrypted) identity —
 * from that point on `/api/portfolio/connect` can send them to link a
 * brokerage under their own, isolated SnapTrade identity.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : null;
    const decision = body.decision === "approved" || body.decision === "denied" ? body.decision : null;
    if (!userId || !decision) {
      return NextResponse.json({ error: "userId and decision are required" }, { status: 400 });
    }

    // Register the SnapTrade identity BEFORE flipping status to "approved" —
    // otherwise a failure here (as happened once in production) leaves the
    // request stuck "approved" with no usable credentials behind it: the
    // request vanishes from the pending list, the requester can never
    // connect, and nothing indicates anything went wrong. If this throws,
    // the request stays pending so the admin can just retry.
    if (decision === "approved") {
      const creds = await registerSnapTradeUser(userId);
      await storeUserSnapTradeCredentials(userId, creds);
    }

    const updated = await decideAccessRequest(userId, decision, auth.user.id);
    return NextResponse.json({ request: updated });
  } catch (e) {
    console.error("[PortfolioAccess] Decision failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to record decision" },
      { status: 500 }
    );
  }
}
