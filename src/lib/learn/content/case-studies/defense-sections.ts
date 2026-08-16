// Shared "defense" block appended to every case study: the warning sign that
// was detectable in the real data, the exact order that belonged in the
// brokerage at entry, and what that order was worth. All numbers are computed
// at module load from src/lib/learn/v2-data via defense.ts — nothing here is
// hand-typed.

import type { Lesson, LessonSection, QuizQuestion } from "@/lib/learn/curriculum";
import { type V2Ticker, bars, money } from "@/lib/learn/v2";
import {
  shortOptionDefense,
  stockStopDefense,
  type ShortDefense,
} from "@/lib/learn/defense";

// ── Formatting ──────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07-10" → "July 10". The whole dataset lives in 2026. */
function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
}

/** "2026-07-10" → "7/10" for order-ticket shorthand. */
function fmtExp(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** Signed per-contract dollars: "+$210" / "-$1,340". */
function usd(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

/** Strike rendered without trailing zeros: 17.5 → "17.50" only if needed. */
function fmtStrike(k: number): string {
  return Number.isInteger(k) ? String(k) : k.toFixed(2).replace(/0$/, "");
}

// ── Spec ────────────────────────────────────────────────────────────────────

export type DefenseSpec =
  | {
      kind: "short-put";
      entryDate: string;
      strike: number;
      expiry: string;
      /** Credit received per share at entry (use the real scanned mid/bid). */
      credit: number;
      /** The level whose daily-close breach kills the thesis. Defaults to the
       *  strike when the setup named no support. */
      support?: { level: number; label: string };
      /** Day volume at entry — <10 switches the ticket to alert+manual close. */
      volume?: number;
      /** Optional extra sentence appended to the warning-sign paragraph. */
      note?: string;
    }
  | {
      kind: "covered-call";
      entryDate: string;
      strike: number;
      expiry: string;
      credit: number;
      volume?: number;
      note?: string;
    }
  | {
      kind: "long-call";
      entryDate: string;
      strike: number;
      expiry: string;
      /** Debit paid per share at entry. */
      credit: number;
      volume?: number;
      note?: string;
    };

// ── Short put ───────────────────────────────────────────────────────────────

function shortPutSections(
  t: V2Ticker,
  lessonId: string,
  s: Extract<DefenseSpec, { kind: "short-put" }>
): LessonSection[] {
  const supportLevel = s.support?.level ?? s.strike;
  const supportLabel = s.support?.label ?? "strike itself — the setup named no support level";
  const d = shortOptionDefense(t, {
    side: "put",
    strike: s.strike,
    expiry: s.expiry,
    entryDate: s.entryDate,
    credit: s.credit,
    support: supportLevel,
  });
  const sym = t.symbol;
  const kStr = fmtStrike(s.strike);
  const illiquid = (s.volume ?? 100) < 10;
  const triggered = d.exit !== null;

  // 1 — the warning sign, stated from the real bars/marks.
  let warn = `**The defense — what to do, not just what happened.**\n\n`;
  if (d.supportBreach && d.premiumBreach && d.premiumBreach.date < d.supportBreach.date) {
    warn += `**The warning sign.** The contract's own marks fired first: on **${fmtDate(d.premiumBreach.date)}** the scanner caught this put at **${money(d.premiumBreach.mid)}** — ${(d.premiumBreach.mid / s.credit).toFixed(1)}× the ${money(s.credit)} credit, through the ${money(d.trigger)} buy-back trigger. The price confirmation came on **${fmtDate(d.supportBreach.date)}**, when ${sym} closed at **${money(d.supportBreach.close)}**, below the ${money(supportLevel)} ${supportLabel}.`;
  } else if (d.supportBreach) {
    warn += `**The warning sign.** On **${fmtDate(d.supportBreach.date)}**, ${sym} closed at **${money(d.supportBreach.close)}** — below the ${money(supportLevel)} ${supportLabel}. A daily close through that level was the detectable, end-of-day signal that the entry thesis was gone; everything after it was hope, not a plan.`;
    if (d.premiumBreach) {
      warn += ` The option said the same thing ${d.premiumBreach.date > d.supportBreach.date ? "shortly after" : "the same day"}: on ${fmtDate(d.premiumBreach.date)} it marked **${money(d.premiumBreach.mid)}**, ${(d.premiumBreach.mid / s.credit).toFixed(1)}× the credit and through the ${money(d.trigger)} trigger.`;
    } else {
      warn += ` Note that no later scan of this contract shows a mark at or above the ${money(d.trigger)} premium trigger — option marks lag and quotes go stale, which is exactly why the underlying's close, not the option's price, is the primary tripwire.`;
    }
  } else if (d.premiumBreach) {
    warn += `**The warning sign.** ${sym} never printed a daily close below ${money(supportLevel)} (${supportLabel}), but the option's marks blew through the premium tripwire: on **${fmtDate(d.premiumBreach.date)}** this contract was scanned at **${money(d.premiumBreach.mid)}** — ${(d.premiumBreach.mid / s.credit).toFixed(1)}× the ${money(s.credit)} collected, past the ${money(d.trigger)} buy-back trigger.`;
  } else {
    warn += `**The warning that never fired.** ${sym} never closed below ${money(supportLevel)} (${supportLabel}), and no post-entry scan of this contract ever reached the ${money(d.trigger)} buy-back trigger. Both defensive orders below would have sat untouched from entry to the end — that is what they are supposed to do on a trade that works.`;
  }
  if (s.note) warn += `\n\n${s.note}`;

  // 2 — the exact order ticket, placed at entry.
  let ticket = `**The orders to place at entry — ${fmtDate(s.entryDate)}, the same session you sell the put:**\n`;
  if (illiquid) {
    ticket += `• This contract showed **${s.volume} contract${s.volume === 1 ? "" : "s"} of day volume** — do NOT rest a stop in this book. A stop-market fills at whatever the wide ask happens to be, and a stop-limit may never fill. Instead: set a **price alert on the option at ${money(d.trigger)}** (2× the ${money(s.credit)} credit) and a **close alert on ${sym} at ${money(supportLevel)}**, and buy to close manually with a limit near the ask when either fires.\n`;
  } else {
    ticket += `• **GTC stop-limit BUY TO CLOSE 1× ${sym} ${fmtExp(s.expiry)} $${kStr}P — stop ${money(d.trigger)}, limit ${money(d.limit)}.** That is the 2× rule: ${money(s.credit)} credit × 2 = ${money(d.trigger)}, with ~10% of limit room so a fast tape can still fill you.\n`;
  }
  ticket += `• **Close-basis alert: ${sym} daily close below ${money(supportLevel)}** (${supportLabel}). If it triggers, buy the put back next session at a limit near the ask — regardless of what the option's P&L shows. Marks lag; closes don't.\n`;
  ticket += `• **GTC BUY TO CLOSE at ${money(Math.round(s.credit * 0.5 * 100) / 100)}** — the 50% take-profit that banks most of the reward and hands back the tail risk.`;

  // 3 — what the defense was worth, from the observed path.
  let worth = `**What it would have saved.**\n`;
  const heldLine = d.settled
    ? `• Held to expiry (${fmtDate(d.settleDate)}, ${sym} at ${money(d.settleClose)}): **${usd(d.actualPnl)} per contract**.`
    : `• Still open at the dataset's edge (${fmtDate(d.settleDate)}, ${sym} at ${money(d.settleClose)}): **${usd(d.actualPnl)} per contract** on the last observed mark.`;
  if (triggered && d.exit && d.exitPnl !== null && d.saved !== null) {
    worth += heldLine + `\n`;
    worth += `• Defensive exit on **${fmtDate(d.exit.date)}** (${d.exit.reason === "premium" ? "premium trigger" : "close below support"}) at ≈${money(d.exit.mark)}${d.exit.estimated ? ` — ${d.exit.markDate !== d.exit.date ? `nearest observed mark, from ${fmtDate(d.exit.markDate)}` : "no scan exists near this date, so this is a conservative floor built from the trigger and intrinsic value"}` : ""}: **${usd(d.exitPnl)} per contract**.\n`;
    if (d.saved > 0) {
      worth += `• The defense kept **$${Math.round(d.saved).toLocaleString("en-US")} per contract** — ${(d.saved / (s.credit * 100)).toFixed(1)}× the entire credit this trade was ever going to pay.`;
    } else {
      worth += `• This time the rule **cost** ${money(Math.abs(d.saved) / 100)}/sh versus holding: the stop fired and the trade recovered. That is the insurance premium — you pay it on the whipsaws so the ${money(s.credit)} credits stop being able to turn into strike-sized losses.`;
    }
  } else {
    worth += heldLine + `\n`;
    worth += `• Neither defensive order fired, so the rules cost **$0** — the full credit was kept with the protection in place the whole time.\n`;
    if (d.profitTake) {
      worth += `• The 50% take-profit was live, though: on **${fmtDate(d.profitTake.date)}** the mark was ${money(d.profitTake.mid)} (${Math.round((1 - d.profitTake.mid / s.credit) * 100)}% of the credit captured, ${d.profitTake.dte} DTE left). Closing there banks ${usd(Math.round((s.credit - d.profitTake.mid) * 100))} and hands the remaining tail risk back — on a mover, that is usually the right trade.`;
    } else {
      worth += `• No post-entry scan caught the mark at or below 50% of the credit, so the take-profit order would have carried to expiry.`;
    }
  }

  // 4 — one quiz question per study: name the trigger.
  const half = money(Math.round(s.credit * 0.5 * 100) / 100);
  const quiz: QuizQuestion = {
    id: `${lessonId}-defense-q`,
    question: `You sell this ${sym} $${kStr} put for ${money(s.credit)}. Per the Defense Playbook, which pair of triggers goes into the brokerage at entry?`,
    options: [
      `Buy to close at ${half}, and add contracts if ${sym} closes below ${money(supportLevel)}`,
      `Buy to close if the option trades to ${money(d.trigger)} (2× the credit), or if ${sym} closes below ${money(supportLevel)} — whichever hits first`,
      `A stop-market on the option at ${money(s.credit)} — exit the moment the position stops profiting`,
      `Nothing until 21 DTE — short puts are managed on the calendar, not on price`,
    ],
    correctIndex: 1,
    explanation: triggered && d.exit
      ? `Trigger = 2 × ${money(s.credit)} = ${money(d.trigger)} on the option, paired with a close-basis alert at ${money(supportLevel)}. Here the ${d.exit.reason === "premium" ? "premium trigger" : "support alert"} fired on ${fmtDate(d.exit.date)}${d.saved !== null && d.saved > 0 ? ` and was worth $${Math.round(d.saved).toLocaleString("en-US")} per contract versus holding` : ""}. ${half} is the take-profit, not the stop.`
      : `Trigger = 2 × ${money(s.credit)} = ${money(d.trigger)} on the option, paired with a close-basis alert at ${money(supportLevel)}. On this trade neither fired — the defense costs nothing when the trade works. ${half} is the take-profit, not the stop.`,
  };

  return [
    { type: "text", content: warn },
    { type: "callout", style: triggered ? "warning" : "tip", content: ticket },
    { type: "text", content: worth },
    { type: "quiz", questions: [quiz] },
  ];
}

// ── Covered call (risk lives in the shares, not the short call) ────────────

function coveredCallSections(
  t: V2Ticker,
  lessonId: string,
  s: Extract<DefenseSpec, { kind: "covered-call" }>
): LessonSection[] {
  const sym = t.symbol;
  const kStr = fmtStrike(s.strike);
  const stock = stockStopDefense(t, s.entryDate);
  const call: ShortDefense = shortOptionDefense(t, {
    side: "call",
    strike: s.strike,
    expiry: s.expiry,
    entryDate: s.entryDate,
    credit: s.credit,
  });
  const half = money(Math.round(s.credit * 0.5 * 100) / 100);

  let warn = `**The defense — what to do, not just what happened.**\n\nA covered call's real risk is the shares, not the short call. The stop belongs under the level that justified holding the stock: the ${money(stock.swingLow.low)} swing low from ${fmtDate(stock.swingLow.date)}, minus one ATR of noise room (ATR₁₄ at entry: ${money(stock.atr)}) = **${money(stock.stopLevel)}**.\n\n`;
  if (stock.breach) {
    warn += `**The warning sign.** On **${fmtDate(stock.breach.date)}**, ${sym} closed at **${money(stock.breach.close)}** — below that ${money(stock.stopLevel)} stop. From that close on, the position was no longer "income on a holding"; it was riding a broken chart for ${money(s.credit)}/sh of premium.`;
  } else {
    warn += `**The warning that never fired.** ${sym} never closed below ${money(stock.stopLevel)} in the dataset — the share stop would have sat untouched while the call did its work.`;
  }
  if (s.note) warn += `\n\n${s.note}`;

  let ticket = `**The orders to place at entry — ${fmtDate(s.entryDate)}, the same session you sell the call:**\n`;
  ticket += `• **GTC stop-limit SELL 100 ${sym} — stop ${money(stock.stopLevel)}** (${money(stock.swingLow.low)} swing low − 1 ATR of ${money(stock.atr)}), limit ~1% below. If it fills, buy the ${fmtExp(s.expiry)} $${kStr}C back the same session — never stay short a call with no shares behind it.\n`;
  ticket += `• **GTC BUY TO CLOSE 1× ${sym} ${fmtExp(s.expiry)} $${kStr}C at ${half}** — the 50% take-profit on the ${money(s.credit)} credit.\n`;
  ticket += `• **Calendar alert at 21 DTE** (${fmtDate(s.expiry)} expiry): close or roll whatever is left — the last three weeks are gamma's, not yours.`;

  let worth = `**What it would have saved.**\n`;
  if (stock.breach && stock.stopPnlPerShare !== null && stock.savedPerShare !== null) {
    worth += `• Holding the shares to the window's edge (${fmtDate(stock.lastBar.date)}, close ${money(stock.lastBar.close)}): **${usd(Math.round(stock.heldPnlPerShare * 100))} per 100 shares** from the ${fmtDate(s.entryDate)} entry close.\n`;
    worth += `• Stopped at ${money(stock.stopLevel)} on ${fmtDate(stock.breach.date)}: **${usd(Math.round(stock.stopPnlPerShare * 100))} per 100 shares**${stock.savedPerShare > 0 ? ` — the stop kept **$${Math.round(stock.savedPerShare * 100).toLocaleString("en-US")}**` : ` — this time the stop cost ${money(Math.abs(stock.savedPerShare))}/sh versus holding; that is the insurance premium`}.\n`;
    worth += `• Either way the ${money(s.credit)}/sh credit (${usd(Math.round(s.credit * 100))}) stays yours — the call seller's cushion is real precisely on days like ${fmtDate(stock.breach.date)}.`;
  } else {
    worth += `• The share stop at ${money(stock.stopLevel)} never fired — protection in place the whole way for $0.\n`;
    if (call.profitTake) {
      worth += `• The call's 50% take-profit was live: on **${fmtDate(call.profitTake.date)}** the ${kStr}C marked ${money(call.profitTake.mid)} (${Math.round((1 - call.profitTake.mid / s.credit) * 100)}% of the credit captured, ${call.profitTake.dte} DTE left). Closing there banks ${usd(Math.round((s.credit - call.profitTake.mid) * 100))} and frees the shares for the next cycle.`;
    } else {
      worth += `• No post-entry scan caught the call at or below 50% of its credit — the take-profit would have ridden on.`;
    }
  }

  const quiz: QuizQuestion = {
    id: `${lessonId}-defense-q`,
    question: `You hold 100 ${sym} and sell the $${kStr} call for ${money(s.credit)}. Where does the playbook put the protective stop, and on what?`,
    options: [
      `On the call: buy it back if it trades to ${money(call.trigger)} (2× credit)`,
      `On the shares: a GTC stop at ${money(stock.stopLevel)} — the ${money(stock.swingLow.low)} swing low minus 1 ATR (${money(stock.atr)}) — because the downside risk of a covered call lives in the stock`,
      `No stop — the ${money(s.credit)} credit is the downside protection`,
      `On the shares at the ${money(s.strike)} strike — above it you get called away anyway`,
    ],
    correctIndex: 1,
    explanation: `The short call can only ever cost you opportunity; the shares can lose real dollars. Stop = swing low − 1 ATR = ${money(stock.swingLow.low)} − ${money(stock.atr)} = ${money(stock.stopLevel)}. ${stock.breach ? `It fired on ${fmtDate(stock.breach.date)} (close ${money(stock.breach.close)}).` : "In this window it never fired — the credit was pure cushion."}`,
  };

  return [
    { type: "text", content: warn },
    { type: "callout", style: stock.breach ? "warning" : "tip", content: ticket },
    { type: "text", content: worth },
    { type: "quiz", questions: [quiz] },
  ];
}

// ── Long call (debit paid; risk = timing, theta, and the whole premium) ────

function longCallSections(
  t: V2Ticker,
  lessonId: string,
  s: Extract<DefenseSpec, { kind: "long-call" }>
): LessonSection[] {
  const sym = t.symbol;
  const kStr = fmtStrike(s.strike);
  const stock = stockStopDefense(t, s.entryDate);
  const breakeven = Math.round((s.strike + s.credit) * 100) / 100;
  const afterBars = bars(t).filter(
    (b) => b.date > s.entryDate && b.date <= s.expiry
  );
  const aboveBreakeven = afterBars.find((b) => b.close > breakeven) ?? null;
  const expiryBar = bars(t).find((b) => b.date === s.expiry) ?? null;
  const settled = expiryBar !== null;
  const settleValue = expiryBar
    ? Math.max(0, expiryBar.close - s.strike)
    : null;

  let warn = `**The defense — what to do, not just what happened.**\n\nA long call's max loss is written on the ticket — the ${money(s.credit)}/sh debit — so the defense is about not paying all of it for a thesis that has already died. Two lines were computable at entry: the stop, at the ${money(stock.swingLow.low)} swing low (${fmtDate(stock.swingLow.date)}) minus 1 ATR (${money(stock.atr)}) = **${money(stock.stopLevel)}**; and the breakeven, strike + debit = **${money(breakeven)}**.\n\n`;
  if (aboveBreakeven) {
    warn += `**The signal that mattered.** On **${fmtDate(aboveBreakeven.date)}**, ${sym} closed at **${money(aboveBreakeven.close)}** — above the ${money(breakeven)} breakeven with time still on the clock. For long premium that close is a *take-profit* signal, not a victory lap: an unrealized gain on a decaying asset is a decision being postponed.`;
  } else {
    warn += `**The signal that never came.** ${sym} never closed above the ${money(breakeven)} breakeven inside the trade's window — the take-profit rule had nothing to take.`;
  }
  if (stock.breach) {
    warn += ` And on **${fmtDate(stock.breach.date)}** ${sym} closed at ${money(stock.breach.close)}, below the ${money(stock.stopLevel)} stop — the day the remaining time value stopped being worth holding.`;
  }
  if (s.note) warn += `\n\n${s.note}`;

  let ticket = `**The orders to place at entry — ${fmtDate(s.entryDate)}, the same session you buy the call:**\n`;
  ticket += `• **Size first:** the ${money(s.credit)}/sh debit ($${Math.round(s.credit * 100).toLocaleString("en-US")} per contract) is the max loss — cap it at 1–2% of the account. The stop below limits the *timing* loss; sizing limits the catastrophe.\n`;
  ticket += `• **Close-basis alert: ${sym} daily close below ${money(stock.stopLevel)}** (${money(stock.swingLow.low)} swing low − 1 ATR of ${money(stock.atr)}). If it fires, sell the call next session at a limit — do not rest a stop keyed to the option's own last trade; a stale print or spread twitch will trigger it.\n`;
  ticket += `• **Take-profit rule:** on any daily close above the ${money(breakeven)} breakeven with more than half the DTE remaining, sell at least half. Long premium pays you for being right *early* — the calendar takes the rest back.`;

  let worth = `**What it would have saved.**\n`;
  worth += settled && settleValue !== null
    ? `• Held to the ${fmtDate(s.expiry)} expiry (${sym} at ${money(expiryBar!.close)}): the call settled at ${settleValue > 0 ? money(settleValue) : "$0.00"} intrinsic against the ${money(s.credit)} paid — **${usd(Math.round((settleValue - s.credit) * 100))} per contract**.\n`
    : `• The expiry sits past the dataset's edge, so the final settle isn't shown here.\n`;
  if (aboveBreakeven) {
    const intr = Math.round((aboveBreakeven.close - s.strike) * 100) / 100;
    worth += `• Selling into the ${fmtDate(aboveBreakeven.date)} close above breakeven: the call carried **${money(intr)}/sh of intrinsic alone** (plus all its remaining time value) against the ${money(s.credit)} paid — a floor of ${usd(Math.round((intr - s.credit) * 100))} per contract *before* counting time value, versus riding it down.\n`;
  }
  if (stock.breach) {
    worth += `• Failing that, the ${money(stock.stopLevel)} stop on ${fmtDate(stock.breach.date)} ends the trade while the option still has time value to sell — any exit there beats paying the full debit to watch the thesis finish dying.`;
  } else if (!aboveBreakeven) {
    worth += `• The stop never fired either; this position simply decayed. That is the long-premium failure mode sizing exists for.`;
  }

  const quiz: QuizQuestion = {
    id: `${lessonId}-defense-q`,
    question: `You pay ${money(s.credit)}/sh for the ${sym} $${kStr} call off a ${money(stock.swingLow.low)} swing low (ATR ${money(stock.atr)}). What defense goes in at entry?`,
    options: [
      `A stop order on the option at half the debit paid`,
      `Size the debit to 1–2% of the account, set a close alert at ${money(stock.stopLevel)} (swing low − 1 ATR), and take profits on a close above the ${money(breakeven)} breakeven with time left`,
      `Nothing — a long call's risk is already defined`,
      `A GTC sell at 2× the debit and no other rule`,
    ],
    correctIndex: 1,
    explanation: `"Defined risk" still means −100% of the debit. Stop = ${money(stock.swingLow.low)} − ${money(stock.atr)} = ${money(stock.stopLevel)} on the underlying; breakeven = ${fmtStrike(s.strike)} + ${money(s.credit)} = ${money(breakeven)}. ${aboveBreakeven ? `This trade closed above breakeven on ${fmtDate(aboveBreakeven.date)} — the exit was offered and expired unused.` : `This trade never saw breakeven — sizing was the only defense that could matter.`}`,
  };

  return [
    { type: "text", content: warn },
    { type: "callout", style: "warning", content: ticket },
    { type: "text", content: worth },
    { type: "quiz", questions: [quiz] },
  ];
}

// ── Public API ──────────────────────────────────────────────────────────────

export function defenseSections(
  t: V2Ticker,
  lessonId: string,
  spec: DefenseSpec
): LessonSection[] {
  if (spec.kind === "covered-call") return coveredCallSections(t, lessonId, spec);
  if (spec.kind === "long-call") return longCallSections(t, lessonId, spec);
  return shortPutSections(t, lessonId, spec);
}

/**
 * Appends a computed defense block to each lesson that has a spec. Throws on
 * a spec whose lesson id doesn't exist, so a typo fails the build.
 */
export function withDefenses(
  lessons: Lesson[],
  t: V2Ticker,
  specs: Record<string, DefenseSpec>
): Lesson[] {
  for (const id of Object.keys(specs)) {
    if (!lessons.some((l) => l.id === id)) {
      throw new Error(`[defense] ${t.symbol}: no lesson with id "${id}"`);
    }
  }
  return lessons.map((l) =>
    specs[l.id]
      ? { ...l, sections: [...l.sections, ...defenseSections(t, l.id, specs[l.id])] }
      : l
  );
}
