// CRWD case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/CRWD.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.
//
// CRWD is an "opportunity" ticker: never traded, repeatedly surfaced by the
// scanner. The July 2026 air pocket is the spine of this module — the same
// $180 put was scanned on consecutive sessions, so its premium blow-out is
// observed, not modelled.

import raw from "@/lib/learn/v2-data/CRWD.json";
import { bars, barOn, findPut, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

const t = raw as V2Ticker;

// ── The window: +89% with a 17.5% hole in the middle ──────────────────────
const first = barOn(t, "2026-05-01");
const last = barOn(t, "2026-08-05");
const juneTop = barOn(t, "2026-06-01");
const juneTrough = barOn(t, "2026-06-09");
const juneSessions = bars(t, "2026-06-01", "2026-06-09").length - 1;
const scanDays = new Set(t.snapshots.map((s) => s.date)).size;

// ── Cases 2–4: the $180 put, scanned twice one session apart ──────────────
const p180 = findPut(t, "2026-07-20", 180, "2026-07-31"); // entry mark
const p180Next = findPut(t, "2026-07-21", 180, "2026-07-31"); // same contract, +1 day
const entry = barOn(t, "2026-07-20");
const dayAfter = barOn(t, "2026-07-21");
const worst = barOn(t, "2026-07-28"); // low 174.14 — the deepest tick
const expiry = barOn(t, "2026-07-31");

const credit = p180.mid;
const breakeven = 180 - credit;
const stop3x = 180 - 3 * credit; // underlying level where intrinsic = 3× credit

// ── Case 5: the winner that survived the same slide ───────────────────────
const p170 = findPut(t, "2026-07-23", 170, "2026-07-31");
const p16875 = findPut(t, "2026-07-23", 168.75, "2026-07-31");
const pickDay = barOn(t, "2026-07-23");

export const CRWD_CASES: Module = {
  id: "cs-crwd",
  title: "CRWD Case Studies",
  subtitle: "A 9% cushion gone in six sessions — and the stop that would have cost you the winner",
  icon: "🦅",
  color: "rose-500",
  level: 2,
  track: "case-study",
  ticker: "CRWD",
  universe: "opportunity",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "opportunity-you-werent-watching",
      title: "The opportunity you weren't watching",
      subtitle: "+89% in three months, and two air pockets that would have shaken you out of both",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `You never traded CRWD. The scanner surfaced it on **${scanDays} separate days** between ${t.window.start} and ${t.window.end}, across ${t.snapshots.length} scan runs — and every single candidate was a short put. Not one covered call, because you never held the shares.\n\nFrom **$${first.close}** on May 1 to **$${last.close}** on August 5, that's **+${(((last.close - first.close) / first.close) * 100).toFixed(1)}%**. The kind of chart that makes selling cash-secured puts look like free money.\n\nIt wasn't a straight line.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "CRWD — the whole window (real bars)",
            bars: bars(t),
            lines: [
              { price: juneTop.close, label: `June top ${juneTop.close}`, color: "amber" },
              { price: juneTrough.close, label: `June trough ${juneTrough.close}`, color: "red" },
            ],
            markers: [
              { date: "2026-06-09", label: `low ${juneTrough.low}`, color: "red", below: true },
              { date: "2026-07-14", label: "+12%", color: "emerald" },
            ],
            caption: `Two holes in an uptrend. June 1 → June 9: ${juneSessions} sessions, close-to-close **${(((juneTrough.close - juneTop.close) / juneTop.close) * 100).toFixed(2)}%**, and $${juneTrough.low} at the worst tick — ${(((juneTrough.low - juneTop.close) / juneTop.close) * 100).toFixed(1)}% from the top. Then a +12% single session on July 14, and another slide into late July.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A ticker that gains ${(((last.close - first.close) / first.close) * 100).toFixed(0)}% over a quarter can still hand a short-put seller a ${Math.abs(((juneTrough.close - juneTop.close) / juneTop.close) * 100).toFixed(0)}% drawdown in ${juneSessions} sessions. Your put doesn't care about the quarter — it cares about the ${juneSessions} sessions it happens to be open.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "crwd-intro-1",
              question: `CRWD gained ${(((last.close - first.close) / first.close) * 100).toFixed(0)}% over the window. Why doesn't that make it a low-risk short-put underlying?`,
              options: [
                "It does — a rising stock means puts always expire worthless",
                `A short put is a ${p180.dte}-day bet on the path, not the quarter; the June air pocket alone was ${Math.abs(((juneTrough.close - juneTop.close) / juneTop.close) * 100).toFixed(0)}% close-to-close in ${juneSessions} sessions`,
                "Only the annual return matters for options",
                "High-growth stocks have lower implied volatility",
              ],
              correctIndex: 1,
              explanation: `Your risk window is the DTE, not the trend. The June drop from $${juneTop.close} to $${juneTrough.close} took ${juneSessions} sessions — shorter than most of the contracts the scanner surfaced on CRWD. The uptrend was real and irrelevant to anyone short a put through it.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "nine-percent-cushion-gone",
      title: "A 9% cushion, gone",
      subtitle: "The same contract, scanned one session apart — watch the premium move",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**Monday, July 20, 2026.** CRWD closes at **$${entry.close}**. The scanner offers the **$180 put expiring July 31** for **$${credit.toFixed(2)}** — delta ${p180.delta.toFixed(2)}, IV ${(p180.iv * 100).toFixed(0)}%, ${p180.aroc}% AROC, juiciness ${p180.juiciness}, ${p180.dte} days out.\n\nThe strike sits **${pctOtm(180, entry.close)}% below spot**. The catalyst line: *"${p180.catalyst}"*\n\nNine percent of cushion on an eleven-day contract. This is the trade that feels like nothing can go wrong.`,
        },
        {
          type: "text",
          content: `**Tuesday, July 21.** CRWD closes at **$${dayAfter.close}** — down ${(((dayAfter.close - entry.close) / entry.close) * 100).toFixed(1)}% in one session. The scanner picks up **the same contract** and marks it at **$${p180Next.mid.toFixed(2)}**.\n\nThat's **${(p180Next.mid / credit).toFixed(2)}× your credit**, one day in. Delta moved ${p180.delta.toFixed(2)} → **${p180Next.delta.toFixed(2)}**. Gamma moved ${p180.gamma.toFixed(5)} → **${p180Next.gamma.toFixed(5)}** — the rate at which delta itself grows is accelerating. Your cushion is now ${pctOtm(180, dayAfter.close)}%.\n\nNote what happened to the catalyst text on the very same strike: *"${p180Next.catalyst}"* — an AROC that jumped to ${p180Next.aroc}% because the contract got more dangerous, not more attractive.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Six sessions from comfortable to in-the-money (real bars)",
            bars: bars(t, "2026-07-13", "2026-07-31"),
            lines: [
              { price: 180, label: "180 strike", color: "sky" },
              { price: Number(breakeven.toFixed(2)), label: `breakeven ${breakeven.toFixed(2)}`, color: "emerald" },
            ],
            markers: [
              { date: "2026-07-20", label: "entry", color: "violet" },
              { date: "2026-07-28", label: `low ${worst.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${expiry.close}`, color: "emerald" },
            ],
            caption: `From the $${entry.close} entry close, CRWD fell to $${worst.low} intraday on July 28 — ${(((worst.low - entry.close) / entry.close) * 100).toFixed(1)}% in ${bars(t, "2026-07-20", "2026-07-28").length - 1} sessions. At that tick the put was $${(180 - worst.low).toFixed(2)}/sh in the money, roughly ${((180 - worst.low) / credit).toFixed(1)}× the credit collected. Then it closed July 31 at $${expiry.close} — expired worthless.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Gamma is why "9% out of the money" isn't a safety margin on a short-dated contract. The move that took the cushion from ${pctOtm(180, entry.close)}% to ${pctOtm(180, dayAfter.close)}% was a single ${Math.abs(((dayAfter.close - entry.close) / entry.close) * 100).toFixed(1)}% day — and it repriced the option by ${(((p180Next.mid - credit) / credit) * 100).toFixed(0)}%.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "crwd-gamma-1",
              question: `The underlying fell ${Math.abs(((dayAfter.close - entry.close) / entry.close) * 100).toFixed(1)}% but the put's mid rose ${(((p180Next.mid - credit) / credit) * 100).toFixed(0)}%. What explains the mismatch in magnitude?`,
              options: [
                "A data error — options can't move that much on a small underlying move",
                `Percentage moves on a $${credit.toFixed(2)} option are enormous in relative terms: delta (${p180.delta.toFixed(2)}) applied to a $${(entry.close - dayAfter.close).toFixed(2)} drop is most of it, and IV rose ${(p180.iv * 100).toFixed(0)}% → ${(p180Next.iv * 100).toFixed(0)}% on top`,
                "Theta decay increased the option's value",
                "The strike changed between the two scans",
              ],
              correctIndex: 1,
              explanation: `Delta ${p180.delta.toFixed(2)} against a $${(entry.close - dayAfter.close).toFixed(2)} decline accounts for roughly $${(p180.delta * (entry.close - dayAfter.close)).toFixed(2)} of the move; vega ${p180.vega.toFixed(4)} against the IV rise from ${(p180.iv * 100).toFixed(1)}% to ${(p180Next.iv * 100).toFixed(1)}% adds more. A small option is a big percentage of itself — that's what makes premium-based stops fire so fast.`,
            },
            {
              id: "crwd-gamma-2",
              question: `Gamma went ${p180.gamma.toFixed(5)} → ${p180Next.gamma.toFixed(5)} as CRWD fell toward the strike. What does a rising gamma mean for a short put seller?`,
              options: [
                "Losses accelerate — each further dollar down costs more than the last, and the position gets directionally shorter without you doing anything",
                "Gains accelerate, since gamma is positive",
                "Nothing — gamma only matters for market makers",
                "The position becomes less sensitive to price",
              ],
              correctIndex: 0,
              explanation: `Short puts are short gamma. As price approaches the strike, delta grows faster and faster, so each additional dollar of decline hurts more than the one before. This is exactly why "it was ${pctOtm(180, entry.close)}% out of the money" gives false comfort: the cushion doesn't erode linearly.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "place-the-stop-air-pocket",
      title: "You place the stop",
      subtitle: "Same trade — where would you have cut it, and what would it have cost?",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `You're short the **$180 put** from July 20 at **$${credit.toFixed(2)}**. It's the close on **July 21** and the contract is marked at $${p180Next.mid.toFixed(2)}.\n\nTwo numbers you have at entry, before any hindsight:\n• **Breakeven $${breakeven.toFixed(2)}** — strike minus credit. Below this, the trade is a net loser at expiry.\n• **$${stop3x.toFixed(2)}** — the underlying level where intrinsic value alone equals **3× your credit** ($${(3 * credit).toFixed(2)}/sh), the classic "cut it" threshold.\n\nSet your stop on the underlying and find out.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-07-13", "2026-07-31"),
            visibleUntil: "2026-07-21",
            strike: 180,
            credit,
            entryDate: "2026-07-20",
            expiry: "2026-07-31",
            guide: {
              min: Number(stop3x.toFixed(2)),
              max: Number(breakeven.toFixed(2)),
            },
            explanation: `The shaded band runs from your breakeven ($${breakeven.toFixed(2)}) down to the 3×-credit level ($${stop3x.toFixed(2)}) — both derived at entry, no hindsight. CRWD's July 28 low of $${worst.low} landed inside it: $${(180 - worst.low).toFixed(2)}/sh of intrinsic, about ${((180 - worst.low) / credit).toFixed(1)}× the credit. So a disciplined stop anywhere above $${worst.low} fires. And then the stock closed July 31 at $${expiry.close} and the put expired worthless. That is the trade-off, stated honestly: a working stop on this path converts a full winner into a realized loss. The premium rule was the one that held — the only later mark the scanner recorded was $${p180Next.mid.toFixed(2)}, which is ${(p180Next.mid / credit).toFixed(2)}× the credit, short of a 2× ($${(2 * credit).toFixed(2)}) trigger.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Stops don't make money — they cap the tail. On this path a price stop cost you the winner; on the June path (${(((juneTrough.close - juneTop.close) / juneTop.close) * 100).toFixed(1)}% in ${juneSessions} sessions) the same rule is what keeps a single trade from eating a quarter of gains. You buy that protection with the winners it occasionally takes away. Decide which side you want to be wrong on *before* you open the position, not while you're watching it.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "crwd-stop-1",
              question: `Why does a stop placed *above* the $${breakeven.toFixed(2)} breakeven guarantee a realized loss, even when the put would have expired worthless?`,
              options: [
                "It doesn't — stops above breakeven are free",
                `Above breakeven the position is still net-positive at expiry, so exiting there converts a trade that could still finish green into a certain loss on the buy-back`,
                "Breakeven is irrelevant to short puts",
                "The broker charges a penalty above breakeven",
              ],
              correctIndex: 1,
              explanation: `Breakeven ($${breakeven.toFixed(2)} = 180 − $${credit.toFixed(2)}) is the underlying price at which the credit exactly offsets intrinsic value at expiry. A stop above it exits positions that were still, on an expiry basis, winners. It's a legitimate choice — you're paying for a tighter tail — but it needs to be a choice, not an accident.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "stop-market-through-the-spread",
      title: "Stop-market vs stop-limit, through a real spread",
      subtitle: "The bid/ask you actually trade against, not the mid you quote yourself",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Every P&L number so far used the **mid**. Nobody trades at the mid. Here are the real two-sided quotes the scanner captured on that $180 put:\n• **Jul 20 (entry)** — bid $${p180.bid.toFixed(2)} / ask $${p180.ask.toFixed(2)}, mid $${credit.toFixed(2)}. Spread $${(p180.ask - p180.bid).toFixed(2)}, or **${(((p180.ask - p180.bid) / credit) * 100).toFixed(0)}% of the mid**.\n• **Jul 21 (stop day)** — bid $${p180Next.bid.toFixed(2)} / ask $${p180Next.ask.toFixed(2)}, mid $${p180Next.mid.toFixed(2)}. Spread $${(p180Next.ask - p180Next.bid).toFixed(2)}, or ${(((p180Next.ask - p180Next.bid) / p180Next.mid) * 100).toFixed(0)}% of the mid.\n\nDay volume on entry was ${p180.volume} contracts. That's the liquidity backing a ${(((p180.ask - p180.bid) / credit) * 100).toFixed(0)}%-wide market.`,
        },
        {
          type: "text",
          content: `Now run both order types through it.\n\n**Stop-market** to buy back on July 21: it takes the offer. You pay **$${p180Next.ask.toFixed(2)}**, not the $${p180Next.mid.toFixed(2)} mid. If you also sold at the bid on entry ($${p180.bid.toFixed(2)}) rather than working the mid, the round trip is $${p180.bid.toFixed(2)} in, $${p180Next.ask.toFixed(2)} out — **−$${((p180Next.ask - p180.bid) * 100).toFixed(0)} per contract** versus the mid-to-mid −$${((p180Next.mid - credit) * 100).toFixed(0)}. The spread alone cost **$${((p180Next.ask - p180.bid) * 100 - (p180Next.mid - credit) * 100).toFixed(0)}**, or ${((((p180Next.ask - p180.bid) - (p180Next.mid - credit)) / credit) * 100).toFixed(0)}% of the credit you set out to collect.\n\n**Stop-limit** at your trigger price: you name a maximum. Set it at $${p180Next.mid.toFixed(2)} — the mid you'd been marking against — and it does not fill, because the offer is $${p180Next.ask.toFixed(2)}. You are still short, in a falling stock, now believing you've exited.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `The dangerous failure mode isn't the ${(((p180.ask - p180.bid) / credit) * 100).toFixed(0)}% you pay on a stop-market fill. It's the stop-limit that silently doesn't fill and leaves you short through the rest of the move — CRWD had ${bars(t, "2026-07-21", "2026-07-28").length - 1} more sessions of downside to go, bottoming at $${worst.low}.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "crwd-spread-1",
              question: `Your stop-limit to buy back the $180 put is set at $${p180Next.mid.toFixed(2)} on July 21, when the market is $${p180Next.bid.toFixed(2)} × $${p180Next.ask.toFixed(2)}. What happens?`,
              options: [
                `It fills at $${p180Next.mid.toFixed(2)} — that's the fair value`,
                `It fills at the bid, $${p180Next.bid.toFixed(2)}`,
                `It doesn't fill: buying requires paying the $${p180Next.ask.toFixed(2)} offer, above your $${p180Next.mid.toFixed(2)} limit — you stay short and unprotected`,
                "It converts automatically to a market order",
              ],
              correctIndex: 2,
              explanation: `A buy limit below the offer just rests. The mid is a display convention, not a price anyone is obliged to trade at. On options with day volume in the double digits, assume you cross the spread in whichever direction hurts.`,
            },
            {
              id: "crwd-spread-2",
              question: `Given a ${(((p180.ask - p180.bid) / credit) * 100).toFixed(0)}%-of-mid spread and ${p180.volume} contracts of day volume, what's the most practical protection?`,
              options: [
                "Always use stop-market — guaranteed fills are worth any price",
                "Always use stop-limit — never pay more than you intended",
                "Size the position so you can exit with a working (marketable) limit order and monitor it, rather than relying on a resting stop to fire cleanly through an illiquid market",
                "Avoid stops entirely on wide-spread options",
              ],
              correctIndex: 2,
              explanation: `Neither order type is safe in a market this thin: stop-market pays whatever's showing, stop-limit may not fill at all. The real defence is upstream — treat a ${(((p180.ask - p180.bid) / credit) * 100).toFixed(0)}% spread as a cost of entry, size so an exit is manageable, and place the exit yourself with a marketable limit rather than trusting a trigger.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "pick-the-contract-mid-slide",
      title: "Two strikes, mid-slide",
      subtitle: "Both survived — but only one of them was worth selling",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**July 23**, three sessions into the slide. CRWD closes at **$${pickDay.close}**, RSI has fallen to ${p170.rsi}, and the scanner puts up two puts on the same July 31 expiry. Both are around 0.2 delta. Both share the same catalyst thesis: *"${p170.catalyst}"*\n\nYou want income and you do not want the shares.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you sell three days into a falling tape?",
            goal: "Income — collect premium on an 8-day contract, avoid assignment, be able to exit",
            a: {
              label: `A · $${p16875.strike} put`,
              date: "2026-07-23",
              side: "put",
              strike: p16875.strike,
              expiry: "2026-07-31",
              dte: p16875.dte,
              bid: p16875.bid,
              ask: p16875.ask,
              mid: p16875.mid,
              delta: p16875.delta,
              iv: p16875.iv,
              aroc: p16875.aroc,
              volume: p16875.volume,
              juiciness: p16875.juiciness,
              note: `${pctOtm(p16875.strike, pickDay.close)}% out of the money`,
            },
            b: {
              label: `B · $${p170.strike} put`,
              date: "2026-07-23",
              side: "put",
              strike: p170.strike,
              expiry: "2026-07-31",
              dte: p170.dte,
              bid: p170.bid,
              ask: p170.ask,
              mid: p170.mid,
              delta: p170.delta,
              iv: p170.iv,
              aroc: p170.aroc,
              volume: p170.volume,
              juiciness: p170.juiciness,
              note: `${pctOtm(p170.strike, pickDay.close)}% out of the money`,
            },
            correct: "b",
            explanation: `A gives up ${(p170.mid - p16875.mid).toFixed(2)}/sh of credit ($${((p170.mid - p16875.mid) * 100).toFixed(0)}/contract, ${((p170.aroc ?? 0) - (p16875.aroc ?? 0)).toFixed(1)} points of AROC) to buy ${(pctOtm(p16875.strike, pickDay.close) - pctOtm(p170.strike, pickDay.close)).toFixed(1)} percentage points of extra cushion — and trades **${p16875.volume} contracts a day** against B's **${p170.volume}**. That liquidity gap is the whole decision: at ${p16875.volume} contracts you are the market, and the $${p16875.bid.toFixed(2)}×$${p16875.ask.toFixed(2)} quote is decoration. Both strikes held — CRWD's July 28 low was $${worst.low}, still $${(worst.low - p170.strike).toFixed(2)} above B's strike, and expiry closed at $${expiry.close}. B kept $${(p170.mid * 100).toFixed(0)}/contract in ${p170.dte} days; A kept $${(p16875.mid * 100).toFixed(0)} and would have been far harder to exit if it hadn't.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Both strikes survived the shakeout (real bars)",
            bars: bars(t, "2026-07-20", "2026-08-05"),
            lines: [
              { price: p170.strike, label: `B: ${p170.strike} strike`, color: "emerald" },
              { price: p16875.strike, label: `A: ${p16875.strike} strike`, color: "violet" },
            ],
            markers: [
              { date: "2026-07-23", label: "entry", color: "sky" },
              { date: "2026-07-28", label: `low ${worst.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${expiry.close}`, color: "emerald" },
            ],
            shadeAfter: "2026-07-31",
            caption: `The July 28 low of $${worst.low} left $${(worst.low - p170.strike).toFixed(2)} of room above the $${p170.strike} strike — a ${(((worst.low - p170.strike) / p170.strike) * 100).toFixed(1)}% margin at the worst tick. Selling *into* the third down day, rather than at the top on July 20, is what bought that room. The shaded stretch after expiry is the recovery to $${last.close} you were never paid for.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `Entry timing did more work here than strike selection. The July 20 seller had ${pctOtm(180, entry.close)}% of cushion and watched it vanish; the July 23 seller had ${pctOtm(p170.strike, pickDay.close)}% *after* three down days and never came within $${(worst.low - p170.strike).toFixed(2)} of trouble. Selling puts into weakness with elevated IV beats selling into strength with a bigger nominal cushion.`,
        },
      ],
    },
  ],
};
