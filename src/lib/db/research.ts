import { createClient } from "@/lib/supabase-server";

export async function createPendingReport(
  userId: string,
  trigger: "cron" | "manual" | "on_demand",
  symbols: string[],
  mode: string = "deep"
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .insert({
      user_id: userId,
      trigger,
      symbols_analyzed: symbols,
      report: "",
      status: "running",
      mode,
      opened: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeReport(reportId: string, report: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .update({ report, status: "completed" })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function failReport(reportId: string, errorMsg: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("research_reports")
    .update({ report: `Error: ${errorMsg}`, status: "failed" })
    .eq("id", reportId);

  if (error) throw error;
}

export async function markReportOpened(reportId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("research_reports")
    .update({ opened: true })
    .eq("id", reportId);

  if (error) throw error;
}

// Legacy compat
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
      status: "completed",
      opened: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentReports(userId: string, limit = 20) {
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

export async function getUnopenedReports(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("opened", false)
    .in("status", ["completed", "running"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getReportById(reportId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_reports")
    .select("*")
    .eq("id", reportId)
    .single();

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
