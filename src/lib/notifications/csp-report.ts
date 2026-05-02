/**
 * CSP Alpha Hunter — Email Report
 *
 * Delta-aware HTML email showing top CSP candidates, changes since last scan,
 * and Claude's risk analysis.
 */

import { Resend } from "resend";
import { CSPHunterCandidate, CSPScanResult } from "@/lib/options/csp-scanner";
import { ScanDelta, DeltaChange } from "@/lib/options/csp-delta";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendCSPHunterReport(
  to: string,
  scan: CSPScanResult,
  delta: ScanDelta | null,
  claudeAnalysis: string | null
): Promise<void> {
  const top = scan.candidates.slice(0, 10);
  const highPriority = top.filter((c) => c.priority === "high");
  const hasDelta = delta && delta.totalChanges > 0;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5;">

  <!-- Header -->
  <div style="padding: 24px 20px; border-bottom: 2px solid #22c55e;">
    <h1 style="font-size: 22px; font-weight: 800; color: #22c55e; margin: 0;">
      🎯 CSP Alpha Hunter
    </h1>
    <p style="color: #737373; font-size: 12px; margin: 4px 0 0 0;">${dateStr} ET · $${scan.capital.toLocaleString()} capital · ${scan.candidates.length} candidates</p>
  </div>

  ${hasDelta ? renderDeltaSection(delta) : ""}

  <!-- Top Picks -->
  <div style="padding: 16px 20px 8px;">
    <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #22c55e; margin: 0;">
      Top ${top.length} Candidates
    </h2>
  </div>
  <table style="width: 100%; border-collapse: collapse;">
    ${top.map((c) => renderCandidate(c)).join("")}
  </table>

  ${claudeAnalysis ? renderClaudeSection(claudeAnalysis) : ""}

  ${scan.errors.length > 0 ? `
  <div style="padding: 12px 20px; border-top: 1px solid #262626;">
    <p style="color: #525252; font-size: 11px; margin: 0;">⚠️ ${scan.errors.length} ticker(s) had errors during scan</p>
  </div>` : ""}

  <!-- Footer -->
  <div style="padding: 16px 20px; text-align: center; border-top: 1px solid #262626;">
    <a href="https://stonkbro.vercel.app/csp-hunter" style="color: #22c55e; font-size: 12px; text-decoration: none;">Open CSP Hunter →</a>
  </div>
</div>`;

  const subject = highPriority.length > 0
    ? `🎯 ${highPriority.length} high-priority CSP${highPriority.length > 1 ? "s" : ""} found — ${highPriority[0].symbol} ${highPriority[0].aroc}% AROC`
    : scan.candidates.length > 0
    ? `🎯 CSP Hunter: ${scan.candidates.length} candidates (top ${top[0]?.aroc ?? 0}% AROC)`
    : "🎯 CSP Hunter: no qualifying candidates this scan";

  await getResend().emails.send({
    from: "stonkbro <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderCandidate(c: CSPHunterCandidate): string {
  const priorityColors: Record<string, string> = {
    high: "#22c55e",
    medium: "#eab308",
    low: "#737373",
  };
  const color = priorityColors[c.priority] ?? "#737373";

  return `
  <tr>
    <td style="padding: 12px 20px; border-bottom: 1px solid #1a1a1a;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="background: ${color}; color: #000; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">${c.priority.toUpperCase()}</span>
          <strong style="color: #f5f5f5; font-size: 15px; margin-left: 8px;">${c.symbol}</strong>
          <span style="color: #525252; font-size: 12px; margin-left: 4px;">$${c.strike} P</span>
          <span style="color: #404040; font-size: 11px; margin-left: 4px;">${c.expiry} (${c.dte}d)</span>
        </div>
      </div>
      <div style="margin-top: 6px; display: flex; gap: 16px; flex-wrap: wrap;">
        <span style="color: #22c55e; font-size: 13px; font-weight: 600;">$${c.mid.toFixed(2)} mid</span>
        <span style="color: #eab308; font-size: 13px;">${c.aroc}% AROC</span>
        <span style="color: #a3a3a3; font-size: 12px;">Δ${c.delta.toFixed(2)}</span>
        <span style="color: #a3a3a3; font-size: 12px;">${c.distanceFromPrice}% OTM</span>
        <span style="color: #a3a3a3; font-size: 12px;">Score: ${c.juiciness}/100</span>
      </div>
      <div style="margin-top: 4px;">
        <span style="color: #525252; font-size: 11px;">${c.contractsAt100k} contracts · $${c.totalPremium.toLocaleString()} premium · ${c.capitalUtilization}% capital</span>
      </div>
      ${c.earningsWithinDTE ? `<div style="margin-top: 4px;"><span style="color: #ef4444; font-size: 11px;">⚠️ Earnings within DTE: ${c.earningsDate}</span></div>` : ""}
      ${c.nearSupport ? `<div style="margin-top: 2px;"><span style="color: #22c55e; font-size: 11px;">✓ Near support $${c.supportLevel}</span></div>` : ""}
    </td>
  </tr>`;
}

function renderDeltaSection(delta: ScanDelta): string {
  const changes: string[] = [];

  for (const d of delta.premiumIncreased.slice(0, 3)) {
    changes.push(`<div style="padding: 4px 0;"><span style="color: #22c55e;">📈</span> ${d.message}</div>`);
  }
  for (const d of delta.newEntries.slice(0, 3)) {
    changes.push(`<div style="padding: 4px 0;"><span style="color: #3b82f6;">🆕</span> ${d.message}</div>`);
  }
  for (const d of delta.supportLost.slice(0, 2)) {
    changes.push(`<div style="padding: 4px 0;"><span style="color: #ef4444;">⚠️</span> ${d.message}</div>`);
  }
  for (const d of delta.dropped.slice(0, 2)) {
    changes.push(`<div style="padding: 4px 0;"><span style="color: #737373;">❌</span> ${d.message}</div>`);
  }

  if (changes.length === 0) return "";

  return `
  <div style="padding: 16px 20px; border-bottom: 1px solid #262626; background: #111;">
    <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #eab308; margin: 0 0 8px 0;">
      Delta — ${delta.hoursSinceLast}h since last scan
    </h2>
    <div style="font-size: 12px; color: #a3a3a3;">
      ${changes.join("")}
    </div>
    <div style="margin-top: 8px; color: #525252; font-size: 11px;">
      ${delta.newEntries.length} new · ${delta.premiumIncreased.length} premium up · ${delta.premiumDecreased.length} down · ${delta.dropped.length} dropped
    </div>
  </div>`;
}

function renderClaudeSection(analysis: string): string {
  // Convert markdown-ish text to basic HTML
  const htmlContent = analysis
    .replace(/## (.*)/g, '<h3 style="color: #a78bfa; font-size: 14px; margin: 12px 0 4px 0;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f5f5f5;">$1</strong>')
    .replace(/\n/g, "<br>");

  return `
  <div style="padding: 16px 20px; border-top: 1px solid #262626; background: #0f0a1a;">
    <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #a78bfa; margin: 0 0 8px 0;">
      🤖 Claude Risk Analysis
    </h2>
    <div style="font-size: 13px; color: #d4d4d4; line-height: 1.5;">
      ${htmlContent}
    </div>
  </div>`;
}
