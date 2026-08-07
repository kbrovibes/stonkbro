import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { PII_LOCK_COOKIE } from "@/lib/privacy";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 90, // lock survives reloads/restarts for 90d
};

/**
 * POST { action: "lock" }            → sets the lock cookie (no code needed)
 * POST { action: "unlock", code }    → verifies code against user_settings.privacy_pin
 *
 * Verification is server-side on purpose: the client never sees the PIN, and
 * the lock cookie is httpOnly so page JS can't clear it.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  if (body.action === "lock") {
    const res = NextResponse.json({ ok: true, locked: true });
    res.cookies.set(PII_LOCK_COOKIE, "1", COOKIE_OPTS);
    return res;
  }

  if (body.action === "unlock") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const { data } = await supabase
      .from("user_settings")
      .select("privacy_pin")
      .eq("user_id", user.id)
      .single();

    const pin = data?.privacy_pin;
    if (!pin) {
      return NextResponse.json(
        { error: "No privacy PIN set. Set one in Settings first." },
        { status: 400 }
      );
    }
    if (code !== pin) {
      // Cheap brute-force damper for the hand-your-phone-over threat model.
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: "Wrong code" }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true, locked: false });
    res.cookies.set(PII_LOCK_COOKIE, "0", { ...COOKIE_OPTS, maxAge: 0 });
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
