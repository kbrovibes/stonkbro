import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null;
  webpush.setVapidDetails("mailto:k4rthikr@gmail.com", pub, priv);
  return webpush;
}

export async function sendPushToAll(opts: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; failed: number }> {
  const wp = getWebPush();
  if (!wp) return { sent: 0, failed: 0 };

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*");

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify(opts);
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await wp.sendNotification(
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
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
      failed++;
    }
  }

  return { sent, failed };
}
