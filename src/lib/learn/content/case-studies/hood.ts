// HOOD case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/HOOD.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.
//
// HOOD sits in the "opportunity" universe: never traded, but the scanner kept
// surfacing it. 18 put rows across 26 scan days, no calls, no LEAPs.

import raw from "@/lib/learn/v2-data/HOOD.json";
import { bars, barOn, findPut, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// ── Case 1: the July 15 top ────────────────────────────────────────────────
const jul108 = findPut(t, "2026-07-15", 108, "2026-07-24");
const jul108Entry = barOn(t, "2026-07-15");
const windowPeak = barOn(t, "2026-07-06"); // 117.55 — the high close of the window
const ripTrough = barOn(t, "2026-05-22"); // 73.64 — start of the +59.6% rip
const crackDay = barOn(t, "2026-07-16"); // -8.2%
const jul24 = barOn(t, "2026-07-24"); // shared expiry: close 94.91, low 93.03

// ── Case 2: the stop that gapped ───────────────────────────────────────────
const jul101 = findPut(t, "2026-07-13", 101, "2026-07-24");
const jul101Entry = barOn(t, "2026-07-13");
const gapDay = barOn(t, "2026-07-17"); // open 100.37, low 96.59, close 99.96

// ── Case 3: 100% AROC, zero volume ─────────────────────────────────────────
const jun80 = findPut(t, "2026-06-09", 80, "2026-06-18");
const jun75 = findPut(t, "2026-06-09", 75, "2026-06-18");
const junEntry = barOn(t, "2026-06-09"); // close 83.77, but low 78.93 same session
const jun18 = barOn(t, "2026-06-18"); // 108.15

// ── Case 4: same setup line, five sessions apart ───────────────────────────
const highPut = findPut(t, "2026-06-18", 100, "2026-06-26"); // sold at a local high
const highEntry = barOn(t, "2026-06-18");
const jun26 = barOn(t, "2026-06-26");
const washoutPut = findPut(t, "2026-06-25", 89, "2026-07-02"); // sold at the washout
const washoutEntry = barOn(t, "2026-06-25"); // close 93.47, low 92.80
const jul02 = barOn(t, "2026-07-02"); // 112.73
const jul31 = barOn(t, "2026-07-31"); // 86.56 — trough of the -26% unwind

// The surge that made June 18 a local high, computed from the real bars.
const surgePct =
  ((barOn(t, "2026-06-17").close - barOn(t, "2026-06-16").close) /
    barOn(t, "2026-06-16").close) *
  100;
const ripPct = ((windowPeak.close - ripTrough.close) / ripTrough.close) * 100;

export const HOOD_CASES: Module = {
  id: "cs-hood",
  title: "HOOD Case Studies",
  subtitle: "A 60% rip, a 26% unwind, and seven July puts that all finished ITM",
  icon: "🪶",
  color: "amber-500",
  level: 2,
  track: "case-study",
  ticker: "HOOD",
  universe: "opportunity",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "iv-expanding-was-the-warning",
      title: "“IV expanding” was the warning, not the invitation",
      subtitle: "Selling a 9-day put one session before an 8% break",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `HOOD is a ticker you never traded — which makes it a clean laboratory. Between **May 22** ($${ripTrough.close}) and **July 6** ($${windowPeak.close}) it ripped **${ripPct.toFixed(1)}%**. The scanner started surfacing it constantly.\n\nOn **July 15, 2026** — close $${jul108Entry.close}, RSI ${jul108.rsi} — it offered the **$${jul108.strike} put expiring July 24** for **$${jul108.mid.toFixed(2)}** (${pctOtm(jul108.strike, jul108Entry.close)}% OTM, delta ${jul108.delta.toFixed(2)}, IV ${(jul108.iv * 100).toFixed(0)}%, ${jul108.aroc}% AROC, ${jul108.dte} DTE).\n\nThe catalyst line: *"${jul108.catalyst}"*`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "HOOD — the July unwind (real bars)",
            bars: bars(t, "2026-07-01", "2026-07-24"),
            lines: [
              { price: jul108.strike, label: "108 strike", color: "sky" },
              { price: windowPeak.close, label: `peak ${windowPeak.close}`, color: "amber" },
            ],
            markers: [
              { date: "2026-07-06", label: "peak", color: "amber" },
              { date: "2026-07-15", label: "sell 108", color: "violet" },
              { date: "2026-07-16", label: "-8.2%", color: "red", below: true },
              { date: "2026-07-24", label: `exp ${jul24.close}`, color: "red", below: true },
            ],
            caption: `The put was sold ${pctOtm(jul108.strike, jul108Entry.close)}% OTM. The very next session HOOD closed $${crackDay.close} (low $${crackDay.low}) — already through the strike. By expiry it closed $${jul24.close}, $${(jul108.strike - jul24.close).toFixed(2)}/sh in the money.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Loss at expiry: **$${((jul108.strike - jul24.close - jul108.mid) * 100).toFixed(0)} per contract** against the $${(jul108.mid * 100).toFixed(0)} collected — **${((jul108.strike - jul24.close - jul108.mid) / jul108.mid).toFixed(1)}× the credit**. And this wasn't the only one: every put the scanner surfaced between July 9 and July 15 — seven entries, strikes $100 through $108 — finished in the money.`,
        },
        {
          type: "text",
          content: `Read the catalyst again. "IV expanding" and "premium rich at ${(jul108.iv * 100).toFixed(0)}% IV" describe the *same* fact from two angles: the market was paying up because the market expected a big move. A ${jul108.dte}-day put at ${(jul108.iv * 100).toFixed(0)}% IV is priced for roughly a ${((jul108.iv * Math.sqrt(jul108.dte / 365)) * 100).toFixed(1)}% one-standard-deviation move over its life. The strike sat only ${pctOtm(jul108.strike, jul108Entry.close)}% away.\n\nRSI at ${jul108.rsi}, after a ${ripPct.toFixed(0)}% run, is the other half of the story: this was a sale into the last inch of a move, not into a cushion.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "hood-iv-1",
              question: `The setup cited "premium rich at ${(jul108.iv * 100).toFixed(0)}% IV" as the reason to sell. What does that number actually tell a seller?`,
              options: [
                "The option is mispriced and free money is available",
                "The market is pricing a larger move than usual — the rich premium is the fee for taking that risk, not evidence the risk is absent",
                "Implied volatility above 50% guarantees mean reversion",
                "High IV means the stock cannot gap",
              ],
              correctIndex: 1,
              explanation: `IV is the market's price of expected movement. At ${(jul108.iv * 100).toFixed(0)}% over ${jul108.dte} days, a one-sigma move was about ${((jul108.iv * Math.sqrt(jul108.dte / 365)) * 100).toFixed(1)}% — and the strike sat ${pctOtm(jul108.strike, jul108Entry.close)}% away. The premium was rich because the strike was reachable, and the very next session proved it.`,
            },
            {
              id: "hood-iv-2",
              question: `HOOD closed at $${jul24.close} on the July 24 expiry. What was the short $${jul108.strike} put's P&L per contract?`,
              options: [
                `+$${(jul108.mid * 100).toFixed(0)} — the credit collected`,
                `-$${((jul108.strike - jul24.close) * 100).toFixed(0)} — the intrinsic value at expiry`,
                `-$${((jul108.strike - jul24.close - jul108.mid) * 100).toFixed(0)} — intrinsic loss less the credit collected`,
                `-$${(jul108.mid * 100).toFixed(0)} — losses on a short put are capped at the credit`,
              ],
              correctIndex: 2,
              explanation: `(strike − close − credit) × 100 = (${jul108.strike} − ${jul24.close} − ${jul108.mid.toFixed(2)}) × 100 = $${((jul108.strike - jul24.close - jul108.mid) * 100).toFixed(0)}. The credit is a discount on the loss, never a cap on it.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "the-stop-that-gapped",
      title: "The stop that gapped",
      subtitle: "You set the exit — then HOOD gaps straight through it",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `Two days before that trade, on **July 13** (close $${jul101Entry.close}), the scanner offered the **$${jul101.strike} put expiring July 24** for **$${jul101.mid.toFixed(2)}** (delta ${jul101.delta.toFixed(2)}, ${jul101.aroc}% AROC, ${jul101.dte} DTE). The catalyst: *"${jul101.catalyst}"*\n\nSo the thesis is explicit and testable: **$105 holds**. That gives you a stop rule before you even enter. Set it on the chart below — you can see the path through July 16, and nothing after.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-07-06", "2026-07-24"),
            visibleUntil: "2026-07-16",
            strike: jul101.strike,
            credit: jul101.mid,
            entryDate: "2026-07-13",
            expiry: "2026-07-24",
            guide: { min: 103, max: 105.5 },
            explanation: `The trade's own thesis was a $105 floor, so a stop just under it ($103–$105.50) is the honest placement: if $105 fails, the reason you sold is gone. July 16 closed $${crackDay.close} with a $${crackDay.low} low — the floor was tested but not broken on a closing basis. Then July 17 **opened at $${gapDay.open}** and traded to $${gapDay.low}. By the July 24 expiry HOOD closed $${jul24.close}: $${(jul101.strike - jul24.close).toFixed(2)}/sh ITM against $${jul101.mid.toFixed(2)} collected, a $${((jul101.strike - jul24.close - jul101.mid) * 100).toFixed(0)} loss per contract.`,
          },
        },
        {
          type: "text",
          content: `Here is the part the slider can't show you. A stop at $105 was *correct* and still didn't save you the amount you expected: July 17 opened **$${gapDay.open}**, roughly $${(105 - gapDay.open).toFixed(2)} below the trigger. A stop order is an instruction to start trying to get out, not a promise about the price.\n\nOn the option side it's worse. This contract was quoted **$${jul101.bid.toFixed(2)} bid / $${jul101.ask.toFixed(2)} ask** — a spread of $${(jul101.ask - jul101.bid).toFixed(2)}, or **${(((jul101.ask - jul101.bid) / jul101.mid) * 100).toFixed(0)}% of mid** — on ${jul101.volume} contracts of day volume. HOOD's puts were routinely this wide: the July 17 $92 put quoted $${findPut(t, "2026-07-17", 92, "2026-07-24").bid.toFixed(2)}/$${findPut(t, "2026-07-17", 92, "2026-07-24").ask.toFixed(2)} (${(((findPut(t, "2026-07-17", 92, "2026-07-24").ask - findPut(t, "2026-07-17", 92, "2026-07-24").bid) / findPut(t, "2026-07-17", 92, "2026-07-24").mid) * 100).toFixed(0)}%), and the June 17 $94 put quoted $${findPut(t, "2026-06-17", 94, "2026-07-02").bid.toFixed(2)}/$${findPut(t, "2026-06-17", 94, "2026-07-02").ask.toFixed(2)} (${(((findPut(t, "2026-06-17", 94, "2026-07-02").ask - findPut(t, "2026-06-17", 94, "2026-07-02").bid) / findPut(t, "2026-06-17", 94, "2026-07-02").mid) * 100).toFixed(0)}%).`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `**Stop-market** on a ${(((jul101.ask - jul101.bid) / jul101.mid) * 100).toFixed(0)}%-wide option guarantees the exit and pays whatever the ask has become in the panic. **Stop-limit** caps the price you pay and, on a gap like July 17, simply doesn't fill — leaving you short a put that keeps getting worse. On thin chains neither is a clean answer: the real control is sizing and strike distance at entry, plus a premium-based alert (buy back at 2–3× the $${jul101.mid.toFixed(2)} credit, i.e. $${(2 * jul101.mid).toFixed(2)}–$${(3 * jul101.mid).toFixed(2)}) that has you working the order manually rather than resting one in a book this thin.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "hood-stop-1",
              question: `Your stop-market on the underlying was $105. HOOD opened July 17 at $${gapDay.open}. What happened?`,
              options: [
                "The order filled at $105 because that was the stop price",
                "The order was rejected because price never traded at $105",
                `It became a market order at the open and filled near $${gapDay.open} — a stop names the trigger, not the fill`,
                "Stops are guaranteed on liquid stocks like HOOD",
              ],
              correctIndex: 2,
              explanation: `A stop triggers when price trades through it and then executes at whatever the market offers. Gapping through the level — as HOOD did, opening $${(105 - gapDay.open).toFixed(2)} below — is exactly when you most want the stop and least get the price.`,
            },
            {
              id: "hood-stop-2",
              question: `Why is a resting stop-market order especially expensive on this specific put?`,
              options: [
                "Because the delta was only " + jul101.delta.toFixed(2),
                `Because the quote was $${jul101.bid.toFixed(2)}/$${jul101.ask.toFixed(2)} on ${jul101.volume} contracts of volume — a market order to close pays through a ${(((jul101.ask - jul101.bid) / jul101.mid) * 100).toFixed(0)}% spread that widens further under stress`,
                "Because the AROC was too high",
                "Because puts cannot be closed before expiry",
              ],
              correctIndex: 1,
              explanation: `Spread is a round-trip tax you pay in a hurry. At ${(((jul101.ask - jul101.bid) / jul101.mid) * 100).toFixed(0)}% of mid on ${jul101.volume} contracts of day volume, the exit cost is a material fraction of the $${(jul101.mid * 100).toFixed(0)} you collected — before the loss itself.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "hundred-percent-aroc-no-bid",
      title: "100% AROC and nobody on the other side",
      subtitle: "Two real June 9 contracts — one of them you can't actually trade",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 9, 2026.** HOOD closed $${junEntry.close} after a violent session — the same day's low was **$${junEntry.low}**. The scanner surfaced two puts on the same June 18 expiry. One of them shows the single highest AROC in HOOD's entire ${t.window.start}–${t.window.end} dataset.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you actually sell?",
            goal: "Weekly income on a ticker you don't own and don't want assigned",
            a: {
              label: "A · $80 put",
              date: "2026-06-09",
              side: "put",
              strike: jun80.strike,
              expiry: "2026-06-18",
              dte: jun80.dte,
              bid: jun80.bid,
              ask: jun80.ask,
              mid: jun80.mid,
              delta: jun80.delta,
              iv: jun80.iv,
              aroc: jun80.aroc,
              volume: jun80.volume,
              juiciness: jun80.juiciness,
              note: jun80.catalyst,
            },
            b: {
              label: "B · $75 put",
              date: "2026-06-09",
              side: "put",
              strike: jun75.strike,
              expiry: "2026-06-18",
              dte: jun75.dte,
              bid: jun75.bid,
              ask: jun75.ask,
              mid: jun75.mid,
              delta: jun75.delta,
              iv: jun75.iv,
              aroc: jun75.aroc,
              volume: jun75.volume,
              juiciness: jun75.juiciness,
              note: jun75.catalyst,
            },
            correct: "b",
            explanation: `Both expired worthless — HOOD closed $${jun18.close} on June 18 — so A made $${((jun80.mid - jun75.mid) * 100).toFixed(0)} more per contract. A still wasn't the trade. Its ${jun80.aroc}% AROC came with **${jun80.volume} contracts of day volume**: no one to sell to at entry, no one to buy it back from if it went wrong. And its "$84 support" claim was already false — HOOD *closed* at $${junEntry.close}, below the cited floor, and had traded $${junEntry.low} that same session, $${(jun80.strike - junEntry.low).toFixed(2)} through the $${jun80.strike} strike. B sat ${(((junEntry.low - jun75.strike) / jun75.strike) * 100).toFixed(1)}% below even that low, on ${jun75.volume} contracts of volume you could actually exit into.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "June 9: the strike was already breached intraday (real bars)",
            bars: bars(t, "2026-06-05", "2026-06-18"),
            lines: [
              { price: jun80.strike, label: "A: 80 strike", color: "red" },
              { price: jun75.strike, label: "B: 75 strike", color: "emerald" },
              { price: 84, label: "claimed 84 support", color: "amber" },
            ],
            markers: [
              { date: "2026-06-09", label: `low ${junEntry.low}`, color: "red", below: true },
              { date: "2026-06-18", label: `exp ${jun18.close}`, color: "emerald" },
            ],
            caption: `Tap the June 9 candle: open $${junEntry.open}, low $${junEntry.low}, close $${junEntry.close}. The $${jun80.strike} strike was inside that range on the day it was scanned. What followed — a run to $${jun18.close} by expiry — bailed out both trades.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Note the trap in A's quote: $${jun80.bid.toFixed(2)}/$${jun80.ask.toFixed(2)} is a **${(((jun80.ask - jun80.bid) / jun80.mid) * 100).toFixed(0)}% spread**, *tighter* than B's ${(((jun75.ask - jun75.bid) / jun75.mid) * 100).toFixed(0)}%. A tight quote on ${jun80.volume} contracts of volume is not liquidity — it's a market maker's placeholder, in whatever size they feel like, and it can vanish the moment you need it. Rank a candidate by yield only after you've checked **day volume**, then the spread, then whether the **cited support level** sits above or below the last print.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "hood-liq-1",
              question: `The $${jun80.strike} put expired worthless and paid more than the $${jun75.strike} put. Why is picking it still the wrong process?`,
              options: [
                "It isn't — the P&L is what counts",
                `Because the outcome was determined by a ${(((jun18.close - junEntry.close) / junEntry.close) * 100).toFixed(0)}% rally you had no way to forecast, while the ${jun80.volume}-volume quote and the already-breached strike were both visible at entry`,
                `Because ${jun80.aroc}% AROC is always a data error`,
                "Because 9-day expiries should never be sold",
              ],
              correctIndex: 1,
              explanation:
                "Judging a decision by its result is how bad process survives. Everything wrong with the $80 put — no volume, a strike inside the current day's range, a support claim below the current price — was on screen before entry. The rally that saved it was not.",
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "where-in-the-swing",
      title: "Same setup line, five sessions apart",
      subtitle: "Two “strike sits on support” trades with opposite outcomes",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `HOOD's scanner rows are remarkably uniform: nearly every one cites a support level and a ~0.20–0.26 delta. So what actually decided the outcomes? Compare two entries five trading sessions apart.\n\n**June 18** — HOOD closes $${highEntry.close}, a local high one session after a surge of ${surgePct.toFixed(1)}%. Sell the **$${highPut.strike} put, June 26 expiry**, $${highPut.mid.toFixed(2)} credit (delta ${highPut.delta.toFixed(2)}, ${highPut.aroc}% AROC, juiciness ${highPut.juiciness}, ${highPut.volume} volume). Catalyst: *"${highPut.catalyst}"*\n\n**June 25** — HOOD closes $${washoutEntry.close}, on the day it printed a $${washoutEntry.low} low. Sell the **$${washoutPut.strike} put, July 2 expiry**, $${washoutPut.mid.toFixed(3)} credit (delta ${washoutPut.delta.toFixed(2)}, ${washoutPut.aroc}% AROC). Catalyst: *"${washoutPut.catalyst}"*`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Sold the high vs sold the washout (real bars)",
            bars: bars(t, "2026-06-17", "2026-07-02"),
            lines: [
              { price: highPut.strike, label: "100 strike (Jun 18)", color: "red" },
              { price: washoutPut.strike, label: "89 strike (Jun 25)", color: "emerald" },
            ],
            markers: [
              { date: "2026-06-18", label: "sell 100", color: "violet" },
              { date: "2026-06-25", label: `low ${washoutEntry.low}`, color: "sky", below: true },
              { date: "2026-06-26", label: `exp ${jun26.close}`, color: "red" },
              { date: "2026-07-02", label: `exp ${jul02.close}`, color: "emerald" },
            ],
            caption: `The June 18 put finished $${(highPut.strike - jun26.close).toFixed(2)}/sh ITM against $${highPut.mid.toFixed(2)} collected — a $${((highPut.strike - jun26.close - highPut.mid) * 100).toFixed(0)} loss per contract that looks like a rounding error, and wasn't. The June 25 put never came within $${(washoutEntry.low - washoutPut.strike).toFixed(2)} of its strike and kept the full $${(washoutPut.mid * 100).toFixed(2)}.`,
          },
        },
        {
          type: "text",
          content: `Look at what that $${((highPut.strike - jun26.close - highPut.mid) * 100).toFixed(0)} hides. At the **June 25** low of $${washoutEntry.low}, the June 18 put was $${(highPut.strike - washoutEntry.low).toFixed(2)}/sh intrinsic — **${((highPut.strike - washoutEntry.low) / highPut.mid).toFixed(1)}× the $${highPut.mid.toFixed(2)} credit collected**. A 2–3× premium stop had fired days earlier. The near-scratch print on June 26 was the last two sessions of the trade going your way, not the trade working.\n\nAnd note which contract carried more delta: the *winner* did (${washoutPut.delta.toFixed(2)} vs ${highPut.delta.toFixed(2)}), at a higher IV (${(washoutPut.iv * 100).toFixed(0)}% vs ${(highPut.iv * 100).toFixed(0)}%). Strike selection wasn't the variable. Position in the swing was.`,
        },
        {
          type: "callout",
          style: "tip",
          content: `HOOD's whole window is this lesson at scale: a **+${ripPct.toFixed(1)}%** rip from $${ripTrough.close} (May 22) to $${windowPeak.close} (July 6), then **${Math.abs(((jul31.close - windowPeak.close) / windowPeak.close) * 100).toFixed(1)}%** down to $${jul31.close} by July 31. Puts sold into the second and third days of a washout paid; puts sold within a week of a local high did not. Selling premium is still a directional bet — it just pays you while you're wrong for a little while first.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "hood-swing-1",
              question: `The June 18 $${highPut.strike} put lost only $${((highPut.strike - jun26.close - highPut.mid) * 100).toFixed(0)} per contract. Why treat it as a bad trade rather than a scratch?`,
              options: [
                "Any loss is a bad trade",
                `Because it spent its final week deep underwater — $${(highPut.strike - washoutEntry.low).toFixed(2)}/sh intrinsic at the June 25 low, ${((highPut.strike - washoutEntry.low) / highPut.mid).toFixed(1)}× the credit — so the near-flat result depended entirely on where the last print landed`,
                "Because the delta was too low",
                `Because ${highPut.volume} contracts of volume is illiquid`,
              ],
              correctIndex: 1,
              explanation: `Grade the risk you carried, not the number you ended with. Carrying ${((highPut.strike - washoutEntry.low) / highPut.mid).toFixed(1)}× your credit in open loss to collect $${(highPut.mid * 100).toFixed(0)} is a trade that has to be repeated many times before the arithmetic works — and it only closed flat because of two sessions of luck.`,
            },
            {
              id: "hood-swing-2",
              question: `Both entries cited a support level, and the winner had the *higher* delta and IV. What separated them?`,
              options: [
                "The winner had a shorter DTE",
                "The winner's strike was a round number",
                `Where price sat in the swing: $${highEntry.close} was a local high one session after a surge of ${surgePct.toFixed(1)}%, while $${washoutEntry.close} was the close of a washout session that printed $${washoutEntry.low}`,
                "The winner had more premium, which cushions any move",
              ],
              correctIndex: 2,
              explanation:
                "The Greeks and the catalyst text were nearly identical. What differed was whether the sale happened into exhaustion or into extension. On a ticker moving this fast, entry timing dominated every other input in the scanner row.",
            },
          ],
        },
      ],
    },
  ], t, {
    "iv-expanding-was-the-warning": {
      kind: "short-put",
      entryDate: "2026-07-15",
      strike: 108,
      expiry: "2026-07-24",
      credit: jul108.mid,
      volume: jul108.volume,
      note: `"IV expanding" was the warning at entry; the defense is what converts a warning into an instruction. With the break arriving one session after the fill, only an order placed on July 15 was ever going to act on it.`,
    },
    "the-stop-that-gapped": {
      kind: "short-put",
      entryDate: "2026-07-13",
      strike: 101,
      expiry: "2026-07-24",
      credit: jul101.mid,
      volume: jul101.volume,
      support: { level: 105, label: `claimed "$105 floor" from the catalyst` },
      note: "The July 17 gap means the orders bound the delay, not the slippage — the fill lands below the trigger. What they still buy is the exit at the start of the unwind instead of the end of it.",
    },
    "hundred-percent-aroc-no-bid": {
      kind: "short-put",
      entryDate: "2026-06-09",
      strike: 75,
      expiry: "2026-06-18",
      credit: jun75.mid,
      volume: jun75.volume,
      note: `This block defends pick B. Pick A cannot be defended at all — with ${jun80.volume} contracts of day volume there is no book to place an exit into, which settles the A/B question before any AROC comparison.`,
    },
    "where-in-the-swing": {
      kind: "short-put",
      entryDate: "2026-06-18",
      strike: 100,
      expiry: "2026-06-26",
      credit: highPut.mid,
      volume: highPut.volume,
      note: "This block defends the June 18 entry at the local high. The June 25 washout entry is the contrast: same catalyst text, strike under a just-tested low, and a set of orders that never had a reason to fire.",
    },
  }),
};
