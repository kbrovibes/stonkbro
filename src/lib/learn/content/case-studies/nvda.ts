// NVDA case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/NVDA.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.
//
// Opportunity universe: NVDA isn't traded here, but the scanner surfaced it on
// 41 scan days across the window — more than most tickers actually wheeled.

import raw from "@/lib/learn/v2-data/NVDA.json";
import { bars, barOn, findPut, findCall, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// How often the scanner surfaced NVDA at all, straight off the dataset.
const scanDays = new Set(t.snapshots.map((s) => s.date)).size;
const optionRows = t.snapshots.reduce(
  (n, s) => n + s.puts.length + s.calls.length + (s.leaps?.length ?? 0),
  0
);

// ── Case 1: three quiet winners ────────────────────────────────────────────
const may205 = findPut(t, "2026-05-27", 205, "2026-06-03");
const jul192 = findPut(t, "2026-07-09", 192.5, "2026-07-17");
const jul195 = findPut(t, "2026-07-17", 195, "2026-07-24");
const winnerCredits = may205.mid + jul192.mid + jul195.mid;

// ── Case 2: the 220 put into the June slide ────────────────────────────────
const jun220 = findPut(t, "2026-06-02", 220, "2026-06-12");
const jun220Entry = barOn(t, "2026-06-02");
const jun220Expiry = barOn(t, "2026-06-12");
const juneWorstLow = barOn(t, "2026-06-09").low; // 199.34
const jun220Loss = (220 - jun220Expiry.close - jun220.mid) * 100;

// ── Case 3: two strikes, one scan (2026-07-21) ─────────────────────────────
const jul195x = findPut(t, "2026-07-21", 195, "2026-07-31");
const jul200x = findPut(t, "2026-07-21", 200, "2026-07-31");
const julyEntry = barOn(t, "2026-07-21");
const julyLow = barOn(t, "2026-07-29").low; // 190.01
const julyExpiry = barOn(t, "2026-07-31"); // 200.75

// ── Case 4: the 205 put that had to be decided ─────────────────────────────
const jul205 = findPut(t, "2026-07-22", 205, "2026-07-31");
const rollTo = findPut(t, "2026-07-31", 195, "2026-08-07");
const assignedBasis = 205 - jul205.mid;
const lastBar = t.prices[t.prices.length - 1]; // 2026-08-05

// ── Case 5: the long call the scanner scored 76 ────────────────────────────
const may225c = findCall(t, "2026-05-06", 225, "2026-07-17");
const callEntry = barOn(t, "2026-05-06");
const callBreakeven = 225 + may225c.mid;
const windowTop = barOn(t, "2026-05-14"); // 235.74 — the highest close in the window
const callExpiry = barOn(t, "2026-07-17");

export const NVDA_CASES: Module = {
  id: "cs-nvda",
  title: "NVDA Case Studies",
  subtitle: "The mega-cap that paid boring — and punished everyone who reached",
  icon: "🔭",
  color: "purple-500",
  level: 2,
  track: "case-study",
  ticker: "NVDA",
  universe: "opportunity",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "boring-wins",
      title: "The boring wins you weren't watching",
      subtitle: "Three real one-week puts, three expirations, zero drama",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `NVDA was never in the traded book, but the scanner kept putting it on the list — ${optionRows} option rows across ${scanDays} scan days between May and August 2026. Nothing about it looked exciting: the deepest drawdown in the whole window was **-19.4%**, and the stock started at $${t.prices[0].close} and finished at $${lastBar.close}.\n\nThat's exactly why it kept working. Three real short puts, taken straight off the scan:\n\n• **May 27** — $${may205.strike} put, ${may205.dte} DTE, **$${may205.mid.toFixed(2)}** credit (delta ${may205.delta.toFixed(2)}, ${may205.aroc}% AROC, juiciness ${may205.juiciness}). NVDA closed $${barOn(t, "2026-05-27").close}; at expiry, $${barOn(t, "2026-06-03").close}.\n• **July 9** — $${jul192.strike} put, ${jul192.dte} DTE, **$${jul192.mid.toFixed(2)}** credit (delta ${jul192.delta.toFixed(2)}, ${jul192.aroc}% AROC). Closed $${barOn(t, "2026-07-09").close}; at expiry, $${barOn(t, "2026-07-17").close}.\n• **July 17** — $${jul195.strike} put, ${jul195.dte} DTE, **$${jul195.mid.toFixed(2)}** credit (delta ${jul195.delta.toFixed(2)}, ${jul195.aroc}% AROC, ${jul195.volume?.toLocaleString()} contracts traded that day). Closed $${barOn(t, "2026-07-17").close}; at expiry, $${barOn(t, "2026-07-24").close}.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Two of the three, back to back (real bars)",
            bars: bars(t, "2026-07-08", "2026-07-24"),
            lines: [
              { price: 192.5, label: "192.5 strike", color: "emerald" },
              { price: 195, label: "195 strike", color: "sky" },
            ],
            markers: [
              { date: "2026-07-09", label: "sell 192.5", color: "violet" },
              { date: "2026-07-17", label: "exp / sell 195", color: "amber", below: true },
              { date: "2026-07-24", label: "exp", color: "emerald" },
            ],
            caption: `Neither put closed in the money. The 192.5 came closest on July 17 (low $${barOn(t, "2026-07-17").low}) — ${(((barOn(t, "2026-07-17").low - 192.5) / 192.5) * 100).toFixed(1)}% of cushion left. Total kept across all three trades: $${(winnerCredits * 100).toFixed(0)} per contract.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Every one of these strikes sat **${pctOtm(205, barOn(t, "2026-05-27").close)}–${pctOtm(192.5, barOn(t, "2026-07-09").close)}% out of the money** with delta near 0.20 and a week or less to run. That's the shape of the trade that works on a large, liquid, slow-moving name: small edge, taken often, on a chart that doesn't need you to be right about direction.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nvda-bw-1",
              question: `All three winners had AROC between ${Math.min(may205.aroc ?? 0, jul192.aroc ?? 0, jul195.aroc ?? 0)}% and ${Math.max(may205.aroc ?? 0, jul192.aroc ?? 0, jul195.aroc ?? 0)}%. Why is that band the interesting one?`,
              options: [
                "It's the highest AROC available anywhere",
                "It's high enough to be worth the collateral but low enough that the market isn't pricing a specific event — a 0.20-delta strike on a liquid mega-cap",
                "AROC below 60% is always safer",
                "AROC has no relationship to risk",
              ],
              correctIndex: 1,
              explanation:
                "AROC is annualized yield, and yield is compensation for risk. On NVDA these numbers came from ordinary time decay on a 0.20-delta strike. When you see triple-digit AROC on the same kind of contract, the market is telling you it expects a much bigger move — not that you found free money.",
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "the-220-put",
      title: "The 220 put and the 24-hour thesis",
      subtitle: "Sold into a 6% up day, underwater by the next close",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 1, 2026**: NVDA jumped **+6.3%** to $${barOn(t, "2026-06-01").close}. The next morning the scanner offered the **$220 put expiring June 12** for **$${jun220.mid.toFixed(2)}** — delta ${jun220.delta.toFixed(2)}, ${jun220.aroc}% AROC, juiciness ${jun220.juiciness}, at ${(jun220.iv * 100).toFixed(0)}% implied vol.\n\nThe catalyst read: *"${jun220.catalyst}"*\n\nNVDA closed $${jun220Entry.close} that day. The strike was only **${pctOtm(220, jun220Entry.close)}% out of the money** — the thinnest cushion of any entry in this dataset. One session later NVDA closed $${barOn(t, "2026-06-03").close}. The put was already in the money.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-05-26", "2026-06-12"),
            visibleUntil: "2026-06-03",
            strike: 220,
            credit: jun220.mid,
            entryDate: "2026-06-02",
            expiry: "2026-06-12",
            guide: { min: 212, max: 216 },
            explanation: `A $${jun220.mid.toFixed(2)} credit on a 0.23-delta put roughly triples in value once the underlying trades ~$6–8 through the strike. That puts the standard "buy it back at 2–3× credit" rule right around $212–216 on the chart — which is also where NVDA's late-May base ($${barOn(t, "2026-05-27").low} on May 27) sat. NVDA broke that shelf on June 5, bottomed at $${juneWorstLow} on June 9, and closed expiry at $${jun220Expiry.close}.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Held to expiry, this trade lost **$${jun220Loss.toFixed(0)} per contract** against $${(jun220.mid * 100).toFixed(0)} of premium. That's ${Math.floor(jun220Loss / (jun220.mid * 100))} of the winners from the previous lesson, erased by one entry.`,
        },
        {
          type: "text",
          content: `What separated this from the three winners?\n• **The cushion.** ${pctOtm(220, jun220Entry.close)}% OTM versus ${pctOtm(195, barOn(t, "2026-07-17").close)}–${pctOtm(192.5, barOn(t, "2026-07-09").close)}% on the winners. Same delta band, far less room.\n• **The entry point.** Sold the session after a +6.3% day. The winners were all sold *into* or *after* weakness.\n• **The catalyst.** "IV expanding" is a description of the option, not a reason to be short the stock. Compare it to the winners' catalysts, which named a price level below the strike.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nvda-220-1",
              question: `The catalyst said premium was "rich at ${(jun220.iv * 100).toFixed(0)}% IV". What does rich IV actually buy you?`,
              options: [
                "A higher probability the put expires worthless",
                "More premium as compensation for a wider expected move — the payout and the risk rise together",
                "Protection against assignment",
                "A guaranteed profit if you hold to expiry",
              ],
              correctIndex: 1,
              explanation:
                "Implied volatility is the market's price for the size of the move it expects. Elevated IV raises your credit and the odds you get run over, in roughly equal measure. It is a reason to size smaller and sit further OTM — not a reason to sell a strike 1.3% away.",
            },
            {
              id: "nvda-220-2",
              question: "You sold this put and NVDA closed below the strike the very next session. What's the decision?",
              options: [
                "Nothing — you have 9 days left, let theta work",
                "Double down at a lower strike to average the credit",
                "The thesis (a squeeze resolving upward) is already wrong; either close for a small loss or have a pre-set level where you will",
                "Wait for assignment, it's a good company",
              ],
              correctIndex: 2,
              explanation: `Time only helps when the direction hasn't broken. Here the trade was ITM on day two and NVDA fell another $${(barOn(t, "2026-06-03").close - juneWorstLow).toFixed(2)} before it bottomed. Deciding your exit *after* you're losing is how a $${(jun220.mid * 100).toFixed(0)} trade becomes a $${jun220Loss.toFixed(0)} one.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "five-points-of-cushion",
      title: "Five points of cushion, sixteen cents",
      subtitle: "Two strikes off the same July 21 scan",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**July 21, 2026**, NVDA at $${julyEntry.close}. The scanner returned two puts on the same expiry, ${jul195x.dte} days out. The AROC column ranked them almost identically — ${jul195x.aroc}% versus ${jul200x.aroc}%. Pick one.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you sell?",
            goal: "Income — collect the credit, avoid assignment",
            a: {
              label: `A · $${jul195x.strike} put`,
              date: "2026-07-21",
              side: "put",
              strike: jul195x.strike,
              expiry: jul195x.expiry,
              dte: jul195x.dte,
              bid: jul195x.bid,
              ask: jul195x.ask,
              mid: jul195x.mid,
              delta: jul195x.delta,
              iv: jul195x.iv,
              aroc: jul195x.aroc,
              volume: jul195x.volume,
              juiciness: jul195x.juiciness,
              note: jul195x.catalyst,
            },
            b: {
              label: `B · $${jul200x.strike} put`,
              date: "2026-07-21",
              side: "put",
              strike: jul200x.strike,
              expiry: jul200x.expiry,
              dte: jul200x.dte,
              bid: jul200x.bid,
              ask: jul200x.ask,
              mid: jul200x.mid,
              delta: jul200x.delta,
              iv: jul200x.iv,
              aroc: jul200x.aroc,
              volume: jul200x.volume,
              juiciness: jul200x.juiciness,
              note: jul200x.catalyst,
            },
            correct: "a",
            explanation: `B pays $${(jul200x.mid - jul195x.mid).toFixed(2)} more per share — ${(((jul200x.mid - jul195x.mid) / jul195x.mid) * 100).toFixed(0)}% more credit for giving up 5 full points of strike. NVDA then fell to $${julyLow} on July 29 and closed expiry at $${julyExpiry.close}. Both survived: A finished $${(julyExpiry.close - jul195x.strike).toFixed(2)} clear, B by $${(julyExpiry.close - jul200x.strike).toFixed(2)}. But at the July 29 low, B was $${(jul200x.strike - julyLow).toFixed(2)}/share underwater versus A's $${(jul195x.strike - julyLow).toFixed(2)} — and B was two sessions from expiry when it happened.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Both strikes were tested (real bars)",
            bars: bars(t, "2026-07-17", "2026-08-05"),
            lines: [
              { price: 195, label: "A: 195", color: "emerald" },
              { price: 200, label: "B: 200", color: "amber" },
            ],
            markers: [
              { date: "2026-07-21", label: "entry", color: "violet" },
              { date: "2026-07-29", label: `low ${julyLow}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${julyExpiry.close}`, color: "sky" },
            ],
            shadeAfter: "2026-07-31",
            caption: `The $${jul200x.strike} strike finished $${(julyExpiry.close - jul200x.strike).toFixed(2)} out of the money — one bad Friday from assignment. The shaded region is what happened next: NVDA closed at $${lastBar.close} on August 5.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `When two candidates show nearly the same AROC, the ranking column has told you nothing. Read the strike ladder instead: which one has more room before you're wrong, and how many days does it have to be wrong in?`,
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "roll-or-take-the-shares",
      title: "Expiry Friday, $4 in the money",
      subtitle: "The roll the scanner actually offered that day",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `A day after the trade in the last lesson, on **July 22** (NVDA $${barOn(t, "2026-07-22").close}), the scanner offered the **$${jul205.strike} put expiring July 31** for **$${jul205.mid.toFixed(2)}** — delta ${jul205.delta.toFixed(2)}, ${jul205.aroc}% AROC, ${jul205.volume?.toLocaleString()} contracts of volume.\n\nBy expiry Friday NVDA was at **$${julyExpiry.close}**: $${(jul205.strike - julyExpiry.close).toFixed(2)} per share in the money, a gross loss of $${((jul205.strike - julyExpiry.close - jul205.mid) * 100).toFixed(0)} per contract after the credit. Two real options were on the table.`,
        },
        {
          type: "text",
          content: `**Take assignment** at $${jul205.strike}. Effective cost basis $${assignedBasis.toFixed(2)} with the stock at $${julyExpiry.close}.\n\n**Roll down and out.** The scanner's own July 31 list included the **$${rollTo.strike} put expiring ${rollTo.expiry}** at **$${rollTo.mid.toFixed(2)}** (delta ${rollTo.delta.toFixed(2)}, ${rollTo.volume?.toLocaleString()} contracts, ${rollTo.aroc}% AROC). Closing the $${jul205.strike} for its $${(jul205.strike - julyExpiry.close).toFixed(2)} of intrinsic and selling that one is a net debit of about $${(jul205.strike - julyExpiry.close - rollTo.mid).toFixed(2)}/share — and it moves your obligation ${jul205.strike - rollTo.strike} points lower.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "What the next week did (real bars)",
            bars: bars(t, "2026-07-17", "2026-08-05"),
            lines: [
              { price: jul205.strike, label: "205 strike", color: "amber" },
              { price: Number(assignedBasis.toFixed(2)), label: "assigned basis", color: "sky" },
              { price: rollTo.strike, label: "rolled to 195", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-31", label: "decision", color: "violet", below: true },
              { date: "2026-08-05", label: `${lastBar.close}`, color: "emerald" },
            ],
            caption: `NVDA closed at $${lastBar.close} on August 5, the last bar in this dataset — ${(((lastBar.close - assignedBasis) / assignedBasis) * 100).toFixed(1)}% above the assignment basis of $${assignedBasis.toFixed(2)}, and ${(((lastBar.close - rollTo.strike) / rollTo.strike) * 100).toFixed(1)}% above the rolled $${rollTo.strike} strike. The ${rollTo.expiry} expiry falls after the data ends, so the roll's final outcome isn't observable here — only that it was comfortably out of the money two days before it.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nvda-roll-1",
              question: `The roll cost a net debit of roughly $${(jul205.strike - julyExpiry.close - rollTo.mid).toFixed(2)}/share. What did that buy?`,
              options: [
                "It erased the loss on the original put",
                "Nothing — rolling is always just deferring a loss",
                `${jul205.strike - rollTo.strike} points of lower strike and ${rollTo.dte} more days, at the cost of realizing part of the loss and staying short`,
                "A guaranteed profit if NVDA recovers",
              ],
              correctIndex: 2,
              explanation: `A roll doesn't undo a loss — the $${(jul205.strike - julyExpiry.close).toFixed(2)} of intrinsic you buy back is real money. What it buys is a better strike and more time, paid for with new premium. It only makes sense if you'd sell that new contract on its own merits today, which the $${rollTo.strike}/${rollTo.expiry} at delta ${rollTo.delta.toFixed(2)} arguably was.`,
            },
            {
              id: "nvda-roll-2",
              question: "Both paths worked on this particular price path. What made assignment the *riskier* choice at the time?",
              options: [
                "Assignment always costs more in fees",
                "It converts a defined 9-day obligation into an open-ended stock position — on a ticker outside the traded book, with no plan to own it",
                "Assigned shares can't be sold",
                "Rolling is guaranteed to be cheaper",
              ],
              correctIndex: 1,
              explanation:
                "Assignment is a fine outcome when the ticker is one you sized to own. NVDA wasn't in the book — it was a yield trade. Taking 100 shares of something you never intended to hold turns a small, bounded loss into an unbounded position that has to be managed.",
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "right-for-eight-days",
      title: "Right for eight days, wrong at expiry",
      subtitle: "The 72-day call the scanner scored 76",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Not every scan row is a put. On **May 6, 2026** — NVDA at $${callEntry.close} — the scanner surfaced a long call: **$${may225c.strike} strike, expiring ${may225c.expiry}**, ${may225c.dte} days out, at **$${may225c.mid.toFixed(2)}** (delta ${may225c.delta.toFixed(2)}, ${(may225c.iv * 100).toFixed(0)}% IV, ${may225c.volume?.toLocaleString()} contracts traded, score ${may225c.score}).\n\nCatalyst: *"${may225c.catalyst}"*\n\nDo the arithmetic before the chart. Paying $${may225c.mid.toFixed(2)} for a $${may225c.strike} strike means NVDA has to be above **$${callBreakeven.toFixed(2)}** at expiry — **+${(((callBreakeven - callEntry.close) / callEntry.close) * 100).toFixed(1)}%** from the entry price — just to get your money back.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Above breakeven for one session out of fifty (real bars)",
            bars: bars(t, "2026-05-06", "2026-07-17"),
            lines: [
              { price: may225c.strike, label: "225 strike", color: "sky" },
              { price: Number(callBreakeven.toFixed(2)), label: `breakeven ${callBreakeven.toFixed(2)}`, color: "amber" },
            ],
            markers: [
              { date: "2026-05-06", label: "buy", color: "violet" },
              { date: "2026-05-14", label: `${windowTop.close}`, color: "emerald" },
              { date: "2026-07-17", label: "exp", color: "red", below: true },
            ],
            caption: `NVDA cleared breakeven on May 14 at $${windowTop.close} — the highest close in the entire dataset — six sessions (eight calendar days) after entry, and it was the only close above breakeven in the whole trade. It never got back. At the ${may225c.expiry} expiry NVDA closed $${callExpiry.close}, $${(may225c.strike - callExpiry.close).toFixed(2)} below the strike: the call expired worthless, a total loss of $${(may225c.mid * 100).toFixed(0)} per contract.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A long call is a bet on price **and** on timing. This one was right about direction within eight days and still returned -100%, because the only day that pays is expiry day. The short puts in lesson 1 collected $${(winnerCredits * 100).toFixed(0)} over the same stretch of tape by being paid for time instead of paying for it.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nvda-call-1",
              question: `The call needed +${(((callBreakeven - callEntry.close) / callEntry.close) * 100).toFixed(1)}% to break even. NVDA's largest peak-to-trough drawdown in the window was -19.4% and its best rally +20.0%. What does that tell you?`,
              options: [
                "Nothing — options prices are independent of the stock's range",
                "The breakeven sat near the edge of the stock's entire observed range, so the trade needed a best-case move just to return zero",
                "The call was underpriced",
                "A longer expiry would have guaranteed a profit",
              ],
              correctIndex: 1,
              explanation:
                "Always compare the breakeven move to the range the underlying actually travels. When a call needs a move as large as the biggest rally the stock has produced in months, you are not buying exposure — you are buying a lottery ticket priced as though the best case is the base case.",
            },
            {
              id: "nvda-call-2",
              question: "You bought this call and NVDA hit its window high eight days later. What's the discipline the trade needed?",
              options: [
                "Hold to expiry — that's what the 72 days were for",
                "A profit-taking rule, because a long call's gain is unrealized until you close it and time works against you every day you don't",
                "Buy more calls to average up",
                "Sell a put against it",
              ],
              correctIndex: 1,
              explanation: `The position was above breakeven with ${may225c.dte - 8} days still on the clock. Long premium decays; an unrealized gain on a call is a decision you're postponing, not a position you're holding. Contrast this with a short put, where doing nothing is how you get paid.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "boring-wins": {
      kind: "short-put",
      entryDate: "2026-07-09",
      strike: 192.5,
      expiry: "2026-07-17",
      credit: jul192.mid,
      volume: jul192.volume,
      note: "The worked contract is the July 9 $192.50 — the winner that came closest to trouble. The other two winners' orders would have sat just as untouched.",
    },
    "the-220-put": {
      kind: "short-put",
      entryDate: "2026-06-02",
      strike: 220,
      expiry: "2026-06-12",
      credit: jun220.mid,
      volume: jun220.volume,
    },
    "five-points-of-cushion": {
      kind: "short-put",
      entryDate: "2026-07-21",
      strike: 195,
      expiry: "2026-07-31",
      credit: jul195x.mid,
      volume: jul195x.volume,
      note: "This block defends pick A, the wider strike. B's identical rules were one bad Friday from firing — five points of strike is the difference between orders that rest and orders that trigger.",
    },
    "roll-or-take-the-shares": {
      kind: "short-put",
      entryDate: "2026-07-22",
      strike: 205,
      expiry: "2026-07-31",
      credit: jul205.mid,
      volume: jul205.volume,
      note: "Roll, assign, or close only becomes a trilemma once the defense was skipped. With the exit taken on the break, the July 31 decision is simply which new trade — if any — deserves the freed-up collateral.",
    },
    "right-for-eight-days": {
      kind: "long-call",
      entryDate: "2026-05-06",
      strike: 225,
      expiry: "2026-07-17",
      credit: may225c.mid,
      volume: may225c.volume,
    },
  }),
};
