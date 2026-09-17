import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { PII_LOCK_COOKIE } from "@/lib/privacy";
import { hasApprovedPortfolioAccess } from "@/lib/portfolio-access";
import { availableNavDestinations, NAV_DESTINATIONS } from "@/lib/nav-destinations";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const navOptions = availableNavDestinations(await hasApprovedPortfolioAccess(user.id, user.email));

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Never ship the PIN to the client — expose only whether one exists.
  if (data) {
    const { privacy_pin, ...rest } = data;
    return NextResponse.json({ settings: { ...rest, has_privacy_pin: !!privacy_pin }, navOptions });
  }

  return NextResponse.json({
    settings: data || {
      starting_cash: 20000,
      alert_email: "",
      preferred_ai_provider: "gemini",
      preferred_ai_model: "gemini-2.0-flash",
      alert_position_signals: true,
      alert_explosive_movers: true,
      alert_earnings: true,
      alert_recommendations: true,
      alert_frequency: "three_daily",
      bottom_nav_tabs: null,
    },
    navOptions,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // `has_privacy_pin` is a derived GET-only field; never persist it.
  delete body.has_privacy_pin;

  if (typeof body.bottom_nav_tabs !== "undefined" && body.bottom_nav_tabs !== null) {
    const tabs = body.bottom_nav_tabs;
    const validHrefs = new Set(NAV_DESTINATIONS.map((d) => d.href));
    if (
      !Array.isArray(tabs) ||
      tabs.length > 4 ||
      tabs.some((h) => typeof h !== "string" || !validHrefs.has(h)) ||
      new Set(tabs).size !== tabs.length
    ) {
      return NextResponse.json({ error: "bottom_nav_tabs must be up to 4 unique, known destinations" }, { status: 400 });
    }
  }

  // While the privacy lock is on, the PIN itself is immutable — otherwise
  // whoever is holding the locked phone could overwrite it and unlock.
  if (typeof body.privacy_pin !== "undefined") {
    const store = await cookies();
    if (store.get(PII_LOCK_COOKIE)?.value === "1") {
      return NextResponse.json(
        { error: "Unlock private info before changing the privacy PIN." },
        { status: 403 }
      );
    }
    if (body.privacy_pin !== null && !/^\d{4,8}$/.test(String(body.privacy_pin))) {
      return NextResponse.json(
        { error: "PIN must be 4-8 digits." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      ...body,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
