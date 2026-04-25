import { createClient } from "@/lib/supabase-server";

export async function saveResearchReport(
  userId: string,
  trigger: "cron" | "manual" | "on_demand",
  symbols: string[],
  report: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .insert({
      user_id: userId,
      trigger,
      symbols_analyzed: symbols,
      report,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentReports(userId: string, limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export type SaveTradeSuggestionData = {
  report_id?: string;
  user_id: string;
  symbol: string;
  strategy: string;
  action: string;
  strike?: number;
  expiry?: string;
  premium?: number;
  reasoning: string;
};

export async function saveTradeSuggestion(data: SaveTradeSuggestionData) {
  const supabase = await createClient();
  const { data: suggestion, error } = await supabase
    .from("trade_suggestions")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return suggestion;
}

export async function getSuggestions(
  userId: string,
  status?: "pending" | "executed" | "dismissed" | "expired"
) {
  const supabase = await createClient();
  let query = supabase
    .from("trade_suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateSuggestionStatus(
  id: string,
  status: "pending" | "executed" | "dismissed" | "expired"
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_suggestions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
