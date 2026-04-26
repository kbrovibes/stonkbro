import { NextResponse } from "next/server";

const TRADIER_BASE = process.env.TRADIER_ENV === "production"
  ? "https://api.tradier.com/v1"
  : "https://sandbox.tradier.com/v1";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.TRADIER_API_TOKEN}`,
    Accept: "application/json",
  };
}

export async function GET() {
  try {
    const res = await fetch(`${TRADIER_BASE}/user/profile`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Tradier profile", status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();
    const profile = data.profile;

    // Extract account info
    const account = profile?.account;
    const accountData = Array.isArray(account) ? account[0] : account;

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
    });
  } catch (e) {
    console.error("Tradier usage API error:", e);
    return NextResponse.json(
      { error: "Failed to connect to Tradier API" },
      { status: 500 }
    );
  }
}
