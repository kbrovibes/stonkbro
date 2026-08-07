import { cookies } from "next/headers";
import { PII_LOCK_COOKIE } from "@/lib/privacy";

/** Server-side read of the privacy lock (RSC / route handlers). */
export async function isPiiLocked(): Promise<boolean> {
  const store = await cookies();
  return store.get(PII_LOCK_COOKIE)?.value === "1";
}
