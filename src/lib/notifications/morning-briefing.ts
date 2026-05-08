/**
 * Morning Briefing Email — comprehensive pre-market digest.
 *
 * Sections:
 * 1. Market pulse: top movers from overnight/pre-market
 * 2. Earnings today: tickers reporting today or tomorrow
 * 3. Position alerts: expiring options, roll signals, trailing stops
 * 4. AI picks: latest recommendations summary
 */

import { Resend } from "resend";
import type { AlertItem } from "./email";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export type MoverDigest = {
  symbol: string;
  price: number;
  changePct: number;
  volumeRatio: number;
  direction: "up" | "down";
};

export type EarningsDigest = {
  symbol: string;
  name: string;
  earningsDate: string;
  timing: "before_market" | "after_market" | "unknown";
  daysUntil: number;
};

export type ExpiringPosition = {
  symbol: string;
  strategy: string;
  legType: string;
  strike: number;
  expiry: string;
  dte: number;
};

export type RecommendationDigest = {
  symbol: string;
  action: string;
  rationale: string;
};

export type MorningBriefingData = {
  movers: MoverDigest[];
  earnings: EarningsDigest[];
  expiring: ExpiringPosition[];
  alerts: AlertItem[];
  recommendations: RecommendationDigest[];
  date: string;
};

function timingBadge(timing: string): string {
  if (timing === "before_market") return "BMO";
  if (timing === "after_market") return "AMC";
  return "TBD";
}

export async function sendMorningBriefing(to: string, data: MorningBriefingData) {
  const { movers, earnings, expiring, alerts, recommendations, date } = data;

  const highAlerts = alerts.filter((a) => a.urgency === "high");

  // --- Sections ---

  const moversSection = movers.length > 0 ? `
    <div style="padding: 16px; border-bottom: 1px solid #f5f5f4;">
      <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8b5cf6; margin: 0 0 12px 0;">Market Pulse</h2>
      ${movers.slice(0, 8).map((m) => {
        const color = m.direction === "up" ? "#059669" : "#ef4444";
        const arrow = m.direction === "up" ? "▲" : "▼";
        return `<div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="font-size: 13px; font-weight: 600; color: #1c1917;">${arrow} ${m.symbol}</span>
          <span style="font-size: 13px; color: ${color}; font-weight: 600;">${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(1)}%</span>
          <span style="font-size: 11px; color: #a8a29e;">${m.volumeRatio.toFixed(1)}x vol</span>
          <span style="font-size: 11px; color: #78716c;">$${m.price.toFixed(2)}</span>
        </div>`;
      }).join("")}
    </div>
  ` : "";

  const earningsSection = earnings.length > 0 ? `
    <div style="padding: 16px; border-bottom: 1px solid #f5f5f4;">
      <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin: 0 0 12px 0;">Earnings Today</h2>
      ${earnings.map((e) => `
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span style="font-size: 13px; font-weight: 600; color: #1c1917;">${e.symbol}</span>
          <span style="font-size: 11px; color: #78716c;">${e.name}</span>
          <span style="font-size: 11px; color: #d97706; font-weight: 600;">${timingBadge(e.timing)}</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  const expiringSection = expiring.length > 0 ? `
    <div style="padding: 16px; border-bottom: 1px solid #f5f5f4;">
      <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ef4444; margin: 0 0 12px 0;">Expiring This Week</h2>
      ${expiring.map((p) => `
        <div style="padding: 4px 0;">
          <span style="font-size: 13px; font-weight: 600; color: #1c1917;">${p.symbol}</span>
          <span style="font-size: 11px; color: #78716c;">${p.strategy} · $${p.strike} ${p.legType.replace("_", " ")} · ${p.dte}d left</span>
        </div>
      `).join("")}
    </div>
  ` : "";

  const alertsSection = highAlerts.length > 0 ? `
    <div style="padding: 16px; border-bottom: 1px solid #f5f5f4;">
      <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ef4444; margin: 0 0 12px 0;">Action Required</h2>
      ${highAlerts.slice(0, 5).map((a) => `
        <div style="padding: 6px 0; border-bottom: 1px solid #fafaf9;">
          <div>
            <span style="background: #ef4444; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px;">${a.action}</span>
            <strong style="color: #1c1917; font-size: 13px; margin-left: 6px;">${a.symbol}</strong>
          </div>
          <p style="color: #44403c; font-size: 12px; margin: 4px 0 0 0;">${a.message}</p>
        </div>
      `).join("")}
    </div>
  ` : "";

  const recsSection = recommendations.length > 0 ? `
    <div style="padding: 16px; border-bottom: 1px solid #f5f5f4;">
      <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0ea5e9; margin: 0 0 12px 0;">AI Picks</h2>
      ${recommendations.slice(0, 5).map((r) => `
        <div style="padding: 4px 0;">
          <span style="font-size: 13px; font-weight: 600; color: #0ea5e9;">${r.symbol}</span>
          <span style="font-size: 12px; color: #44403c;"> — ${r.action}</span>
          <p style="font-size: 11px; color: #a8a29e; margin: 2px 0 0 0;">${r.rationale}</p>
        </div>
      `).join("")}
    </div>
  ` : "";

  // --- Compose ---

  const hasContent = movers.length > 0 || earnings.length > 0 || expiring.length > 0 || highAlerts.length > 0 || recommendations.length > 0;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px 16px; border-bottom: 2px solid #1c1917;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0;">Good morning</h1>
        <p style="color: #a8a29e; font-size: 12px; margin: 4px 0 0 0;">${date} · Pre-market briefing</p>
      </div>

      ${!hasContent ? `
        <div style="padding: 32px 16px; text-align: center;">
          <p style="color: #a8a29e; font-size: 14px;">Markets are quiet. No action items today.</p>
        </div>
      ` : `
        ${alertsSection}
        ${expiringSection}
        ${earningsSection}
        ${moversSection}
        ${recsSection}
      `}

      <div style="padding: 16px; text-align: center; border-top: 1px solid #f5f5f4;">
        <a href="https://stonkbro.vercel.app/today" style="color: #0ea5e9; font-size: 12px; text-decoration: none; font-weight: 600;">Open Today's Plays →</a>
      </div>
    </div>`;

  const urgentCount = highAlerts.length;
  const earningsCount = earnings.length;
  const subject = urgentCount > 0
    ? `⚡ ${urgentCount} action${urgentCount > 1 ? "s" : ""} + ${earningsCount > 0 ? `${earningsCount} earnings` : "market update"}`
    : earningsCount > 0
    ? `📊 ${earningsCount} earnings today + market update`
    : movers.length > 0
    ? `📈 ${movers.length} mover${movers.length > 1 ? "s" : ""} detected — morning briefing`
    : "☀️ stonkbro morning briefing";

  await getResend().emails.send({
    from: process.env.EMAIL_FROM ?? "stonkbro <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
