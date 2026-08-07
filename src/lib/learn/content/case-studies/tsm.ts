// TSM case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/TSM.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/TSM.json";
import { bars, barOn, findPut, pctOtm, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";

// TSM's leap rows omit premium/gamma/theta/vega, so the direct cast fails.
const t = raw as unknown as V2Ticker;

// ── Case 1: the 34%-wide quote (2026-06-23, both expiring 07-02) ───────────
const june417 = findPut(t, "2026-06-23", 417.5, "2026-07-02");
const june415 = findPut(t, "2026-06-23", 415, "2026-07-02");
const june23 = barOn(t, "2026-06-23");

// ── Case 2: the "$438 floor" that opened below the strike ─────────────────
const june440 = findPut(t, "2026-06-22", 440, "2026-07-02");
const june440Entry = barOn(t, "2026-06-22");
const june440Expiry = barOn(t, "2026-07-02");
const june26Low = barOn(t, "2026-06-26").low; // 419.19 — worst mark of that trade

// ── Case 3: the July washout the seller survived ──────────────────────────
const july397 = findPut(t, "2026-07-22", 397.5, "2026-07-31");
const july397Entry = barOn(t, "2026-07-22");
const july397Expiry = barOn(t, "2026-07-31");
const julyTrough = barOn(t, "2026-07-29"); // low 372.72, close 374.67

// ── Case 4: same expiry, 20 points of strike apart (2026-06-29) ───────────
const june410 = findPut(t, "2026-06-29", 410, "2026-07-10");
const june430 = findPut(t, "2026-06-29", 430, "2026-07-10");
const june29 = barOn(t, "2026-06-29");
const july10 = barOn(t, "2026-07-10"); // low 428.10, close 434.11

// ── Case 5: the winner that expired five sessions early ───────────────────
const july375 = findPut(t, "2026-07-17", 375, "2026-07-24");
const july375Entry = barOn(t, "2026-07-17");
const july375Expiry = barOn(t, "2026-07-24");

const spreadPct = (o: { bid: number; ask: number; mid: number }) =>
  ((o.ask - o.bid) / o.mid) * 100;

export const TSM_CASES: Module = {
  id: "cs-tsm",
  title: "TSM Case Studies",
  subtitle: "Wide quotes, a floor that opened underneath the strike, and a washout that paid in full",
  icon: "🏭",
  color: "indigo-500",
  level: 2,
  track: "case-study",
  ticker: "TSM",
  universe: "traded",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "the-spread-tax",
      title: "The 34% spread",
      subtitle: "Two puts, same expiry, same outcome — one paid $80 less",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 23, 2026.** TSM has just dropped ${(((barOn(t, "2026-06-22").close - june23.close) / barOn(t, "2026-06-22").close) * 100).toFixed(2)}% in one session to close at **$${june23.close}**. The scanner surfaces two puts expiring July 2, nine days out.\n\nBefore you look at strikes, look at the **quotes**. The $${june417.strike} put is marked **$${june417.bid} bid / $${june417.ask} ask** — a spread worth ${spreadPct(june417).toFixed(1)}% of its own mid, on a day when **${june417.volume} contract** traded. The $${june415.strike} put is **$${june415.bid} / $${june415.ask}** — ${spreadPct(june415).toFixed(1)}% wide, ${june415.volume} contracts traded.\n\nNotice what that does: the *higher* strike, the one closer to the money, has the **lower bid**.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you actually sell?",
            goal: "Income — collect premium on a 9-day hold",
            a: {
              label: `A · $${june417.strike} put`,
              date: "2026-06-23",
              side: "put",
              strike: june417.strike,
              expiry: june417.expiry,
              dte: june417.dte,
              bid: june417.bid,
              ask: june417.ask,
              mid: june417.mid,
              delta: june417.delta,
              iv: june417.iv,
              aroc: june417.aroc,
              volume: june417.volume,
              juiciness: june417.juiciness,
              note: june417.catalyst,
            },
            b: {
              label: `B · $${june415.strike} put`,
              date: "2026-06-23",
              side: "put",
              strike: june415.strike,
              expiry: june415.expiry,
              dte: june415.dte,
              bid: june415.bid,
              ask: june415.ask,
              mid: june415.mid,
              delta: june415.delta,
              iv: june415.iv,
              aroc: june415.aroc,
              volume: june415.volume,
              juiciness: june415.juiciness,
              note: june415.catalyst,
            },
            correct: "b",
            explanation: `Both expired worthless — TSM's lowest print between entry and expiry was $${june26Low} on June 26, above both strikes, and July 2 closed at $${june440Expiry.close}. Identical outcome, different paycheck.\n\nYou sell at the **bid**, not the mid. B pays $${(june415.bid * 100).toFixed(0)} per contract; A pays $${(june417.bid * 100).toFixed(0)} — $${((june415.bid - june417.bid) * 100).toFixed(0)} less for a strike $${(june417.strike - june415.strike).toFixed(2)} *closer* to the money. The $${june417.mid.toFixed(3)} "mid" on A was a number halfway between two quotes nobody was trading at.`,
          },
        },
        {
          type: "text",
          content: `**Why this matters more than $80: the exit.**\n\nSay you set a stop to buy the put back if it triples. Two ways to write that order:\n\n• **Stop-market** — once triggered, it becomes a market order. On A's quote you buy back at the **ask**: $${june417.ask} against a $${june417.mid.toFixed(3)} mid. That's $${((june417.ask - june417.mid) * 100).toFixed(0)} of slippage per contract on entry-day quotes alone — ${(((june417.ask - june417.mid) / june417.bid) * 100).toFixed(0)}% of the credit you collected — and a stop only triggers on days the market is moving, when spreads are wider than this.\n\n• **Stop-limit** — you cap the price you'll pay. On a ${spreadPct(june417).toFixed(0)}%-wide book with ${june417.volume} contract of daily volume, the limit protects you from a terrible fill by not filling at all. You keep the short put through exactly the move you were trying to escape.\n\nOn B's quote the same stop-market costs $${((june415.ask - june415.mid) * 100).toFixed(0)} — ${((june415.ask - june415.mid) / (june417.ask - june417.mid)).toFixed(1)}× cheaper — and a stop-limit has a realistic chance of filling because ${june415.volume} contracts changed hands.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "Liquidity is not a nice-to-have on a short option — it *is* your exit. A stop-loss plan you can't fill is not a plan. Check the bid/ask spread and volume before you check the AROC column, because those two numbers decide whether your risk management is executable.",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsm-ws-1",
              question: `The $${june417.strike} put is closer to the money than the $${june415.strike} put, yet its bid ($${june417.bid}) is lower than the other's ($${june415.bid}). What does that tell you?`,
              options: [
                "The higher strike is genuinely safer, so it pays less",
                "The quote is stale — with 1 contract of volume, the market maker's bid isn't a real, contested price the way a 61-lot contract's is",
                "Put pricing is inverted below a certain delta",
                "The $417.50 put must have a later expiry",
              ],
              correctIndex: 1,
              explanation: `Both expire ${june417.expiry} and both are on the same underlying, so option math says the higher strike should be worth more. It isn't, because ${june417.volume} contract traded. A quote nobody is competing on drifts. When the mid and the bid disagree by ${(((june417.mid - june417.bid) / june417.mid) * 100).toFixed(0)}%, believe the bid — it's the only one you can actually sell into.`,
            },
            {
              id: "tsm-ws-2",
              question: `You want to close the $${june417.strike} put on a fast down day. Its quote at entry was $${june417.bid} / $${june417.ask}. What's the honest trade-off between a stop-market and a stop-limit here?`,
              options: [
                "Stop-market is strictly better because it always fills",
                "Stop-limit is strictly better because it controls price",
                "Stop-market guarantees you're out but not at what price; stop-limit controls the price but may leave you in the position — on a book this thin, neither is safe, which is an argument for a smaller position, not a cleverer order type",
                "Neither order type works on options",
              ],
              correctIndex: 2,
              explanation:
                "Order type doesn't create liquidity. On a wide, thin book you're choosing which risk to accept: a bad fill or no fill. The real fix is upstream — don't sell the contract whose exit you can't price.",
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "floor-below-the-strike",
      title: "The floor underneath the strike",
      subtitle: "When your support level is already inside your loss zone",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 22, 2026.** TSM closes at **$${june440Entry.close}**, capping a ${(((june440Entry.close - barOn(t, "2026-05-19").close) / barOn(t, "2026-05-19").close) * 100).toFixed(1)}% run off the May 19 low of $${barOn(t, "2026-05-19").close}. RSI ${june440.rsi}.\n\nThe scanner's pick: the **$${june440.strike} put expiring ${june440.expiry}** for **$${june440.mid.toFixed(2)}** mid (bid $${june440.bid}), delta ${june440.delta.toFixed(3)}, ${june440.aroc}% AROC, ${june440.volume} contracts of volume.\n\nThe catalyst line: *"${june440.catalyst}"*\n\nRead that carefully. The "strong floor" is **$438**. The strike is **$${june440.strike}**. The floor sits *below* the strike — meaning by the time price reaches the level that's supposed to save you, the put is already $${(june440.strike - 438).toFixed(2)} in the money.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-10", "2026-07-02"),
            visibleUntil: "2026-06-22",
            strike: 440,
            credit: june440.mid,
            entryDate: "2026-06-22",
            expiry: "2026-07-02",
            guide: { min: 434, max: 438 },
            explanation: `TSM **opened** June 23 at $${june23.open} — already below the $440 strike, before you could react — then traded through the "$438 floor" to $${june23.low} and closed at $${june23.close}. Any stop in the $434–$438 zone (at or just under the level the trade was built on) triggered that morning with the put roughly $${(440 - june23.close).toFixed(2)} in the money.\n\nHolding instead: the June 26 low was **$${june26Low}** — $${(440 - june26Low).toFixed(2)} through the strike, ${((440 - june26Low) / june440.mid).toFixed(1)}× the credit collected. Then TSM ripped back to $${barOn(t, "2026-06-30").close} on June 30, fell ${Math.abs(((barOn(t, "2026-07-01").close - barOn(t, "2026-06-30").close) / barOn(t, "2026-06-30").close) * 100).toFixed(2)}% on July 1, and settled expiry at **$${june440Expiry.close}** — $${(440 - june440Expiry.close).toFixed(2)} ITM against $${june440.mid.toFixed(2)} collected, a net **-$${((440 - june440Expiry.close - june440.mid) * 100).toFixed(0)} per contract**.\n\nThis dataset never re-scans the $440 put after entry, so what a stop would actually have *filled* at isn't observable — only the path is. And the path is the point: a stop triggered on June 23 exits a put that is $${(440 - june23.close).toFixed(2)} in the money with ${june440.dte - 1} days left, which is a real loss, just a smaller and earlier one than sitting through a $${(440 - june26Low).toFixed(2)} drawdown and a $${(barOn(t, "2026-06-30").close - june26Low).toFixed(2)} round trip to end up down $${((440 - june440Expiry.close - june440.mid) * 100).toFixed(0)}.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "TSM — the gap under the floor (real bars)",
            bars: bars(t, "2026-06-10", "2026-07-02"),
            lines: [
              { price: 440, label: "440 strike", color: "sky" },
              { price: 438, label: "claimed floor", color: "amber" },
            ],
            markers: [
              { date: "2026-06-22", label: "entry", color: "violet" },
              { date: "2026-06-26", label: `low ${june26Low}`, color: "red", below: true },
              { date: "2026-07-02", label: "expiry", color: "stone" },
            ],
            shadeAfter: "2026-07-02",
            caption: `Entry at $${june440Entry.close}. The next session opened $${(june440Entry.close - june23.open).toFixed(2)} lower — already under the $${june440.strike} strike — and took out the "$438 support" within the same session. Support levels are tested by gaps more often than by drift, and a gap gives you no price in between.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsm-fl-1",
              question: `The catalyst justified a $${june440.strike} put with a "$438 support" level. What's the structural flaw?`,
              options: [
                "$438 is too close to $440 to matter",
                "The support sits below the strike, so the level that's supposed to protect the trade only gets tested after the put is already in the money — the thesis and the loss arrive at the same moment",
                "Support levels only apply to calls",
                "The AROC was too low to justify any strike",
              ],
              correctIndex: 1,
              explanation: `A support-based short put wants the level meaningfully *above* the strike, so the level failing is your warning and your exit — not your loss. Here $438 and $${june440.strike} were effectively the same price, which is why the June 23 gap resolved both at once.`,
            },
            {
              id: "tsm-fl-2",
              question: "TSM gapped from a $467.67 close to a $439.18 open. What does that do to a stop placed at $438?",
              options: [
                "It fills at exactly $438",
                "It doesn't trigger, because the open was above $438",
                "It triggers when the session trades down to $434.19, and the fill happens somewhere in a session that ranged $434.19–$447.33 — the stop defines when you exit, never at what price",
                "Stops are ignored on gap days",
              ],
              correctIndex: 2,
              explanation: `The June 23 session ranged from $${june23.low} to $${june23.high}. A stop is a trigger, not a fill price. On gap-and-range days the difference between the two is the whole ballgame — which is the same lesson as the wide-spread case, arriving from the other direction.`,
            },
          ],
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "stop-that-would-have-cost-you",
      title: "The stop that would have cost you",
      subtitle: "A put that went $24.78 in the money — and expired worthless",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**July 22, 2026.** TSM closes at **$${july397Entry.close}**, RSI ${july397.rsi}. The scanner offers the **$${july397.strike} put expiring ${july397.expiry}** for **$${july397.mid.toFixed(3)}** mid (bid $${july397.bid} / ask $${july397.ask}), delta ${july397.delta.toFixed(3)}, ${july397.aroc}% AROC, juiciness ${july397.juiciness}, ${july397.volume} contracts traded.\n\nThe catalyst: *"${july397.catalyst}"*\n\nOne detail the catalyst missed: the entry session's own low was **$${july397Entry.low}** — the "$417 support" had already been traded through before the ink was dry.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "TSM — nine days that went nowhere and everywhere (real bars)",
            bars: bars(t, "2026-07-15", "2026-07-31"),
            lines: [
              { price: 397.5, label: "397.5 strike", color: "sky" },
              { price: 417, label: "claimed support", color: "amber" },
            ],
            markers: [
              { date: "2026-07-22", label: "entry", color: "violet" },
              { date: "2026-07-29", label: `low ${julyTrough.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${july397Expiry.close}`, color: "emerald" },
            ],
            caption: `Strike breached July 27 (low $${barOn(t, "2026-07-27").low}). July 29 printed $${julyTrough.low} — $${(397.5 - julyTrough.low).toFixed(2)} through the strike, ${((397.5 - julyTrough.low) / july397.mid).toFixed(1)}× the credit collected. Then a ${(((barOn(t, "2026-07-30").close - julyTrough.close) / julyTrough.close) * 100).toFixed(2)}% session on July 30 and expiry at $${july397Expiry.close} — worthless. The seller kept every cent of the $${(july397.mid * 100).toFixed(2)}.`,
          },
        },
        {
          type: "text",
          content: `Run the standard rule against this path. "Buy it back at 3× credit" means covering around **$${(july397.mid * 3).toFixed(2)}**. With the underlying $${(397.5 - julyTrough.low).toFixed(2)} in the money on July 29, the put was worth multiples of that — the rule fires somewhere in the July 27–29 window and books a loss in the four figures per contract.\n\nTwo sessions later the position was worth zero.\n\nThat is not an argument against stops. It's the bill for owning them. A stop converts an unknown tail loss into a known, frequent, smaller one — and on **this** draw the premium was pure waste. Compare the previous case, where the same discipline cost almost nothing and removed a $${(440 - june26Low).toFixed(2)} drawdown. You do not get to know in advance which one you're in.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `The dangerous conclusion from this case is "stops don't work on TSM." The correct one is narrower: **TSM's July was a whipsaw**, and whipsaws are exactly where stops lose. Across the same window, the July 22 seller who held was rescued by a ${(((barOn(t, "2026-07-30").close - julyTrough.close) / julyTrough.close) * 100).toFixed(1)}% single-session bounce that owed nothing to their analysis.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsm-sc-1",
              question: `This put went $${(397.5 - julyTrough.low).toFixed(2)} in the money and still expired worthless. What is the right lesson?`,
              options: [
                "Never use stops on short puts — they only cost money",
                "Always hold short puts to expiry; they usually come back",
                "A stop trades a rare large loss for frequent small ones. This path is what paying that premium looks like when the tail doesn't arrive — it says nothing about whether the insurance was worth buying",
                "The trade was risk-free because it expired worthless",
              ],
              correctIndex: 2,
              explanation:
                "Judging a risk rule by a single realized path is the core error. The July 22 seller was paid in full and was never in control of that outcome — a second down day instead of the July 30 bounce and the same position closes deep in the money.",
            },
            {
              id: "tsm-sc-2",
              question: `The catalyst cited "$417 support," but the entry session's low was $${july397Entry.low}. Why does that matter before you even place the trade?`,
              options: [
                "It doesn't — intraday lows are noise",
                "The level the trade was justified by had already failed at entry, so there was no untested line left between the entry price and the strike",
                "It means the put was mispriced",
                "It guarantees the strike will be breached",
              ],
              correctIndex: 1,
              explanation: `Catalyst text is generated from indicators, not audited. When the "floor" is inside the day's range you already have your answer: the trade is a delta bet, not a support trade — size it as one.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "cushion-versus-credit",
      title: "$40 of credit, 20 points of cushion",
      subtitle: "Same expiry, same day — what were you paid for the extra risk?",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 29, 2026.** TSM closes at **$${june29.close}**, up ${(((june29.close - barOn(t, "2026-06-26").close) / barOn(t, "2026-06-26").close) * 100).toFixed(2)}% on the session. Two puts expiring ${june410.expiry} are on the board — ${june410.dte} days out, ${june410.strike} and ${june430.strike} strikes.\n\nOne sits ${pctOtm(june410.strike, june29.close)}% below spot, the other ${pctOtm(june430.strike, june29.close)}%.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which strike do you sell?",
            goal: "Income — collect premium without being assigned",
            a: {
              label: `A · $${june410.strike} put`,
              date: "2026-06-29",
              side: "put",
              strike: june410.strike,
              expiry: june410.expiry,
              dte: june410.dte,
              bid: june410.bid,
              ask: june410.ask,
              mid: june410.mid,
              delta: june410.delta,
              iv: june410.iv,
              aroc: june410.aroc,
              volume: june410.volume,
              juiciness: june410.juiciness,
              note: june410.catalyst,
            },
            b: {
              label: `B · $${june430.strike} put`,
              date: "2026-06-29",
              side: "put",
              strike: june430.strike,
              expiry: june430.expiry,
              dte: june430.dte,
              bid: june430.bid,
              ask: june430.ask,
              mid: june430.mid,
              delta: june430.delta,
              iv: june430.iv,
              aroc: june430.aroc,
              volume: june430.volume,
              juiciness: june430.juiciness,
              note: june430.catalyst,
            },
            correct: "a",
            explanation: `Both expired worthless — July 10 closed at $${july10.close}. On this draw B made more money, and it's worth saying that plainly.\n\nBut look at what the extra $${((june430.mid - june410.mid) * 100).toFixed(0)} of mid bought: a strike $${(june430.strike - june410.strike).toFixed(0)} closer to spot, delta ${june430.delta.toFixed(3)} against ${june410.delta.toFixed(3)}. TSM's lowest print between entry and expiry was **$${july10.low}** on expiry day itself — B spent that final session $${(june430.strike - july10.low).toFixed(2)} in the money before closing above; A was never within $${(july10.low - june410.strike).toFixed(2)} of trouble.\n\n${((june430.mid - june410.mid) / june410.mid * 100).toFixed(1)}% more premium for ${((june430.strike - june410.strike) / (june29.close - june410.strike) * 100).toFixed(0)}% less cushion is a bad exchange rate, however this particular week resolved.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Where the path actually went (real bars)",
            bars: bars(t, "2026-06-26", "2026-07-10"),
            lines: [
              { price: 430, label: "B: 430 strike", color: "amber" },
              { price: 410, label: "A: 410 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-06-29", label: "entry", color: "violet" },
              { date: "2026-07-10", label: `low ${july10.low}`, color: "red", below: true },
            ],
            caption: `The whole trade lived between $${july10.low.toFixed(2)} and $${barOn(t, "2026-06-30").high.toFixed(2)}, intraday low to intraday high. B's strike was inside that range; A's was $${(july10.low - june410.strike).toFixed(2)} outside it. Two contracts, same P&L sign, entirely different weeks.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `Price a strike change the way the market does: in premium per point of cushion. Here you gave up $${(june29.close - june410.strike).toFixed(2)} of downside room and $${(june430.strike - june410.strike).toFixed(0)} points of strike for $${((june430.mid - june410.mid) * 100).toFixed(0)} — roughly $${(((june430.mid - june410.mid) * 100) / (june430.strike - june410.strike)).toFixed(0)} per point. When that number is small, the further strike is the trade.`,
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "five-sessions-early",
      title: "The winner that expired five sessions early",
      subtitle: "A clean CSP, and the calendar that made it one",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**July 17, 2026.** TSM has fallen ${Math.abs(((july375Entry.close - barOn(t, "2026-07-15").close) / barOn(t, "2026-07-15").close) * 100).toFixed(1)}% in two sessions to close at **$${july375Entry.close}**, RSI ${july375.rsi}. The scanner's pick: the **$${july375.strike} put expiring ${july375.expiry}** at **$${july375.mid.toFixed(3)}** (bid $${july375.bid} / ask $${july375.ask}, ${spreadPct(july375).toFixed(1)}% wide), delta ${july375.delta.toFixed(3)}, ${july375.aroc}% AROC, **${july375.volume} contracts** traded, juiciness ${july375.juiciness}.\n\nThe strike sits **${pctOtm(july375.strike, july375Entry.close)}% below spot** — sold into the fall rather than into the run.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Seven clean days, then the floor (real bars)",
            bars: bars(t, "2026-07-15", "2026-07-31"),
            lines: [
              { price: 375, label: "375 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-07-17", label: "entry", color: "violet" },
              { date: "2026-07-24", label: `exp ${july375Expiry.close}`, color: "emerald" },
              { date: "2026-07-29", label: `low ${julyTrough.low}`, color: "red", below: true },
            ],
            shadeAfter: "2026-07-24",
            caption: `The put expired worthless on July 24 with TSM at $${july375Expiry.close} — $${(july375Expiry.close - 375).toFixed(2)} of room to spare, $${(july375.mid * 100).toFixed(2)} kept in ${july375.dte} days. Three sessions later (shaded) TSM printed $${julyTrough.low}, below the strike.`,
          },
        },
        {
          type: "text",
          content: `Two things made this a good entry, and neither was the AROC:\n\n• **Where in the swing.** Entry came after a two-session drop, not after a run. The June 22 case sold into a ${(((june440Entry.close - barOn(t, "2026-05-19").close) / barOn(t, "2026-05-19").close) * 100).toFixed(1)}% rally; this one sold into fear, with RSI at ${july375.rsi}.\n\n• **Liquidity.** ${july375.volume} contracts traded and the spread was ${spreadPct(july375).toFixed(1)}% — the exit was real, had it been needed.\n\nAnd one thing that was luck: **the calendar**. The identical strike with one more week of expiry would have been in the money on July 29. The seller earned the entry; the expiry date happened to them.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "tsm-fs-1",
              question: `TSM traded to $${julyTrough.low} on July 29 — below this trade's $${july375.strike} strike. Why did the position still pay in full?`,
              options: [
                "The put was closed early for a profit",
                "It expired on July 24, before the low happened — short-dated options are exposed to a window, not to the whole future",
                "The strike was never actually breached",
                "TSM recovered before assignment could be processed",
              ],
              correctIndex: 1,
              explanation: `A short option's risk starts and ends with its expiry window. This contract's window was ${july375.dte} days; the damage arrived three sessions after it shut. Choosing DTE is choosing how much future you're exposed to — usually a bigger decision than choosing the strike.`,
            },
            {
              id: "tsm-fs-2",
              question: "What separates this entry from the June 22 trade in case 2, given both used the same scanner and the same strategy?",
              options: [
                "This one collected more premium",
                "This one had a lower delta",
                "This one was sold after a decline with a liquid contract and a strike well outside the recent range; the June 22 trade was sold at the top of a rally with the 'support' level sitting inside the strike",
                "This one had more days to expiry",
              ],
              correctIndex: 2,
              explanation:
                "Same tool, opposite results. What changed was position in the swing, the relationship between the strike and a tested level, and whether the contract could actually be traded out of. Those three checks are most of the edge.",
            },
          ],
        },
      ],
    },
  ],
};
