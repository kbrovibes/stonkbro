import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAccessRequest, requestAccess } from "@/lib/db/portfolio-access-requests";
import { insertAlerts } from "@/lib/db/alerts";
import { hasPortfolioAccess } from "@/lib/portfolio-access";

export const dynamic = "force-dynamic";

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** The caller's own access-request status: none | pending | approved | denied. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (hasPortfolioAccess(user.email)) {
    return NextResponse.json({ status: "approved", owner: true });
  }

  try {
    const request = await getAccessRequest(user.id);
    return NextResponse.json({ status: request?.status ?? "none", owner: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load request status" },
      { status: 500 }
    );
  }
}

/** File (or re-file, after a denial) a request for Portfolio access. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (hasPortfolioAccess(user.email)) {
    return NextResponse.json({ status: "approved", owner: true });
  }

  try {
    const request = await requestAccess(user.id);
    await insertAlerts([{
      severity: "warning",
      kind: "access_request",
      // Reusing `symbol` to carry the requester's user_id — the Approve/Deny
      // buttons in AlertBanner need it and there's no dedicated column for
      // "which user does this alert concern" on a table built for market alerts.
      symbol: user.id,
      title: "Portfolio access requested",
      body: `${user.email ?? "A user"} is asking for Portfolio access.`,
      action: null,
      url: "/settings",
      dedupe_key: `access_request:${user.id}:${request.requested_at}`,
    }]);
    return NextResponse.json({ status: request.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to submit request" },
      { status: 500 }
    );
  }
}
