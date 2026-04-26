import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdmin, setAppConfig } from "@/lib/db/admin";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const provider = body.provider;

  if (provider !== "claude" && provider !== "gemini") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  await setAppConfig("default_ai_provider", provider);

  return NextResponse.json({ success: true, provider });
}
