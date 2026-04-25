import { AlertItem } from "@/lib/notifications/email";
import { QuoteData } from "@/lib/market/yahoo";

export type TrackedPosition = {
  symbol: string;
  strategy: "PMCC" | "Covered Call" | "Cash-Secured Put";
  legs: {
    type: "leaps_call" | "short_call" | "short_put" | "shares";
    strike: number;
    expiry: string;
    entryPrice: number;
    currentPrice?: number;
  }[];
  entryDate: string;
};

/**
 * Generate actionable alerts for tracked positions based on current market data.
 */
export function generateAlerts(
  positions: TrackedPosition[],
  quotes: Map<string, QuoteData>,
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const now = new Date();

  for (const pos of positions) {
    const quote = quotes.get(pos.symbol);
    if (!quote) continue;

    for (const leg of pos.legs) {
      const expiryDate = new Date(leg.expiry);
      const dte = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // === SHORT CALL SIGNALS ===
      if (leg.type === "short_call") {
        // Profit target: if current price is < 50% of entry (50%+ profit)
        if (leg.currentPrice !== undefined && leg.currentPrice <= leg.entryPrice * 0.5) {
          const profitPct = ((leg.entryPrice - leg.currentPrice) / leg.entryPrice * 100).toFixed(0);
          alerts.push({
            action: "CLOSE",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `Short $${leg.strike} call at ${profitPct}% profit — close and resell`,
            urgency: "high",
            details: `Entry: $${leg.entryPrice.toFixed(2)} → Current: $${leg.currentPrice.toFixed(2)}`,
          });
        }

        // DTE warning: roll when < 21 DTE
        if (dte <= 21 && dte > 0) {
          alerts.push({
            action: "ROLL",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `Short $${leg.strike} call has ${dte} DTE — consider rolling to next month`,
            urgency: dte <= 7 ? "high" : "medium",
            details: `Expires ${leg.expiry}`,
          });
        }

        // Price approaching strike
        if (quote.price >= leg.strike * 0.97 && quote.price < leg.strike) {
          alerts.push({
            action: "WARNING",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `${pos.symbol} at $${quote.price.toFixed(2)} — within 3% of $${leg.strike} short call`,
            urgency: "high",
            details: "Consider rolling up and out to avoid assignment",
          });
        }

        // Breached strike
        if (quote.price >= leg.strike) {
          alerts.push({
            action: "ROLL",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `${pos.symbol} breached $${leg.strike} short call — roll up and out NOW`,
            urgency: "high",
            details: `Stock: $${quote.price.toFixed(2)}, Strike: $${leg.strike}`,
          });
        }
      }

      // === SHORT PUT SIGNALS ===
      if (leg.type === "short_put") {
        // Profit target
        if (leg.currentPrice !== undefined && leg.currentPrice <= leg.entryPrice * 0.5) {
          const profitPct = ((leg.entryPrice - leg.currentPrice) / leg.entryPrice * 100).toFixed(0);
          alerts.push({
            action: "CLOSE",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `Short $${leg.strike} put at ${profitPct}% profit — close and resell`,
            urgency: "high",
            details: `Entry: $${leg.entryPrice.toFixed(2)} → Current: $${leg.currentPrice.toFixed(2)}`,
          });
        }

        // DTE warning
        if (dte <= 21 && dte > 0) {
          alerts.push({
            action: "ROLL",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `Short $${leg.strike} put has ${dte} DTE — consider rolling`,
            urgency: dte <= 7 ? "high" : "medium",
          });
        }

        // Price approaching put strike (danger of assignment)
        if (quote.price <= leg.strike * 1.03 && quote.price > leg.strike) {
          alerts.push({
            action: "WARNING",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `${pos.symbol} at $${quote.price.toFixed(2)} — within 3% of $${leg.strike} short put`,
            urgency: "high",
            details: "May get assigned — prepare to own shares or roll down",
          });
        }
      }

      // === LEAPS SIGNALS ===
      if (leg.type === "leaps_call") {
        // LEAPS DTE warning
        if (dte <= 120 && dte > 0) {
          alerts.push({
            action: "ROLL",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `LEAPS $${leg.strike} call has ${dte} DTE — getting short, consider rolling`,
            urgency: dte <= 60 ? "high" : "medium",
            details: "LEAPS should maintain 180+ DTE for optimal theta decay ratio",
          });
        }
      }
    }

    // === EARNINGS WARNING ===
    if (quote.earningsDate) {
      const earningsDate = new Date(quote.earningsDate);
      const daysToEarnings = Math.ceil((earningsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysToEarnings >= 0 && daysToEarnings <= 7) {
        const hasShortOption = pos.legs.some((l) => l.type === "short_call" || l.type === "short_put");
        if (hasShortOption) {
          alerts.push({
            action: "WARNING",
            symbol: pos.symbol,
            strategy: pos.strategy,
            message: `Earnings in ${daysToEarnings} day${daysToEarnings !== 1 ? "s" : ""} — close short options before earnings`,
            urgency: daysToEarnings <= 2 ? "high" : "medium",
            details: `Earnings date: ${quote.earningsDate}`,
          });
        }
      }
    }
  }

  // === NEW OPPORTUNITY SIGNALS ===
  // High volume ratio = potential explosive move
  for (const [, quote] of quotes) {
    if (quote.volumeRatio >= 2.5 && quote.changePct > 3) {
      alerts.push({
        action: "BUY",
        symbol: quote.symbol,
        strategy: "PMCC",
        message: `${quote.symbol} breakout: +${quote.changePct.toFixed(1)}% on ${quote.volumeRatio.toFixed(1)}x volume — scan for PMCC setup`,
        urgency: "medium",
        details: `Price: $${quote.price.toFixed(2)}, above 50 SMA: ${quote.above50sma ? "yes" : "no"}`,
      });
    }
  }

  // Sort by urgency
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}
