import { NextResponse } from "next/server";
import { tradierFetch, getRateLimitState } from "@/lib/market/tradier-client";

export async function GET() {
  try {
    const res = await tradierFetch("/user/profile");

    if (!res) {
      return NextResponse.json(
        { error: "Failed to fetch Tradier profile" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const profile = data.profile;

    // Extract account info
    const account = profile?.account;
    const accountData = Array.isArray(account) ? account[0] : account;

    const rateLimit = getRateLimitState();

    return NextResponse.json({
      env: process.env.TRADIER_ENV === "production" ? "production" : "sandbox",
      profile: {
        name: profile?.name || "N/A",
        id: profile?.id || "N/A",
      },
      account: accountData
        ? {
            accountNumber: accountData.account_number || "N/A",
            type: accountData.type || "N/A",
            classification: accountData.classification || "N/A",
            status: accountData.status || "N/A",
            dayTrader: accountData.day_trader ?? false,
          }
        : null,
      rateLimit: {
        allowed: rateLimit.allowed,
        used: rateLimit.used,
        available: rateLimit.available,
        resetsAt: rateLimit.expiresAt > 0 ? new Date(rateLimit.expiresAt).toISOString() : null,
      },
    });
  } catch (e) {
    console.error("Tradier usage API error:", e);
    return NextResponse.json(
      { error: "Failed to connect to Tradier API" },
      { status: 500 }
    );
  }
}
