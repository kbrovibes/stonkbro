import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Encrypts a per-user SnapTrade userSecret before it ever touches the
 * database. `SNAPTRADE_SECRET_ENCRYPTION_KEY` lives only in the server
 * environment (never the repo), and `decryptSecret` is only ever called at
 * the moment of an actual SnapTrade API call — its output never gets
 * returned in an API response or logged.
 */
function encryptionKey(): Buffer {
  const hex = process.env.SNAPTRADE_SECRET_ENCRYPTION_KEY;
  if (!hex) throw new Error("SNAPTRADE_SECRET_ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("SNAPTRADE_SECRET_ENCRYPTION_KEY must be a 32-byte hex string");
  return key;
}

export interface EncryptedSecret {
  encrypted: string; // base64 ciphertext
  iv: string; // base64
  authTag: string; // base64
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(row: { encrypted_secret: string; iv: string; auth_tag: string }): string {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.iv, "base64"));
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_secret, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
