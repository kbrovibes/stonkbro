// RKLB case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/RKLB.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.
//
// RKLB is the thinnest ticker in the set: 66 sessions produced 8 scan days and
// no call rows at all. The scarcity is the lesson.

import raw from "@/lib/learn/v2-data/RKLB.json";
import { bars, barOn, findPut, contractSeries, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// ── Case 1: what the scanner actually produced on a ±60% stock ─────────────
const allPuts = t.snapshots.flatMap((s) => s.puts);
const scanDays = new Set(t.snapshots.map((s) => s.date)).size;
const callRows = t.snapshots.reduce((n, s) => n + s.calls.length, 0);
const contracts = new Set(allPuts.map((o) => `${o.strike}|${o.expiry}`)).size;
const ivLo = Math.min(...allPuts.map((o) => o.iv));
const ivHi = Math.max(...allPuts.map((o) => o.iv));
const ripLow = barOn(t, "2026-05-07"); // 78.58 — the launch pad
const peak = barOn(t, "2026-05-27"); // 150.23 — the top
const trough = barOn(t, "2026-07-29"); // 58.60 — the bottom

// ── Case 2: the 130% IV winner (2026-06-09, 90 put) ────────────────────────
const june90 = findPut(t, "2026-06-09", 90, "2026-06-18");
const june90Entry = barOn(t, "2026-06-09");
const june90Expiry = barOn(t, "2026-06-18");
const june90Sigma = june90.iv * Math.sqrt(june90.dte / 365) * june90Entry.close;

// ── Case 3: the stop that got gapped (2026-07-01, 90 put) ──────────────────
const july90 = findPut(t, "2026-07-01", 90, "2026-07-17");
const july90Entry = barOn(t, "2026-07-01");
const july90Expiry = barOn(t, "2026-07-17");
const gapDay = barOn(t, "2026-07-07");
const lastCalmDay = barOn(t, "2026-07-06");
// Widest quotes in the dataset — the stop-limit problem, in real numbers.
const wide85 = findPut(t, "2026-06-29", 85, "2026-07-17");
const post60 = findPut(t, "2026-07-16", 60, "2026-07-31");
const post60Entry = barOn(t, "2026-07-16");
const post60Sigma = post60.iv * Math.sqrt(post60.dte / 365) * post60Entry.close;

// ── Case 4: three scans of decay, then a cliff ─────────────────────────────
const decay85 = contractSeries(t, "put", 85, "2026-07-17");
const decayFirst = decay85[0];
const decayLast = decay85[decay85.length - 1];
const pick85 = findPut(t, "2026-07-06", 85, "2026-07-24");
const pick80 = findPut(t, "2026-07-06", 80, "2026-07-17");
const pickEntry = barOn(t, "2026-07-06");
const pick85Expiry = barOn(t, "2026-07-24");

const spreadPct = (o: { bid: number; ask: number; mid: number }) =>
  ((o.ask - o.bid) / o.mid) * 100;

export const RKLB_CASES: Module = {
  id: "cs-rklb",
  title: "RKLB Case Studies",
  subtitle: `A 91% rip, a 61% collapse, and only ${contracts} contracts worth selling`,
  icon: "🚀",
  color: "orange-500",
  level: 2,
  track: "case-study",
  ticker: "RKLB",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "thin-chain-in-a-hurricane",
      title: "A hurricane with almost nothing to trade",
      subtitle: "The most violent chart in the dataset produced the fewest trades",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Between May 1 and August 5, 2026, RKLB ran from $${ripLow.close} (May 7) to **$${peak.close}** (May 27) — **+${(((peak.close - ripLow.close) / ripLow.close) * 100).toFixed(1)}%** in fourteen sessions — then fell to **$${trough.close.toFixed(2)}** on July 29 — a **${Math.abs(((trough.close - peak.close) / peak.close) * 100).toFixed(1)}% drawdown** from the peak.\n\nAcross those ${bars(t).length} sessions the scanner surfaced **${allPuts.length} put rows on ${scanDays} scan days**, covering just ${contracts} distinct contracts — and **${callRows} call rows**. Every row sat in a narrow band: delta ${Math.min(...allPuts.map((o) => o.delta)).toFixed(2)}–${Math.max(...allPuts.map((o) => o.delta)).toFixed(2)}, ${Math.min(...allPuts.map((o) => o.dte))}–${Math.max(...allPuts.map((o) => o.dte))} DTE, IV **${(ivLo * 100).toFixed(0)}–${(ivHi * 100).toFixed(0)}%**.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "RKLB, May–August 2026 (real bars)",
            bars: bars(t),
            markers: [
              { date: "2026-05-08", label: "+34%", color: "emerald" },
              { date: "2026-05-27", label: `peak ${peak.close}`, color: "emerald" },
              { date: "2026-07-29", label: `low ${trough.close}`, color: "red", below: true },
            ],
            caption: `The whole tradeable record on this chart is ${scanDays} scan days clustered between June 9 and July 16 — the scanner had almost nothing to say during the rip that made the name famous.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A stock moving ${(((peak.close - ripLow.close) / ripLow.close) * 100).toFixed(0)}% in three weeks looks like the best premium-selling opportunity on your screen. What it actually produces is a chain priced at ${(ivLo * 100).toFixed(0)}–${(ivHi * 100).toFixed(0)}% IV with quotes too wide and volume too thin for most contracts to clear a quality filter. **An empty candidate list on a wild ticker is the filter working, not failing.**`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "rklb-scarcity-1",
              question: `${bars(t).length} sessions of extreme movement produced only ${allPuts.length} scanner rows on ${scanDays} days. What is the most useful read?`,
              options: [
                "The scanner was broken during the rip",
                "Big price movement and tradeable premium are different things — the same volatility that inflates IV also widens spreads and thins the chain, so most contracts never clear liquidity and quality bars",
                "RKLB options are always untradeable",
                "You should lower your filters until candidates appear",
              ],
              correctIndex: 1,
              explanation:
                "Movement creates premium; liquidity decides whether you can actually capture it. On a name like this the honest position most days is no position — and loosening filters to force a trade is exactly how you end up in the contracts that lost money in the next three lessons.",
            },
            {
              id: "rklb-scarcity-2",
              question: `The dataset contains ${callRows} call rows for RKLB. What can these case studies legitimately say about covered calls on it?`,
              options: [
                "That tight call strikes would have capped the May rip",
                "That the rip made calls a great sell",
                "Nothing — with no call snapshots, any covered-call number would be invented rather than observed",
                "That calls were priced the same as the puts",
              ],
              correctIndex: 2,
              explanation:
                "Discipline about what your data supports is a trading skill, not just a research one. Every claim in this module traces to a real snapshot or price bar; the call side of RKLB simply isn't in the record, so it stays out of the lessons.",
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "iv-at-130",
      title: "The 130% IV winner that was never safe",
      subtitle: "A clean win where the strike still sat inside one standard deviation",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 9, 2026.** RKLB closes at $${june90Entry.close} after trading an $${(june90Entry.high - june90Entry.low).toFixed(2)} range in one session (high $${june90Entry.high.toFixed(2)}, low $${june90Entry.low.toFixed(2)}). The scanner offers the **$90 put expiring June 18** at **$${june90.mid.toFixed(2)}** — ${pctOtm(90, june90Entry.close)}% out of the money, delta ${june90.delta.toFixed(2)}, ${june90.aroc}% AROC, IV **${(june90.iv * 100).toFixed(0)}%**, and ${june90.volume} contracts of day volume — the most liquid row in the entire RKLB dataset.\n\nIt worked. RKLB never closed below $${Math.min(...bars(t, "2026-06-09", "2026-06-18").map((b) => b.close))} and finished expiry at $${june90Expiry.close}. The put expired worthless: **+$${(june90.mid * 100).toFixed(0)} per contract in ${june90.dte} days.**`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The one that worked (real bars)",
            bars: bars(t, "2026-06-05", "2026-06-18"),
            lines: [{ price: 90, label: "90 strike", color: "emerald" }],
            markers: [
              { date: "2026-06-09", label: "entry", color: "violet" },
              { date: "2026-06-12", label: `low ${barOn(t, "2026-06-12").low}`, color: "amber", below: true },
              { date: "2026-06-18", label: `exp ${june90Expiry.close}`, color: "emerald" },
            ],
            caption: `Closest approach was the June 12 low of $${barOn(t, "2026-06-12").low} — still $${(barOn(t, "2026-06-12").low - 90).toFixed(2)} above the strike. Comfortable in hindsight; read the next section before you file it as "safe".`,
          },
        },
        {
          type: "text",
          content: `Here is what ${(june90.iv * 100).toFixed(0)}% implied volatility actually meant over the ${june90.dte} days of this trade:\n\n• One standard deviation ≈ IV × √(DTE/365) × price = **$${june90Sigma.toFixed(2)}**\n• The strike sat $${(june90Entry.close - 90).toFixed(2)} below spot\n• So the cushion was **${((june90Entry.close - 90) / june90Sigma).toFixed(2)}σ** — inside a routine move\n\nThe theta line says the same thing from the other side: at $${june90.theta.toFixed(2)}/day against a $${june90.mid.toFixed(2)} mid, the market was paying out **${((-june90.theta / june90.mid) * 100).toFixed(0)}% of the premium per day** because it genuinely expected the stock to travel.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "rklb-iv-1",
              question: `The strike was ${pctOtm(90, june90Entry.close)}% OTM and the trade won. Why is "${pctOtm(90, june90Entry.close)}% OTM is a wide cushion" still the wrong conclusion?`,
              options: [
                "Because the premium was too small",
                `Because percent-OTM only means something relative to the stock's volatility — at ${(june90.iv * 100).toFixed(0)}% IV the strike was under one standard deviation away, so the trade won on direction, not on distance`,
                "Because the delta was too low",
                "Because 9-day options never have real risk",
              ],
              correctIndex: 1,
              explanation: `1σ over ${june90.dte} days at ${(june90.iv * 100).toFixed(0)}% IV was $${june90Sigma.toFixed(2)} — the $90 strike was only ${((june90Entry.close - 90) / june90Sigma).toFixed(2)}σ below spot. The identical distance on a 30% IV stock would be a genuinely remote strike. Always measure the cushion in sigmas, not percent.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "the-gap-that-ate-the-stop",
      title: "The gap that ate the stop",
      subtitle: "Where you put it decided whether you exited at $95 or watched $82",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `**July 1, 2026.** RKLB closes $${july90Entry.close}, having bounced hard off the late-June flush. The scanner offers the **$90 put, July 17 expiry** at **$${july90.mid.toFixed(2)}** ($${july90.premium.toFixed(0)} credit) — ${pctOtm(90, july90Entry.close)}% OTM, delta ${july90.delta.toFixed(2)}, ${july90.dte} DTE, ${july90.aroc}% AROC.\n\nThe catalyst line: *"${july90.catalyst}"*\n\nNotice what that thesis does **not** give you: a price level. "IV expanding" tells you nothing about where you are wrong. If your reason to be in a trade has no invalidation level, you have to supply one before you enter.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-22", "2026-07-17"),
            visibleUntil: "2026-07-02",
            strike: 90,
            credit: july90.mid,
            entryDate: "2026-07-01",
            expiry: "2026-07-17",
            guide: { min: 95, max: 96.5 },
            explanation: `The recommended band has two real anchors: the June 22 low of $${barOn(t, "2026-06-22").low} — the last tested level below entry — and $${(july90Entry.close - (july90Entry.close - 90) / 2).toFixed(2)}, the point where half your cushion to the strike is gone. A stop in that band triggered on **July 6**, an orderly session that opened $${lastCalmDay.open.toFixed(2)} and traded down to $${lastCalmDay.low.toFixed(2)}. Any stop below $${lastCalmDay.low.toFixed(2)} never got a fill at its own number: July 7 opened at $${gapDay.open}, below the entire prior session, and traded to $${gapDay.low}. RKLB closed expiry at $${july90Expiry.close}, leaving the put $${(90 - july90Expiry.close).toFixed(2)}/sh in the money: a **$${((90 - july90Expiry.close - july90.mid) * 100).toFixed(0)} loss** against $${july90.premium.toFixed(0)} collected, or ${((90 - july90Expiry.close - july90.mid) / july90.mid).toFixed(1)}× the credit.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `A stop is a trigger, not a fill price. July 7 opened at $${gapDay.open}, $${(lastCalmDay.low - gapDay.open).toFixed(2)} below the *lowest* price of the previous session — so every stop between $${gapDay.open.toFixed(2)} and $${lastCalmDay.low.toFixed(2)} fired at the open on a gap, not at your number. Gap risk is why the useful stop sits where the trade is *first* wrong, not where the loss is already unbearable.`,
        },
        {
          type: "text",
          content: `Now the second half of the problem: **getting out of an RKLB option costs real money.** The two widest quotes in the dataset:\n\n• June 29, $85 put (Jul 17): bid $${wide85.bid} / ask $${wide85.ask} — **${spreadPct(wide85).toFixed(1)}% of mid**, on ${wide85.volume} contracts of volume\n• July 16, $60 put (Jul 31): bid $${post60.bid} / ask $${post60.ask} — **${spreadPct(post60).toFixed(1)}% of mid**, on ${post60.volume} contracts\n\nA **stop-market** on the June 29 contract buys back at the ask: $${wide85.ask.toFixed(2)} against a $${wide85.mid.toFixed(2)} mid, so $${((wide85.ask - wide85.mid) * 100).toFixed(0)} per contract — **${(((wide85.ask - wide85.mid) / wide85.mid) * 100).toFixed(0)}% of the credit you collected** — vanishes in the exit alone. A **stop-limit** at the mid protects you from that, and on a chain trading ${Math.min(...allPuts.map((o) => o.volume ?? 0))}–${Math.max(...allPuts.map((o) => o.volume ?? 0))} contracts a day it may simply never fill while the stock keeps falling.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "rklb-stop-1",
              question: `You are short the June 29 $85 put (${spreadPct(wide85).toFixed(1)}% spread) and your stop triggers during a fast decline. Stop-market or stop-limit?`,
              options: [
                "Stop-limit at the mid, always — never pay the spread",
                "Stop-market, always — fills are what matter",
                "Neither in isolation: on a wide, thin chain the real fix is sizing the position so a market exit at the ask is survivable, and using a limit only when you can sit and work the order",
                "Stop-limit, then cancel if it doesn't fill in a week",
              ],
              correctIndex: 2,
              explanation: `Both order types fail on an illiquid chain — one costs you ${(((wide85.ask - wide85.mid) / wide85.mid) * 100).toFixed(0)}% of the credit, the other may not fill at all. The decision that actually mattered happened before entry: a spread this wide is a reason to trade smaller or skip the name, because your exit is priced in from the start.`,
            },
            {
              id: "rklb-stop-2",
              question: `On July 16 the scanner offered the $60 put (${post60.dte} DTE, IV ${(post60.iv * 100).toFixed(0)}%) with RKLB at $${post60Entry.close}, and its catalyst advertised a "15% downside cushion". It expired OTM at $${barOn(t, "2026-07-31").close}. Was the cushion as wide as it sounded?`,
              options: [
                "Yes — 15% is a wide margin on any stock",
                `No — 1σ over those ${post60.dte} days was about $${post60Sigma.toFixed(2)}, so the strike sat roughly ${((post60Entry.close - 60) / post60Sigma).toFixed(2)}σ away, and RKLB in fact traded to $${trough.low} on July 29`,
                "Yes, because it expired worthless",
                "The cushion doesn't matter once IV is above 90%",
              ],
              correctIndex: 1,
              explanation: `The only clean winner after the crash still spent July 29 below its strike (low $${trough.low}) and needed the last two sessions to recover. A percentage cushion quoted without the volatility it has to absorb is marketing, not risk management.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "three-scans-that-lied",
      title: "Three scans of decay, then a cliff",
      subtitle: "The premium path looked perfect right up until the stock lost a third",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `The **$85 put expiring July 17** is the only RKLB contract the scanner quoted on more than one day — ${decay85.length} scans, ${decayFirst.date} through ${decayLast.date}. Scrub through them. Every reading a premium seller wants to see is present: mid down ${Math.abs(((decayLast.mid - decayFirst.mid) / decayFirst.mid) * 100).toFixed(0)}%, delta no higher than at entry, stock holding $${barOn(t, decayLast.date).close}. Ten sessions later it closed at $${july90Expiry.close}.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: "The only multi-scan contract in the RKLB dataset",
            side: "put",
            strike: 85,
            expiry: "2026-07-17",
            series: decay85.map((o) => ({
              date: o.date,
              dte: o.dte,
              mid: o.mid,
              iv: o.iv,
              delta: o.delta,
              theta: o.theta,
            })),
            caption: `$${decayFirst.mid.toFixed(2)} → $${decayLast.mid.toFixed(2)} in ${decay85.length} scans (${(((decayLast.mid - decayFirst.mid) / decayFirst.mid) * 100).toFixed(0)}%) while IV barely moved. Then the record stops — the contract never cleared the scanner again. RKLB closed July 17 at $${july90Expiry.close}, making this put $${(85 - july90Expiry.close).toFixed(2)}/sh ITM: a $${((85 - july90Expiry.close - decayFirst.mid) * 100).toFixed(0)} loss from the ${decayFirst.date} entry, ${((85 - july90Expiry.close - decayFirst.mid) / decayFirst.mid).toFixed(1)}× the credit.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Three consecutive green readings told you nothing about the fourth. Decay is a **certainty** on a short option; direction is not. A position that is "working" on the premium line is still carrying its full delta exposure — and on this contract the entire ${Math.abs(((decayLast.mid - decayFirst.mid) / decayFirst.mid) * 100).toFixed(0)}% of collected decay was erased many times over in the week that followed.`,
        },
        {
          type: "text",
          content: `**July 6**, four days after that last scan: RKLB closes $${pickEntry.close}, down from $${barOn(t, "2026-07-02").close}. The scanner surfaces two puts on the same day — the only same-day pair in the dataset. One of them is materially less bad than the other.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Same scan day, same stock — which do you sell?",
            goal: "Income on a name in a confirmed downtrend, with an exit you can actually execute",
            a: {
              label: "A · $85 put",
              date: "2026-07-06",
              side: "put",
              strike: 85,
              expiry: "2026-07-24",
              dte: pick85.dte,
              bid: pick85.bid,
              ask: pick85.ask,
              mid: pick85.mid,
              delta: pick85.delta,
              iv: pick85.iv,
              aroc: pick85.aroc,
              volume: pick85.volume,
              note: pick85.catalyst,
            },
            b: {
              label: "B · $80 put",
              date: "2026-07-06",
              side: "put",
              strike: 80,
              expiry: "2026-07-17",
              dte: pick80.dte,
              bid: pick80.bid,
              ask: pick80.ask,
              mid: pick80.mid,
              delta: pick80.delta,
              iv: pick80.iv,
              aroc: pick80.aroc,
              volume: pick80.volume,
              note: pick80.catalyst,
            },
            correct: "b",
            explanation: `Both lost. B lost less, and that is the whole exercise. A collected $${((pick85.mid - pick80.mid) * 100).toFixed(0)} more but sat ${pctOtm(85, pickEntry.close)}% OTM (vs ${pctOtm(80, pickEntry.close)}%) for ${pick85.dte - pick80.dte} extra days on a ${spreadPct(pick85).toFixed(1)}% spread with ${pick85.volume} contracts of volume — B's spread was ${spreadPct(pick80).toFixed(1)}% on ${pick80.volume}. A finished at the July 24 close of $${pick85Expiry.close}: $${(85 - pick85Expiry.close).toFixed(2)}/sh ITM, **-$${((85 - pick85Expiry.close - pick85.mid) * 100).toFixed(0)}**. B finished at the July 17 close of $${july90Expiry.close}: $${(80 - july90Expiry.close).toFixed(2)}/sh ITM, **-$${((80 - july90Expiry.close - pick80.mid) * 100).toFixed(0)}**. More distance, less time, and a spread you can exit through — every edge B had was a defensive one.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Both strikes, both expiries (real bars)",
            bars: bars(t, "2026-07-02", "2026-07-24"),
            lines: [
              { price: 85, label: "A: 85 strike", color: "red" },
              { price: 80, label: "B: 80 strike", color: "amber" },
            ],
            markers: [
              { date: "2026-07-06", label: "entry", color: "violet" },
              { date: "2026-07-17", label: `B exp ${july90Expiry.close}`, color: "red", below: true },
              { date: "2026-07-24", label: `A exp ${pick85Expiry.close}`, color: "red", below: true },
            ],
            caption: `Neither strike was ever seriously threatened at entry and both were breached within ${bars(t, "2026-07-07", "2026-07-10").length} sessions. When the trend is this clean, the productive question isn't which strike — it's whether to be short puts on this name at all.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "rklb-pick-1",
              question: `A paid ${(((pick85.mid - pick80.mid) / pick80.mid) * 100).toFixed(0)}% more premium than B. What did that extra credit actually buy?`,
              options: [
                "A better risk-adjusted return",
                `Compensation for sitting ${(pctOtm(pick80.strike, pickEntry.close) - pctOtm(pick85.strike, pickEntry.close)).toFixed(1)} points closer to the money, staying exposed ${pick85.dte - pick80.dte} days longer, and being harder to exit — the market charged for real risk, and every part of it showed up`,
                "Nothing — premium is arbitrary",
                "Protection against the downtrend",
              ],
              correctIndex: 1,
              explanation: `Extra premium is never free money; it is the price of whatever you gave up to get it. Here it was ${(pctOtm(pick80.strike, pickEntry.close) - pctOtm(pick85.strike, pickEntry.close)).toFixed(1)} points of cushion, ${pick85.dte - pick80.dte} extra days of exposure, and a spread ${(spreadPct(pick85) / spreadPct(pick80)).toFixed(1)}× wider on ${(pick80.volume ?? 0) - (pick85.volume ?? 0)} fewer contracts of daily volume.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "thin-chain-in-a-hurricane": {
      kind: "short-put",
      entryDate: "2026-07-16",
      strike: 60,
      expiry: "2026-07-31",
      credit: post60.mid,
      volume: post60.volume,
      note: "The worked contract here is the post-crash $60 put — the only clean winner the chain produced — because on a book this thin the defense is mostly decided before any order: fewer contracts, wider levels, alerts instead of resting stops.",
    },
    "iv-at-130": {
      kind: "short-put",
      entryDate: "2026-06-09",
      strike: 90,
      expiry: "2026-06-18",
      credit: june90.mid,
      volume: june90.volume,
    },
    "the-gap-that-ate-the-stop": {
      kind: "short-put",
      entryDate: "2026-07-01",
      strike: 90,
      expiry: "2026-07-17",
      credit: july90.mid,
      volume: july90.volume,
      support: { level: barOn(t, "2026-06-22").low, label: "June 22 swing low — the last tested level under the entry" },
      note: "The gap means neither trigger fills at its trigger price here — the orders bound the delay, not the slippage. What they still buy you is the exit on day one of the break instead of day ten.",
    },
    "three-scans-that-lied": {
      kind: "short-put",
      entryDate: "2026-07-06",
      strike: 80,
      expiry: "2026-07-17",
      credit: pick80.mid,
      volume: pick80.volume,
      note: "This block defends pick B, the less-bad $80. Three green decay scans changed nothing about where these orders belonged — they were placed before the first scan and fire on the same break either way.",
    },
  }),
};
