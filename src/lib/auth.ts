import { cache } from "react";
import { createClient } from "@/lib/supabase-server";

/**
 * Request-scoped, deduplicated current-user lookup.
 *
 * `supabase.auth.getUser()` validates the session JWT against the Supabase
 * Auth server — a network round-trip, not a local decode. The app shell alone
 * calls it twice per navigation (the (app) layout and Header), and most pages
 * call it again. React's `cache()` memoizes the result for the duration of a
 * single server render, so all callers in one request share ONE round-trip.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
