// AMD case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/AMD.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/AMD.json";
import { bars, barOn, findPut, contractSeries, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

const t = raw as V2Ticker;

// ── Case 1: the top tick (2026-06-30, 520 put) ────────────────────────────
// AMD closes 580.91 — the peak of a +70% run off the May 4 low. The scanner's
// highest-priority AMD put that day expires 17 days later, deep in the wreck.
const jun30_520 = findPut(t, "2026-06-30", 520, "2026-07-17");
const topBar = barOn(t, "2026-06-30");
const ripLow = barOn(t, "2026-05-04");
const jul17 = barOn(t, "2026-07-17");

// ── Case 2: the wick that wasn't a trend (2026-06-03, 500 put) ────────────
const jun3_500 = findPut(t, "2026-06-03", 500, "2026-06-18");
const jun3 = barOn(t, "2026-06-03");
const jun8 = barOn(t, "2026-06-08");
const jun9 = barOn(t, "2026-06-09");
const jun18 = barOn(t, "2026-06-18");

// ── Case 3: the wide-spread rows (12 in this dataset) ─────────────────────
const jul13_480 = findPut(t, "2026-07-13", 480, "2026-07-22");
const jul15_510 = findPut(t, "2026-07-15", 510, "2026-07-22");
const jul22 = barOn(t, "2026-07-22");

// ── Case 4: highest AROC in the dataset vs the boring one ─────────────────
const jul22_515 = findPut(t, "2026-07-22", 515, "2026-07-29");
const jul23_500 = findPut(t, "2026-07-23", 500, "2026-07-31");
const jul23 = barOn(t, "2026-07-23");
const jul29 = barOn(t, "2026-07-29");
const jul31 = barOn(t, "2026-07-31");

// ── Case 5: the one contract scanned five times (450 put, 07-24 expiry) ───
const decay450 = contractSeries(t, "put", 450, "2026-07-24");
const decayFirst = decay450[0];
const decayLast = decay450[decay450.length - 1];
const decayTrough = decay450.reduce((m, p) => (p.mid < m.mid ? p : m));
const jul2 = barOn(t, "2026-07-02");
const jul24 = barOn(t, "2026-07-24");

// ── Case 6: the mirror image of case 1 (2026-06-10, 420 put) ──────────────
const jun10_420 = findPut(t, "2026-06-10", 420, "2026-06-18");
const jun10 = barOn(t, "2026-06-10");

export const AMD_CASES: Module = {
  id: "cs-amd",
  title: "AMD Case Studies",
  subtitle: "A +70% rip, a −26% unwind, and the 122% AROC contract that cost $7,334",
  icon: "🎢",
  color: "red-500",
  level: 2,
  track: "case-study",
  ticker: "AMD",
  universe: "opportunity",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "sold-the-top-tick",
      title: "The scanner's best idea was the top tick",
      subtitle: "10.5% out of the money on a stock that moves 10% in a day",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `You don't trade AMD. The scanner surfaced it anyway, over and over — 87 put candidates between May and August 2026.\n\nOn **June 30, 2026** AMD closed at **$${topBar.close}**, up ${(((topBar.close - barOn(t, "2026-06-29").close) / barOn(t, "2026-06-29").close) * 100).toFixed(1)}% on the day and **+${(((topBar.close - ripLow.close) / ripLow.close) * 100).toFixed(0)}%** from its May 4 close of $${ripLow.close}. It was the exact high of the window.\n\nThe pick that day: **$520 put, July 17 expiry**, $${jun30_520.mid.toFixed(2)} credit — delta ${jun30_520.delta.toFixed(2)}, IV ${(jun30_520.iv * 100).toFixed(0)}%, RSI ${jun30_520.rsi}, juiciness ${jun30_520.juiciness}, priority **${jun30_520.priority}**. The strike sat **${pctOtm(520, topBar.close)}% below spot** with ${jun30_520.dte} days to run.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "AMD — top tick to expiry (real bars)",
            bars: bars(t, "2026-06-22", "2026-07-17"),
            lines: [{ price: 520, label: "520 strike", color: "sky" }],
            markers: [
              { date: "2026-06-30", label: `sell ${jun30_520.mid.toFixed(2)}`, color: "violet" },
              { date: "2026-07-17", label: `exp ${jul17.close}`, color: "red", below: true },
            ],
            caption: `Two sessions after entry AMD traded $${barOn(t, "2026-07-02").low} — already through the strike. It never recovered: the July 17 low was $${jul17.low} and the close was $${jul17.close}, leaving the put $${(520 - jul17.close).toFixed(2)}/sh in the money against $${jun30_520.mid.toFixed(2)} collected.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Loss per contract: **$${((520 - jul17.close - jun30_520.mid) * 100).toFixed(0)}**. The ${jun30_520.aroc}% annualized return on the entry ticket assumed you'd keep the credit. You kept $${jun30_520.mid.toFixed(2)} and paid back $${(520 - jul17.close).toFixed(2)}.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "amd-top-1",
              question: `The 520 strike was ${pctOtm(520, topBar.close)}% out of the money with ${jun30_520.dte} days left. Why is that a thinner cushion than it sounds on AMD?`,
              options: [
                "Because 17 days is too long for any short put",
                `Because AMD moved more than that in a single session inside this same window — June 5 alone closed ${(((barOn(t, "2026-06-05").close - barOn(t, "2026-06-04").close) / barOn(t, "2026-06-04").close) * 100).toFixed(1)}% — so the buffer was worth about one bad day, not seventeen`,
                "Because delta 0.22 is too high for an income trade",
                "Because the IV was too low to compensate",
              ],
              correctIndex: 1,
              explanation: `"% out of the money" only means something relative to how far the stock actually travels. AMD ran ${(((topBar.close - ripLow.close) / ripLow.close) * 100).toFixed(0)}% in eight weeks and gave ${(((topBar.close - jul29.close) / topBar.close) * 100).toFixed(1)}% of it back in four. A ${pctOtm(520, topBar.close)}% buffer on a name like that is roughly one session of normal range.`,
            },
            {
              id: "amd-top-2",
              question: `RSI read ${jun30_520.rsi} and the catalyst line was "${jun30_520.catalyst}". What is the trap in that phrasing?`,
              options: [
                "Bollinger squeezes never resolve",
                "IV expansion is always bearish",
                "\"IV expanding\" and \"premium rich\" describe the same fact from the seller's flattering angle — the market was pricing a bigger move, and it got one",
                "RSI above 60 guarantees a reversal",
              ],
              correctIndex: 2,
              explanation:
                "Rich premium is not a free lunch the market forgot to price. It is the market's estimate of the range ahead. Selling into an expanding-IV squeeze at the top of a vertical run is taking the other side of that estimate at its most expensive moment.",
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "stops-and-wicks",
      title: "You place the stop — and it's the wrong instrument",
      subtitle: "The June 3 short put wicked $62 through the strike and still won",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 3, 2026**: AMD closes $${jun3.close}, RSI ${jun3_500.rsi} — overbought. The scanner offers the **$500 put, June 18 expiry** for **$${jun3_500.mid.toFixed(2)}** (delta ${jun3_500.delta.toFixed(2)}, IV ${(jun3_500.iv * 100).toFixed(0)}%, ${jun3_500.dte} DTE, juiciness ${jun3_500.juiciness}). The strike is ${pctOtm(500, jun3.close)}% below spot.\n\nBy **June 8** the position is already ugly: AMD closed $${jun8.close}, ${(((jun8.close - jun3.close) / jun3.close) * 100).toFixed(1)}% below your entry and **below your strike**. You manage it from here.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-05-28", "2026-06-18"),
            visibleUntil: "2026-06-08",
            strike: 500,
            credit: jun3_500.mid,
            entryDate: "2026-06-03",
            expiry: "2026-06-18",
            guide: { min: 425, max: 440 },
            explanation: `The next session was the worst of the trade: June 9 opened $${jun9.open}, collapsed to $${jun9.low} — $${(500 - jun9.low).toFixed(2)}/sh through your strike, a paper loss of about $${((500 - jun9.low - jun3_500.mid) * 100).toFixed(0)}/contract — and then closed the *same day* at $${jun9.close}. AMD finished expiry at $${jun18.close}. The put expired worthless and the seller kept the entire $${(jun3_500.mid * 100).toFixed(0)}.\n\nAny price stop tight enough to respect the $500 strike would have bought you out at or near the single worst tick of the trade. That is why the shaded zone sits *below* the wick: on a ${(jun3_500.iv * 100).toFixed(0)}%-IV name, the price stop is a disaster backstop, and the working instrument is a premium rule — buy it back at 2–3× the credit ($${(2 * jun3_500.mid).toFixed(2)}–$${(3 * jun3_500.mid).toFixed(2)}), which only fires if the option *stays* expensive rather than spiking for an hour.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Case 1 and case 2 disagree on purpose. A stop protects you from a **trend** (June 30 → July 17: down every leg, never recovered). It cannot protect you from a **wick** (June 9: down $${(jun3.close - jun9.low).toFixed(2)} and back up $${(jun9.close - jun9.low).toFixed(2)} inside one session). Distinguishing the two in advance is impossible — which is why the stop belongs where the *thesis* dies, not where the discomfort starts.`,
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "the-exit-tax",
      title: "Stop-market vs stop-limit through a 24% spread",
      subtitle: "Twelve AMD rows had spreads this wide — one had zero volume",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Every number in this lesson is a bid and an ask the scanner actually recorded.\n\n• **July 13**, $480 put (Jul 22): bid $${jul13_480.bid.toFixed(2)} / ask $${jul13_480.ask.toFixed(2)} — a $${(jul13_480.ask - jul13_480.bid).toFixed(2)} spread, **${(((jul13_480.ask - jul13_480.bid) / jul13_480.mid) * 100).toFixed(0)}% of the $${jul13_480.mid.toFixed(2)} mid**. Day volume: ${jul13_480.volume}.\n• **July 15**, $510 put (Jul 22): bid $${jul15_510.bid.toFixed(2)} / ask $${jul15_510.ask.toFixed(2)} — ${(((jul15_510.ask - jul15_510.bid) / jul15_510.mid) * 100).toFixed(0)}% of mid. Day volume: ${jul15_510.volume}.\n• **July 22**, $515 put (Jul 29): bid $${jul22_515.bid.toFixed(2)} / ask $${jul22_515.ask.toFixed(2)}, and day volume **${jul22_515.volume}** — nobody traded it at all.\n\nSell the 510 at the bid and you collect $${jul15_510.bid.toFixed(2)}. Buy it back at the ask and you pay $${jul15_510.ask.toFixed(2)}. The round trip hands $${(jul15_510.ask - jul15_510.bid).toFixed(2)}/sh — **$${((jul15_510.ask - jul15_510.bid) * 100).toFixed(0)} per contract** — to the market maker before the stock has moved a cent.`,
        },
        {
          type: "text",
          content: `Now put a stop on it. Say your rule is 2× credit, so you want out at $${(2 * jul15_510.bid).toFixed(2)}.\n\n• A **stop-market** guarantees you get out and takes whatever ask exists. In a ${jul15_510.volume}-contract line that ask can be ${(((jul15_510.ask - jul15_510.mid) / jul15_510.mid) * 100).toFixed(0)}% above mid — the slippage *is* the spread.\n• A **stop-limit** at $${(2 * jul15_510.bid).toFixed(2)} caps what you pay, but if the ask gaps past your limit it simply doesn't fill, and you're still short the put while it keeps repricing.\n\nBoth of those 22-expiry contracts expired worthless — AMD closed $${jul22.close} on July 22, far above both strikes. The spread cost nothing because nobody needed the exit. That's the whole point: **the spread is an exit tax you only pay in the trades that are already going wrong.**`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "amd-spread-1",
              question: `You need out of the July 22 $515 put — bid $${jul22_515.bid.toFixed(2)}, ask $${jul22_515.ask.toFixed(2)}, day volume ${jul22_515.volume}. Which order type is "safer"?`,
              options: [
                "Stop-limit — it can't fill at a bad price, so your risk is capped",
                "Stop-market — it always fills, so your risk is capped",
                "Neither is safer; they trade different risks — the limit risks not exiting at all, the market risks paying the full spread. On a zero-volume line you're choosing which one to eat",
                "Both are equivalent because the mid is the real price",
              ],
              correctIndex: 2,
              explanation: `A stop-limit caps price and leaves execution uncertain; a stop-market caps execution and leaves price uncertain. The $515 row shows why the choice matters here — a $${(jul22_515.ask - jul22_515.bid).toFixed(2)} spread on a $${jul22_515.mid.toFixed(2)} mid with zero contracts traded means the "price" on your screen is a suggestion, not a market.`,
            },
            {
              id: "amd-spread-2",
              question: "What is the more useful conclusion to draw from twelve wide-spread rows in one ticker's scan history?",
              options: [
                "Always use stop-limits on wide spreads",
                "Screen for liquidity at entry — a spread you can't exit through turns your stop rule into a suggestion, so the fix belongs before the trade, not during it",
                "Never sell puts on stocks above $400",
                "Trade only at the mid price",
              ],
              correctIndex: 1,
              explanation:
                "Order-type tuning is downstream damage control. The decision that actually changes the outcome is refusing the illiquid contract at entry, when it costs you nothing but the foregone premium.",
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "the-aroc-trap",
      title: "The AROC trap",
      subtitle: "The highest annualized return in the AMD dataset, and what it cost",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Late July, AMD is falling out of the June top and IV is above 90%. Two consecutive scan days, two short puts, same trade idea. One of them shows the **highest AROC of any AMD row in the dataset**.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you sell?",
            goal: "Income — collect the credit, keep the ability to get out",
            a: {
              label: "A · $515 put",
              date: "2026-07-22",
              side: "put",
              strike: 515,
              expiry: "2026-07-29",
              dte: jul22_515.dte,
              bid: jul22_515.bid,
              ask: jul22_515.ask,
              mid: jul22_515.mid,
              delta: jul22_515.delta,
              iv: jul22_515.iv,
              aroc: jul22_515.aroc,
              volume: jul22_515.volume,
              juiciness: jul22_515.juiciness,
              note: jul22_515.catalyst,
            },
            b: {
              label: "B · $500 put",
              date: "2026-07-23",
              side: "put",
              strike: 500,
              expiry: "2026-07-31",
              dte: jul23_500.dte,
              bid: jul23_500.bid,
              ask: jul23_500.ask,
              mid: jul23_500.mid,
              delta: jul23_500.delta,
              iv: jul23_500.iv,
              aroc: jul23_500.aroc,
              volume: jul23_500.volume,
              juiciness: jul23_500.juiciness,
              note: jul23_500.catalyst,
            },
            correct: "b",
            explanation: `A pays ${jul22_515.aroc}% annualized against B's ${jul23_500.aroc}%. It also has a ${(((jul22_515.ask - jul22_515.bid) / jul22_515.mid) * 100).toFixed(0)}% spread and ${jul22_515.volume} contracts of volume versus B's ${(((jul23_500.ask - jul23_500.bid) / jul23_500.mid) * 100).toFixed(0)}% and ${jul23_500.volume}, and its strike is only ${pctOtm(515, jul22.close)}% below spot versus ${pctOtm(500, jul23.close)}% for B.\n\nBoth lost. A expired July 29 with AMD at $${jul29.close} — $${(515 - jul29.close).toFixed(2)}/sh in the money, **−$${((515 - jul29.close - jul22_515.mid) * 100).toFixed(0)} per contract**. B expired July 31 at $${jul31.close}, $${(500 - jul31.close).toFixed(2)} ITM, **−$${((500 - jul31.close - jul23_500.mid) * 100).toFixed(0)}**. The extra ${((jul22_515.aroc ?? 0) - (jul23_500.aroc ?? 0)).toFixed(0)} points of AROC bought a loss ${(((515 - jul29.close - jul22_515.mid) * 100) / ((500 - jul31.close - jul23_500.mid) * 100)).toFixed(1)}× larger.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "One week, both strikes taken out (real bars)",
            bars: bars(t, "2026-07-20", "2026-08-05"),
            lines: [
              { price: 515, label: "A: 515", color: "red" },
              { price: 500, label: "B: 500", color: "amber" },
            ],
            markers: [
              { date: "2026-07-29", label: `A exp ${jul29.close}`, color: "red", below: true },
              { date: "2026-07-31", label: `B exp ${jul31.close}`, color: "amber" },
            ],
            caption: `AMD fell from $${jul22.close} on July 22 to a $${jul29.low} low on July 29 — the trough of a ${(((topBar.close - jul29.close) / topBar.close) * 100).toFixed(1)}% drawdown off the June 30 peak — then rebounded ${(((barOn(t, "2026-07-30").close - jul29.close) / jul29.close) * 100).toFixed(0)}% the next session. A's expiry landed on the worst day; B's landed two sessions later, after the bounce. Same thesis, different calendar, ${(((515 - jul29.close - jul22_515.mid) * 100) / ((500 - jul31.close - jul23_500.mid) * 100)).toFixed(1)}× the damage.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `AROC is credit ÷ collateral ÷ time. Every one of those levers gets better by moving the strike closer, shortening the expiry, or picking a contract nobody trades — the three things that make a short put more dangerous. Treat a chart-topping AROC as a **question**, not a ranking.`,
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "watch-the-premium-move",
      title: "Watch a real premium decay",
      subtitle: "One contract, five scans, IV up 19 points and the price down anyway",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The scanner caught the **$450 put expiring July 24** on ${decay450.length} separate days between ${decayFirst.date} and ${decayLast.date}. That's not a model — it's the same contract, re-priced by the real market ${decay450.length} times.\n\nAt the first scan it was ${decayFirst.dte} DTE, mid $${decayFirst.mid.toFixed(2)}, IV ${(decayFirst.iv * 100).toFixed(0)}%, theta ${decayFirst.theta.toFixed(2)}. AMD had closed $${jul2.close} the session before, putting the strike ${pctOtm(450, jul2.close)}% out of the money. Scrub through what happened next.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: "AMD $450 put — five real scans of one contract",
            side: "put",
            strike: 450,
            expiry: "2026-07-24",
            series: decay450,
            caption: `Two forces fight across these ${decay450.length} points. Theta wins: DTE falls ${decayFirst.dte} → ${decayLast.dte} and the mid drops from $${decayFirst.mid.toFixed(2)} to $${decayTrough.mid.toFixed(2)} by ${decayTrough.date} — down ${(((decayFirst.mid - decayTrough.mid) / decayFirst.mid) * 100).toFixed(0)}%. But look at the dashed IV line: it *rose* from ${(decayFirst.iv * 100).toFixed(0)}% to ${(decayTrough.iv * 100).toFixed(0)}% over the same stretch. Then on ${decayLast.date} AMD dropped to a $${jul17.low} low and the mid jumped back to $${decayLast.mid.toFixed(2)} (+${(((decayLast.mid - decayTrough.mid) / decayTrough.mid) * 100).toFixed(0)}% in one session) even though the strike was never touched — that's vega and delta repricing a scare. AMD closed expiry at $${jul24.close}; the put expired worthless.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `A short put makes money three ways and loses it three ways: time (theta, always in your favour), direction (delta), and fear (vega). This contract had delta and vega working *against* it for three straight weeks and still paid $${(decayFirst.mid * 100).toFixed(0)} — because ${decayFirst.dte} days of theta on a ${(decayFirst.iv * 100).toFixed(0)}%-IV name is a big number. That is the actual edge in put selling, and it's the only one of the three you can count on.`,
        },
        {
          type: "text",
          content: `Two practical notes from the same five rows:\n• The mid never came close to a 2× stop ($${(2 * decayFirst.mid).toFixed(2)}) — the position was uncomfortable, never wrong. Distinguishing those is what a premium rule is for.\n• Day volume on the quiet ${decayTrough.date} scan was ${decayTrough.volume}; on the ${decayLast.date} scare it was **${decayLast.volume}**, and the spread tightened to $${(decayLast.ask - decayLast.bid).toFixed(2)} (${(((decayLast.ask - decayLast.bid) / decayLast.mid) * 100).toFixed(0)}% of mid). Liquidity arrived on the day you might have wanted out — the opposite of the July 22 $515 row, and not something you can count on.`,
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "the-other-side-of-the-swing",
      title: "The same scanner, one week later",
      subtitle: "Strike under the panic low — the mirror image of case 1",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**June 10, 2026**: AMD closes $${jun10.close}, one session after the $${jun9.low} capitulation wick. RSI has cooled to ${jun10_420.rsi}. The scanner's pick: **$420 put, June 18 expiry** for **$${jun10_420.mid.toFixed(2)}** — delta ${jun10_420.delta.toFixed(2)}, IV ${(jun10_420.iv * 100).toFixed(0)}%, juiciness ${jun10_420.juiciness}, priority ${jun10_420.priority}, ${jun10_420.volume} contracts traded, spread ${(((jun10_420.ask - jun10_420.bid) / jun10_420.mid) * 100).toFixed(0)}% of mid.\n\nThe geometry is the thing. The strike sits ${pctOtm(420, jun10.close)}% below spot **and $${(jun9.low - 420).toFixed(2)} below the June 9 panic low** — under a level the market had already tested and rejected.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Strike beneath a tested low (real bars)",
            bars: bars(t, "2026-06-03", "2026-06-18"),
            lines: [
              { price: 420, label: "420 strike", color: "emerald" },
              { price: jun9.low, label: `Jun 9 low ${jun9.low}`, color: "amber" },
            ],
            markers: [
              { date: "2026-06-10", label: "entry", color: "violet" },
              { date: "2026-06-18", label: `exp ${jun18.close}`, color: "emerald", below: true },
            ],
            caption: `AMD never traded within $${(Math.min(...bars(t, "2026-06-10", "2026-06-18").map((b) => b.low)) - 420).toFixed(2)} of the strike after entry. The put expired worthless at $${jun18.close} — $${(jun10_420.mid * 100).toFixed(0)} kept in ${jun10_420.dte} days, ${jun10_420.aroc}% annualized, and the position was never stressed for a single session.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "amd-mirror-1",
              question: "Same ticker, same scanner, same strategy — what actually separated this entry from the June 30 top-tick trade?",
              options: [
                "This one collected less premium, so it was safer by definition",
                `Where the strike sat relative to *tested* price and where in the swing the entry happened: $420 was below a low the market had already rejected, entered after the washout, versus ${pctOtm(520, topBar.close)}% below an untested all-time high entered at the top of a +${(((topBar.close - ripLow.close) / ripLow.close) * 100).toFixed(0)}% run`,
                "The June 18 expiry was further out",
                "IV was lower, so the trade was less risky",
              ],
              correctIndex: 1,
              explanation: `Note that this trade had *higher* IV (${(jun10_420.iv * 100).toFixed(0)}% vs ${(jun30_520.iv * 100).toFixed(0)}%) and *higher* AROC (${jun10_420.aroc}% vs ${jun30_520.aroc}%) than the losing one. None of the columns you'd screen on told you which was which. Position in the swing and the price level under the strike did.`,
            },
            {
              id: "amd-mirror-2",
              question: "AMD was never in your portfolio. What is the case for studying it anyway?",
              options: [
                "Opportunity tickers always outperform the ones you hold",
                "The scanner surfaced 87 AMD puts in three months, so these are trades you plausibly could have taken — and the mistakes are cheaper to learn from a name you have no attachment to",
                "AMD's option chain is unusually simple",
                "You should trade every high-juiciness candidate the scanner finds",
              ],
              correctIndex: 1,
              explanation:
                "The whole point of an opportunity ticker: no cost basis, no sunk-cost story, no conviction to defend. The entry logic transfers to the names you do trade; the emotional baggage doesn't.",
            },
          ],
        },
      ],
    },
  ],
};
