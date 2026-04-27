/**
 * Centralized Tradier API client — base URL, auth, rate limit tracking,
 * and a smart fetch wrapper with exponential backoff on 429s.
 *
 * All Tradier-calling modules should use `tradierFetch` instead of raw fetch.
 */

// ---------------------------------------------------------------------------
// Base URL — respects TRADIER_ENV for sandbox vs production
// ---------------------------------------------------------------------------

export function getTradierBase(): string {
  return process.env.TRADIER_ENV === "production"
    ? "https://api.tradier.com"
    : "https://sandbox.tradier.com";
}

export function getTradierBaseV1(): string {
  return `${getTradierBase()}/v1`;
}

export function getTradierHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.TRADIER_API_TOKEN}`,
    Accept: "application/json",
  };
}

// ---------------------------------------------------------------------------
// Rate limit tracking (in-memory, per-process)
// ---------------------------------------------------------------------------

interface RateLimitState {
  allowed: number;
  used: number;
  available: number;
  expiresAt: number; // epoch ms
  lastUpdated: number;
}

let rateLimitState: RateLimitState = {
  allowed: 120,
  used: 0,
  available: 120,
  expiresAt: 0,
  lastUpdated: 0,
};

function updateRateLimitFromHeaders(headers: Headers): void {
  const allowed = headers.get("x-ratelimit-allowed");
  const used = headers.get("x-ratelimit-used");
  const available = headers.get("x-ratelimit-available");
  const expiry = headers.get("x-ratelimit-expiry");

  if (allowed || used || available) {
    rateLimitState = {
      allowed: allowed ? parseInt(allowed, 10) : rateLimitState.allowed,
      used: used ? parseInt(used, 10) : rateLimitState.used,
      available: available ? parseInt(available, 10) : rateLimitState.available,
      expiresAt: expiry ? parseInt(expiry, 10) * 1000 : rateLimitState.expiresAt,
      lastUpdated: Date.now(),
    };
  }
}

export function getRateLimitState(): Readonly<RateLimitState> {
  return { ...rateLimitState };
}

// ---------------------------------------------------------------------------
// Smart fetch with retry + backoff on 429
// ---------------------------------------------------------------------------

interface TradierFetchOptions {
  /** Next.js revalidation in seconds */
  revalidate?: number;
  /** Max retries on 429 (default: 2) */
  maxRetries?: number;
}

export async function tradierFetch(
  path: string,
  options: TradierFetchOptions = {}
): Promise<Response | null> {
  const { revalidate, maxRetries = 2 } = options;
  const url = path.startsWith("http") ? path : `${getTradierBaseV1()}${path}`;

  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
    headers: getTradierHeaders(),
  };
  if (revalidate !== undefined) {
    fetchOptions.next = { revalidate };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);

      // Track rate limits from every response
      updateRateLimitFromHeaders(res.headers);

      if (res.ok) return res;

      // 401 — bad token, no point retrying
      if (res.status === 401) {
        console.error("Tradier API: invalid token (401)");
        return null;
      }

      // 429 — rate limited, back off and retry
      if (res.status === 429 && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.warn(`Tradier API: rate limited (429), retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      // Other errors — log and return null
      console.error(`Tradier API error: ${res.status} ${res.statusText} for ${path}`);
      return null;
    } catch (e) {
      if (attempt < maxRetries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        console.warn(`Tradier API: network error, retrying in ${backoffMs}ms`, e);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      console.error(`Tradier API: network error for ${path}:`, e);
      return null;
    }
  }

  return null;
}
