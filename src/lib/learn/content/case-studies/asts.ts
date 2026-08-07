// ASTS case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/ASTS.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/ASTS.json";
import { bars, barOn, findPut, contractSeries, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

const t = raw as V2Ticker;

// ── The July collapse: the 75 put sold at the June 29 bounce high ──────────
const jun29p75 = findPut(t, "2026-06-29", 75, "2026-07-17");
const jun29Bar = barOn(t, "2026-06-29"); // close 86.77, a +21.4% day
const jul17Bar = barOn(t, "2026-07-17"); // expiry, close 57.80
const jul07Bar = barOn(t, "2026-07-07"); // first close under the 75 strike
const jul16Bar = barOn(t, "2026-07-16"); // -17.0% day, low 53.33
const p75Series = contractSeries(t, "put", 75, "2026-07-17"); // 4 real scans
const p75Last = p75Series[p75Series.length - 1]; // 07-02, mid 2.03

// ── Wide books: two real quotes on the same underlying, weeks apart ────────
const jun10p75 = findPut(t, "2026-06-10", 75, "2026-06-18"); // 1.91 / 2.51
const jul13p60 = findPut(t, "2026-07-13", 60, "2026-07-24"); // 0.92 / 1.09
const jul15p60 = findPut(t, "2026-07-15", 60, "2026-07-24"); // 1.10 / 1.17
const jul17p52 = findPut(t, "2026-07-17", 52, "2026-07-24"); // 1.04 / 1.30
const jul24Bar = barOn(t, "2026-07-24"); // close 56.20 — the 7/24 expiry

// ── The clean entry, after the washout ────────────────────────────────────
const jul24p51 = findPut(t, "2026-07-24", 51, "2026-07-31");
const jul29Bar = barOn(t, "2026-07-29"); // drawdown trough: low 52.80, close 53.03
const jul31Bar = barOn(t, "2026-07-31"); // expiry, close 58.98

// ── Window context (real bars) ────────────────────────────────────────────
const ripLow = barOn(t, "2026-05-05"); // 63.87
const ripHigh = barOn(t, "2026-05-28"); // 133.09 — the top
const lastBar = barOn(t, "2026-08-05"); // 67.52

const p75Loss = (75 - jul17Bar.close - jun29p75.mid) * 100; // $1,417.50
const spreadPct = (o: { bid: number; ask: number; mid: number }) =>
  ((o.ask - o.bid) / o.mid) * 100;

export const ASTS_CASES: Module = {
  id: "cs-asts",
  title: "ASTS Case Studies",
  subtitle: "A +108% rip, a -60% collapse, and every way a 20-delta put can lie to you",
  icon: "🛰️",
  color: "violet-500",
  level: 2,
  track: "case-study",
  ticker: "ASTS",
  universe: "traded",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "delta-is-not-a-safety-rating",
      title: "A 0.23 delta is not a safety rating",
      subtitle: "13.6% out of the money, and still $1,400 underwater",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `On **June 29, 2026**, ASTS closed at **$${jun29Bar.close}** after a +21.4% session. The scanner surfaced the **$75 put expiring July 17** at **$${jun29p75.mid.toFixed(2)}** — delta ${jun29p75.delta.toFixed(2)}, ${jun29p75.aroc}% AROC, juiciness ${jun29p75.juiciness}, ${jun29p75.volume} contracts traded that day.\n\nThe strike sat **${pctOtm(75, jun29Bar.close)}% below spot** with ${jun29p75.dte} days to run. The catalyst line: *"${jun29p75.catalyst}"*.\n\nRead that catalyst again. It is not a bull thesis — it is a note that **implied volatility is ${(jun29p75.iv * 100).toFixed(0)}%**. That number is the whole case study.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "ASTS — what 106% IV actually means (real bars)",
            bars: bars(t, "2026-06-22", "2026-07-17"),
            lines: [{ price: 75, label: "75 strike", color: "sky" }],
            markers: [
              { date: "2026-06-29", label: "entry", color: "violet" },
              { date: "2026-07-07", label: "strike lost", color: "amber", below: true },
              { date: "2026-07-17", label: `exp ${jul17Bar.close}`, color: "red", below: true },
            ],
            caption: `ASTS closed under the strike for the first time on July 7 ($${jul07Bar.close}), then fell ${Math.abs(((jul16Bar.close - barOn(t, "2026-07-15").close) / barOn(t, "2026-07-15").close) * 100).toFixed(1)}% in a single session on July 16 (low $${jul16Bar.low}). At expiry it closed $${jul17Bar.close} — the put finished $${(75 - jul17Bar.close).toFixed(2)}/sh in the money against $${jun29p75.mid.toFixed(2)} collected.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `That is a **$${p75Loss.toFixed(0)} loss per contract** on a trade that paid $${(jun29p75.mid * 100).toFixed(0)}. You would need roughly **${Math.round(p75Loss / (jun29p75.mid * 100))} identical winners** to get back to flat — and each winner takes ${jun29p75.dte} days of collateral to earn.`,
        },
        {
          type: "text",
          content: `Delta ≈ the market's odds the strike gets breached. A 0.23 delta on a 20% IV utility is a rare event. **The same 0.23 delta on a ${(jun29p75.iv * 100).toFixed(0)}% IV name is a routine one** — the option chain was pricing a move of exactly this size, and charging $${jun29p75.mid.toFixed(2)} for it.\n\nThe premium was not free money. It was an accurate quote for the risk you took.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "asts-delta-1",
              question: `The put was ${pctOtm(75, jun29Bar.close)}% OTM with a 0.23 delta. Why did that cushion evaporate?`,
              options: [
                "The delta calculation was wrong",
                `At ${(jun29p75.iv * 100).toFixed(0)}% IV the market was pricing roughly this much movement over the ${jun29p75.dte}-day hold — the "cushion" was already inside the expected range`,
                "Because the position was held to expiry",
                "Because the strike was too close to a round number",
              ],
              correctIndex: 1,
              explanation: `% OTM is only meaningful relative to the underlying's volatility. ${pctOtm(75, jun29Bar.close)}% on a name whose chain implies ${(jun29p75.iv * 100).toFixed(0)}% annualized vol is a smaller cushion than 8% on a slow mover. The scanner's own catalyst text told you the IV — it just framed it as an opportunity.`,
            },
            {
              id: "asts-delta-2",
              question: `ASTS closed at $${jul17Bar.close} on expiry. What was the seller's P&L per contract, and what capped the downside?`,
              options: [
                `+$${(jun29p75.mid * 100).toFixed(0)} — the credit was kept`,
                `-$${((75 - jul17Bar.close) * 100).toFixed(0)} — the intrinsic value, with the credit irrelevant`,
                `-$${p75Loss.toFixed(0)} — intrinsic minus credit, and nothing capped it short of the stock going to zero`,
                `-$${(jun29p75.mid * 100 * 2).toFixed(0)} — losses on short puts are capped at 2× credit`,
              ],
              correctIndex: 2,
              explanation: `Loss = (strike − close − credit) × 100 = (75 − ${jul17Bar.close} − ${jun29p75.mid.toFixed(2)}) × 100 = $${p75Loss.toFixed(0)}. A short put's maximum loss is (strike − credit) × 100, i.e. $${((75 - jun29p75.mid) * 100).toFixed(0)} here. Credit softens; it never caps.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "where-the-stop-belonged",
      title: "You place the stop",
      subtitle: "Same trade, and the market gave you eight days of warning",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `Rewind to **July 6** — a week into the trade. ASTS closed at **$${barOn(t, "2026-07-06").close}**, still $${(barOn(t, "2026-07-06").close - 75).toFixed(2)} above your $75 strike, and the scanner's last observed mark on this contract (July 2) was **$${p75Last.mid.toFixed(2)}**, down from the $${jun29p75.mid.toFixed(2)} you collected. On paper you were winning.\n\nYou manage it from here. Set the level on the underlying where you would cut the trade, then see the real path.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-22", "2026-07-17"),
            visibleUntil: "2026-07-06",
            strike: 75,
            credit: jun29p75.mid,
            entryDate: "2026-06-29",
            expiry: "2026-07-17",
            guide: { min: 74, max: 79 },
            explanation: `The strike itself was the line. ASTS touched $${jul07Bar.low} on July 7 — the very next session — with ${jun29p75.dte - 8} days still to run. Exiting into that test, near the strike and with intrinsic barely off zero, was the cheap version of being wrong. Instead the stock ground lower for six sessions and then gapped: July 16 opened $${jul16Bar.open}, low $${jul16Bar.low}. By then the put was worth its $${(75 - jul16Bar.low).toFixed(2)}/sh intrinsic at the lows. A stop below $${jul16Bar.high} was no longer a stop — it was a hope.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Two stops, one trade. The **thesis stop** sits where the reason you sold dies — here, the strike being tested at all. The **premium stop** (buy back at 2–3× credit, so $${(jun29p75.mid * 2).toFixed(2)}–$${(jun29p75.mid * 3).toFixed(2)} on this contract) is the backstop for when price grinds instead of breaks. Whichever fires first, you are out.`,
        },
        {
          type: "text",
          content: `One honest limitation of this dataset: the scanner stopped surfacing the $75 put after **July 2**, because it stopped qualifying as a candidate. The position kept living. **The scan list is not a position monitor** — the contracts that most need watching are precisely the ones that fall off it.`,
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "stop-market-vs-stop-limit",
      title: "The stop that couldn't fill",
      subtitle: "Real ASTS books: 27% wide, 6% wide, and what each does to your exit",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `A stop is only worth what it fills at. Three real ASTS quotes from the dataset, all ~0.16–0.21 delta puts:\n\n• **June 10, $75 put (6/18)** — bid $${jun10p75.bid} / ask $${jun10p75.ask}. That is $${(jun10p75.ask - jun10p75.bid).toFixed(2)} wide on a $${jun10p75.mid.toFixed(2)} mid: **${spreadPct(jun10p75).toFixed(0)}%**.\n• **July 13, $60 put (7/24)** — $${jul13p60.bid} / $${jul13p60.ask} → ${spreadPct(jul13p60).toFixed(0)}% wide, ${jul13p60.volume} contracts traded.\n• **July 15, $60 put (7/24)** — $${jul15p60.bid} / $${jul15p60.ask} → ${spreadPct(jul15p60).toFixed(0)}% wide, ${jul15p60.volume} contracts traded.\n\nSame ticker, same delta band, four times the exit friction between the best and worst book.`,
        },
        {
          type: "text",
          content: `Say you set a 2× credit stop on that June 10 contract: buy to close at $${(jun10p75.mid * 2).toFixed(2)}.\n\n**Stop-market.** The trigger fires and you pay whatever the offer is. On a book quoted $${jun10p75.bid}/$${jun10p75.ask}, the offer is already $${(jun10p75.ask - jun10p75.mid).toFixed(2)} above mid in calm conditions — and a stop only triggers when conditions are not calm. You get out, at a price you did not choose.\n\n**Stop-limit at $${(jun10p75.mid * 2).toFixed(2)}.** You choose the price. On a fast move the book gaps straight past it, your order rests unfilled, and you are still short — which on this ticker means still short into a session like July 16 (open $${jul16Bar.open}, low $${jul16Bar.low}).\n\nNeither is "correct". A stop-market guarantees the exit and not the price; a stop-limit guarantees the price and not the exit.`,
        },
        {
          type: "callout",
          style: "tip",
          content: `On a book this wide, the fix is upstream of the order type: **size the position so you can exit on a limit order without a stop at all**, and prefer the contract you can actually trade. The July 15 $60 put's ${spreadPct(jul15p60).toFixed(0)}%-wide book with ${jul15p60.volume} contracts traded is a manageable position. The ${spreadPct(jun10p75).toFixed(0)}%-wide June 10 book is a trap you enter voluntarily.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "asts-slt-1",
              question: `You hold a stop-limit to buy back at $${(jun10p75.mid * 2).toFixed(2)} and ASTS gaps down. What is the realistic outcome?`,
              options: [
                "It fills at your limit — that is what limits are for",
                "It fills at the midpoint of the new spread",
                "It may not fill at all: the option gaps past your limit, the order rests, and you stay short with a losing position",
                "The broker converts it to a market order automatically",
              ],
              correctIndex: 2,
              explanation: `A stop-limit is two conditions — trigger, then a price you will accept. When the option's value jumps straight through your limit, nothing trades there. The order sits unfilled while the position keeps losing. That is the exact scenario a stop was supposed to prevent.`,
            },
            {
              id: "asts-slt-2",
              question: `Which cost does the ${spreadPct(jun10p75).toFixed(0)}%-wide June 10 book impose that the ${spreadPct(jul15p60).toFixed(0)}%-wide July 15 book does not?`,
              options: [
                "Higher margin collateral",
                `An immediate round-trip haircut — you sell near $${jun10p75.bid} and buy back near $${jun10p75.ask}, so ~$${((jun10p75.ask - jun10p75.bid) * 100).toFixed(0)}/contract of the $${(jun10p75.mid * 100).toFixed(0)} credit is spread cost before the stock moves at all`,
                "A higher assignment probability",
                "Faster theta decay",
              ],
              correctIndex: 1,
              explanation: `Spread is a fee on changing your mind. At ${spreadPct(jun10p75).toFixed(0)}% of mid, roughly a quarter of the credit is gone the moment you decide to manage the trade — which is why wide books quietly push traders into holding losers to expiry.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "the-decay-that-lied",
      title: "The decay that lied",
      subtitle: "Four real scans of one contract: -33% premium, then a 15-point loss",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The dataset caught the **$75 put (July 17 expiry)** on ${p75Series.length} consecutive scan days. Scrub through it — this is the exact premium path a seller would have watched on their screen.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: "Four days of textbook theta",
            side: "put",
            strike: 75,
            expiry: "2026-07-17",
            series: p75Series.map((o) => ({
              date: o.date,
              dte: o.dte,
              mid: o.mid,
              iv: o.iv,
              delta: o.delta,
              theta: o.theta,
            })),
            caption: `${p75Series[0].date} to ${p75Last.date}: mid $${p75Series[0].mid.toFixed(2)} → $${p75Last.mid.toFixed(2)} (${(((p75Last.mid - p75Series[0].mid) / p75Series[0].mid) * 100).toFixed(0)}%), delta ${p75Series[0].delta.toFixed(2)} → ${p75Last.delta.toFixed(2)}, IV roughly flat around ${(p75Series[0].iv * 100).toFixed(0)}%. Everything a seller wants to see.`,
          },
        },
        {
          type: "text",
          content: `Here is what the scrubber cannot show you, because the scanner had stopped listing the contract.\n\nOn **July 2** the mid was $${p75Last.mid.toFixed(2)} with ${p75Last.dte} days left and ASTS at $${barOn(t, "2026-07-02").close}. Fifteen days later the stock closed **$${jul17Bar.close}** and the put settled at its intrinsic **$${(75 - jul17Bar.close).toFixed(2)}** — about **${((75 - jul17Bar.close) / p75Last.mid).toFixed(1)}×** the last quote anyone saw.\n\nThe -${Math.abs(((p75Last.mid - p75Series[0].mid) / p75Series[0].mid) * 100).toFixed(0)}% decay was real. It was also completely uninformative about the outcome, because over those four days the underlying had moved just ${Math.abs(((barOn(t, "2026-07-02").close - jun29Bar.close) / jun29Bar.close) * 100).toFixed(1)}% — and then fell ${Math.abs(((jul17Bar.close - barOn(t, "2026-07-02").close) / barOn(t, "2026-07-02").close) * 100).toFixed(0)}%.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Theta pays you a little every day for a risk that arrives all at once. On this contract theta was $${p75Last.theta.toFixed(2)}/day — roughly $${(Math.abs(p75Last.theta) * 100).toFixed(0)} per contract per day — while gamma ${p75Last.gamma.toFixed(4)} meant one bad session could reprice the whole position. Four green days in a row is not evidence the trade is working. It is just four days.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "asts-decay-1",
              question: `Between ${p75Series[0].date} and ${p75Last.date} the premium fell ${Math.abs(((p75Last.mid - p75Series[0].mid) / p75Series[0].mid) * 100).toFixed(0)}% while IV stayed near ${(p75Last.iv * 100).toFixed(0)}%. What was the seller's unrealized gain actually telling them?`,
              options: [
                "That the thesis was confirmed and the position was safe",
                `Only that ${p75Series[0].dte - p75Last.dte} days had passed without a large move — a statement about the past, not about the ${p75Last.dte} days of gamma risk still ahead`,
                "That IV was about to collapse",
                "That the strike would not be tested",
              ],
              correctIndex: 1,
              explanation: `Mark-to-market gains on a short option are the reward for time already survived. With ${p75Last.dte} DTE remaining on a ${(p75Last.iv * 100).toFixed(0)}% IV name, most of the distribution of outcomes was still in front of the trade — and the realized path took the stock to $${jul17Bar.close}.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "when-the-premium-is-the-warning",
      title: "When the premium is the warning",
      subtitle: "117% AROC, and what the tape can do to a $117 credit",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `Two real ASTS puts, both expiring **July 24**, scanned two sessions apart on either side of a -17% day. Both sit about 10% out of the money at the time they were quoted. Pick the one you would sell.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Same expiry, same delta band — which entry do you take?",
            goal: "Income on a 7–9 day hold, avoid assignment",
            a: {
              label: "A · $52 put",
              date: "2026-07-17",
              side: "put",
              strike: 52,
              expiry: "2026-07-24",
              dte: jul17p52.dte,
              bid: jul17p52.bid,
              ask: jul17p52.ask,
              mid: jul17p52.mid,
              delta: jul17p52.delta,
              iv: jul17p52.iv,
              aroc: jul17p52.aroc,
              volume: jul17p52.volume,
              note: jul17p52.catalyst,
            },
            b: {
              label: "B · $60 put",
              date: "2026-07-15",
              side: "put",
              strike: 60,
              expiry: "2026-07-24",
              dte: jul15p60.dte,
              bid: jul15p60.bid,
              ask: jul15p60.ask,
              mid: jul15p60.mid,
              delta: jul15p60.delta,
              iv: jul15p60.iv,
              aroc: jul15p60.aroc,
              volume: jul15p60.volume,
              note: jul15p60.catalyst,
            },
            correct: "a",
            explanation: `B was written on July 15 with ASTS at $${barOn(t, "2026-07-15").close} — ${pctOtm(60, barOn(t, "2026-07-15").close)}% OTM — one session before the stock fell to $${jul16Bar.close}. At the July 24 close of $${jul24Bar.close} it finished $${(60 - jul24Bar.close).toFixed(2)}/sh ITM: a $${((60 - jul24Bar.close - jul15p60.mid) * 100).toFixed(0)} loss against $${(jul15p60.mid * 100).toFixed(0)} collected. A was written on July 17 after the flush, ${pctOtm(52, jul17Bar.close)}% OTM, and its closest approach was $${(Math.min(...bars(t, "2026-07-18", "2026-07-24").map((x) => x.low)) - 52).toFixed(2)} above the strike — the full $${(jul17p52.mid * 100).toFixed(0)} was kept. Note what did *not* decide it: B had the tighter book (${spreadPct(jul15p60).toFixed(0)}% vs ${spreadPct(jul17p52).toFixed(0)}%) and more volume. On a name moving this fast, **when in the swing you sell dominates every other input.**`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Two strikes, nine sessions (real bars)",
            bars: bars(t, "2026-07-10", "2026-07-24"),
            lines: [
              { price: 60, label: "B: 60 strike", color: "red" },
              { price: 52, label: "A: 52 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-15", label: "B sold", color: "violet" },
              { date: "2026-07-17", label: "A sold", color: "sky", below: true },
              { date: "2026-07-24", label: `exp ${jul24Bar.close}`, color: "amber" },
            ],
            caption: `Nine sessions, one -17% gap. B was sold into the last quiet bar before it; A was sold the session after the low of $${jul16Bar.low} printed.`,
          },
        },
        {
          type: "text",
          content: `Now the sizing question. A's ${jul17p52.aroc}% AROC is an annualized rate on a ${jul17p52.dte}-day hold: in dollars it is **$${(jul17p52.mid * 100).toFixed(0)} against $${(52 * 100).toLocaleString("en-US")} of collateral**. Set that beside what ASTS actually did in this window:\n\n• July 16 alone: $${barOn(t, "2026-07-15").close} → $${jul16Bar.close}, or **$${(barOn(t, "2026-07-15").close - jul16Bar.close).toFixed(2)}/share** — $${((barOn(t, "2026-07-15").close - jul16Bar.close) * 100).toFixed(0)} on 100 shares, about **${((barOn(t, "2026-07-15").close - jul16Bar.close) / jul17p52.mid).toFixed(0)}× the entire credit**, in one session.\n• May 5 → May 28: $${ripLow.close} → $${ripHigh.close}, **+${(((ripHigh.close - ripLow.close) / ripLow.close) * 100).toFixed(1)}%**.\n• May 28 → July 29: $${ripHigh.close} → $${jul29Bar.close}, **${(((jul29Bar.close - ripHigh.close) / ripHigh.close) * 100).toFixed(1)}%**.\n\nA high AROC is not a reward for skill. It is the chain quoting you for standing in front of that tape.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "asts-size-1",
              question: `On a ticker that ran +${(((ripHigh.close - ripLow.close) / ripLow.close) * 100).toFixed(0)}% and then gave back ${Math.abs(((jul29Bar.close - ripHigh.close) / ripHigh.close) * 100).toFixed(0)}% inside one quarter, what should the AROC column change about your entry?`,
              options: [
                "Nothing — AROC is the return, so higher is strictly better",
                "It should raise your size, since the yield compensates for the risk",
                "It should shrink your size: AROC is priced off IV, so the highest-AROC names are the ones where a single session can exceed many weeks of collected credit",
                "It should push you to longer-dated contracts to capture more of the rate",
              ],
              correctIndex: 2,
              explanation: `AROC and IV are the same information wearing different clothes. The correct response to a 100%+ AROC is fewer contracts and a strike placed for the realized move, not more contracts because the rate looks generous. One $${((barOn(t, "2026-07-15").close - jul16Bar.close) * 100).toFixed(0)} session erases ${((barOn(t, "2026-07-15").close - jul16Bar.close) / jul17p52.mid).toFixed(0)} winning weeks.`,
            },
          ],
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "the-entry-after-the-washout",
      title: "The one that worked",
      subtitle: "A strike under the capitulation low — and the math on how little it paid",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**July 24, 2026**: ASTS at $${jul24Bar.close}, ${Math.abs(((jul24Bar.close - ripHigh.close) / ripHigh.close) * 100).toFixed(0)}% below the May top, RSI ${jul24p51.rsi}. The scanner's pick was the **$51 put, July 31 expiry** at **$${jul24p51.mid.toFixed(2)}** — delta ${jul24p51.delta.toFixed(2)}, ${jul24p51.aroc}% AROC, juiciness ${jul24p51.juiciness}, ${jul24p51.dte} DTE. Catalyst: *"${jul24p51.catalyst}"*.\n\nThe strike sat **${pctOtm(51, jul24Bar.close)}% below spot**, and — unlike every entry in the earlier lessons — **below the price the stock had already been beaten down to**.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Selling after the flush, not into it (real bars)",
            bars: bars(t, "2026-07-16", "2026-08-05"),
            lines: [{ price: 51, label: "51 strike", color: "emerald" }],
            markers: [
              { date: "2026-07-24", label: "entry", color: "violet" },
              { date: "2026-07-29", label: `low ${jul29Bar.low}`, color: "amber", below: true },
              { date: "2026-07-31", label: `exp ${jul31Bar.close}`, color: "emerald" },
            ],
            caption: `The drawdown bottomed on July 29 at a $${jul29Bar.close} close (low $${jul29Bar.low}) — still $${(jul29Bar.low - 51).toFixed(2)} above the strike, a ${(((jul29Bar.low - 51) / 51) * 100).toFixed(1)}% cushion at the worst moment. The put expired worthless on July 31 with ASTS at $${jul31Bar.close}, and the stock closed the window at $${lastBar.close} on August 5.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `Two caveats before you file this as a win. The book was $${jul24p51.bid}/$${jul24p51.ask} — ${spreadPct(jul24p51).toFixed(0)}% wide — and only ${jul24p51.volume} contracts traded that day, so an early exit would have been expensive. And the payoff was $${(jul24p51.mid * 100).toFixed(0)}: it takes about **${Math.round(p75Loss / (jul24p51.mid * 100))} of these** to pay for the single $75 put from lesson one.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "asts-wash-1",
              question: `What structurally separated this entry from the June 29 $75 put, beyond the outcome?`,
              options: [
                "The premium was larger relative to the risk",
                `The strike sat below levels the stock had already traded through, entered after a ${Math.abs(((jul24Bar.close - ripHigh.close) / ripHigh.close) * 100).toFixed(0)}% decline — not above an untested level after a +21% day`,
                "The implied volatility was much lower",
                "The expiry was longer, giving more time to be right",
              ],
              correctIndex: 1,
              explanation: `Same ticker, same scanner, same ~0.20 delta, opposite results. The June 29 entry placed a strike ${pctOtm(75, jun29Bar.close)}% under a price that had just jumped 21% in a session; this one placed a strike ${pctOtm(51, jul24Bar.close)}% under a price that had already fallen for two months. Where you are in the swing is the variable the AROC column never shows you.`,
            },
            {
              id: "asts-wash-2",
              question: `Across these six cases, what is the honest summary of selling ~0.20 delta puts on a ${(jun29p75.iv * 100).toFixed(0)}% IV ticker?`,
              options: [
                "It is free money as long as you stay 10% OTM",
                "It should never be done",
                `The wins are small and frequent ($${(jul24p51.mid * 100).toFixed(0)}, $${(jul17p52.mid * 100).toFixed(0)}) and the losses are large and rare ($${p75Loss.toFixed(0)}) — so position size and exit discipline, not strike selection alone, decide whether the strategy is profitable`,
                "Wider spreads always mean better returns",
              ],
              correctIndex: 2,
              explanation: `This is the shape of every premium-selling program: a high hit rate funding occasional outsized losses. On ASTS the ratio was roughly ${Math.round(p75Loss / (jul24p51.mid * 100))}:1 between one loss and one win. That arithmetic is survivable only if the loss is sized to be survivable — and cut when the thesis breaks rather than held to expiry.`,
            },
          ],
        },
      ],
    },
  ],
};
