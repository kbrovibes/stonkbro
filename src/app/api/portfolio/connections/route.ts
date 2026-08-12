import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { listConnections, getConnectPortalUrl, getAccounts } from "@/lib/snaptrade/client";
import { hasPortfolioAccess } from "@/lib/portfolio-access";

export const dynamic = "force-dynamic";

async function authorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPortfolioAccess(user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

/** List brokerage connections + the accounts under them. */
export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;

  try {
    const [connections, accounts] = await Promise.all([listConnections(), getAccounts()]);
    return NextResponse.json({ connections, accounts });
  } catch (e) {
    console.error("Connections fetch failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

/**
 * Generate a SnapTrade Connection Portal link (expires in 5 minutes).
 * Body: { broker?: string, reconnect?: string } — broker preselects an
 * institution by SnapTrade slug; reconnect repairs a disabled connection.
 */
export async function POST(req: Request) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const url = await getConnectPortalUrl({
      broker: typeof body.broker === "string" ? body.broker : undefined,
      reconnect: typeof body.reconnect === "string" ? body.reconnect : undefined,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Portal link generation failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate portal link" },
      { status: 500 }
    );
  }
}
