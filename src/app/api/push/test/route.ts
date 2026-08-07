import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPushToAll } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

/**
 * Authenticated push-only test: sends a notification to the CURRENT user's
 * own subscriptions and reports exactly what happened. Unlike /api/email/*
 * this has no alert_email prerequisite — it exercises nothing but the push
 * chain.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      sent: 0,
      failed: 0,
      reason: "No push subscriptions for this account on any device. Enable notifications first.",
    });
  }

  const result = await sendPushToAll({
    title: "stonkbro test 🔔",
    body: `Push works! Sent ${new Date().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" })} PT`,
    url: "/settings",
    tag: "stonkbro-test",
    userId: user.id,
  });

  return NextResponse.json({ ok: result.sent > 0, subscriptions: subs.length, ...result });
}
