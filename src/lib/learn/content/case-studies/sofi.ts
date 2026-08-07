// SOFI case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/SOFI.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/SOFI.json";
import { bars, barOn, findPut, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

const t = raw as V2Ticker;

// ── Case 1: the same strike, two outcomes ─────────────────────────────────
// 2026-06-17: the 17.5 put sold with SOFI *below* the strike (close 17.42).
const june175 = findPut(t, "2026-06-17", 17.5, "2026-06-26");
const june175Entry = barOn(t, "2026-06-17");
const june175Worst = barOn(t, "2026-06-23"); // low 16.72
const june175Expiry = barOn(t, "2026-06-26"); // close 17.88 — expired OTM

// 2026-07-14: same strike, same structure, opposite ending.
const july175 = findPut(t, "2026-07-14", 17.5, "2026-07-24");
const july175Entry = barOn(t, "2026-07-14");
const july175Breach = barOn(t, "2026-07-16"); // first close under the strike
const july175Worst = barOn(t, "2026-07-24"); // low 16.33
const july175Expiry = barOn(t, "2026-07-24"); // close 16.46 — 1.04 ITM

// Worst mark each trade printed, as a multiple of the credit collected.
const juneWorstIntrinsic = 17.5 - june175Worst.low;
const julyWorstIntrinsic = 17.5 - july175Worst.low;
const julyLoss = 17.5 - july175Expiry.close - july175.mid;

// ── Case 3: the stale quote (2026-08-04) ──────────────────────────────────
const aug17Stale = findPut(t, "2026-08-04", 17, "2026-08-14");
const aug17Prior = findPut(t, "2026-08-03", 17, "2026-08-14");
const aug175Fresh = findPut(t, "2026-08-04", 17.5, "2026-08-14");
const aug3Bar = barOn(t, "2026-08-03");
const aug4Bar = barOn(t, "2026-08-04");

// ── Case 4: four cents from assignment (2026-07-17) ───────────────────────
const july16 = findPut(t, "2026-07-17", 16, "2026-07-24");
const july165 = findPut(t, "2026-07-17", 16.5, "2026-07-24");
const july17Bar = barOn(t, "2026-07-17");

// ── Case 5: selling the capitulation (2026-07-30) ─────────────────────────
const july30Put = findPut(t, "2026-07-30", 15.5, "2026-08-07");
const july31Put = findPut(t, "2026-07-31", 15.5, "2026-08-07");
const capitulation = barOn(t, "2026-07-29"); // -8.9% day, close 15.25
// Size of that drop, unsigned — the prose always reads "fell X%".
const capDrop = Math.abs(
  ((capitulation.close - barOn(t, "2026-07-28").close) / barOn(t, "2026-07-28").close) * 100
);
const july30Bar = barOn(t, "2026-07-30");
const lastBar = t.prices[t.prices.length - 1]; // 2026-08-05

export const SOFI_CASES: Module = {
  id: "cs-sofi",
  title: "SOFI Case Studies",
  subtitle: "One strike, two endings — and the quote that never moved",
  icon: "🏦",
  color: "cyan-500",
  level: 2,
  track: "case-study",
  ticker: "SOFI",
  universe: "traded",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "same-strike-two-endings",
      title: "The same strike, two endings",
      subtitle: "What a stop would actually have cost you",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `The scanner sold the **SOFI $17.50 put** twice this summer. Same strike, same 0.24 delta, credits within three cents of each other. The two trades ended on opposite sides of zero.\n\n**Trade A — June 17.** SOFI closed at $${june175Entry.close} — *below* the strike. The scanner still offered $${june175.mid.toFixed(3)} for the June 26 expiry (delta ${june175.delta.toFixed(2)}, ${june175.aroc}% AROC, ${june175.volume?.toLocaleString()} contracts traded).\n\n**Trade B — July 14.** SOFI closed at $${july175Entry.close}, a comfortable ${(((july175Entry.close - 17.5) / july175Entry.close) * 100).toFixed(1)}% above the strike. Credit $${july175.mid.toFixed(2)} for the July 24 expiry (delta ${july175.delta.toFixed(2)}, ${july175.aroc}% AROC, ${july175.volume} contracts).\n\nB looks like the safer trade. It wasn't.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Trade A — June 17 entry, June 26 expiry (real bars)",
            bars: bars(t, "2026-06-15", "2026-06-26"),
            lines: [{ price: 17.5, label: "17.50 strike", color: "sky" }],
            markers: [
              { date: "2026-06-17", label: "entry", color: "violet" },
              { date: "2026-06-23", label: `low ${june175Worst.low}`, color: "red", below: true },
              { date: "2026-06-26", label: `exp ${june175Expiry.close}`, color: "emerald" },
            ],
            caption: `Underwater from the first minute — the June 23 low of $${june175Worst.low} put $${juneWorstIntrinsic.toFixed(2)} of intrinsic value into the contract, ${(juneWorstIntrinsic / june175.mid).toFixed(1)}× the credit collected. Then it closed at $${june175Expiry.close} and expired worthless. Full $${(june175.mid * 100).toFixed(2)} kept.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Trade B — July 14 entry, July 24 expiry (real bars)",
            bars: bars(t, "2026-07-06", "2026-07-24"),
            lines: [{ price: 17.5, label: "17.50 strike", color: "sky" }],
            markers: [
              { date: "2026-07-14", label: "entry", color: "violet" },
              { date: "2026-07-16", label: "breach", color: "amber", below: true },
              { date: "2026-07-24", label: `exp ${july175Expiry.close}`, color: "red", below: true },
            ],
            caption: `SOFI closed under the strike on July 16 ($${july175Breach.close}) and closed above it only once more before expiry — $${barOn(t, "2026-07-21").close} on July 21, a single session of hope that gave a manager one clean exit. Expiry: $${july175Expiry.close}, or $${(17.5 - july175Expiry.close).toFixed(2)}/sh in the money against $${july175.mid.toFixed(2)} collected — a $${(julyLoss * 100).toFixed(0)} loss per contract.`,
          },
        },
        {
          type: "text",
          content: `Now run the counterfactual. A common rule is **buy back at 2× the credit**. The dataset doesn't re-scan either contract after entry, so we can't quote a fill — but intrinsic value alone is a hard floor on what the option was worth, and that we can measure:\n\n• **Trade A** touched $${juneWorstIntrinsic.toFixed(2)} of intrinsic on June 23 — **${(juneWorstIntrinsic / june175.mid).toFixed(1)}× the credit**. A 2× stop was through.\n• **Trade B** touched $${julyWorstIntrinsic.toFixed(2)} on July 24 — **${(julyWorstIntrinsic / july175.mid).toFixed(1)}× the credit**. Also through.\n\nSo the stop fires on *both*. Assume it fills right at 2× credit:\n\n• **Trade A** — no stop: **+$${(june175.mid * 100).toFixed(2)}**. With the stop: −$${(june175.mid * 100).toFixed(2)}.\n• **Trade B** — no stop: −$${(julyLoss * 100).toFixed(2)}. With the stop: −$${(july175.mid * 100).toFixed(2)}.\n• **Both trades** — no stop: **−$${((julyLoss - june175.mid) * 100).toFixed(2)}**. With the stop: **−$${((june175.mid + july175.mid) * 100).toFixed(2)}**.\n\nThe stop saved $${((julyLoss - july175.mid) * 100).toFixed(2)} on the loser, gave back $${(june175.mid * 2 * 100).toFixed(2)} on the winner, and finished **$${(((june175.mid + july175.mid) - (julyLoss - june175.mid)) * 100).toFixed(2)} worse** across the pair.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "A stop is insurance, and insurance has a premium. On a two-trade sample the premium can exceed the payout — that is not evidence the stop is wrong. What a stop buys is protection from the tail, and SOFI's summer simply didn't contain one. (Open the MRVL case studies for a trade that lost 6.8× its credit.)",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sofi-ss-1",
              question: `Trade A was entered with SOFI at $${june175Entry.close} against a $17.50 strike. What does that mean at entry?`,
              options: [
                "The put was out of the money and safe",
                "The put was already in the money — the credit included intrinsic value, not just time value",
                "Delta must have been near zero",
                "The trade could not be assigned",
              ],
              correctIndex: 1,
              explanation: `Strike $17.50 above a $${june175Entry.close} close means the put was $${(17.5 - june175Entry.close).toFixed(2)} in the money on day one. Part of that $${june175.mid.toFixed(3)} credit was intrinsic value you were simply holding, not premium you were earning. It worked out only because SOFI closed at $${june175Expiry.close} nine days later.`,
            },
            {
              id: "sofi-ss-2",
              question: "Across these two trades, a 2×-credit stop produced a worse result than no stop at all. What is the right conclusion?",
              options: [
                "Stops don't work on short puts",
                "The stop level was too tight and should be removed",
                "Two trades is not a sample — a stop trades many small certain losses for protection against the rare large one, and this window contained no large one",
                "You should only use stops on winning trades",
              ],
              correctIndex: 2,
              explanation:
                "The distribution matters more than the average. A short put's losses are unbounded and its gains are capped at the credit, so the trades that decide your year are the tail losses. Judging a stop on a window with no tail is like judging fire insurance on a year without a fire.",
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "place-the-stop",
      title: "You place the stop",
      subtitle: "The July 14 trade, before you know how it ends",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Rewind trade B. It's **July 14**, SOFI closed at $${july175Entry.close}, and you've just sold the **$17.50 put expiring July 24** for $${july175.mid.toFixed(2)} (delta ${july175.delta.toFixed(2)}, ${july175.aroc}% AROC). The catalyst: *"${july175.catalyst}"*\n\nOne thing worth noting before you decide: this row shows **${july175.volume} contracts** of volume and a $${july175.bid.toFixed(2)} / $${july175.ask.toFixed(2)} market — a ${(((july175.ask - july175.bid) / july175.mid) * 100).toFixed(0)}% spread. Getting out will not be free.\n\nSet your stop on the underlying, then reveal what happened.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-07-06", "2026-07-24"),
            visibleUntil: "2026-07-16",
            strike: 17.5,
            credit: july175.mid,
            entryDate: "2026-07-14",
            expiry: "2026-07-24",
            guide: { min: 17.0, max: 17.5 },
            explanation: `There was no support thesis to lean on here — the catalyst cited an IV squeeze, not a level. That leaves the strike itself as the line: below $17.50 you stop earning time value and start paying intrinsic. SOFI closed at $${july175Breach.close} on July 16, two sessions in, and closed back above $17.50 exactly once before expiry ($${barOn(t, "2026-07-21").close} on July 21) — the only session that offered a clean exit. It ground to $${july175Expiry.close} by expiry — $${(17.5 - july175Expiry.close).toFixed(2)}/sh ITM, a $${(julyLoss * 100).toFixed(0)} loss against $${(july175.mid * 100).toFixed(0)} collected. A stop at the strike would have cost roughly the credit; waiting cost ${(julyLoss / july175.mid).toFixed(1)}× it.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content:
            "When the entry has no level in it, the strike is your level. A short put that closes in the money has stopped being an income trade and started being a leveraged long — decide which one you're in before the chart decides for you.",
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "the-quote-that-never-moved",
      title: "The quote that never moved",
      subtitle: "Two rows from the same scan — one of them is impossible",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**August 4, 2026.** SOFI closed at $${aug4Bar.close}, up ${(((aug4Bar.close - aug3Bar.close) / aug3Bar.close) * 100).toFixed(1)}% from the day before. The scan surfaced two puts on the same August 14 expiry. Pick one.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which August 14 put do you sell?",
            goal: "Income — you want the credit you see on the screen to be the credit you actually get",
            a: {
              label: "A · $17 put",
              date: "2026-08-04",
              side: "put",
              strike: 17,
              expiry: "2026-08-14",
              dte: aug17Stale.dte,
              bid: aug17Stale.bid,
              ask: aug17Stale.ask,
              mid: aug17Stale.mid,
              delta: aug17Stale.delta,
              iv: aug17Stale.iv,
              aroc: aug17Stale.aroc,
              volume: aug17Stale.volume,
              juiciness: aug17Stale.juiciness,
              note: aug17Stale.catalyst,
            },
            b: {
              label: "B · $17.50 put",
              date: "2026-08-04",
              side: "put",
              strike: 17.5,
              expiry: "2026-08-14",
              dte: aug175Fresh.dte,
              bid: aug175Fresh.bid,
              ask: aug175Fresh.ask,
              mid: aug175Fresh.mid,
              delta: aug175Fresh.delta,
              iv: aug175Fresh.iv,
              aroc: aug175Fresh.aroc,
              volume: aug175Fresh.volume,
              juiciness: aug175Fresh.juiciness,
              note: aug175Fresh.catalyst,
            },
            correct: "b",
            explanation: `A shows the higher AROC (${aug17Stale.aroc}% vs ${aug175Fresh.aroc}%), and A is the row you should refuse. Look at the two mids: the **$17 put is quoted at $${aug17Stale.mid.toFixed(2)} while the $17.50 put — a strictly more valuable contract, same expiry — is quoted at $${aug175Fresh.mid.toFixed(3)}.** A put with a lower strike cannot be worth more than one with a higher strike. One of those quotes is not real, and A tells you which: **${aug17Stale.volume} contracts traded**. B traded ${aug175Fresh.volume?.toLocaleString()}.`,
          },
        },
        {
          type: "text",
          content: `Compare row A against the *previous* day's scan of the exact same contract (Aug 3 → Aug 4):\n\n• **SOFI close** — $${aug3Bar.close} → $${aug4Bar.close}.\n• **Bid / ask** — $${aug17Prior.bid.toFixed(2)} / $${aug17Prior.ask.toFixed(2)} → $${aug17Stale.bid.toFixed(2)} / $${aug17Stale.ask.toFixed(2)}.\n• **Delta** — ${aug17Prior.delta.toFixed(4)} → ${aug17Stale.delta.toFixed(4)}.\n• **IV** — ${(aug17Prior.iv * 100).toFixed(2)}% → ${(aug17Stale.iv * 100).toFixed(2)}%.\n• **Volume** — ${aug17Prior.volume?.toLocaleString()} → ${aug17Stale.volume}.\n• **AROC** — **${aug17Prior.aroc}% → ${aug17Stale.aroc}%.**\n\nEvery market input is byte-identical across a day in which SOFI rose $${(aug4Bar.close - aug3Bar.close).toFixed(2)}. The quote is stale. And yet the AROC *rose* by ${((aug17Stale.aroc ?? 0) - (aug17Prior.aroc ?? 0)).toFixed(1)} points — because AROC annualizes the credit over the days to expiry, and the clock ticked from ${aug17Prior.dte} days to ${aug17Stale.dte}. Same frozen premium ÷ a shorter holding period = a bigger number.`,
        },
        {
          type: "callout",
          style: "warning",
          content:
            "A ranking column is only as good as the quote underneath it. Before trusting an AROC, check three things the scanner can't check for you: is there volume, is the spread payable, and does this strike price sensibly against its neighbours?",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sofi-sq-1",
              question: `Row A's AROC went from ${aug17Prior.aroc}% to ${aug17Stale.aroc}% while its bid, ask, delta and IV did not change at all. Why?`,
              options: [
                "SOFI's rally increased the option's value",
                "Implied volatility fell, raising the annualized return",
                "AROC annualizes the same credit over one fewer day to expiry — the number moved because the calendar moved, not the market",
                "The scanner recalculated delta",
              ],
              correctIndex: 2,
              explanation: `AROC ≈ (credit ÷ collateral) × (365 ÷ days held). Credit ($${aug17Stale.mid.toFixed(2)}) and collateral ($17 × 100) were unchanged; DTE went ${aug17Prior.dte} → ${aug17Stale.dte}. Shrinking the denominator inflates the annualized figure on a premium nobody was actually offering.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "four-cents",
      title: "Four cents from a clean expiry",
      subtitle: "Two strikes, near-identical P&L, completely different Monday",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**July 17**, SOFI at $${july17Bar.close}. The scan showed two puts on the July 24 expiry:\n\n• **$16 put** — $${july16.mid.toFixed(2)} credit, ${july16.aroc}% AROC, ${july16.volume?.toLocaleString()} contracts, ${(((july17Bar.close - 16) / july17Bar.close) * 100).toFixed(1)}% cushion\n• **$16.50 put** — $${july165.mid.toFixed(3)} credit, ${july165.aroc}% AROC, ${july165.volume?.toLocaleString()} contracts, juiciness ${july165.juiciness} and flagged **${july165.priority} priority** — the better-ranked row\n\nSOFI closed expiry week at **$${july175Expiry.close}**.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "One week, two strikes (real bars)",
            bars: bars(t, "2026-07-17", "2026-07-31"),
            lines: [
              { price: 16.5, label: "16.50 strike", color: "amber" },
              { price: 16, label: "16.00 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-17", label: "entry", color: "violet" },
              { date: "2026-07-24", label: `exp ${july175Expiry.close}`, color: "amber" },
              { date: "2026-07-29", label: `${capitulation.close}`, color: "red", below: true },
            ],
            shadeAfter: "2026-07-24",
            caption: `The $16 put expired $${(july175Expiry.close - 16).toFixed(2)} out of the money — clean, $${(july16.mid * 100).toFixed(0)} kept. The $16.50 put finished $${(16.5 - july175Expiry.close).toFixed(2)} in the money: net P&L $${((july165.mid - (16.5 - july175Expiry.close)) * 100).toFixed(2)}, so almost exactly the same money — but you're now long 100 shares at an effective $${(16.5 - july165.mid).toFixed(3)} basis. Three sessions later SOFI closed $${capitulation.close}.`,
          },
        },
        {
          type: "text",
          content: `Line the two up honestly:\n\n• **$16 put** — $${(july16.mid * 100).toFixed(0)} credit, settled $${(july175Expiry.close - 16).toFixed(2)} OTM, cash P&L **+$${(july16.mid * 100).toFixed(2)}**, position after: flat.\n• **$16.50 put** — $${(july165.mid * 100).toFixed(0)} credit, settled $${(16.5 - july175Expiry.close).toFixed(2)} ITM, cash P&L **+$${((july165.mid - (16.5 - july175Expiry.close)) * 100).toFixed(2)}**, position after: long 100 shares.\n\nThe cash difference is **$${((july16.mid - (july165.mid - (16.5 - july175Expiry.close))) * 100).toFixed(2)}**. The position difference is everything. On July 29 SOFI fell ${capDrop.toFixed(1)}% to $${capitulation.close} — those assigned shares were ${(((16.5 - july165.mid - capitulation.close) / (16.5 - july165.mid)) * 100).toFixed(1)}% underwater against the effective basis. By August 5 SOFI was back to $${lastBar.close.toFixed(2)}, well above it.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sofi-fc-1",
              question: "Both trades made roughly the same cash. What is the actual difference between them?",
              options: [
                "Nothing — identical P&L means identical trades",
                "Assignment is a step function: the $16.50 put converted a closed trade into an open 100-share position with its own risk, on a settle that was 4 cents from going the other way",
                "The $16.50 put was riskier because its delta was higher",
                "The $16 put was better because its AROC was lower",
              ],
              correctIndex: 1,
              explanation: `Four cents decided whether you woke up flat or long 100 shares into a week that included an ${capDrop.toFixed(1)}% down day. If you'd be happy owning SOFI at $${(16.5 - july165.mid).toFixed(2)}, that's a fine outcome — this is a wheel ticker. If you were sizing for cash and not for shares, you just took on exposure you didn't price.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "selling-the-capitulation",
      title: "Selling the capitulation",
      subtitle: "The lowest AROC on the board was the best trade of the summer",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**July 29** SOFI fell ${capDrop.toFixed(1)}% to $${capitulation.close} and printed $${capitulation.low} intraday — the lowest price anywhere in the window. The next morning, with SOFI back at $${july30Bar.close}, the scanner offered the **$15.50 put expiring August 7** for **$${july30Put.mid.toFixed(2)}** — delta ${july30Put.delta.toFixed(2)}, RSI ${july30Put.rsi}, ${july30Put.volume?.toLocaleString()} contracts traded, and only **${july30Put.aroc}% AROC**.\n\nThat AROC is a *third lower* than what the same scanner was quoting on SOFI in June (the June 17 trade in case 1 showed ${june175.aroc}%). Low AROC is what a strike ${(((july30Bar.close - 15.5) / july30Bar.close) * 100).toFixed(1)}% below a washed-out price looks like.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Strike under the capitulation low (real bars)",
            bars: bars(t, "2026-07-20", "2026-08-05"),
            lines: [
              { price: 15.5, label: "15.50 strike", color: "emerald" },
              { price: capitulation.low, label: `July 29 low ${capitulation.low}`, color: "amber" },
            ],
            markers: [
              { date: "2026-07-29", label: `${capitulation.close}`, color: "red", below: true },
              { date: "2026-07-30", label: "entry", color: "violet" },
              {
                date: "2026-08-03",
                label: `+${(((barOn(t, "2026-08-03").close - barOn(t, "2026-07-31").close) / barOn(t, "2026-07-31").close) * 100).toFixed(1)}%`,
                color: "emerald",
              },
            ],
            caption: `Entry day itself printed a $${july30Bar.low} low — $${(15.5 - july30Bar.low).toFixed(2)} through the strike for part of one session. After that it never came close: SOFI rallied to $${barOn(t, "2026-08-03").close} on August 3 and closed the dataset at $${lastBar.close.toFixed(2)}.`,
          },
        },
        {
          type: "text",
          content: `The dataset ends **August 5**, two sessions before this contract's August 7 expiry, so we can't call it settled. What we can say is that it went into those last two days $${(lastBar.close - 15.5).toFixed(2)} out of the money — ${(((lastBar.close - 15.5) / lastBar.close) * 100).toFixed(1)}% of clearance on a contract with ${july30Put.dte} days of life at entry.\n\nOne day of patience cost real money, in the other direction: the **July 31** scan of the identical contract paid only $${july31Put.mid.toFixed(3)} — ${(((july30Put.mid - july31Put.mid) / july30Put.mid) * 100).toFixed(0)}% less credit for the same risk, because IV had already deflated from ${(july30Put.iv * 100).toFixed(1)}% to ${(july31Put.iv * 100).toFixed(1)}%.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "The trades that read worst on the ranking screen — low AROC, unglamorous strike, entered when the chart looks broken — are frequently the ones with the most margin for error. AROC measures what you're paid; distance to a tested low measures how likely you are to keep it.",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "sofi-cap-1",
              question: `This entry paid ${july30Put.aroc}% AROC versus ${june175.aroc}% for the June trade in case 1. Why is the lower number here not a worse deal?`,
              options: [
                "AROC is unreliable and should be ignored",
                "The June trade had a longer holding period",
                "Yield is compensation for risk: the June strike sat above the stock price, this one sat below a just-tested capitulation low — you're paid less because you're taking on less",
                "Implied volatility was higher in July",
              ],
              correctIndex: 2,
              explanation: `The June 17 trade collected ${june175.aroc}% for a strike the stock was already below. This one collected ${july30Put.aroc}% for a strike $${(july30Bar.close - 15.5).toFixed(2)} under a price that had just been stress-tested by an ${capDrop.toFixed(1)}% down day. Comparing AROC across setups without comparing where the strike sits is comparing the payment while ignoring the job.`,
            },
          ],
        },
      ],
    },
  ],
};
