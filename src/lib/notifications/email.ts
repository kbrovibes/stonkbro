import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export type AlertItem = {
  action: "CLOSE" | "ROLL" | "SELL" | "BUY" | "WARNING";
  symbol: string;
  strategy: string;
  message: string;
  urgency: "high" | "medium" | "low";
  details?: string;
};

export async function sendDailyBriefing(to: string, alerts: AlertItem[]) {
  const highUrgency = alerts.filter((a) => a.urgency === "high");
  const mediumUrgency = alerts.filter((a) => a.urgency === "medium");
  const lowUrgency = alerts.filter((a) => a.urgency === "low");

  const actionColors: Record<string, string> = {
    CLOSE: "#059669",
    ROLL: "#d97706",
    SELL: "#0ea5e9",
    BUY: "#8b5cf6",
    WARNING: "#ef4444",
  };

  const renderAlert = (alert: AlertItem) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f5f5f4;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: ${actionColors[alert.action] || "#737373"}; color: white; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">${alert.action}</span>
          <strong style="color: #1c1917; font-size: 14px;">${alert.symbol}</strong>
          <span style="color: #a8a29e; font-size: 12px;">${alert.strategy}</span>
        </div>
        <p style="color: #44403c; font-size: 13px; margin: 4px 0 0 0;">${alert.message}</p>
        ${alert.details ? `<p style="color: #a8a29e; font-size: 11px; margin: 4px 0 0 0;">${alert.details}</p>` : ""}
      </td>
    </tr>`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px 16px; border-bottom: 2px solid #1c1917;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0;">stonkbro daily briefing</h1>
        <p style="color: #a8a29e; font-size: 12px; margin: 4px 0 0 0;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>

      ${alerts.length === 0 ? `
        <div style="padding: 32px 16px; text-align: center;">
          <p style="color: #a8a29e; font-size: 14px;">No action items today. Your positions are looking good.</p>
        </div>
      ` : `
        ${highUrgency.length > 0 ? `
          <div style="padding: 12px 16px 4px;">
            <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ef4444; margin: 0;">Action Required</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse;">${highUrgency.map(renderAlert).join("")}</table>
        ` : ""}

        ${mediumUrgency.length > 0 ? `
          <div style="padding: 12px 16px 4px;">
            <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #d97706; margin: 0;">Opportunities</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse;">${mediumUrgency.map(renderAlert).join("")}</table>
        ` : ""}

        ${lowUrgency.length > 0 ? `
          <div style="padding: 12px 16px 4px;">
            <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; margin: 0;">FYI</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse;">${lowUrgency.map(renderAlert).join("")}</table>
        ` : ""}

        ${(() => {
          const moverAlerts = alerts.filter((a) => a.action === "BUY" && a.details?.includes("Suggested:"));
          return moverAlerts.length > 0 ? `
            <div style="padding: 16px 16px 4px; border-top: 1px solid #f5f5f4;">
              <h2 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #8b5cf6; margin: 0;">Market Movers</h2>
              <p style="color: #a8a29e; font-size: 11px; margin: 4px 0 0 0;">Explosive moves detected in today's scan</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">${moverAlerts.map(renderAlert).join("")}</table>
          ` : "";
        })()}
      `}

      <div style="padding: 16px; text-align: center; border-top: 1px solid #f5f5f4;">
        <a href="https://stonkbro.vercel.app/scanner" style="color: #0ea5e9; font-size: 12px; text-decoration: none;">Open stonkbro →</a>
      </div>
    </div>`;

  const subject = highUrgency.length > 0
    ? `⚡ ${highUrgency.length} action${highUrgency.length > 1 ? "s" : ""} needed — stonkbro`
    : alerts.length > 0
    ? `stonkbro: ${alerts.length} update${alerts.length > 1 ? "s" : ""} today`
    : "stonkbro: all clear today";

  await getResend().emails.send({
    from: "stonkbro <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
