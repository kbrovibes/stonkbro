import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:k4rthikr+stonkbro@gmail.com", pub, priv);
  return webpush;
}

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, body, url, tag } = await request.json();
  if (!title || !body) {
    return NextResponse.json(
      { error: "title and body required" },
      { status: 400 }
    );
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*");

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no subscribers" });
  }

  const payload = JSON.stringify({ title, body, url, tag });
  let sent = 0;
  const failed: string[] = [];

  for (const sub of subs) {
    try {
      await getWebPush().sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
        },
        payload
      );
      sent++;
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : 0;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — clean up
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
      failed.push(sub.endpoint.slice(-20));
    }
  }

  return NextResponse.json({ ok: true, sent, failed: failed.length });
}
