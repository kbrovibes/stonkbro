// SNDK case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/SNDK.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/SNDK.json";
import { bars, barOn, findPut, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

/** Per-contract dollars (100 shares), comma-grouped. Sign is written in prose. */
const perCt = (perShare: number) =>
  `$${Math.round(Math.abs(perShare) * 100).toLocaleString("en-US")}`;

/** Session-over-session % change between two adjacent real bars. */
const dayMove = (prev: string, day: string) => {
  const a = barOn(t, prev).close;
  const b = barOn(t, day).close;
  return ((b - a) / a) * 100;
};

// ── Case 1: the "strong floor" that had already broken ─────────────────────
// 2026-06-30: SNDK closes 2273.73. Scanner offers the 2000 put, 07-10 expiry,
// catalyst claims a "$2092 support" floor — that number is the 06-25 low.
const jun2000 = findPut(t, "2026-06-30", 2000, "2026-07-10");
const jun30 = barOn(t, "2026-06-30");
const jun25 = barOn(t, "2026-06-25"); // low 2092.08 — the "support"
const jun29 = barOn(t, "2026-06-29"); // low 1895 — already under it, pre-entry
const jul02 = barOn(t, "2026-07-02"); // -14.13%, low 1693
const jul07 = barOn(t, "2026-07-07"); // low 1485.02
const jul10 = barOn(t, "2026-07-10");

// ── Case 2: the 1800 put and the whipsaw ───────────────────────────────────
const jul1800 = findPut(t, "2026-07-01", 1800, "2026-07-17");
const jun1800 = findPut(t, "2026-06-26", 1800, "2026-07-17"); // same contract, 5d earlier
const jul01 = barOn(t, "2026-07-01");
const jul17 = barOn(t, "2026-07-17");

// ── Case 3: twenty dollars of strike (2026-07-08, same expiry) ─────────────
const jul1420 = findPut(t, "2026-07-08", 1420, "2026-07-17");
const jul1400 = findPut(t, "2026-07-08", 1400, "2026-07-17");
const jul08 = barOn(t, "2026-07-08");

// ── Case 4: the 1600 put's three observed marks ────────────────────────────
const mark0629 = findPut(t, "2026-06-29", 1600, "2026-07-17");
const mark0709 = findPut(t, "2026-07-09", 1600, "2026-07-17");
const mark0710 = findPut(t, "2026-07-10", 1600, "2026-07-17");
const jul09 = barOn(t, "2026-07-09");

// ── Case 5: selling into the fear (2026-07-15) ─────────────────────────────
const jul1310 = findPut(t, "2026-07-15", 1310, "2026-07-24");
const jul1390 = findPut(t, "2026-07-15", 1390, "2026-07-24");
const jul15 = barOn(t, "2026-07-15");
const jul24 = barOn(t, "2026-07-24");

// ── Case 6: liquidity — the contracts nobody was trading ───────────────────
const jun1610 = findPut(t, "2026-06-24", 1610, "2026-07-02"); // day volume: 1
const jul1390b = findPut(t, "2026-07-23", 1390, "2026-07-31"); // day volume: 4
const jul23 = barOn(t, "2026-07-23");
const jul27 = barOn(t, "2026-07-27");
const jul29 = barOn(t, "2026-07-29"); // low 998.19 — the bottom
const jul31 = barOn(t, "2026-07-31");

export const SNDK_CASES: Module = {
  id: "cs-sndk",
  title: "SNDK Case Studies",
  subtitle: "182% AROC, ±14% days, and a 56% drawdown that ate every credit",
  icon: "💾",
  color: "orange-500",
  level: 2,
  track: "case-study",
  ticker: "SNDK",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "credit-vs-realized-move",
      title: "A $5,665 credit and a 35% drop",
      subtitle: "103% AROC, and the credit covered 2.8% of the strike",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `On **June 30, 2026**, SNDK closed at **$${jun30.close}**. The scanner surfaced the **$2000 put expiring July 10** for **$${jun2000.mid.toFixed(2)}** — ${perCt(jun2000.mid)} of credit per contract, delta ${jun2000.delta.toFixed(2)}, **${jun2000.aroc}% AROC**, juiciness ${jun2000.juiciness}.\n\nThe catalyst read: *"${jun2000.catalyst}"*\n\nThat ${perCt(jun2000.mid)} feels enormous. Measured against the collateral it is defending, it is **${((jun2000.mid / 2000) * 100).toFixed(2)}% of the strike**. Hold that number — it's the whole lesson.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Premium is only meaningful next to the moves the stock actually makes. SNDK's biggest sessions in this window: **+${dayMove("2026-07-29", "2026-07-30").toFixed(1)}% (Jul 30)**, **+${dayMove("2026-06-24", "2026-06-25").toFixed(1)}% (Jun 25)**, **${dayMove("2026-07-27", "2026-07-28").toFixed(1)}% (Jul 28)**, **${dayMove("2026-07-01", "2026-07-02").toFixed(1)}% (Jul 2)**. That July 2 session alone moved the stock $${(jul01.close - jul02.close).toFixed(2)} — **${((jul01.close - jul02.close) / jun2000.mid).toFixed(1)}× the entire credit**. A ${jun2000.aroc}% annualized return means little when one ordinary session for this name is several times your buffer.`,
        },
        {
          type: "text",
          content: `The "$2092 support" is worth pulling apart, because it was checkable at entry:\n• $2092 was the **June 25 intraday low** ($${jun25.low}) — a single wick, three sessions old.\n• The very next session, **June 29**, SNDK traded down to $${jun29.low} — already $${(jun25.low - jun29.low).toFixed(2)} *below* the "floor", the day before the scan called it strong.\n• And the floor sat **above** the $2000 strike. By the time price tested the strike, the thesis was long dead.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "SNDK — entry at the top of the range (real bars)",
            bars: bars(t, "2026-06-18", "2026-07-10"),
            lines: [
              { price: 2000, label: "2000 strike", color: "sky" },
              { price: jun25.low, label: `claimed support ${jun25.low}`, color: "amber" },
            ],
            markers: [
              { date: "2026-06-30", label: "entry", color: "violet" },
              {
                date: "2026-07-02",
                label: `${dayMove("2026-07-01", "2026-07-02").toFixed(1)}%`,
                color: "red",
                below: true,
              },
              { date: "2026-07-07", label: `low ${jul07.low}`, color: "red", below: true },
            ],
            caption: `Two sessions after entry SNDK fell ${Math.abs(dayMove("2026-07-01", "2026-07-02")).toFixed(1)}% to $${jul02.close} (low $${jul02.low}) — straight through the strike. Five sessions in, the July 7 low of $${jul07.low} was ${Math.abs(((jul07.low - jun30.close) / jun30.close) * 100).toFixed(0)}% below the entry close, leaving the put $${(2000 - jul07.low).toFixed(2)}/sh intrinsic: **${((2000 - jul07.low) / jun2000.mid).toFixed(1)}× the credit collected**.`,
          },
        },
        {
          type: "text",
          content: `A late bounce softened it. SNDK closed expiry at **$${jul10.close}**, leaving the put $${(2000 - jul10.close).toFixed(2)}/sh in the money — a **-${perCt(2000 - jul10.close - jun2000.mid)} per contract** result on a trade that offered ${perCt(jun2000.mid)}. The seller was never rescued; they were only rescued *from the worst version of it*.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sndk-crv-1",
              question: `The credit was $${jun2000.mid.toFixed(2)} on a $2000 strike. What does that buy you?`,
              options: [
                "A 12% cushion — the strike was 12% below spot",
                `A ${((jun2000.mid / 2000) * 100).toFixed(1)}% cushion below the strike — roughly one fifth of a single average big day for this stock`,
                "Nothing; premium never provides a cushion",
                `${jun2000.aroc}% of downside protection, annualized`,
              ],
              correctIndex: 1,
              explanation: `Two separate cushions get confused constantly. The *strike* sat ${pctOtm(2000, jun30.close)}% below spot — that's the distance-to-trouble. The *credit* extends your breakeven by only $${jun2000.mid.toFixed(2)}, or ${((jun2000.mid / 2000) * 100).toFixed(2)}% of the strike. On a name that regularly moves 14% in a day, the second number is decoration.`,
            },
            {
              id: "sndk-crv-2",
              question: `SNDK closed at $${jul10.close} on July 10 expiry. P&L per contract, ignoring early management?`,
              options: [
                `+${perCt(jun2000.mid)} — it recovered above the strike`,
                `-${perCt(2000 - jul10.close)} — the intrinsic value`,
                `-${perCt(2000 - jul10.close - jun2000.mid)} — intrinsic loss less the credit collected`,
                `-${perCt(2000 - jul07.low)} — the worst mark during the hold`,
              ],
              correctIndex: 2,
              explanation: `Loss = (strike − close − credit) × 100 = (2000 − ${jul10.close} − ${jun2000.mid.toFixed(2)}) × 100 = ${perCt(2000 - jul10.close - jun2000.mid)}. The July 7 mark ($${(2000 - jul07.low).toFixed(2)}/sh intrinsic) was never realized — but it *was* the risk you carried, and it's what a margin call is priced off.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "stop-through-the-whipsaw",
      title: "You place the stop",
      subtitle: "The 1800 put: cut it, watch it recover, then watch it not",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `The scanner had already offered this exact contract once. On **June 26** (close $${barOn(t, "2026-06-26").close}) the **$1800 put expiring July 17** was worth $${jun1800.mid.toFixed(2)} at ${jun1800.dte} DTE. Five sessions later, on **July 1** (close $${jul01.close}), the same contract paid **$${jul1800.mid.toFixed(2)}** with ${jul1800.dte} DTE left — richer despite less time, because the stock had come $${(barOn(t, "2026-06-26").close - jul01.close).toFixed(2)} closer to the strike.\n\nDelta ${jul1800.delta.toFixed(2)}, IV ${(jul1800.iv * 100).toFixed(0)}%, ${jul1800.aroc}% AROC, strike ${pctOtm(1800, jul01.close)}% OTM. Catalyst: *"${jul1800.catalyst}"*\n\nThis time you manage it. Set your stop on the underlying, then see the real path.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-18", "2026-07-17"),
            visibleUntil: "2026-07-01",
            strike: 1800,
            credit: jul1800.mid,
            entryDate: "2026-07-01",
            expiry: "2026-07-17",
            guide: { min: 1800, max: 1900 },
            explanation: `The thesis was "stable uptrend above all major MAs". The last swing low before entry was $${jun29.low} (June 29), and the strike itself was $1800 — so the zone between them is where the trade stops being the trade you opened. Any stop in there fired on **July 2** (low $${jul02.low}). Then came the trap: SNDK bounced to $${jul10.close} by July 10, back *above* the strike, and for five sessions the stop looked like a mistake. It wasn't. July 13–17 took the stock to a $${jul17.low} low and a $${jul17.close} close — the put finished $${(1800 - jul17.close).toFixed(2)}/sh ITM, a **-${perCt(1800 - jul17.close - jul1800.mid)} per contract** loss for anyone still holding. The premium-side backstop (buy back at 2–3× credit, $${(2 * jul1800.mid).toFixed(2)}–$${(3 * jul1800.mid).toFixed(2)}) would have fired in the same window.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A stop that gets you out, followed by a recovery, is not a failed stop — it's the cost of the insurance. You will pay it repeatedly. The July 10 bounce back above $1800 was the market's invitation to abandon the rule; five sessions later the same put was $${(1800 - jul17.close).toFixed(0)}/sh in the money.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sndk-stop-1",
              question: `The same $1800 put paid $${jun1800.mid.toFixed(2)} on June 26 and $${jul1800.mid.toFixed(2)} on July 1, with ${jun1800.dte - jul1800.dte} fewer days to expiry. Why did it get more expensive?`,
              options: [
                "Theta decay reverses close to expiry",
                `The stock fell $${(barOn(t, "2026-06-26").close - jul01.close).toFixed(2)} over those sessions — delta moved against the seller faster than time worked for them`,
                "The scanner repriced it after a dividend",
                "Implied volatility collapsed",
              ],
              correctIndex: 1,
              explanation: `Delta beat theta. Spot went $${barOn(t, "2026-06-26").close} → $${jul01.close} while IV barely moved (${(jun1800.iv * 100).toFixed(0)}% → ${(jul1800.iv * 100).toFixed(0)}%). For a seller, a mark that *rises* as expiry approaches is the position telling you the underlying is doing the work — and it's exactly the signal a premium-based stop is built to catch.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "twenty-dollars-of-strike",
      title: "Twenty dollars of strike",
      subtitle: "Two contracts, same day, same expiry — opposite signs",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**July 8, 2026.** SNDK has fallen from $${jun30.close} to **$${jul08.close}** in six sessions, IV is near ${(jul1400.iv * 100).toFixed(0)}%, and the scanner is printing AROC numbers that look like typos. Two real candidates from that scan, same July 17 expiry, ${jul1420.dte} DTE, twenty dollars of strike apart:`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you sell?",
            goal: "Income — keep the credit, avoid finishing in the money",
            a: {
              label: "A · $1420 put",
              date: "2026-07-08",
              side: "put",
              strike: 1420,
              expiry: "2026-07-17",
              dte: jul1420.dte,
              bid: jul1420.bid,
              ask: jul1420.ask,
              mid: jul1420.mid,
              delta: jul1420.delta,
              iv: jul1420.iv,
              aroc: jul1420.aroc,
              volume: jul1420.volume,
              juiciness: jul1420.juiciness,
              note: jul1420.catalyst,
            },
            b: {
              label: "B · $1400 put",
              date: "2026-07-08",
              side: "put",
              strike: 1400,
              expiry: "2026-07-17",
              dte: jul1400.dte,
              bid: jul1400.bid,
              ask: jul1400.ask,
              mid: jul1400.mid,
              delta: jul1400.delta,
              iv: jul1400.iv,
              aroc: jul1400.aroc,
              volume: jul1400.volume,
              juiciness: jul1400.juiciness,
              note: jul1400.catalyst,
            },
            correct: "b",
            explanation: `SNDK closed July 17 at $${jul17.close}. **A** finished $${(1420 - jul17.close).toFixed(2)}/sh ITM against $${jul1420.mid.toFixed(2)} collected — **-${perCt(jul1420.mid - (1420 - jul17.close))} per contract**. **B** finished $${(1400 - jul17.close).toFixed(2)}/sh ITM against $${jul1400.mid.toFixed(2)} — **+${perCt(jul1400.mid - (1400 - jul17.close))} per contract**, a winner by $${(jul1400.mid - (1400 - jul17.close)).toFixed(2)}/sh. Twenty points of strike cost $${(jul1420.mid - jul1400.mid).toFixed(2)} of credit and ${((jul1420.aroc ?? 0) - (jul1400.aroc ?? 0)).toFixed(1)} points of AROC, and flipped the sign of the trade. B also traded ${((jul1400.volume ?? 0) / (jul1420.volume ?? 1)).toFixed(1)}× A's day volume (${jul1400.volume} vs ${jul1420.volume}) on a tighter spread ($${(jul1400.ask - jul1400.bid).toFixed(2)} vs $${(jul1420.ask - jul1420.bid).toFixed(2)}).`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Where the two strikes landed (real bars)",
            bars: bars(t, "2026-07-06", "2026-07-17"),
            lines: [
              { price: 1420, label: "A: 1420 strike", color: "red" },
              { price: 1400, label: "B: 1400 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-08", label: "entry", color: "violet" },
              { date: "2026-07-17", label: `exp ${jul17.close}`, color: "red", below: true },
            ],
            caption: `Both strikes were breached — the July 17 low was $${jul17.low}, $${(1400 - jul17.low).toFixed(2)} through even the lower one. The close is what settles the contract, and the close landed inside the ${(1420 - 1400).toFixed(0)}-point gap between them.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `AROC ranks candidates by credit per dollar of collateral. It cannot rank them by *which side of the strike the closing price lands on* — and on a single expiry, that's a binary that swamps every other number in the row. The higher-AROC contract is higher-AROC because it's closer to the money.`,
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "the-exit-you-didnt-take",
      title: "The exit you didn't take",
      subtitle: "Up 39% with a week to run, then -$17,993",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `The scanner surfaced the **$1600 put, July 17 expiry** three separate times. Same strike, same expiry — so these are real observed marks on one position:\n• **Jun 29 (entry)** — spot $${barOn(t, "2026-06-29").close}, mid **$${mark0629.mid.toFixed(2)}**, IV ${(mark0629.iv * 100).toFixed(0)}%, delta ${mark0629.delta.toFixed(2)}, ${mark0629.dte} DTE\n• **Jul 9** — spot $${jul09.close}, mid **$${mark0709.mid.toFixed(2)}**, IV ${(mark0709.iv * 100).toFixed(0)}%, delta ${mark0709.delta.toFixed(2)}, ${mark0709.dte} DTE\n• **Jul 10** — spot $${jul10.close}, mid **$${mark0710.mid.toFixed(2)}**, IV ${(mark0710.iv * 100).toFixed(0)}%, delta ${mark0710.delta.toFixed(2)}, ${mark0710.dte} DTE\n\nBy **July 10** the position showed **+${perCt(mark0629.mid - mark0710.mid)} unrealized** — ${(((mark0629.mid - mark0710.mid) / mark0629.mid) * 100).toFixed(0)}% of the credit captured with ${mark0710.dte} days left. A standard "close at 50%" rule was within touching distance of firing.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `Look at the July 9 row against the entry row. The mark had improved ${Math.abs(((mark0709.mid - mark0629.mid) / mark0629.mid) * 100).toFixed(0)}% — while the stock had fallen ${Math.abs(((jul09.close - barOn(t, "2026-06-29").close) / barOn(t, "2026-06-29").close) * 100).toFixed(1)}%, the cushion had shrunk from ${pctOtm(1600, barOn(t, "2026-06-29").close)}% to ${pctOtm(1600, jul09.close)}% OTM, delta had *risen* ${mark0629.delta.toFixed(2)} → ${mark0709.delta.toFixed(2)}, and IV had jumped ${(mark0629.iv * 100).toFixed(0)}% → ${(mark0709.iv * 100).toFixed(0)}%. **Your P&L said "winning". Every risk metric on the same row said "worse."**`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The 1600 put: a bounce, then the real leg down",
            bars: bars(t, "2026-06-26", "2026-07-17"),
            lines: [{ price: 1600, label: "1600 strike", color: "sky" }],
            markers: [
              { date: "2026-06-29", label: "entry", color: "violet" },
              { date: "2026-07-10", label: `mark ${mark0710.mid.toFixed(2)}`, color: "emerald" },
              { date: "2026-07-17", label: `exp ${jul17.close}`, color: "red", below: true },
            ],
            caption: `Five sessions after the $${mark0710.mid.toFixed(2)} mark, SNDK closed expiry at $${jul17.close} — the put $${(1600 - jul17.close).toFixed(2)}/sh in the money. The position went from **+${perCt(mark0629.mid - mark0710.mid)}** to **-${perCt(mark0629.mid - (1600 - jul17.close))}** per contract in a week.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sndk-exit-1",
              question: `On July 10 the mark was $${mark0710.mid.toFixed(2)} against a $${mark0629.mid.toFixed(2)} credit, with ${mark0710.dte} days left. What is the strongest argument for closing there?`,
              options: [
                "Puts always lose value into expiry, so there was nothing left to gain",
                `${(((mark0629.mid - mark0710.mid) / mark0629.mid) * 100).toFixed(0)}% of the maximum profit was already banked, and the remaining $${mark0710.mid.toFixed(2)} of extrinsic value was the entire upside against unlimited-ish downside on a stock realizing ±14% days`,
                "The delta had fallen below 0.20",
                "IV had dropped, so premium would stop decaying",
              ],
              correctIndex: 1,
              explanation: `Closing a short put early is a risk/reward trade, not a profit-taking ritual. At $${mark0710.mid.toFixed(2)}, you were risking a strike-sized loss to earn a final ${perCt(mark0710.mid)}. That ratio only worsens as the mark shrinks — which is precisely why 50%-of-credit rules exist, and why they matter more the more volatile the underlying.`,
            },
            {
              id: "sndk-exit-2",
              question: `Between June 29 and July 9 the mid fell ${Math.abs(((mark0709.mid - mark0629.mid) / mark0629.mid) * 100).toFixed(0)}% while IV rose ${((mark0709.iv - mark0629.iv) * 100).toFixed(0)} points and the stock fell ${Math.abs(((jul09.close - barOn(t, "2026-06-29").close) / barOn(t, "2026-06-29").close) * 100).toFixed(1)}%. What was doing the work?`,
              options: [
                "The stock moving away from the strike",
                `Time — ${mark0629.dte} DTE went to ${mark0709.dte} DTE, and theta on a ${(mark0629.iv * 100).toFixed(0)}%-IV contract is brutal; the decay outran a hostile move in spot and vol`,
                "The bid–ask spread narrowing",
                "Falling gamma",
              ],
              correctIndex: 1,
              explanation: `Ten days of decay on a high-IV short-dated put is enormous — enough to mask a ${Math.abs(((jul09.close - barOn(t, "2026-06-29").close) / barOn(t, "2026-06-29").close) * 100).toFixed(1)}% adverse move in the underlying *and* a ${((mark0709.iv - mark0629.iv) * 100).toFixed(0)}-point IV expansion. Theta paying you while delta and vega go against you is not safety; it's a shrinking reward for a growing risk.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "selling-into-the-fear",
      title: "Selling into the fear, verified",
      subtitle: "Same day, same expiry, 80 points apart — and 80 points was everything",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**July 15, 2026** was a $${(jul15.high - jul15.low).toFixed(0)}-point range day: SNDK opened $${jul15.open}, traded down to $${jul15.low}, closed $${jul15.close}. RSI in the low 40s, IV above 150%. The scanner offered two July 24 puts:\n\n• **$1390** — $${jul1390.mid.toFixed(2)} credit, delta ${jul1390.delta.toFixed(2)}, ${jul1390.aroc}% AROC, ${pctOtm(1390, jul15.close)}% OTM\n• **$1310** — $${jul1310.mid.toFixed(2)} credit, delta ${jul1310.delta.toFixed(2)}, ${jul1310.aroc}% AROC, ${pctOtm(1310, jul15.close)}% OTM\n\nThe $1310 gives up $${(jul1390.mid - jul1310.mid).toFixed(2)} of credit — ${(((jul1390.mid - jul1310.mid) / jul1390.mid) * 100).toFixed(0)}% less income — to buy $${(1390 - 1310).toFixed(0)} more strike. Its catalyst: *"${jul1310.catalyst}"*`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Eighty points of strike, nine days (real bars)",
            bars: bars(t, "2026-07-14", "2026-07-24"),
            lines: [
              { price: 1390, label: "1390 strike", color: "amber" },
              { price: 1310, label: "1310 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-15", label: "entry", color: "violet" },
              { date: "2026-07-17", label: `low ${jul17.low}`, color: "red", below: true },
              { date: "2026-07-24", label: `exp ${jul24.close}`, color: "emerald" },
            ],
            caption: `Two sessions in, the July 17 low of $${jul17.low} put the $1390 put $${(1390 - jul17.low).toFixed(2)}/sh intrinsic and closed it $${(1390 - jul17.close).toFixed(2)} ITM. The $1310 was never touched — it cleared the low by $${(jul17.low - 1310).toFixed(2)} (${(((jul17.low - 1310) / 1310) * 100).toFixed(2)}%). Both expired worthless at $${jul24.close}, but only one of them let you sleep.`,
          },
        },
        {
          type: "text",
          content: `Both trades won: **+${perCt(jul1390.mid)}** and **+${perCt(jul1310.mid)}** per contract in ${jul1310.dte} days. The difference is what they cost you to hold. The $1390 spent July 17 in the money and would have tripped any stop you'd set after reading case 2. The $1310 was never in trouble on any basis, and its ${jul1310.aroc}% AROC is still an absurd annualized return.\n\nThat's the shape of a good entry in a ${(jul1310.iv * 100).toFixed(0)}%-IV name: sell **after** the fear is priced in (RSI ${jul1310.rsi}, entry the day of a $${(jul15.high - jul15.low).toFixed(0)}-point range), and take the strike that survives the next leg rather than the one with the fatter AROC.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sndk-fear-1",
              question: `Both puts expired worthless. Why call the $1310 the better entry rather than a matter of taste?`,
              options: [
                "It collected more premium",
                `Same outcome, materially less path risk: it cleared the worst low by $${(jul17.low - 1310).toFixed(2)} while the $1390 went $${(1390 - jul17.low).toFixed(2)}/sh intrinsic — you can't manage a position you're forced to defend`,
                "Lower IV made it safer",
                "Its delta was closer to 0.30",
              ],
              correctIndex: 1,
              explanation: `Two trades with the same P&L are not the same trade. The $1390 required you to hold through a $${(1390 - jul17.low).toFixed(2)}/sh intrinsic mark to collect — and if you'd honored a stop, you'd have taken a loss on a contract that ultimately expired worthless. Path risk is the cost that never shows up in the AROC column.`,
            },
          ],
        },
        {
          type: "callout",
          style: "tip",
          content: `Note what this case does *not* prove: SNDK went on to close at $${jul29.close} on July 29, far under both strikes. The entry was good because of where the strike sat relative to the realized range, not because the stock cooperated afterwards — it eventually didn't.`,
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "day-volume-one",
      title: "Day volume: 1",
      subtitle: "A stop you can't fill isn't a stop",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Two real SNDK candidates, chosen for one column everyone skips:\n\n• **June 24, $1610 put, July 2 expiry** — $${jun1610.mid.toFixed(2)} mid, ${jun1610.aroc}% AROC, bid/ask $${jun1610.bid} / $${jun1610.ask}. **Day volume: ${jun1610.volume}.**\n• **July 23, $1390 put, July 31 expiry** — $${jul1390b.mid.toFixed(2)} mid, **${jul1390b.aroc}% AROC**, bid/ask $${jul1390b.bid} / $${jul1390b.ask}. **Day volume: ${jul1390b.volume}.**\n\nNeither spread is wide in percentage terms (${(((jun1610.ask - jun1610.bid) / jun1610.mid) * 100).toFixed(1)}% and ${(((jul1390b.ask - jul1390b.bid) / jul1390b.mid) * 100).toFixed(1)}% of mid). In dollars they are **${perCt(jun1610.ask - jun1610.bid)}** and **${perCt(jul1390b.ask - jul1390b.bid)}** per contract — and that's the *quoted* spread on a calm day, with ${jun1610.volume} and ${jul1390b.volume} contracts of daily interest behind it.`,
        },
        {
          type: "text",
          content: `**The $1610 won.** SNDK closed July 2 at $${jul02.close}, never trading below $${jul02.low} during the hold — the put expired worthless, +${perCt(jun1610.mid)}. Liquidity cost nothing, because the exit was never needed.\n\n**The $1390 is the other case.** Entered July 23 with SNDK at $${jul23.close} (${pctOtm(1390, jul23.close)}% cushion), it walked straight into the worst four sessions in the dataset: July 27 low $${jul27.low}, July 28 close $${barOn(t, "2026-07-28").close}, July 29 low **$${jul29.low}** — $${(1390 - jul29.low).toFixed(2)}/sh intrinsic, **${((1390 - jul29.low) / jul1390b.mid).toFixed(1)}× the credit**.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The July collapse — where you'd have needed the exit",
            bars: bars(t, "2026-07-20", "2026-07-31"),
            lines: [{ price: 1390, label: "1390 strike", color: "sky" }],
            markers: [
              { date: "2026-07-23", label: "entry", color: "violet" },
              { date: "2026-07-29", label: `low ${jul29.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${jul31.close}`, color: "amber" },
            ],
            caption: `SNDK closed July 31 at $${jul31.close}: the put $${(1390 - jul31.close).toFixed(2)}/sh ITM, **-${perCt(jul1390b.mid - (1390 - jul31.close))} per contract** against a ${perCt(jul1390b.mid)} credit. From the June 25 close of $${barOn(t, "2026-06-25").close} to the July 29 close of $${jul29.close}, SNDK drew down ${Math.abs(((jul29.close - barOn(t, "2026-06-25").close) / barOn(t, "2026-06-25").close) * 100).toFixed(1)}%.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Every stop rule in this module assumes a counterparty. On July 27 SNDK traded from a $${jul27.open} open down to $${jul27.low} — the session you'd be trying to buy back a contract that showed ${jul1390b.volume} contracts of volume on the day it was scanned. In that tape you don't get mid; you get the ask, or worse, and a stop-market order fills wherever the book happens to be. A stop-limit protects the price and may simply never fill — leaving you in the position you decided to exit.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sndk-liq-1",
              question: `The $1610 put (day volume ${jun1610.volume}) expired worthless for a full profit. What's the correct read on that?`,
              options: [
                "Liquidity doesn't matter for options you intend to hold to expiry",
                "Low volume is fine as long as the AROC is high enough",
                "The liquidity risk was real and simply never billed — it's a cost you pay only in the scenarios where you need the exit, which are exactly the scenarios that hurt",
                "It proves the scanner's volume filter is too strict",
              ],
              correctIndex: 2,
              explanation: `Judging a risk by one favorable outcome is how position sizing goes wrong. An illiquid contract is a normal trade in every path where you hold to expiry and a materially worse one in every path where you need out — and you don't know which path you're on at entry. The ${jul1390b.aroc}% AROC on the $1390 was the same kind of bet, and that one got billed in full.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "credit-vs-realized-move": {
      kind: "short-put",
      entryDate: "2026-06-30",
      strike: 2000,
      expiry: "2026-07-10",
      credit: jun2000.mid,
      volume: jun2000.volume,
      support: { level: jun25.low, label: `"support" low from June 25 that the catalyst cited` },
      note: `Sharper still: this tripwire was blown before the trade existed — June 29 traded down to $${jun29.low}, under the claimed floor, the day before the scan called it strong. The cheapest defense was available at order time: don't sell the put at all.`,
    },
    "stop-through-the-whipsaw": {
      kind: "short-put",
      entryDate: "2026-07-01",
      strike: 1800,
      expiry: "2026-07-17",
      credit: jul1800.mid,
      volume: jul1800.volume,
      support: { level: jun29.low, label: "June 29 swing low under the entry" },
    },
    "twenty-dollars-of-strike": {
      kind: "short-put",
      entryDate: "2026-07-08",
      strike: 1420,
      expiry: "2026-07-17",
      credit: jul1420.mid,
      volume: jul1420.volume,
      note: "This block defends contract A — the higher-AROC $1420 that flipped negative. The same orders under contract B would have used its own credit and the same close-basis line.",
    },
    "the-exit-you-didnt-take": {
      kind: "short-put",
      entryDate: "2026-06-29",
      strike: 1600,
      expiry: "2026-07-17",
      credit: mark0629.mid,
      volume: mark0629.volume,
      support: { level: jun29.low, label: "entry-day swing low" },
    },
    "selling-into-the-fear": {
      kind: "short-put",
      entryDate: "2026-07-15",
      strike: 1310,
      expiry: "2026-07-24",
      credit: jul1310.mid,
      volume: jul1310.volume,
      support: { level: jul15.low, label: "entry-day washout low" },
    },
    "day-volume-one": {
      kind: "short-put",
      entryDate: "2026-07-23",
      strike: 1390,
      expiry: "2026-07-31",
      credit: jul1390b.mid,
      volume: jul1390b.volume,
      support: { level: jul17.low, label: "July 17 swing low" },
    },
  }),
};
