import { supabaseAdmin } from "@/lib/supabase";

// --- Admin check ---

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_settings")
    .select("is_admin")
    .eq("user_id", userId)
    .single();
  return data?.is_admin === true;
}

// --- App config ---

export async function getAppConfig(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value ?? null;
}

export async function setAppConfig(key: string, value: string): Promise<void> {
  await supabaseAdmin
    .from("app_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}

// Cached default AI provider (60s TTL)
let cachedProvider: { value: "claude" | "gemini"; ts: number } | null = null;

export async function getDefaultAIProvider(userId?: string): Promise<"claude" | "gemini"> {
  // Try user setting first
  if (userId) {
    const { data } = await supabaseAdmin
      .from("user_settings")
      .select("preferred_ai_provider")
      .eq("user_id", userId)
      .single();
    if (data?.preferred_ai_provider) {
      return data.preferred_ai_provider as "claude" | "gemini";
    }
  }

  // Fallback to global config
  if (cachedProvider && Date.now() - cachedProvider.ts < 60_000) {
    return cachedProvider.value;
  }
  const val = await getAppConfig("default_ai_provider");
  const provider = val === "gemini" ? "gemini" : "claude";
  cachedProvider = { value: provider, ts: Date.now() };
  return provider;
}

export async function getPreferredAIModel(userId?: string): Promise<string> {
  if (userId) {
    const { data } = await supabaseAdmin
      .from("user_settings")
      .select("preferred_ai_model")
      .eq("user_id", userId)
      .single();
    if (data?.preferred_ai_model) {
      return data.preferred_ai_model;
    }
  }
  return "gemini-2.0-flash";
}

// --- User stats ---

export async function getUserCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("user_settings")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

// --- Token usage ---

export interface TokenUsageRow {
  email: string;
  provider: string;
  feature: string;
  total_input: number;
  total_output: number;
  call_count: number;
}

export async function getTokenUsageSummary(days = 30): Promise<TokenUsageRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: usage } = await supabaseAdmin
    .from("ai_token_usage")
    .select("user_id, provider, feature, input_tokens, output_tokens")
    .gte("created_at", since);

  if (!usage || usage.length === 0) return [];

  // Get user emails
  const userIds = [...new Set(usage.filter((u) => u.user_id).map((u) => u.user_id))];
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (users?.users) {
    for (const u of users.users) {
      emailMap.set(u.id, u.email || "unknown");
    }
  }

  // Aggregate
  const agg = new Map<string, TokenUsageRow>();
  for (const row of usage) {
    const key = `${row.user_id || "system"}-${row.provider}-${row.feature}`;
    const existing = agg.get(key);
    if (existing) {
      existing.total_input += row.input_tokens;
      existing.total_output += row.output_tokens;
      existing.call_count += 1;
    } else {
      agg.set(key, {
        email: row.user_id ? (emailMap.get(row.user_id) || "unknown") : "system",
        provider: row.provider,
        feature: row.feature,
        total_input: row.input_tokens,
        total_output: row.output_tokens,
        call_count: 1,
      });
    }
  }

  return [...agg.values()].sort((a, b) => b.total_input + b.total_output - (a.total_input + a.total_output));
}

export function trackTokenUsage(params: {
  userId?: string;
  provider: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  fallback?: boolean;
}): void {
  // Fire-and-forget — never blocks AI calls
  Promise.resolve(
    supabaseAdmin
      .from("ai_token_usage")
      .insert({
        user_id: params.userId || null,
        provider: params.provider,
        feature: params.feature,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        model: params.model || null,
        fallback: params.fallback || false,
      })
  ).catch((e: unknown) => console.error("Token tracking error:", e));
}
