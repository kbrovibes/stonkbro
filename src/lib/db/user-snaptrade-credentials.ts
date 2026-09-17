import { supabaseAdmin } from "@/lib/supabase";
import { decryptSecret, encryptSecret } from "@/lib/snaptrade/secrets";
import type { SnapTradeCreds } from "@/lib/snaptrade/client";

const TABLE = "user_snaptrade_credentials";

interface CredentialRow {
  user_id: string;
  snaptrade_user_id: string;
  encrypted_secret: string;
  iv: string;
  auth_tag: string;
}

/** Encrypts and stores a newly-registered SnapTrade identity for an approved user. */
export async function storeUserSnapTradeCredentials(userId: string, creds: SnapTradeCreds): Promise<void> {
  const { encrypted, iv, authTag } = encryptSecret(creds.userSecret);
  const { error } = await supabaseAdmin.from(TABLE).upsert({
    user_id: userId,
    snaptrade_user_id: creds.userId,
    encrypted_secret: encrypted,
    iv,
    auth_tag: authTag,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`storeUserSnapTradeCredentials: ${error.message}`);
}

/** Decrypts a user's own SnapTrade identity for a server-side SnapTrade call. Never return this to a client. */
export async function getUserSnapTradeCredentials(userId: string): Promise<SnapTradeCreds | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("user_id, snaptrade_user_id, encrypted_secret, iv, auth_tag")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getUserSnapTradeCredentials: ${error.message}`);
  if (!data) return null;
  const row = data as CredentialRow;
  return { userId: row.snaptrade_user_id, userSecret: decryptSecret(row) };
}

export async function hasUserSnapTradeCredentials(userId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from(TABLE)
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`hasUserSnapTradeCredentials: ${error.message}`);
  return (count ?? 0) > 0;
}
