// MRVL case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/MRVL.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/MRVL.json";
import { bars, barOn, findPut, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// ── Case 1 + 5: the June 4 top (close 316.43, the peak of a +97.76% rip) ───
const top = barOn(t, "2026-06-04");
const ripStart = barOn(t, "2026-05-07"); // 160.01 — the low the run started from
const p280 = findPut(t, "2026-06-04", 280, "2026-06-12");
const p250top = findPut(t, "2026-06-04", 250, "2026-06-12");
const crackDay = barOn(t, "2026-06-05"); // -16.7% the next session
const junLow = barOn(t, "2026-06-09").low; // 244.00
const jun12 = barOn(t, "2026-06-12"); // 279.70 — the 280 put finished 0.30 ITM

// Roll decision after that expiry (June 18 scan, MRVL back at 310.58).
const roll270 = findPut(t, "2026-06-18", 270, "2026-06-26");
const roll2875 = findPut(t, "2026-06-18", 287.5, "2026-06-26");
const roll270Early = findPut(t, "2026-06-15", 270, "2026-06-26");
const jun26 = barOn(t, "2026-06-26"); // 266.77

// ── Case 2: the -48.36% collapse (316.43 on 06-04 → 163.40 on 07-29) ──────
const p250 = findPut(t, "2026-06-30", 250, "2026-07-17");
const p250Next = findPut(t, "2026-07-01", 250, "2026-07-17"); // same contract, next day
const stopEntry = barOn(t, "2026-06-30"); // 297.89
const stopDay2 = barOn(t, "2026-07-01"); // 272.05
const jul17 = barOn(t, "2026-07-17"); // 188.68
const trough = barOn(t, "2026-07-29"); // 163.40

// ── Case 3: real spreads you'd have to trade through ──────────────────────
const wide220 = findPut(t, "2026-06-05", 220, "2026-06-18"); // 6.65 / 9.35
const thin146 = findPut(t, "2026-05-04", 146, "2026-05-15"); // volume 2
const thin160 = findPut(t, "2026-07-27", 160, "2026-08-14"); // volume 6

// ── Case 4: same strike, same day, two expiries ───────────────────────────
const jul10 = findPut(t, "2026-07-02", 210, "2026-07-10");
const jul17Put = findPut(t, "2026-07-02", 210, "2026-07-17");
const dteEntry = barOn(t, "2026-07-02"); // 245.29
const jul10Bar = barOn(t, "2026-07-10"); // 235.81

// ── Case 6: cushion, tested three ways ────────────────────────────────────
const cushion170 = findPut(t, "2026-05-28", 170, "2026-06-18"); // AROC 45 — the boringest row
const cushion180 = findPut(t, "2026-05-28", 180, "2026-06-18");
const cushionEntry = barOn(t, "2026-05-28"); // 204.83
const cushionMinLow = Math.min(...bars(t, "2026-05-28", "2026-06-18").map((b) => b.low));
const jun18 = barOn(t, "2026-06-18"); // 310.58
const oversold200 = findPut(t, "2026-07-07", 200, "2026-07-17"); // RSI 31.9
const oversoldEntry = barOn(t, "2026-07-07"); // 230.70
const oversold170 = findPut(t, "2026-07-20", 170, "2026-07-31"); // RSI 27.7
const oversold170Entry = barOn(t, "2026-07-20"); // 194.94
const jul31 = barOn(t, "2026-07-31"); // 187.56

const lastBar = t.prices[t.prices.length - 1]; // 2026-08-05, 214.83

export const MRVL_CASES: Module = {
  id: "cs-mrvl",
  title: "MRVL Case Studies",
  subtitle: "A 98% rip, a 48% collapse, and every stop that never got set",
  icon: "🎢",
  color: "sky-500",
  level: 2,
  track: "case-study",
  ticker: "MRVL",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "selling-the-euphoria-top",
      title: "Selling puts at the exact top",
      subtitle: "June 4: two contracts, 4 points of AROC apart, 30 points of cushion apart",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `Between **May 7** ($${ripStart.close.toFixed(2)}) and **June 4** ($${top.close.toFixed(2)}), MRVL ran **+${(((top.close - ripStart.close) / ripStart.close) * 100).toFixed(1)}%**. On June 4 itself the scanner fired two put candidates, both expiring June 12, both with roughly the same headline number:\n\n• **$280 put** — $${p280.mid.toFixed(2)} credit, ${p280.aroc}% AROC, RSI **${p280.rsi}**\n• **$250 put** — $${p250top.mid.toFixed(2)} credit, ${p250top.aroc}% AROC\n\nFour points of AROC separate them. Thirty points of strike separate them. The $280 catalyst read: *"${p280.catalyst}"*`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "MRVL just went vertical. Which 8-day put do you sell?",
            goal: "Income — collect the IV premium without getting run over",
            a: {
              label: "A · $280 put",
              date: "2026-06-04",
              side: "put",
              strike: 280,
              expiry: "2026-06-12",
              dte: p280.dte,
              bid: p280.bid,
              ask: p280.ask,
              mid: p280.mid,
              delta: p280.delta,
              iv: p280.iv,
              aroc: p280.aroc,
              volume: p280.volume,
              juiciness: p280.juiciness,
              note: p280.catalyst,
            },
            b: {
              label: "B · $250 put",
              date: "2026-06-04",
              side: "put",
              strike: 250,
              expiry: "2026-06-12",
              dte: p250top.dte,
              bid: p250top.bid,
              ask: p250top.ask,
              mid: p250top.mid,
              delta: p250top.delta,
              iv: p250top.iv,
              aroc: p250top.aroc,
              volume: p250top.volume,
              juiciness: p250top.juiciness,
              note: p250top.catalyst,
            },
            correct: "b",
            explanation: `A sat ${pctOtm(280, top.close)}% below spot; B sat ${pctOtm(250, top.close)}%. The next session MRVL fell ${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}% to $${crackDay.close.toFixed(2)}, and by June 9 it traded as low as $${junLow.toFixed(2)}. At that low the $280 put was $${(280 - junLow).toFixed(2)}/sh in the money — **${((280 - junLow) / p280.mid).toFixed(1)}× the credit collected** — while the $250 put was only $${(250 - junLow).toFixed(2)} under water. Both technically finished fine (June 12 close $${jun12.close.toFixed(2)}: A netted $${((p280.mid - (280 - jun12.close)) * 100).toFixed(0)}, B kept the full $${(p250top.mid * 100).toFixed(0)}), but only one of them was survivable to hold.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The top, and the crack the next day (real bars)",
            bars: bars(t, "2026-05-26", "2026-06-12"),
            lines: [
              { price: 280, label: "A: 280 strike", color: "red" },
              { price: 250, label: "B: 250 strike", color: "emerald" },
              { price: 294, label: "claimed support", color: "amber", dash: true },
            ],
            markers: [
              { date: "2026-06-04", label: "entry", color: "violet" },
              { date: "2026-06-05", label: `${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}%`, color: "red", below: true },
              { date: "2026-06-12", label: `exp ${jun12.close.toFixed(2)}`, color: "sky" },
            ],
            caption: `The "$294 support" in the catalyst never even survived entry day — June 4's low was $${top.low.toFixed(2)}. RSI was ${p280.rsi} and IV was ${(p280.iv * 100).toFixed(0)}%: the market was pricing exactly the move that arrived.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `AROC is a *rate*, not a risk measure. ${p280.aroc}% vs ${p250top.aroc}% is a rounding error; 11.5% cushion vs 21% cushion is the entire trade. When two candidates pay nearly the same, the correct tiebreak is always distance.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "mrvl-et-1",
              question: `RSI was ${p280.rsi} and IV was ${(p280.iv * 100).toFixed(0)}% when this put was offered. What does that combination tell a put seller?`,
              options: [
                "Premium is rich, so this is the best time to sell",
                "The stock is overbought and the option market is pricing an unusually large move — the fat premium is compensation for real risk, not free money",
                "High RSI means the trend will continue",
                "IV above 100% means the option is mispriced",
              ],
              correctIndex: 1,
              explanation: `${(p280.iv * 100).toFixed(0)}% IV on an 8-day option implies a huge expected move. MRVL delivered ${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}% the very next session. Rich premium and dangerous entry are the same fact viewed from two sides.`,
            },
            {
              id: "mrvl-et-2",
              question: `Both puts expired profitably. Why is the $280 put still the wrong choice?`,
              options: [
                "It collected less premium",
                "It had a later expiry",
                `It spent the hold ${((280 - junLow) / p280.mid).toFixed(1)}x the credit under water — an outcome you'd have to stomach, or panic-close, long before expiry rescued it`,
                "It was less liquid",
              ],
              correctIndex: 2,
              explanation: `Judging a trade by its final P&L is outcome bias. At the June 9 low the $280 put was $${(280 - junLow).toFixed(2)}/sh ITM against $${p280.mid.toFixed(2)} collected. Most traders close there. The $250 put never got closer than $${(250 - junLow).toFixed(2)} and required no decisions at all.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "the-stop-nobody-set",
      title: "The stop nobody set",
      subtitle: "One entry into a 48% collapse — you decide where to get out",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `**June 30, 2026.** MRVL closes at $${stopEntry.close.toFixed(2)} and the scanner surfaces its **highest-juiciness MRVL row of the entire window**: the **$250 put expiring July 17**, $${p250.mid.toFixed(2)} credit, ${p250.aroc}% AROC, delta ${p250.delta.toFixed(2)}, juiciness ${p250.juiciness}. Strike sits ${pctOtm(250, stopEntry.close)}% below spot. Catalyst: *"${p250.catalyst}"*\n\nWhat nobody knew on June 30: the June 4 high of $${top.close.toFixed(2)} was the start of a **${(((trough.close - top.close) / top.close) * 100).toFixed(2)}%** drawdown that would bottom at $${trough.close.toFixed(2)} on July 29.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-18", "2026-07-17"),
            visibleUntil: "2026-07-01",
            strike: 250,
            credit: p250.mid,
            entryDate: "2026-06-30",
            expiry: "2026-07-17",
            guide: { min: 255, max: 268 },
            explanation: `The last real structure under the entry was the June 26 low of $${jun26.low.toFixed(2)}. A stop just below it ($255–$268) triggers on July 2, when MRVL sliced from a $${dteEntry.open.toFixed(2)} open to a $${dteEntry.low.toFixed(2)} low. Exit anywhere in that zone and the put is still comfortably out of the money — you buy back time value, not intrinsic value. Held to expiry instead, MRVL closed at $${jul17.close.toFixed(2)}: $${(250 - jul17.close).toFixed(2)}/sh in the money, a **$${((250 - jul17.close - p250.mid) * 100).toFixed(0)} loss per contract** against $${(p250.mid * 100).toFixed(0)} collected.`,
          },
        },
        {
          type: "text",
          content: `Here's the trap that makes premium-based stops fail on a slow bleed. The scanner re-priced the *same contract* the next day:\n\n• **June 30** — MRVL $${stopEntry.close.toFixed(2)}, 250P mid $${p250.mid.toFixed(2)}, IV ${(p250.iv * 100).toFixed(0)}%\n• **July 1** — MRVL $${stopDay2.close.toFixed(2)} (**${(((stopDay2.close - stopEntry.close) / stopEntry.close) * 100).toFixed(1)}%**), 250P mid $${p250Next.mid.toFixed(2)} (**+${(((p250Next.mid - p250.mid) / p250.mid) * 100).toFixed(1)}%**)\n\nThe underlying fell ${Math.abs((((stopDay2.close - stopEntry.close) / stopEntry.close) * 100)).toFixed(1)}% and the option barely moved — theta (${p250.theta.toFixed(2)}/day) and falling IV offset the delta loss. A "buy back at 2× credit" rule would still be sitting on its hands, comfortably, while the thesis quietly died.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `$${((250 - jul17.close - p250.mid) * 100).toFixed(0)} is **${((250 - jul17.close - p250.mid) / p250.mid).toFixed(1)}× the credit collected** — it takes ${Math.ceil((250 - jul17.close - p250.mid) / p250.mid)} identical winners to get back to flat. That is the real cost of not defining an exit before entry.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "mrvl-sn-1",
              question: `MRVL dropped ${Math.abs((((stopDay2.close - stopEntry.close) / stopEntry.close) * 100)).toFixed(1)}% on July 1, yet the 250 put's mid only rose from $${p250.mid.toFixed(2)} to $${p250Next.mid.toFixed(2)}. What is the practical lesson?`,
              options: [
                "The option was mispriced and should be sold again",
                "Premium-multiple stops (2–3x credit) lag on a grinding decline — a stop anchored to the underlying's structure fires while the exit is still cheap",
                "Delta was too low to matter",
                "Nothing — the position was fine on July 1",
              ],
              correctIndex: 1,
              explanation: `With ${p250.dte} days to run, theta and IV compression masked an 8.7% adverse move. Premium stops work on gaps; on a slow bleed the option price gives you permission to hold right up until the loss is unavoidable. Anchor the stop to the price level that invalidates your thesis.`,
            },
            {
              id: "mrvl-sn-2",
              question: `Why does exiting in the $255–$268 zone cost so much less than holding to expiry, even though it's a loss either way?`,
              options: [
                "Because losses before expiry aren't real",
                `Because the option is still out of the money there — you're buying back time value, not $${(250 - jul17.close).toFixed(2)}/sh of intrinsic value`,
                "Because the broker refunds commissions",
                "Because IV was lower",
              ],
              correctIndex: 1,
              explanation: `A short put's loss is bounded by time value until price crosses the strike; past that, every dollar of decline is a dollar of intrinsic loss. MRVL fell $${(268 - jul17.close).toFixed(2)} beyond that stop zone. Stops on short puts are about staying on the flat part of the payoff curve.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "stops-through-wide-spreads",
      title: "Your stop has to fill through this",
      subtitle: "Real MRVL quotes where stop-market and stop-limit both hurt",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `A stop is only worth what it fills at. Three real MRVL quotes from the dataset:\n\n| Date | Contract | Bid | Ask | Spread | Volume |\n|---|---|---|---|---|---|\n| 2026-06-05 | $220P ${wide220.expiry} | $${wide220.bid.toFixed(2)} | $${wide220.ask.toFixed(2)} | **${(((wide220.ask - wide220.bid) / wide220.mid) * 100).toFixed(1)}% of mid** | ${wide220.volume} |\n| 2026-07-27 | $160P ${thin160.expiry} | $${thin160.bid.toFixed(2)} | $${thin160.ask.toFixed(2)} | ${(((thin160.ask - thin160.bid) / thin160.mid) * 100).toFixed(1)}% | ${thin160.volume} |\n| 2026-05-04 | $146P ${thin146.expiry} | $${thin146.bid.toFixed(2)} | $${thin146.ask.toFixed(2)} | ${(((thin146.ask - thin146.bid) / thin146.mid) * 100).toFixed(1)}% | ${thin146.volume} |\n\nThe first one is the interesting case. June 5 was the day MRVL fell ${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}%, and the catalyst reads *"${wide220.catalyst}"* — the "juicy" $${wide220.mid.toFixed(2)} mid is the midpoint of a **$${(wide220.ask - wide220.bid).toFixed(2)} wide** quote.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `Round-tripping that $220 put — sell at the $${wide220.bid.toFixed(2)} bid, buy back at the $${wide220.ask.toFixed(2)} ask — costs **$${((wide220.ask - wide220.bid) * 100).toFixed(0)} per contract** in spread alone, against a mid-price credit of $${(wide220.mid * 100).toFixed(0)}. You start the trade ${(((wide220.mid - wide220.bid) / wide220.mid) * 100).toFixed(0)}% behind the number the scanner showed you.`,
        },
        {
          type: "text",
          content: `**Stop-market** on that contract: it becomes a market order the instant it triggers, and on a ${(((wide220.ask - wide220.bid) / wide220.mid) * 100).toFixed(0)}%-wide quote in a fast tape it fills at whatever the ask happens to be — possibly worse than $${wide220.ask.toFixed(2)}. It *will* get you out. The price is the question.\n\n**Stop-limit** at, say, the $${wide220.mid.toFixed(2)} mid: it protects you from the terrible fill, and on June 5, with MRVL down ${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}% on the day, there's a real chance nothing prints there and you simply stay short into the decline. A stop that doesn't fill isn't risk management, it's a preference.\n\nThe $146 put from May 4 is the other failure mode: **${thin146.volume} contracts of volume** for the entire day. There is no fill, at any order type, at any price you'd like. Its AROC was ${thin146.aroc}% versus ${findPut(t, "2026-05-04", 150, "2026-05-15").aroc}% for the $150 put the same day, which traded ${findPut(t, "2026-05-04", 150, "2026-05-15").volume} contracts.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "mrvl-ws-1",
              question: `You hold the $220 put quoted $${wide220.bid.toFixed(2)} / $${wide220.ask.toFixed(2)} and want a hard exit. Which is the more honest choice?`,
              options: [
                "Stop-limit at the mid — never overpay",
                "Stop-market, accepting the spread as the cost of a guaranteed exit — the position size should have been set assuming that cost",
                "No stop; manage by watching the screen",
                "A stop-limit $1 below the bid",
              ],
              correctIndex: 1,
              explanation: `On an illiquid contract you're choosing between a bad fill and no fill. If a bad fill would be unacceptable, the contract was too illiquid to sell in the first place — liquidity is a precondition you check at entry, not a problem you solve at the exit.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "dte-is-exposure",
      title: "Same strike, same day, two expiries",
      subtitle: "Seven extra days cost $1,847 on the identical thesis",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**July 2, 2026.** MRVL closes at $${dteEntry.close.toFixed(2)} after falling from $${stopEntry.close.toFixed(2)} in two sessions. The scanner surfaces the **$210 strike twice** — same strike, same scan, different expiry. Strike is ${pctOtm(210, dteEntry.close)}% below spot either way, and the longer-dated one pays **${(((jul17Put.mid - jul10.mid) / jul10.mid) * 100).toFixed(0)}% more premium**.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Same $210 strike. Which expiry?",
            goal: "Income — the thesis is a bounce off the July 2 washout",
            a: {
              label: "A · $210P — July 10",
              date: "2026-07-02",
              side: "put",
              strike: 210,
              expiry: "2026-07-10",
              dte: jul10.dte,
              bid: jul10.bid,
              ask: jul10.ask,
              mid: jul10.mid,
              delta: jul10.delta,
              iv: jul10.iv,
              aroc: jul10.aroc,
              volume: jul10.volume,
              juiciness: jul10.juiciness,
              note: jul10.catalyst,
            },
            b: {
              label: "B · $210P — July 17",
              date: "2026-07-02",
              side: "put",
              strike: 210,
              expiry: "2026-07-17",
              dte: jul17Put.dte,
              bid: jul17Put.bid,
              ask: jul17Put.ask,
              mid: jul17Put.mid,
              delta: jul17Put.delta,
              iv: jul17Put.iv,
              aroc: jul17Put.aroc,
              volume: jul17Put.volume,
              juiciness: jul17Put.juiciness,
              note: jul17Put.catalyst,
            },
            correct: "a",
            explanation: `MRVL closed at $${jul10Bar.close.toFixed(2)} on July 10 — **A expired worthless, keeping $${(jul10.mid * 100).toFixed(0)}**. Then the slide resumed: by July 17 MRVL was at $${jul17.close.toFixed(2)}, leaving **B $${(210 - jul17.close).toFixed(2)}/sh in the money, a $${((210 - jul17.close - jul17Put.mid) * 100).toFixed(0)} loss**. Same strike, same thesis, same day — a $${((jul10.mid + (210 - jul17.close - jul17Put.mid)) * 100).toFixed(0)} swing bought with $${((jul17Put.mid - jul10.mid) * 100).toFixed(0)} of extra credit.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Where each expiry landed (real bars)",
            bars: bars(t, "2026-06-30", "2026-07-17"),
            lines: [{ price: 210, label: "210 strike", color: "sky" }],
            markers: [
              { date: "2026-07-02", label: "entry", color: "violet" },
              { date: "2026-07-10", label: `A exp ${jul10Bar.close}`, color: "emerald" },
              { date: "2026-07-17", label: `B exp ${jul17.close}`, color: "red", below: true },
            ],
            caption: `Note A's higher AROC (${jul10.aroc}% vs ${jul17Put.aroc}%) despite the smaller credit — annualizing already told you the short expiry paid better per day of risk. The extra ${jul17Put.dte - jul10.dte} days added exposure, not edge.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `In a downtrend, DTE is exposure. Every additional day is another day the trend can keep working against you, and the credit for those days is priced by the same market that expects the move. When AROC favors the shorter expiry, the longer one is paying you *less* per unit of risk while asking you to hold more of it.`,
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "the-roll-that-mattered",
      title: "Rolling: the strike, not the credit",
      subtitle: "Two real roll candidates from the same June 18 scan",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Return to the $280 put from case 1. It expired June 12 with MRVL at $${jun12.close.toFixed(2)} — $${(280 - jun12.close).toFixed(2)}/sh in the money, net **+$${((p280.mid - (280 - jun12.close)) * 100).toFixed(0)}** after the credit. You either took the shares near $280 or let it go and redeployed.\n\nMRVL then rallied back to $${jun18.close.toFixed(2)} by June 18, and the scanner offered two June 26 puts on that day:\n\n• **$270 put** — $${roll270.mid.toFixed(2)} credit, ${roll270.aroc}% AROC, delta ${roll270.delta.toFixed(2)}, juiciness ${roll270.juiciness}\n• **$287.50 put** — $${roll2875.mid.toFixed(2)} credit, ${roll2875.aroc}% AROC, delta ${roll2875.delta.toFixed(2)}, juiciness **${roll2875.juiciness}**\n\nThe scanner ranked the $287.50 higher on both AROC and juiciness. It sits ${pctOtm(287.5, jun18.close)}% below spot; the $270 sits ${pctOtm(270, jun18.close)}%.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Eight days later (real bars)",
            bars: bars(t, "2026-06-11", "2026-06-26"),
            lines: [
              { price: 287.5, label: "287.5 strike", color: "red" },
              { price: 270, label: "270 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-06-18", label: "roll", color: "violet" },
              { date: "2026-06-26", label: `exp ${jun26.close}`, color: "sky", below: true },
            ],
            caption: `June 26 close: $${jun26.close.toFixed(2)}. The $270 put finished $${(270 - jun26.close).toFixed(2)} ITM — still **net +$${((roll270.mid - (270 - jun26.close)) * 100).toFixed(0)}** after its $${roll270.mid.toFixed(2)} credit. The $287.50 finished $${(287.5 - jun26.close).toFixed(2)} ITM — **net -$${Math.abs((roll2875.mid - (287.5 - jun26.close)) * 100).toFixed(0)}**. The higher-ranked contract paid $${((roll2875.mid - roll270.mid) * 100).toFixed(0)} more and lost $${(((roll270.mid - (270 - jun26.close)) - (roll2875.mid - (287.5 - jun26.close))) * 100).toFixed(0)} more.`,
          },
        },
        {
          type: "text",
          content: `One more detail worth stealing. The same $270/June 26 contract was scanned three days earlier, on **June 15** (MRVL $${barOn(t, "2026-06-15").close}), at $${roll270Early.mid.toFixed(2)} — versus $${roll270.mid.toFixed(2)} on June 18 with MRVL slightly *higher* at $${jun18.close.toFixed(2)}. Waiting three days to redeploy gave up **$${((roll270Early.mid - roll270.mid) * 100).toFixed(0)} per contract** on an identical strike and expiry, purely to theta (${roll270Early.dte} DTE → ${roll270.dte} DTE) and IV.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "mrvl-rt-1",
              question: `The scanner scored the $287.50 put higher (juiciness ${roll2875.juiciness} vs ${roll270.juiciness}, AROC ${roll2875.aroc}% vs ${roll270.aroc}%). What does its outcome reveal about scores like these?`,
              options: [
                "The score was miscalculated",
                "Scores rank premium efficiency, not survivability — they reward exactly the tighter strike that a normal pullback breaks",
                "Juiciness only applies to calls",
                "The scores were right; the outcome was unlucky",
              ],
              correctIndex: 1,
              explanation: `A ranking built on annualized return per dollar of collateral will always favor closer strikes, because closer strikes pay more. The score is an input; cushion relative to the stock's actual range is the constraint you apply on top of it — MRVL had already printed ${(((crackDay.close - top.close) / top.close) * 100).toFixed(1)}% single-day moves that month. Rolling for a *bigger* credit after a scare means selling more risk right when risk has just been proven expensive.`,
            },
          ],
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "cushion-beats-the-catalyst",
      title: "Cushion beats the catalyst",
      subtitle: "The lowest-AROC row in the file was the safest trade in the file",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**May 28, 2026**, MRVL at $${cushionEntry.close.toFixed(2)}. The scanner's **$170 put, June 18 expiry** paid $${cushion170.mid.toFixed(2)} at just **${cushion170.aroc}% AROC** — the lowest AROC of any MRVL row in the whole May–August window. Delta ${cushion170.delta.toFixed(2)}, volume ${cushion170.volume}, strike ${pctOtm(170, cushionEntry.close)}% below spot. The $180 put on the same scan paid ${cushion180.aroc}% AROC for ${(pctOtm(170, cushionEntry.close) - pctOtm(180, cushionEntry.close)).toFixed(1)} points less cushion.\n\nMRVL never traded below $${cushionMinLow.toFixed(2)} over the hold and closed expiry at **$${jun18.close.toFixed(2)}** — the $170 put was never remotely threatened, and it kept the full $${(cushion170.mid * 100).toFixed(0)}.\n\nNow the other side of the same instinct.`,
        },
        {
          type: "text",
          content: `**July 7**, MRVL at $${oversoldEntry.close.toFixed(2)} and falling. The scanner flags the **$200 put, July 17 expiry** at $${oversold200.mid.toFixed(2)}, catalyst: *"${oversold200.catalyst}"* — ${pctOtm(200, oversoldEntry.close)}% of cushion, sold into an RSI of ${oversold200.rsi}.\n\nJuly 17 close: **$${jul17.close.toFixed(2)}**. The put finished $${(200 - jul17.close).toFixed(2)}/sh ITM — a **$${((200 - jul17.close - oversold200.mid) * 100).toFixed(0)} loss**.\n\n**July 20**, MRVL at $${oversold170Entry.close.toFixed(2)}, RSI ${oversold170.rsi} — even more oversold. The **$170 put, July 31 expiry**, $${oversold170.mid.toFixed(2)} credit, ${pctOtm(170, oversold170Entry.close)}% cushion. MRVL fell to $${trough.low.toFixed(2)} intraday on July 29 (through the strike) before closing expiry at **$${jul31.close.toFixed(2)}**. It kept the $${(oversold170.mid * 100).toFixed(0)} — by $${(jul31.close - 170).toFixed(2)} and two sessions.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Two 'oversold' entries into the same downtrend (real bars)",
            bars: bars(t, "2026-07-06", "2026-08-05"),
            lines: [
              { price: 200, label: "200 strike (lost)", color: "red" },
              { price: 170, label: "170 strike (held)", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-07", label: `RSI ${oversold200.rsi}`, color: "violet" },
              { date: "2026-07-20", label: `RSI ${oversold170.rsi}`, color: "violet" },
              { date: "2026-07-29", label: `low ${trough.low.toFixed(2)}`, color: "red", below: true },
            ],
            caption: `Same catalyst text, same downtrend, opposite outcomes — separated by ${(pctOtm(200, oversoldEntry.close) - pctOtm(170, oversold170Entry.close)).toFixed(1)} points of cushion and a bounce that arrived just in time. MRVL closed the window at $${lastBar.close.toFixed(2)} on ${lastBar.date}.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `"RSI oversold — likely bounce territory" described three MRVL entries in July. One lost $${((200 - jul17.close - oversold200.mid) * 100).toFixed(0)}, one won by a hair, and the stock kept falling for two weeks after the first of them. Oversold is a description of the past, not a floor under the price.\n\nAnd read the eventual recovery to $${lastBar.close.toFixed(2)} carefully: it's one real path. It makes assignment tolerable on a name you sized to own — it does nothing for whoever panic-closed at $${trough.close.toFixed(2)}.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "mrvl-cb-1",
              question: `The ${cushion170.aroc}%-AROC put was never stressed; the ${oversold200.aroc}%-AROC "oversold bounce" put lost $${((200 - jul17.close - oversold200.mid) * 100).toFixed(0)}. What generalizes here?`,
              options: [
                "Low AROC contracts always win",
                "Never sell puts on semiconductors",
                "Distance to the strike is the variable you actually control; the catalyst narrative is the one you can't verify until it's too late",
                "RSI should be ignored entirely",
              ],
              correctIndex: 2,
              explanation: `Across every MRVL case in this module — the June 4 top, the June 30 collapse entry, the July 2 expiry pair, the June 18 roll — the contract with more cushion produced the better outcome, regardless of what the catalyst line said. Cushion is measurable at entry. Bounces are not.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "selling-the-euphoria-top": {
      kind: "short-put",
      entryDate: "2026-06-04",
      strike: 280,
      expiry: "2026-06-12",
      credit: p280.mid,
      volume: p280.volume,
      support: { level: 294, label: `claimed "$294 support" from the catalyst — inside entry day's own range` },
      note: "This block defends pick A, the $280 that spent the week in the fire. Note that this is one of the cases where the defense loses money on the final print — the whipsaw is the fee, and the June 9 mark is what it insures against.",
    },
    "the-stop-nobody-set": {
      kind: "short-put",
      entryDate: "2026-06-30",
      strike: 250,
      expiry: "2026-07-17",
      credit: p250.mid,
      volume: p250.volume,
      support: { level: jun26.low, label: "June 26 swing low — the last structure under the entry" },
    },
    "stops-through-wide-spreads": {
      kind: "short-put",
      entryDate: "2026-06-05",
      strike: 220,
      expiry: "2026-06-18",
      credit: wide220.mid,
      volume: wide220.volume,
      note: `On this book the ticket's stop-limit is doing heavy lifting: the quoted spread was $${(wide220.ask - wide220.bid).toFixed(2)} wide, so a stop-market pays up to $${((wide220.ask - wide220.bid) * 100).toFixed(0)}/contract of pure slippage. The $146 and $160 rows get the stricter variant — at ${thin146.volume} and ${thin160.volume} contracts of day volume, alerts and manual limits only.`,
    },
    "dte-is-exposure": {
      kind: "short-put",
      entryDate: "2026-07-02",
      strike: 210,
      expiry: "2026-07-17",
      credit: jul17Put.mid,
      volume: jul17Put.volume,
      note: "This block defends B, the longer expiry that gave the downtrend time to reach it. A expired before the break and never needed its orders — fewer days at risk is itself a defense.",
    },
    "the-roll-that-mattered": {
      kind: "short-put",
      entryDate: "2026-06-18",
      strike: 287.5,
      expiry: "2026-06-26",
      credit: roll2875.mid,
      volume: roll2875.volume,
      note: "This block defends the $287.50 — the roll-up that turned a recovery into a fresh loss. The $270's identical orders would have sat unused: its strike was under the structure instead of on top of it.",
    },
    "cushion-beats-the-catalyst": {
      kind: "short-put",
      entryDate: "2026-07-07",
      strike: 200,
      expiry: "2026-07-17",
      credit: oversold200.mid,
      volume: oversold200.volume,
      note: `The May 28 $170 — the boringest row in the window — never came near its triggers, and the July 20 $170 squeaked by. The defensive orders only earn their keep on rows like this one, where "oversold" was the whole thesis.`,
    },
  }),
};
