// TSLA case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/TSLA.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/TSLA.json";
import {
  bars,
  barOn,
  findPut,
  contractSeries,
  pctOtm,
  type V2Ticker,
} from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

/** Whole dollars, thousands-separated, sign carried by the surrounding prose. */
const usd = (x: number) => `$${Math.round(Math.abs(x)).toLocaleString("en-US")}`;

// ── Case 1: the "$436 support level" at the late-May lower high ────────────
const may425 = findPut(t, "2026-05-28", 425, "2026-06-05");
const mayEntry = barOn(t, "2026-05-28");
const mayExpiry = barOn(t, "2026-06-05"); // 391.00 — 34.00 through the strike

// ── Case 2: the bounce that lied (June 15 → June 26) ──────────────────────
const june395 = findPut(t, "2026-06-15", 395, "2026-06-26");
const juneEntry = barOn(t, "2026-06-15");
const juneExpiry = barOn(t, "2026-06-26");

// ── Case 3: two June 12 contracts, same expiry, very different spreads ────
const wide385 = findPut(t, "2026-06-12", 385, "2026-06-26"); // 9.10 / 10.65
const tight380 = findPut(t, "2026-06-12", 380, "2026-06-26"); // 6.90 / 7.05

// ── Case 4: the 400 put scanned four days running into the June 5 gap ─────
const june400Series = contractSeries(t, "put", 400, "2026-06-12");
const june400 = findPut(t, "2026-06-01", 400, "2026-06-12");
const gapDay = barOn(t, "2026-06-05");
const worstJune = barOn(t, "2026-06-10");
const june400Expiry = barOn(t, "2026-06-12");

// ── Case 5: assignment with no rescue (July 6 → the -14.5% gap) ───────────
const july400 = findPut(t, "2026-07-06", 400, "2026-07-17");
const julyEntry = barOn(t, "2026-07-06");
const julyExpiry = barOn(t, "2026-07-17");
const basis = 400 - july400.mid; // 393.60 effective cost if assigned
const crashDay = barOn(t, "2026-07-23");
const trough = barOn(t, "2026-07-29");
const lastBar = t.prices[t.prices.length - 1]; // 2026-08-05, close 323.21
const postCrash290 = findPut(t, "2026-07-28", 290, "2026-08-07");

// ── Case 6: the quote nobody traded (June 8 vs June 9, identical marks) ───
const stale385Prior = findPut(t, "2026-06-08", 385, "2026-06-18");
const stale385 = findPut(t, "2026-06-09", 385, "2026-06-18"); // volume 0
const live375 = findPut(t, "2026-06-09", 375, "2026-06-18"); // volume 1209

export const TSLA_CASES: Module = {
  id: "cs-tsla",
  title: "TSLA Case Studies",
  subtitle: "A 33% grind lower, support levels that never held, and an assignment that never came back",
  icon: "📉",
  color: "rose-500",
  level: 2,
  track: "case-study",
  ticker: "TSLA",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "support-level-mirage",
      title: "The $436 floor that wasn't a floor",
      subtitle: `Selling a lower high with ${pctOtm(425, mayEntry.close)}% of cushion`,
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `On **May 28, 2026** TSLA closed at **$${mayEntry.close}** — a lower high, two weeks after the $${barOn(t, "2026-05-13").close} peak. The scanner offered the **$425 put expiring June 5** for **$${may425.mid.toFixed(2)}** (delta ${may425.delta.toFixed(2)}, RSI ${may425.rsi}, ${may425.aroc}% AROC, juiciness ${may425.juiciness}).\n\nThe catalyst read: *"${may425.catalyst}"*\n\nThat strike sat just **${pctOtm(425, mayEntry.close)}% below spot** on a stock that routinely moved 5% in a session.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "TSLA — the late-May roll-over (real bars)",
            bars: bars(t, "2026-05-20", "2026-06-10"),
            lines: [
              { price: 425, label: "425 strike", color: "sky" },
              { price: 436, label: "claimed support", color: "amber" },
            ],
            markers: [
              { date: "2026-05-28", label: "entry", color: "violet" },
              { date: "2026-06-05", label: "expiry", color: "red", below: true },
            ],
            shadeAfter: "2026-06-05",
            caption: `The "$436 floor" broke on June 1 — the same session took out the strike too (low $${barOn(t, "2026-06-01").low}). Four sessions later TSLA fell ${Math.abs(((mayExpiry.close - barOn(t, "2026-06-04").close) / barOn(t, "2026-06-04").close) * 100).toFixed(1)}% in a day and closed expiry at $${mayExpiry.close}. The shaded bars are what came after: it kept going to $${barOn(t, "2026-06-10").low}.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `The put finished **$${(425 - mayExpiry.close).toFixed(2)}/sh in the money** against $${may425.mid.toFixed(2)} collected — a **${usd((425 - mayExpiry.close - may425.mid) * 100)} loss per contract**, or ${((425 - mayExpiry.close - may425.mid) / may425.mid).toFixed(1)}× the entire credit. You'd need ${Math.ceil((425 - mayExpiry.close - may425.mid) / may425.mid)} clean winners of the same size just to get back to flat.`,
        },
        {
          type: "text",
          content: `Three things were already wrong before price moved:\n• The "support level" ($436) sat **above** the $425 strike. Once it failed, nothing stood between price and the strike.\n• ${may425.dte} days to expiry on a stock whose average daily range that month was wider than the entire cushion.\n• RSI ${may425.rsi} — this was an entry into strength that had already rolled over from the $${barOn(t, "2026-05-13").close} high.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsla-sm-1",
              question: `The $425 put was ${pctOtm(425, mayEntry.close)}% out of the money with ${may425.dte} days left. Why is that cushion misleading on TSLA specifically?`,
              options: [
                `It isn't — ${pctOtm(425, mayEntry.close)}% is a wide cushion on any stock`,
                `Cushion only means something relative to the stock's own volatility: at ${(may425.iv * 100).toFixed(0)}% IV, a single session (June 5 fell ${Math.abs(((mayExpiry.close - barOn(t, "2026-06-04").close) / barOn(t, "2026-06-04").close) * 100).toFixed(1)}%) can eat it whole`,
                "The delta was too low to matter",
                `${pctOtm(425, mayEntry.close)}% cushions are fine as long as AROC is above 40%`,
              ],
              correctIndex: 1,
              explanation: `Percent-OTM is only meaningful next to expected move. TSLA was priced at ${(may425.iv * 100).toFixed(0)}% IV — the option market was openly saying moves of this size were routine. The ${may425.aroc}% AROC was the compensation for exactly that.`,
            },
            {
              id: "tsla-sm-2",
              question: `TSLA closed at $${mayExpiry.close} on expiry. Ignoring early management, what was the seller's P&L per contract?`,
              options: [
                `+$${(may425.mid * 100).toFixed(0)} — the credit collected`,
                `-${usd((425 - mayExpiry.close) * 100)} — the intrinsic value`,
                `-${usd((425 - mayExpiry.close - may425.mid) * 100)} — intrinsic loss less the credit`,
                `-${usd(may425.mid * 100)} — losses are capped at the premium`,
              ],
              correctIndex: 2,
              explanation: `(strike − close − credit) × 100 = (425 − ${mayExpiry.close} − ${may425.mid.toFixed(2)}) × 100 = -${usd((425 - mayExpiry.close - may425.mid) * 100)}. The credit softens the loss; it never caps it.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "the-bounce-that-lied",
      title: "You place the stop",
      subtitle: "The put came back OTM. Was that vindication, or your exit?",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 15**, TSLA at $${juneEntry.close}. The scanner surfaced the **$395 put expiring June 26** for **$${june395.mid.toFixed(2)}** (delta ${june395.delta.toFixed(2)}, ${june395.aroc}% AROC). Catalyst: *"${june395.catalyst}"*\n\nWhat happened next is the trap. On **June 17** TSLA traded down to $${barOn(t, "2026-06-17").low} — through the strike. Then it bounced, and by **June 22** it closed back at $${barOn(t, "2026-06-22").close}, comfortably above $395 again.\n\nThat bounce is your decision point. Set the level where you'd cut it.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-08", "2026-06-26"),
            visibleUntil: "2026-06-22",
            strike: 395,
            credit: june395.mid,
            entryDate: "2026-06-15",
            expiry: "2026-06-26",
            guide: { min: 393.5, max: 401 },
            explanation: `The strike itself was the line. TSLA had already probed it on June 17 (low $${barOn(t, "2026-06-17").low}) and the June 16 low was $${barOn(t, "2026-06-16").low} — a stop in the $393.50–$401 band exits on the next break instead of riding it. June 23 fell ${(((barOn(t, "2026-06-23").close - barOn(t, "2026-06-22").close) / barOn(t, "2026-06-22").close) * 100).toFixed(1)}% to $${barOn(t, "2026-06-23").close} and there was no second bounce: June 26 low $${juneExpiry.low}, close $${juneExpiry.close} — $${(395 - juneExpiry.close).toFixed(2)}/sh ITM against $${june395.mid.toFixed(2)} collected, a ${usd((395 - juneExpiry.close - june395.mid) * 100)} loss per contract.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A recovery back above your strike is not the trade working — it's the trade giving you a second chance to leave. The June 22 bounce was the last print above $395 in this dataset; TSLA never traded there again through August 5.`,
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "mid-price-fiction",
      title: "The AROC column is a mid-price fiction",
      subtitle: "Two June 12 puts, same expiry, one 15.7% wide",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Both of these were live scanner rows on **June 12, 2026**, same June 26 expiry. One shows the highest AROC in the entire TSLA dataset. Look at the bid and the ask before you pick.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put actually pays you more?",
            goal: "Income — maximize realized credit, not quoted credit",
            a: {
              label: "A · $385 put",
              date: "2026-06-12",
              side: "put",
              strike: 385,
              expiry: "2026-06-26",
              dte: wide385.dte,
              bid: wide385.bid,
              ask: wide385.ask,
              mid: wide385.mid,
              delta: wide385.delta,
              iv: wide385.iv,
              aroc: wide385.aroc,
              volume: wide385.volume,
              juiciness: wide385.juiciness,
              note: wide385.catalyst,
            },
            b: {
              label: "B · $380 put",
              date: "2026-06-12",
              side: "put",
              strike: 380,
              expiry: "2026-06-26",
              dte: tight380.dte,
              bid: tight380.bid,
              ask: tight380.ask,
              mid: tight380.mid,
              delta: tight380.delta,
              iv: tight380.iv,
              aroc: tight380.aroc,
              volume: tight380.volume,
              juiciness: tight380.juiciness,
              note: tight380.catalyst,
            },
            correct: "b",
            explanation: `A's ${wide385.aroc}% AROC is computed off a $${wide385.mid.toFixed(3)} mid that sits between a $${wide385.bid.toFixed(2)} bid and a $${wide385.ask.toFixed(2)} ask — ${(((wide385.ask - wide385.bid) / wide385.mid) * 100).toFixed(1)}% wide. As a seller you get filled near the bid. TSLA closed June 26 at $${juneExpiry.close}: A finished $${(385 - juneExpiry.close).toFixed(2)} ITM, so realistic net = $${wide385.bid.toFixed(2)} − $${(385 - juneExpiry.close).toFixed(2)} = **$${(wide385.bid - (385 - juneExpiry.close)).toFixed(2)}/sh**. B's spread was only ${(((tight380.ask - tight380.bid) / tight380.mid) * 100).toFixed(1)}% and it finished $${(380 - juneExpiry.close).toFixed(2)} ITM: net **$${(tight380.bid - (380 - juneExpiry.close)).toFixed(2)}/sh**. The lower-AROC contract paid ${(((tight380.bid - (380 - juneExpiry.close)) / (wide385.bid - (385 - juneExpiry.close)) - 1) * 100).toFixed(0)}% more.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `Sanity-check every scanner row against its spread: (ask − bid) ÷ mid. Under ~5% the mid is roughly real. Above ~10%, treat the **bid** as your credit and recompute the yield yourself — half of A's headline premium existed only in the arithmetic.`,
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "premium-down-risk-up",
      title: "Premium falling, risk rising",
      subtitle: "Four consecutive scans of one contract, right before the gap",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The **$400 put expiring June 12** was scanned four days running — June 1 through June 4 — and the dataset caught the whole path. Sold on June 1 at $${june400.mid.toFixed(2)} (TSLA $${barOn(t, "2026-06-01").close}), by June 3 the mid was down to $${june400Series[2].mid.toFixed(2)}: a ${Math.abs(((june400Series[2].mid - june400.mid) / june400.mid) * 100).toFixed(0)}% paper gain in two sessions.\n\nScrub through it and watch the dashed IV line while the solid premium line falls.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: "The $400 put, scan by scan",
            side: "put",
            strike: 400,
            expiry: "2026-06-12",
            series: june400Series,
            caption: `Premium fell ${Math.abs(((june400Series[june400Series.length - 1].mid - june400.mid) / june400.mid) * 100).toFixed(0)}% across the four scans while IV *rose* from ${(june400.iv * 100).toFixed(1)}% to ${(june400Series[june400Series.length - 1].iv * 100).toFixed(1)}% and the scanner's own juiciness score climbed ${june400.juiciness} → ${june400Series[june400Series.length - 1].juiciness}. Theta was paying the seller; the market was simultaneously repricing the tail.`,
          },
        },
        {
          type: "text",
          content: `Then June 5 happened: TSLA fell to a low of $${gapDay.low} and closed $${gapDay.close}. The put was **$${(400 - gapDay.low).toFixed(2)}/sh intrinsic** at the intraday worst against a $${june400.mid.toFixed(2)} credit. On June 10 it got worse — low $${worstJune.low}, $${(400 - worstJune.low).toFixed(2)} through the strike.\n\nAnd then it recovered. June 12 expiry closed **$${june400Expiry.close}** — the put expired worthless. Full $${(june400.mid * 100).toFixed(0)} credit kept.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `This is a winner on the scoreboard and a near-miss in risk terms. It cleared expiry by $${(june400Expiry.close - 400).toFixed(2)} after being roughly $${(400 - worstJune.low).toFixed(0)} underwater. Judging the entry by its outcome would teach you the wrong lesson — the *next* time TSLA was ~$20 through a strike (case 5) it kept going.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsla-pd-1",
              question: "Premium on the $400 put fell while its implied volatility rose. What was the market telling you?",
              options: [
                "Nothing — falling premium always means the trade is working",
                "IV was mispriced and should be sold more aggressively",
                "Time decay was outrunning the repricing: theta paid the seller day by day while rising IV said the distribution of outcomes was widening, not narrowing",
                "The contract had become illiquid",
              ],
              correctIndex: 2,
              explanation: `Mid is theta and vega netted together. Here theta won the daily scoreboard (${june400.theta.toFixed(2)}/day at entry) while vega quietly repriced the tail upward. A short put whose IV is climbing into expiry is a position the market is getting *less* comfortable with, however green the P&L column looks.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "assignment-without-a-rescue",
      title: "Assignment, and no recovery came",
      subtitle: "The case that breaks the wheel's favourite story",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `**July 6, 2026**: TSLA closed $${julyEntry.close} after a ${(((julyEntry.close - barOn(t, "2026-07-02").close) / barOn(t, "2026-07-02").close) * 100).toFixed(1)}% bounce day. The scanner flagged the **$400 put, July 17 expiry** at **$${july400.mid.toFixed(2)}** — priority *${july400.priority}*, juiciness ${july400.juiciness}, ${july400.aroc}% AROC, ${july400.volume} contracts traded. Catalyst: *"${july400.catalyst}"*\n\nBy July 17 TSLA closed **$${julyExpiry.close}** — $${(400 - julyExpiry.close).toFixed(2)} in the money, a ${usd((400 - julyExpiry.close - july400.mid) * 100)} loss per contract. Take assignment and your effective basis is **$${basis.toFixed(2)}**.\n\nThe wheel's standard comfort at this point: *"I own a stock I wanted anyway, and it recovers."* Here is what actually followed.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "After assignment — the real path (real bars)",
            bars: bars(t, "2026-07-06", "2026-08-05"),
            lines: [
              { price: 400, label: "400 strike", color: "sky" },
              { price: Number(basis.toFixed(2)), label: `basis ${basis.toFixed(2)}`, color: "emerald" },
            ],
            markers: [
              { date: "2026-07-17", label: "assigned", color: "violet" },
              { date: "2026-07-23", label: `${(((crashDay.close - barOn(t, "2026-07-22").close) / barOn(t, "2026-07-22").close) * 100).toFixed(1)}%`, color: "red", below: true },
              { date: "2026-07-29", label: `low ${trough.low}`, color: "red", below: true },
            ],
            caption: `Six sessions after assignment TSLA gapped ${Math.abs(((crashDay.close - barOn(t, "2026-07-22").close) / barOn(t, "2026-07-22").close) * 100).toFixed(1)}% lower to $${crashDay.close}, bottomed at $${trough.low} on July 29, and closed the dataset on August 5 at $${lastBar.close} — **${Math.abs(((lastBar.close - basis) / basis) * 100).toFixed(1)}% below the $${basis.toFixed(2)} basis**, an unrealized loss of ${usd((lastBar.close - basis) * 100)} per contract.`,
          },
        },
        {
          type: "text",
          content: `"Just keep wheeling it" doesn't rescue this either. The scanner's post-crash entry on **July 28** was the **$290 put** at $${postCrash290.mid.toFixed(2)} (RSI ${postCrash290.rsi}). At that credit you would need **${Math.ceil(((basis - lastBar.close) * 100) / (postCrash290.mid * 100))} consecutive winning cycles** to cover the ${usd((lastBar.close - basis) * 100)} hole — while holding shares that can fall again. And every call you sell against a $${basis.toFixed(2)} basis at $${lastBar.close} spot either caps the recovery or is written below your cost.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `Compare this with the PLTR module, where assignment worked out. Same strategy, same scanner, same window — opposite endings. The PLTR recovery is **one real path**, not a property of short puts. TSLA is the other path, and it is equally real.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsla-ar-1",
              question: "What actually distinguished this assignment from one that works out?",
              options: [
                "TSLA is a worse company than PLTR",
                "The credit collected was too small",
                "Nothing you could know at entry — which is the point: assignment outcomes depend on the path after you lose control, so the decision that matters is position size and the stop before you get there",
                "Assignment should always be avoided by rolling",
              ],
              correctIndex: 2,
              explanation: `Neither outcome was knowable on the entry date. That's precisely why "I'll just take the shares" cannot be your risk plan — it's a plan that outsources the result to a path you don't control. Size so that a ${Math.abs(((lastBar.close - basis) / basis) * 100).toFixed(0)}% hole on assigned stock is survivable, and use the stop while you still have one.`,
            },
            {
              id: "tsla-ar-2",
              question: `You hold assigned shares at a $${basis.toFixed(2)} basis with TSLA at $${lastBar.close}. Why is "sell covered calls to repair it" harder than it sounds?`,
              options: [
                "Covered calls can't be sold on assigned shares",
                `A call struck near your $${basis.toFixed(2)} basis is ~${(((basis - lastBar.close) / lastBar.close) * 100).toFixed(0)}% OTM and collects almost nothing, while a call with real premium sits far below your basis and locks in the loss if it's exercised`,
                "Assignment resets your cost basis to the market price",
                "You must wait 30 days after assignment",
              ],
              correctIndex: 1,
              explanation: `That's the repair trap in one line: premium worth collecting and strikes above your basis are on opposite ends of the chain. The wheel doesn't break here because of bad execution — it breaks because a ${Math.abs(((lastBar.close - basis) / basis) * 100).toFixed(0)}% gap is bigger than the income the strategy generates.`,
            },
          ],
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "quote-nobody-traded",
      title: "The quote nobody traded",
      subtitle: "Same bid, same ask, same Greeks — two days and 3% apart",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `On **June 8** the scanner listed the **$385 put, June 18 expiry** at $${stale385Prior.bid.toFixed(2)} / $${stale385Prior.ask.toFixed(2)} with TSLA at $${barOn(t, "2026-06-08").close}. On **June 9** it listed the same contract at **$${stale385.bid.toFixed(2)} / $${stale385.ask.toFixed(2)}** — identical bid, ask, delta (${stale385.delta.toFixed(4)}) and IV (${(stale385.iv * 100).toFixed(2)}%) — while TSLA had fallen ${(((barOn(t, "2026-06-09").close - barOn(t, "2026-06-08").close) / barOn(t, "2026-06-08").close) * 100).toFixed(1)}% to $${barOn(t, "2026-06-09").close}.\n\nThe tell is in the volume column: **${stale385.volume} contracts** traded that day. The quote hadn't updated because nobody had touched it.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Both scanned June 9, both expiring June 18. Which do you sell?",
            goal: "Income — a fill you can actually get, and get out of",
            a: {
              label: "A · $385 put",
              date: "2026-06-09",
              side: "put",
              strike: 385,
              expiry: "2026-06-18",
              dte: stale385.dte,
              bid: stale385.bid,
              ask: stale385.ask,
              mid: stale385.mid,
              delta: stale385.delta,
              iv: stale385.iv,
              aroc: stale385.aroc,
              volume: stale385.volume,
              juiciness: stale385.juiciness,
              note: stale385.catalyst,
            },
            b: {
              label: "B · $375 put",
              date: "2026-06-09",
              side: "put",
              strike: 375,
              expiry: "2026-06-18",
              dte: live375.dte,
              bid: live375.bid,
              ask: live375.ask,
              mid: live375.mid,
              delta: live375.delta,
              iv: live375.iv,
              aroc: live375.aroc,
              volume: live375.volume,
              juiciness: live375.juiciness,
              note: live375.catalyst,
            },
            correct: "b",
            explanation: `B is better on every axis at once: $${live375.mid.toFixed(2)} of credit versus $${stale385.mid.toFixed(2)}, a strike $10 further out of the money, ${live375.aroc}% AROC versus ${stale385.aroc}%, and ${live375.volume} contracts traded against A's ${stale385.volume}. The path confirmed it — TSLA's low over the remaining life was $${worstJune.low} on June 10, which put A **$${(385 - worstJune.low).toFixed(2)}/sh in the money** while B was never touched. Both expired OTM (June 18 close $${barOn(t, "2026-06-18").close}), but only one of them was a position you could have exited at a fair price mid-trade.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Greeks and premiums on a zero-volume row are a *model*, not a market. Before trusting any scanner line, check that the contract traded today — an unfilled quote tells you what your position is worth only until you try to sell it.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsla-qt-1",
              question: `The June 9 $385 row carried a "${stale385.priority}" priority and juiciness ${stale385.juiciness} despite zero volume. What does that tell you about screener scores?`,
              options: [
                "Screener scores already account for liquidity",
                "Zero volume is a data error and should be ignored",
                "Scores are computed from quoted prices and Greeks — liquidity is a separate check you have to run yourself before the score means anything",
                "High priority always overrides low volume",
              ],
              correctIndex: 2,
              explanation: `Juiciness, AROC and priority are all functions of the quote. If the quote is stale, every score built on it is stale too — and it will rank *higher*, not lower, because a quote that hasn't repriced against a falling stock looks abnormally generous.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "support-level-mirage": {
      kind: "short-put",
      entryDate: "2026-05-28",
      strike: 425,
      expiry: "2026-06-05",
      credit: may425.mid,
      volume: may425.volume,
      support: { level: 436, label: `claimed "$436 support" from the catalyst` },
    },
    "the-bounce-that-lied": {
      kind: "short-put",
      entryDate: "2026-06-15",
      strike: 395,
      expiry: "2026-06-26",
      credit: june395.mid,
      volume: june395.volume,
      note: "The June 22 bounce back above the strike is the moment these orders defend you from yourself: the exit rule already fired, and re-justifying the hold on a one-day recovery is how a credit-sized loss becomes a strike-sized one.",
    },
    "mid-price-fiction": {
      kind: "short-put",
      entryDate: "2026-06-12",
      strike: 380,
      expiry: "2026-06-26",
      credit: tight380.mid,
      volume: tight380.volume,
      note: `This block defends pick B. Pick A's defense starts earlier: on a ${(((wide385.ask - wide385.bid) / wide385.mid) * 100).toFixed(0)}%-wide quote, recompute the credit off the $${wide385.bid.toFixed(2)} bid before any order exists — half its headline premium was arithmetic, and a stop through that spread pays the difference twice.`,
    },
    "premium-down-risk-up": {
      kind: "short-put",
      entryDate: "2026-06-01",
      strike: 400,
      expiry: "2026-06-12",
      credit: june400.mid,
      volume: june400.volume,
      note: "On the scoreboard this exit looks like a mistake — the put expired worthless anyway. That is the point of the lesson: the block above prices what the near-miss cost to insure, and the same rule is what caps the TSLA trades in this module that did not come back.",
    },
    "assignment-without-a-rescue": {
      kind: "short-put",
      entryDate: "2026-07-06",
      strike: 400,
      expiry: "2026-07-17",
      credit: july400.mid,
      volume: july400.volume,
      note: `"I'll just take the shares" is not a defense — it hands the result to a path you don't control. The order below is what turns this study's ${usd((400 - julyExpiry.close - july400.mid) * 100)} assignment (and the crash that followed it) into a bounded, sized loss.`,
    },
    "quote-nobody-traded": {
      kind: "short-put",
      entryDate: "2026-06-09",
      strike: 375,
      expiry: "2026-06-18",
      credit: live375.mid,
      volume: live375.volume,
      note: `Row A needs no ticket: with ${stale385.volume} contracts traded, its quote is a model, not a market, and no defensive order against it can be real. Refusing the row is the defense.`,
    },
  }),
};
