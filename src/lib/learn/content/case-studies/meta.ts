// META case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/META.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/META.json";
import {
  bars,
  barOn,
  findPut,
  findCall,
  contractSeries,
  pctOtm,
  type V2Ticker,
} from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

const t = raw as V2Ticker;

// ── Case 1: the June break ─────────────────────────────────────────────────
// 2026-06-03: META closes 622.98 after bouncing off the June 1 low. Scanner
// offers the 600 put, 06-12 expiry. Two sessions later the stock gaps down.
const jun600 = findPut(t, "2026-06-03", 600, "2026-06-12");
const jun600Entry = barOn(t, "2026-06-03");
const jun600Mark = findPut(t, "2026-06-05", 600, "2026-06-12"); // same contract, rescanned
const gapDay = barOn(t, "2026-06-05");
const junLowBar = barOn(t, "2026-06-11");
const jun600Expiry = barOn(t, "2026-06-12");
const junOneLow = barOn(t, "2026-06-01").low; // the shelf the 600 strike sat on

// ── Case 2: the winner that spent a week underwater ───────────────────────
const jun575 = findPut(t, "2026-06-05", 575, "2026-06-18");
const jun575Expiry = barOn(t, "2026-06-18");

// ── Case 3: same scan day, two very different order books ─────────────────
const may585 = findPut(t, "2026-05-06", 585, "2026-05-13"); // 6 contracts traded
const may590 = findPut(t, "2026-05-06", 590, "2026-05-15");
const mayEntry = barOn(t, "2026-05-06");

// ── Case 4: an observed decay path (4 real scans of one contract) ─────────
const decay580 = contractSeries(t, "put", 580, "2026-05-15");
const may580First = decay580[0];
const may580Last = decay580[decay580.length - 1];
const mayFriClose = barOn(t, "2026-05-01").close; // last close before the 05-02 scan
const may580Expiry = barOn(t, "2026-05-15");

// ── Case 5 + 6: the covered calls ─────────────────────────────────────────
const cc630 = findCall(t, "2026-05-27", 630, "2026-08-21");
const ccEntry = barOn(t, "2026-05-27");
const junCall630 = findCall(t, "2026-06-03", 630, "2026-08-21");
const junCall640 = findCall(t, "2026-06-03", 640, "2026-08-21");
const peakBar = barOn(t, "2026-07-15"); // best close in the window
const crashBar = barOn(t, "2026-07-30");
const lastBar = barOn(t, "2026-08-05");

const cap630 = 630 + cc630.mid;
// Calendar days between the last bar in the dataset and the call's expiry.
const daysLeftAtWindowEnd = Math.round(
  (Date.parse(cc630.expiry) - Date.parse(lastBar.date)) / 86_400_000
);
const junCap630 = 630 + junCall630.mid;
const junCap640 = 640 + junCall640.mid;

export const META_CASES: Module = {
  id: "cs-meta",
  title: "META Case Studies",
  subtitle: "A 21% July break, a put that survived $18 underwater, and the covered call that paid for the crash",
  icon: "🌐",
  color: "amber-500",
  level: 2,
  track: "case-study",
  ticker: "META",
  universe: "traded",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "quality-still-gaps",
      title: "Quality doesn't mean gentle",
      subtitle: "A $600 put on a mega-cap, and the two sessions that ended it",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 3, 2026.** META closes at **$${jun600Entry.close}**, having bounced off the June 1 washout (that day's low: $${junOneLow}). The scanner surfaces the **$600 put expiring June 12** at **$${jun600.mid.toFixed(2)}** — delta ${jun600.delta.toFixed(2)}, ${jun600.aroc}% AROC, juiciness ${jun600.juiciness}, and ${jun600.volume} contracts of day volume. Real liquidity, a household name, ${pctOtm(600, jun600Entry.close)}% of downside cushion.\n\nThe catalyst line: *"${jun600.catalyst}"*\n\nEverything about it reads "safe". Here's the problem nobody flags: the $600 strike sits **on** the June 1 low, not below it. There is no tested level between the stock and your strike.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-05-26", "2026-06-12"),
            visibleUntil: "2026-06-04",
            strike: 600,
            credit: jun600.mid,
            entryDate: "2026-06-03",
            expiry: "2026-06-12",
            guide: { min: 595, max: 605 },
            explanation: `The zone that made sense was right around the strike itself ($595–$605): the whole trade rested on $600 holding, so once it didn't, the reason to be in was gone. META opened June 5 at $${gapDay.open} and traded to $${gapDay.low} that same session — any stop in that band filled on the way down. It kept falling: $${junLowBar.low} on June 11, and expiry closed at $${jun600Expiry.close}.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "META — the June break (real bars)",
            bars: bars(t, "2026-05-26", "2026-06-12"),
            lines: [
              { price: 600, label: "600 strike", color: "sky" },
              { price: junOneLow, label: `June 1 low ${junOneLow}`, color: "amber" },
            ],
            markers: [
              { date: "2026-06-03", label: "entry", color: "violet" },
              { date: "2026-06-05", label: `gap ${gapDay.close}`, color: "red", below: true },
              { date: "2026-06-12", label: `exp ${jun600Expiry.close}`, color: "red", below: true },
            ],
            shadeAfter: "2026-06-04",
            caption: `Nine days, $${(jun600Entry.close - jun600Expiry.close).toFixed(2)} of downside. The put finished $${(600 - jun600Expiry.close).toFixed(2)}/sh in the money against the $${jun600.mid.toFixed(2)} collected.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Loss ≈ **$${((600 - jun600Expiry.close - jun600.mid) * 100).toFixed(0)} per contract** on a trade that paid $${jun600.premium.toFixed(0)}. That is **${((600 - jun600Expiry.close - jun600.mid) / jun600.mid).toFixed(1)}×** the credit, gone in nine days, on one of the largest companies in the world.`,
        },
        {
          type: "text",
          content: `**One more thing the data shows.** The scanner picked up the *same contract* again on June 5 — the day META closed at $${gapDay.close}, already below the strike. Its mark: **$${jun600Mark.mid.toFixed(2)}**, only ${(jun600Mark.mid / jun600.mid).toFixed(2)}× the entry credit, delta still ${jun600Mark.delta.toFixed(2)}.\n\nA "buy it back at 2× credit" rule would **not** have fired on that mark. The underlying had already broken; the option mark hadn't caught up. When the two disagree, the underlying is the honest signal — it can't be stale, and it can't be a wide quote.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "meta-gap-1",
              question: `META closed at $${jun600Expiry.close} on June 12 expiry. What was the short $600 put's approximate P&L per contract?`,
              options: [
                `+$${jun600.premium.toFixed(0)} — the credit collected`,
                `-$${((600 - jun600Expiry.close) * 100).toFixed(0)} — the intrinsic value at expiry`,
                `-$${((600 - jun600Expiry.close - jun600.mid) * 100).toFixed(0)} — intrinsic minus the credit collected`,
                "Break-even — the credit offsets the assignment",
              ],
              correctIndex: 2,
              explanation: `Loss = (strike − close − credit) × 100 = (600 − ${jun600Expiry.close} − ${jun600.mid.toFixed(2)}) × 100 ≈ $${((600 - jun600Expiry.close - jun600.mid) * 100).toFixed(0)}. Market cap is not a stop loss.`,
            },
            {
              id: "meta-gap-2",
              question: `On June 5 the stock was below the strike, but the rescanned mid was only $${jun600Mark.mid.toFixed(2)} versus the $${jun600.mid.toFixed(2)} credit. Why is that a warning about premium-based stops?`,
              options: [
                "It means the position wasn't actually losing money",
                "A stop keyed to the option's mark can sit unfilled while the underlying has already invalidated the trade — the mark lags, quotes widen, and you wait through the damage",
                "Premium stops always fill faster than price stops",
                "It proves the scanner mispriced the contract",
              ],
              correctIndex: 1,
              explanation: `The 2–3× credit rule is a good backstop, not a trigger. Here the underlying was $${(600 - gapDay.close).toFixed(2)} through the strike while the mark showed a ${(((jun600Mark.mid - jun600.mid) / jun600.mid) * 100).toFixed(0)}% move. Anchor the primary stop to the price level your thesis depends on.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "underwater-winner",
      title: "The winner that spent a week underwater",
      subtitle: "Two days later, one strike lower, and a completely different outcome",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 5**, after the gap. META closes at **$${gapDay.close}**, down ${(((gapDay.close - barOn(t, "2026-06-04").close) / barOn(t, "2026-06-04").close) * 100).toFixed(1)}% on the session. Panic is priced in, and the scanner's best-rated candidate of the whole window shows up: the **$575 put expiring June 18** at **$${jun575.mid.toFixed(2)}** — delta ${jun575.delta.toFixed(2)}, ${jun575.aroc}% AROC, juiciness ${jun575.juiciness}, ${jun575.volume} contracts traded.\n\nNote the geometry, and contrast it with case 1: the $575 strike sits **below** the day's low of $${gapDay.low}. You are selling under the wick, not on top of a shelf.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Stressed, but never breached at expiry (real bars)",
            bars: bars(t, "2026-06-05", "2026-06-18"),
            lines: [
              { price: 575, label: "575 strike", color: "emerald" },
              { price: Number((575 - jun575.mid).toFixed(2)), label: "breakeven", color: "sky" },
            ],
            markers: [
              { date: "2026-06-05", label: "entry", color: "violet" },
              { date: "2026-06-11", label: `low ${junLowBar.low}`, color: "red", below: true },
              { date: "2026-06-18", label: `exp ${jun575Expiry.close}`, color: "emerald" },
            ],
            caption: `The June 11 low of $${junLowBar.low} sat $${(575 - junLowBar.low).toFixed(2)}/sh through the strike — intrinsic value alone was ${((575 - junLowBar.low) / jun575.mid).toFixed(1)}× the entire credit. Expiry closed at $${jun575Expiry.close}, $${(jun575Expiry.close - 575).toFixed(2)} above the strike. Full $${jun575.premium.toFixed(0)} kept.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Both June trades were roughly ${pctOtm(575, gapDay.close)}–${pctOtm(600, jun600Entry.close)}% out of the money at delta ~0.2. One lost ${((600 - jun600Expiry.close - jun600.mid) / jun600.mid).toFixed(1)}× its credit, the other kept 100% of it. The difference wasn't the Greeks — it was whether the strike sat **above or below a price the market had already tested**.`,
        },
        {
          type: "text",
          content: `This case also complicates the previous one. A mechanical stop at the strike would have fired here on **June 10** (low $${barOn(t, "2026-06-10").low}) and closed a position that finished as a clean winner eight days later.\n\nThat is the real cost of stops, and it is not a reason to skip them. It is a reason to place them where the *thesis* dies rather than where the position is merely uncomfortable. In case 1 the thesis was "$600 holds" — a break was fatal. Here the thesis was "the panic low is the floor," and the June 10–11 wicks tested it while the position still finished above the strike at expiry.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "meta-uw-1",
              question: `The June 11 low was $${junLowBar.low} against a $575 strike, yet this trade is filed as a winner. What actually decided that?`,
              options: [
                "The delta was low enough that assignment was impossible",
                "Only the closing price at expiry determines a short put's settlement — intraday wicks move the mark, not the outcome",
                "The credit was large enough to cover any intrinsic value",
                "META recovered because mega-caps always recover",
              ],
              correctIndex: 1,
              explanation: `A short put settles on the expiry close. The $${(575 - junLowBar.low).toFixed(2)} of intraday intrinsic on June 11 was real risk and a real mark-to-market drawdown — but it was never realized. What you do while underwater is the whole game.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "six-contracts-traded",
      title: "Six contracts traded all day",
      subtitle: "Same ticker, same scan, same delta — half the pay",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**May 6, 2026**, META at $${mayEntry.close}. The scanner returned both of these on the same day. They carry nearly identical delta. Look past the strike and the expiry — read the order book.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you actually want to sell?",
            goal: "Weekly income — get paid properly for the risk you take",
            a: {
              label: "A · $585 put",
              date: "2026-05-06",
              side: "put",
              strike: 585,
              expiry: "2026-05-13",
              dte: may585.dte,
              bid: may585.bid,
              ask: may585.ask,
              mid: may585.mid,
              delta: may585.delta,
              iv: may585.iv,
              aroc: may585.aroc,
              volume: may585.volume,
              juiciness: may585.juiciness,
              note: `priority: ${may585.priority}`,
            },
            b: {
              label: "B · $590 put",
              date: "2026-05-06",
              side: "put",
              strike: 590,
              expiry: "2026-05-15",
              dte: may590.dte,
              bid: may590.bid,
              ask: may590.ask,
              mid: may590.mid,
              delta: may590.delta,
              iv: may590.iv,
              aroc: may590.aroc,
              volume: may590.volume,
              juiciness: may590.juiciness,
              note: may590.catalyst,
            },
            correct: "b",
            explanation: `A carries *more* delta (${may585.delta.toFixed(2)} vs ${may590.delta.toFixed(2)}) for less than half the credit, and its quote is $${may585.bid.toFixed(2)} / $${may585.ask.toFixed(2)} — a ${(((may585.ask - may585.bid) / may585.mid) * 100).toFixed(0)}% spread against ${(((may590.ask - may590.bid) / may590.mid) * 100).toFixed(0)}% for B. With ${may585.volume} contracts of day volume you are the market in A: you sell at the bid ($${(may585.bid * 100).toFixed(0)}) and buy back at the ask, so the round trip costs $${((may585.ask - may585.bid) * 100).toFixed(0)} before the stock does anything. B pays $${(may590.bid * 100).toFixed(0)} at the bid with ${may590.volume} contracts of volume behind it. Both expired worthless (May 13 close $${barOn(t, "2026-05-13").close}, May 15 close $${barOn(t, "2026-05-15").close}) — the choice didn't change the outcome, only what you were paid to accept it.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `A useful filter: if the bid–ask spread exceeds ~10% of mid, or day volume is in single digits, you are not trading a market — you are negotiating with one market maker. AROC computed off the *mid* (${may585.aroc}% here) quietly assumes a fill you will not get.`,
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "watching-theta-work",
      title: "Watching theta actually work",
      subtitle: "Four real scans of one contract, and the day decay lost",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The dataset caught the **$580 put expiring May 15** on four separate scan days. Same strike, same expiry, ${decay580.length} observations of what the market would pay for it — a decay curve you can read instead of a textbook one.\n\nScrub through it, then notice the second point.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: "The $580 put, scan by scan",
            side: "put",
            strike: 580,
            expiry: "2026-05-15",
            series: decay580,
            caption: `From $${may580First.mid.toFixed(2)} at ${may580First.dte} DTE to $${may580Last.mid.toFixed(2)} at ${may580Last.dte} DTE. Over that same stretch META went from $${mayFriClose} to $${mayEntry.close} — up ${(((mayEntry.close - mayFriClose) / mayFriClose) * 100).toFixed(1)}%. The seller was paid for time passing, not for being right about direction.`,
          },
        },
        {
          type: "text",
          content: `**The May 4 point breaks the curve.** Two days of time had burned off, yet the mid went *up*, from $${may580First.mid.toFixed(2)} to $${decay580[1].mid.toFixed(2)}. Nothing is wrong with the data: these are intraday scanner marks, and May 4 traded down to $${barOn(t, "2026-05-04").low} before closing at $${barOn(t, "2026-05-04").close}.\n\nThe arithmetic behind it is in the Greeks the scanner recorded. At entry, theta was **$${Math.abs(may580First.theta).toFixed(2)}/day** and delta was **${may580First.delta.toFixed(2)}**. So one day of decay is worth roughly a **$${(Math.abs(may580First.theta) / may580First.delta).toFixed(2)}** move in META. That session's range alone was $${(barOn(t, "2026-05-04").high - barOn(t, "2026-05-04").low).toFixed(2)}.\n\nTheta is a tailwind measured in dollars a day, competing with a stock that moves several dollars an hour. It wins over the *hold*, never over the *session*.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "meta-theta-1",
              question: `With theta at $${Math.abs(may580First.theta).toFixed(2)}/day and delta ${may580First.delta.toFixed(2)}, roughly how far does META have to fall in one session to wipe out a full day of decay?`,
              options: [
                `About $${(Math.abs(may580First.theta) * may580First.delta).toFixed(2)}`,
                `About $${(Math.abs(may580First.theta) / may580First.delta).toFixed(2)}`,
                `About $${Math.abs(may580First.theta).toFixed(2)}`,
                "Decay can't be offset by price moves",
              ],
              correctIndex: 1,
              explanation: `Theta ÷ delta = ${Math.abs(may580First.theta).toFixed(2)} ÷ ${may580First.delta.toFixed(2)} ≈ $${(Math.abs(may580First.theta) / may580First.delta).toFixed(2)} of adverse move. On a $600 stock that is noise — which is exactly why short-premium positions need to be judged over the full hold, not day to day.`,
            },
            {
              id: "meta-theta-2",
              question: `The contract went from $${may580First.mid.toFixed(2)} to $${may580Last.mid.toFixed(2)} — down ${Math.abs(((may580Last.mid - may580First.mid) / may580First.mid) * 100).toFixed(0)}% — while META rose ${(((mayEntry.close - mayFriClose) / mayFriClose) * 100).toFixed(1)}%. What did most of that work?`,
              options: [
                "The rally alone — delta drove the entire move",
                "Time decay plus the stock refusing to threaten the strike, which together drained both extrinsic value and the market's need to price a breach",
                "A collapse in implied volatility (it fell sharply across the four scans)",
                "The strike moved further out of the money by more than 10%",
              ],
              correctIndex: 1,
              explanation: `IV barely budged (${(may580First.iv * 100).toFixed(1)}% → ${(may580Last.iv * 100).toFixed(1)}%) and the stock only gained ${(((mayEntry.close - mayFriClose) / mayFriClose) * 100).toFixed(1)}%. The credit evaporated because ${may580First.dte - may580Last.dte} days passed with the strike never seriously tested. META closed expiry at $${may580Expiry.close}, $${(may580Expiry.close - 580).toFixed(2)} above the strike.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "call-you-regret-then-thank",
      title: "The call you regret, then thank",
      subtitle: "A covered call through a 25% rip and a 21% break",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**May 27, 2026.** META closes at **$${ccEntry.close}** after a $${(ccEntry.high - ccEntry.low).toFixed(2)} range day. Holding 100 shares, the scanner offers the **$630 call expiring August 21** — ${cc630.dte} days out — for **$${cc630.mid.toFixed(2)}**. Delta ${cc630.delta.toFixed(2)}, IV ${(cc630.iv * 100).toFixed(1)}%, ${cc630.volume} contracts of volume, score ${cc630.score}.\n\nThe catalyst: *"${cc630.catalyst}"*\n\nSelling a call **into** a MACD bullish crossover is selling upside precisely when the signal says there will be some. Your position from here is capped at strike plus credit: **$${cap630.toFixed(2)}**, or ${(((cap630 - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}% above the entry close.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "META from the covered-call entry to the dataset's edge (real bars)",
            bars: bars(t, "2026-05-27", "2026-08-05"),
            lines: [
              { price: 630, label: "630 strike", color: "amber" },
              { price: Number(cap630.toFixed(2)), label: `cap ${cap630.toFixed(2)}`, color: "emerald" },
            ],
            markers: [
              { date: "2026-05-27", label: "sold the call", color: "violet" },
              { date: "2026-07-15", label: `peak ${peakBar.close}`, color: "sky" },
              { date: "2026-07-30", label: `${crashBar.close}`, color: "red", below: true },
            ],
            caption: `Peak close $${peakBar.close} on July 15 (+${(((peakBar.close - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}% from entry), then $${crashBar.close} on July 30 — a $${(peakBar.close - crashBar.close).toFixed(2)} round trip in eleven sessions. The August 21 expiry sits past the dataset's window, so the final settlement isn't shown here.`,
          },
        },
        {
          type: "text",
          content: `**The regret window.** On July 15 the stock closed $${peakBar.close}. Deep in the money, the call felt like a mistake — but the honest cost of the cap at that moment was only **$${(peakBar.close - cap630).toFixed(2)}/share** ($${peakBar.close} − $${cap630.toFixed(2)}), not the $${(peakBar.close - 630).toFixed(2)} of intrinsic value. The credit is part of your ceiling.\n\n**The thank-you window.** Then META closed $${crashBar.close} on July 30 (${(((crashBar.close - peakBar.close) / peakBar.close) * 100).toFixed(1)}% from the peak) and $${lastBar.close} on August 5. Against the $${ccEntry.close} entry close, the shares alone are **${(((lastBar.close - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}%**. The $${cc630.mid.toFixed(2)} credit is ${((cc630.mid / ccEntry.close) * 100).toFixed(1)}% of the entry price — more than enough to cover that.\n\nWith the stock $${(630 - lastBar.close).toFixed(2)} below the strike and ${daysLeftAtWindowEnd} days left at the dataset's edge, most of that credit is still the seller's. We can't show the settlement — August 21 is outside the window — but the shape of the trade is already decided.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "meta-cc-1",
              question: `At the July 15 peak close of $${peakBar.close}, how much upside had the $630 covered call actually cost versus holding shares alone?`,
              options: [
                `$${(peakBar.close - 630).toFixed(2)}/share — the call's intrinsic value`,
                `$${(peakBar.close - cap630).toFixed(2)}/share — the peak minus the capped value of strike plus credit`,
                `$${cc630.mid.toFixed(2)}/share — the premium collected`,
                "Nothing — covered calls never cost upside",
              ],
              correctIndex: 1,
              explanation: `Your capped value is strike + credit = $630 + $${cc630.mid.toFixed(2)} = $${cap630.toFixed(2)}. Against a $${peakBar.close} peak close that is $${(peakBar.close - cap630).toFixed(2)}/share of forgone gain — ${(((peakBar.close - cap630) / peakBar.close) * 100).toFixed(1)}% of the stock price. Traders routinely quote the intrinsic value as their "loss" and talk themselves into panic-rolling.`,
            },
            {
              id: "meta-cc-2",
              question: "What is the fair verdict on this covered call, given the full price path in the dataset?",
              options: [
                "A clear mistake — it capped the July rally",
                `A trade whose cap cost $${(peakBar.close - cap630).toFixed(2)}/share at the best close, and whose ${((cc630.mid / ccEntry.close) * 100).toFixed(1)}% credit then more than covered the ${Math.abs(((lastBar.close - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}% the shares gave back — you sold a tail you didn't need`,
                "Irrelevant — the expiry is outside the dataset so nothing can be judged",
                "A perfect trade that should be repeated at the same strike every cycle",
              ],
              correctIndex: 1,
              explanation: `Covered calls trade a thin slice of upside for a real cushion. The July 15 regret was $${(peakBar.close - cap630).toFixed(2)}/share; the July 30 relief was worth far more. Judge the structure across the whole path, not at its most flattering or most painful moment.`,
            },
          ],
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "pick-the-cap",
      title: "Pick the cap, not the credit",
      subtitle: "$10 of strike for $4.38 of premium — two real calls, one week later",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**June 3**, META at $${jun600Entry.close}. The scanner returned two covered-call candidates on the same August 21 expiry, ${junCall630.dte} days out. Both score ${junCall630.score}–${junCall640.score}. Before you pick, do one piece of arithmetic: **strike + credit** is the most your shares can be worth.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which call do you sell against 100 shares?",
            goal: "Income on a core holding you'd rather not have called away",
            a: {
              label: "A · $630 call",
              date: "2026-06-03",
              side: "call",
              strike: 630,
              expiry: "2026-08-21",
              dte: junCall630.dte,
              bid: junCall630.bid,
              ask: junCall630.ask,
              mid: junCall630.mid,
              delta: junCall630.delta,
              iv: junCall630.iv,
              volume: junCall630.volume,
              note: `caps you at $${junCap630.toFixed(2)}`,
            },
            b: {
              label: "B · $640 call",
              date: "2026-06-03",
              side: "call",
              strike: 640,
              expiry: "2026-08-21",
              dte: junCall640.dte,
              bid: junCall640.bid,
              ask: junCall640.ask,
              mid: junCall640.mid,
              delta: junCall640.delta,
              iv: junCall640.iv,
              volume: junCall640.volume,
              note: `caps you at $${junCap640.toFixed(2)}`,
            },
            correct: "b",
            explanation: `B costs $${(junCall630.mid - junCall640.mid).toFixed(2)} of credit and buys $10 of strike — a net $${(junCap640 - junCap630).toFixed(2)} higher ceiling. That mattered: META's best close in the window was $${peakBar.close} on July 15. B's cap of $${junCap640.toFixed(2)} sat within $${(peakBar.close - junCap640).toFixed(2)} of it; A's cap of $${junCap630.toFixed(2)} was $${(peakBar.close - junCap630).toFixed(2)} short. B also keeps delta under 0.50 (${junCall640.delta.toFixed(2)} vs ${junCall630.delta.toFixed(2)}) — at ${junCall630.delta.toFixed(2)} you have sold more than half of every future dollar. The honest cost of B: ${junCall640.volume} contracts of day volume against ${junCall630.volume}, so expect a worse fill and check the quote before you lift it.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `On a position you want to keep, the strike question is not "which pays more" — it is **"at what price would I be genuinely happy to sell 100 shares?"** Set the cap there, then take whatever credit that strike happens to offer. Here the $10 of extra strike cost $${(junCall630.mid - junCall640.mid).toFixed(2)} and covered an additional $${(junCap640 - junCap630).toFixed(2)} of a move that actually happened.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "meta-cap-1",
              question: `The $630 call pays $${junCall630.mid.toFixed(2)} and the $640 pays $${junCall640.mid.toFixed(2)}. Why is the higher-credit contract usually the worse choice on a long-term holding?`,
              options: [
                "Higher credit always means a worse fill",
                `It is higher-credit because it is closer to the money (delta ${junCall630.delta.toFixed(2)} vs ${junCall640.delta.toFixed(2)}) — you are being paid more precisely because you are more likely to lose the shares`,
                "Higher-credit calls have shorter durations",
                "The scanner scores lower-credit contracts higher",
              ],
              correctIndex: 1,
              explanation: `Both contracts are the same expiry with nearly identical IV (${(junCall630.iv * 100).toFixed(1)}% vs ${(junCall640.iv * 100).toFixed(1)}%). The entire credit difference is moneyness. Premium is never free — it is the price of the risk you just took on.`,
            },
          ],
        },
      ],
    },
  ],
};
