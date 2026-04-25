import { createClient } from "@/lib/supabase-server";

export type UserSettings = {
  starting_cash?: number;
  alert_email?: string;
};

export async function getSettings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // No settings row yet — return defaults
    return { user_id: userId, starting_cash: 20000, alert_email: null };
  }

  if (error) throw error;
  return data;
}

export async function upsertSettings(userId: string, settings: UserSettings) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
