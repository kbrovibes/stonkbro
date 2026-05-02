import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPushToAll } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's alert email
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("alert_email")
    .eq("user_id", user.id)
    .single();

  const email = settings?.alert_email;
  if (!email) {
    return NextResponse.json(
      { error: "No alert_email found in user_settings", userId: user.id },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: "stonkbro <onboarding@resend.dev>",
      to: email,
      subject: "stonkbro email test",
      html: "<h2>It works!</h2><p>This is a test email from stonkbro.</p>",
    });

    const push = await sendPushToAll({
      title: "stonkbro email test",
      body: "Test notification — email + push working!",
      url: "/settings",
      tag: "test-ping",
    });

    return NextResponse.json({
      ok: true,
      sentTo: email,
      resendResponse: result,
      push,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Resend API call failed",
        sentTo: email,
        details: String(e),
      },
      { status: 500 }
    );
  }
}
