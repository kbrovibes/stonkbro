// The Defense Playbook — the house rules every case-study "defense" block
// applies. Worked examples are computed from the same real dataset the
// studies use (META's June $600 put, META's May covered-call entry, MRVL's
// wide June quote), so the tickets shown here are real, not illustrative.

import metaRaw from "@/lib/learn/v2-data/META.json";
import mrvlRaw from "@/lib/learn/v2-data/MRVL.json";
import { barOn, findPut, money, type V2Ticker } from "@/lib/learn/v2";
import {
  creditStopLimit,
  creditStopTrigger,
  shortOptionDefense,
  stockStopDefense,
} from "@/lib/learn/defense";
import type { Module } from "@/lib/learn/curriculum";

const meta = metaRaw as V2Ticker;
const mrvl = mrvlRaw as V2Ticker;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** "2026-06-03" → "June 3" (no Date object — dataset dates are plain ISO). */
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
};

// Worked example 1 — the short-put ticket (META $600 put, June 3, 2026).
const exPut = findPut(meta, "2026-06-03", 600, "2026-06-12");
const exEntry = barOn(meta, "2026-06-03");
const exSupport = barOn(meta, "2026-06-01").low; // the shelf the strike sat on
const exTrigger = creditStopTrigger(exPut.mid);
const exLimit = creditStopLimit(exPut.mid);
const exDef = shortOptionDefense(meta, {
  side: "put",
  strike: 600,
  expiry: "2026-06-12",
  entryDate: "2026-06-03",
  credit: exPut.mid,
  support: exSupport,
});

// Worked example 2 — the long-side stop (META shares at the May 27 CC entry).
const exStock = stockStopDefense(meta, "2026-05-27");
const exStockEntry = barOn(meta, "2026-05-27");

// Worked example 3 — why stop-market on options is dangerous (real quote).
const exWide = findPut(mrvl, "2026-06-05", 220, "2026-06-18");

export const DEFENSE_PLAYBOOK: Module = {
  id: "cs-defense-playbook",
  title: "The Defense Playbook",
  subtitle: "The stop, the trigger, and the order ticket — placed at entry, every time",
  icon: "🛡️",
  color: "emerald-500",
  level: 2,
  track: "case-study",
  ticker: "DEFENSE",
  universe: "traded",
  lessons: [
    {
      id: "defense-playbook",
      title: "The rules every case study applies",
      subtitle: "Read this first — each study's defense block assumes these orders exist",
      estimatedMinutes: 9,
      sections: [
        {
          type: "text",
          content: `Every case study in this track now ends with a **defense block**: the warning sign that was detectable in the real data, the exact order that belonged in the brokerage **at entry**, and what that order was worth in dollars. This lesson is the rulebook those blocks apply — read it once and every ticket in the studies will parse at a glance.\n\nThe single idea underneath all of it: **the defensive order is placed the day you open the trade, not after the drop.** Once the position is losing, the decision is emotional; at entry, it is arithmetic.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `**Short puts & covered calls — the income rules**\n• **The 2× rule:** the moment you are filled, place a GTC stop-limit BUY TO CLOSE at **2× the credit received** (limit ~10% above the stop). Sold it for $2.10? Stop $4.20, limit $4.62.\n• **The support tripwire:** pair it with a close-basis alert on the underlying at the setup's support level. If the stock **closes** below it, buy the option back next session no matter what the mark shows — option marks lag and go stale; daily closes don't.\n• Whichever of the two hits first wins. Then stand down — no re-entry the same week.\n• **Take profits at 50–75% of the credit** with a resting GTC buy-to-close at half the credit. The last quarter of the premium is the worst-paid risk you will ever carry.\n• **Manage at 21 DTE:** close or roll whatever is still open. Inside three weeks, gamma turns every ordinary session into a coin flip on your whole credit.`,
        },
        {
          type: "text",
          content: `**A real ticket, filled out.** On ${fmtDate("2026-06-03")}, 2026, META closed at ${money(exEntry.close)} and the scanner offered the **$600 put expiring 6/12** at **${money(exPut.mid)}**. The setup leaned on the June 1 low of ${money(exSupport)}. The moment that fill lands, the playbook says the brokerage should hold:\n\n• GTC stop-limit **BUY TO CLOSE 1× META 6/12 $600P — stop ${money(exTrigger)}, limit ${money(exLimit)}** (2 × ${money(exPut.mid)}).\n• Alert: **META daily close < ${money(exSupport)}** → buy the put back next morning.\n• GTC **BUY TO CLOSE at ${money(Math.round(exPut.mid * 0.5 * 100) / 100)}** — the 50% take-profit.\n\nWhat happened: META closed at ${money(exDef.supportBreach ? exDef.supportBreach.close : exEntry.close)} on ${exDef.supportBreach ? fmtDate(exDef.supportBreach.date) : ""} — through the support tripwire — while the rescanned option still marked only ${money(findPut(meta, "2026-06-05", 600, "2026-06-12").mid)}, *below* the ${money(exTrigger)} premium stop. The close-basis alert is what got you out; the premium stop alone would have sat there while the stock kept falling to a ${money(exDef.settleClose)} expiry close. Two triggers, because each one covers the other's blind spot.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `**Long calls, LEAPS, and shares — the directional rules**\n• **The stop goes under the structure, not under your pain:** entry swing low **minus 1 ATR(14)** of noise room. You bought the breakout off a ${money(exStock.swingLow.low)} low with a ${money(exStock.atr)} ATR? Your stop is ${money(exStock.stopLevel)} — not "down 20%", not "I'll watch it".\n• **Size from the stop, not from conviction:** contracts (or shares) = your fixed risk budget ÷ distance to the stop. Cap the max loss at **1–2% of the account** per position, and a LEAPS position's premium counts as its max loss.\n• For options on that thesis, the same stop applies to the **underlying** — set the alert on the stock's close and exit the option manually. A resting stop keyed to an option's own last-trade price will trigger on a stale print or a spread twitch.`,
        },
        {
          type: "text",
          content: `**The long-side numbers, worked.** At META's May 27 close of ${money(exStockEntry.close)}, the prior 20 sessions' swing low was **${money(exStock.swingLow.low)}** (${fmtDate(exStock.swingLow.date)}) and ATR₁₄ was **${money(exStock.atr)}**. Stop = ${money(exStock.swingLow.low)} − ${money(exStock.atr)} = **${money(exStock.stopLevel)}**, about ${(((exStockEntry.close - exStock.stopLevel) / exStockEntry.close) * 100).toFixed(1)}% below the entry close. Risking 1% of a $100,000 account ($1,000) across that ${money(exStockEntry.close - exStock.stopLevel)} of stop distance sizes the position at ${Math.floor(1000 / (exStockEntry.close - exStock.stopLevel))} shares — the stop picked the size, and in this window that stop was never hit.`,
        },
        {
          type: "text",
          content: `**Order mechanics — the part that decides whether any of this works.**\n\n• A **GTC stop-limit buy-to-close** rests at the broker until cancelled: when the option trades at or above your stop, a limit order goes live at your limit price. It cannot fill worse than the limit — and that protection is also its weakness: gap past the limit and you are still short.\n• A **stop-market on an option is a blank check.** Real quote from this dataset: MRVL's June 5 $220 put was ${money(exWide.bid)} bid / ${money(exWide.ask)} ask — a ${money(exWide.ask - exWide.bid)} spread, ${(((exWide.ask - exWide.bid) / exWide.mid) * 100).toFixed(0)}% of the mid. A stop-market triggering into that book buys the ask or worse; on the day you most need out, the ask is furthest away.\n• **Below ~10 contracts of day volume, resting stops stop meaning anything** — there may be no counterparty at any price you would accept. There, the playbook switches to **alerts + a manual limit order near the ask**. An alert you act on beats a stop that fills at fantasy prices or never fills at all.\n• Stops on the **underlying's daily close** (via alert + next-morning exit) dodge both problems: stock prices cannot be stale and cannot be a wide quote. That is why every ticket in these studies pairs the premium stop with a close-basis alert.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "playbook-2x",
              question: `You sell a put for ${money(exPut.mid)} in credit. Under the 2× rule, what rests at the broker from that moment?`,
              options: [
                `A stop-market buy-to-close at ${money(exTrigger)}`,
                `A GTC stop-limit buy-to-close — stop ${money(exTrigger)}, limit ${money(exLimit)} — plus a close-basis alert at the setup's support`,
                `A GTC buy-to-close at ${money(Math.round(exPut.mid * 0.5 * 100) / 100)} only`,
                `Nothing until the position shows a loss`,
              ],
              correctIndex: 1,
              explanation: `Stop = 2 × ${money(exPut.mid)} = ${money(exTrigger)}, limit ~10% above at ${money(exLimit)}, entered as GTC the day of the fill — and paired with the support alert, because the META example shows the option's mark can lag the very break that kills the trade.`,
            },
            {
              id: "playbook-close-basis",
              question: "Why does the playbook trigger on the underlying's daily CLOSE below support rather than on the option's own price alone?",
              options: [
                "Closes are delayed, which gives the trade more room to recover",
                "Option marks lag and go stale — META broke its support while its put still marked under the 2× trigger; the stock's close is the signal that cannot be a wide or stale quote",
                "Brokers do not accept stop orders on options",
                "Intraday breaks of support do not matter to option settlement",
              ],
              correctIndex: 1,
              explanation: `On June 5, META closed below the ${money(exSupport)} shelf while the rescanned $600 put still marked ${money(findPut(meta, "2026-06-05", 600, "2026-06-12").mid)} — short of the ${money(exTrigger)} trigger. The premium stop covers fast reprices; the close-basis alert covers lagging marks. Each covers the other's blind spot.`,
            },
            {
              id: "playbook-longstop",
              question: `You buy shares off a swing low of ${money(exStock.swingLow.low)} with an ATR of ${money(exStock.atr)}. Where is the stop, and what else does it decide?`,
              options: [
                `At the swing low exactly — support is support`,
                `${money(exStock.stopLevel)} (swing low − 1 ATR), and it sets the position size: risk budget ÷ distance to the stop`,
                `20% below the entry price, sized to conviction`,
                `No stop — long options and shares have defined risk already`,
              ],
              correctIndex: 1,
              explanation: `Stop = ${money(exStock.swingLow.low)} − ${money(exStock.atr)} = ${money(exStock.stopLevel)}. One ATR under the level keeps ordinary noise from tagging it, and the distance to that stop — not conviction — is what sizes the position (max loss 1–2% of the account).`,
            },
          ],
        },
      ],
    },
  ],
};
