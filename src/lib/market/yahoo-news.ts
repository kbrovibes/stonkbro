/**
 * Yahoo Finance news fetcher (unofficial public endpoint, no key required).
 *
 * Endpoint: https://query1.finance.yahoo.com/v1/finance/search?q=SYMBOL&quotesCount=0&newsCount=10
 * Best-effort. Returns [] on any failure. 30-min in-memory cache.
 */

import type { NewsHeadline } from "@/lib/portfolio-manager/types";

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { ts: number; headlines: NewsHeadline[] }>();

type YahooNewsItem = {
  uuid?: string;
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number; // seconds
};

export async function getRecentHeadlines(symbol: string, limit = 5): Promise<NewsHeadline[]> {
  const key = symbol.toUpperCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.headlines.slice(0, limit);
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(key)}&quotesCount=0&newsCount=${Math.max(limit, 5)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (stonkbro portfolio-manager)" },
      // Avoid Next.js fetch cache; we manage our own TTL above.
      cache: "no-store",
    });
    if (!res.ok) {
      cache.set(key, { ts: Date.now(), headlines: [] });
      return [];
    }
    const data = (await res.json()) as { news?: YahooNewsItem[] };
    const items = data.news ?? [];
    const headlines: NewsHeadline[] = items
      .filter((n) => n.title && n.link)
      .map((n) => ({
        title: n.title!,
        url: n.link!,
        published_at: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : new Date().toISOString(),
        publisher: n.publisher,
      }))
      .slice(0, limit);

    cache.set(key, { ts: Date.now(), headlines });
    return headlines;
  } catch {
    cache.set(key, { ts: Date.now(), headlines: [] });
    return [];
  }
}
