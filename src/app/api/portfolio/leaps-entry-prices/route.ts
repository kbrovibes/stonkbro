import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHistoricalClose } from "@/lib/market/history";

type Pair = { symbol: string; date: string };

function cacheKey(p: Pair): string {
  return `histclose:${p.symbol.toUpperCase()}:${p.date}`;
}

async function readCached(pairs: Pair[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (pairs.length === 0) return out;
  const keys = pairs.map(cacheKey);
  const { data } = await supabaseAdmin
    .from("market_cache")
    .select("key, data")
    .in("key", keys);
  for (const row of (data ?? []) as { key: string; data: { price?: number } }[]) {
    if (typeof row.data?.price === "number") out.set(row.key, row.data.price);
  }
  return out;
}

async function writeCache(key: string, price: number): Promise<void> {
  await supabaseAdmin
    .from("market_cache")
    .upsert({ key, data: { price }, updated_at: new Date().toISOString() });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { pairs?: Pair[] };
  try {
    body = (await request.json()) as { pairs?: Pair[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const pairs = (body.pairs ?? [])
    .filter((p): p is Pair => !!p && typeof p.symbol === "string" && typeof p.date === "string")
    .slice(0, 200);

  const cached = await readCached(pairs);
  const result: Record<string, number | null> = {};
  const misses: Pair[] = [];
  for (const p of pairs) {
    const key = cacheKey(p);
    if (cached.has(key)) {
      result[`${p.symbol.toUpperCase()}|${p.date}`] = cached.get(key)!;
    } else {
      misses.push(p);
    }
  }

  // Fetch misses in parallel (cap concurrency at 5)
  const CONC = 5;
  for (let i = 0; i < misses.length; i += CONC) {
    const batch = misses.slice(i, i + CONC);
    await Promise.all(
      batch.map(async (p) => {
        const price = await getHistoricalClose(p.symbol, p.date);
        const outKey = `${p.symbol.toUpperCase()}|${p.date}`;
        result[outKey] = price;
        if (price != null) {
          await writeCache(cacheKey(p), price).catch(() => {});
        }
      })
    );
  }

  return NextResponse.json({ prices: result });
}
