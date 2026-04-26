import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdmin, getUserCount, getTokenUsageSummary, getAppConfig } from "@/lib/db/admin";
import { getAvailableProviders } from "@/lib/ai/provider";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [userCount, usage, defaultProvider] = await Promise.all([
    getUserCount(),
    getTokenUsageSummary(30),
    getAppConfig("default_ai_provider"),
  ]);

  return NextResponse.json({
    userCount,
    usage,
    defaultProvider: defaultProvider || "claude",
    availableProviders: getAvailableProviders(),
  });
}
