// NBIS case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/NBIS.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/NBIS.json";
import { bars, barOn, findPut, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// ── Case 1 + 2: selling the exact top ─────────────────────────────────────
// 2026-06-18 is the highest close in the window; the scanner sold the 252.5 put.
const top252 = findPut(t, "2026-06-18", 252.5, "2026-06-26");
const top252Prior = findPut(t, "2026-06-17", 252.5, "2026-06-26");
const topBar = barOn(t, "2026-06-18"); // close 286.69 — window peak
const priorBar = barOn(t, "2026-06-17");
const top252Expiry = barOn(t, "2026-06-26"); // close 240.30, low 234.40
const top252Loss = 252.5 - top252Expiry.close - top252.mid;

// ── Case 3: same strike, two expiries (2026-06-22) ───────────────────────
const jun240Short = findPut(t, "2026-06-22", 240, "2026-07-02");
const jun240Long = findPut(t, "2026-06-22", 240, "2026-07-10");
const jun22Bar = barOn(t, "2026-06-22");
const jul02Bar = barOn(t, "2026-07-02"); // close 215.62, low 207.299
const jul10Bar = barOn(t, "2026-07-10"); // close 219.65
const jul08Bar = barOn(t, "2026-07-08"); // low 192.67 — worst tick for the long one

// ── Case 4: the widest book in the dataset ───────────────────────────────
const wide160 = findPut(t, "2026-07-24", 160, "2026-07-31");
const wide160Entry = barOn(t, "2026-07-24");
const crashBar = barOn(t, "2026-07-29"); // close 148.22, low 145.80 — window trough
const jul31Bar = barOn(t, "2026-07-31"); // close 190.41

// Other genuinely wide markets the same scanner surfaced.
const wide180 = findPut(t, "2026-06-09", 180, "2026-06-18");
const wide1975 = findPut(t, "2026-06-12", 197.5, "2026-06-26");
const wide140 = findPut(t, "2026-07-17", 140, "2026-07-24");
const spreadPct = (o: { bid: number; ask: number; mid: number }) =>
  ((o.ask - o.bid) / o.mid) * 100;

// ── Case 5: the stock rose and the short put got more expensive ──────────
const iv150Early = findPut(t, "2026-07-16", 150, "2026-07-31");
const iv150Later = findPut(t, "2026-07-20", 150, "2026-07-31");
const jul16Bar = barOn(t, "2026-07-16");
const jul20Bar = barOn(t, "2026-07-20");

export const NBIS_CASES: Module = {
  id: "cs-nbis",
  title: "NBIS Case Studies",
  subtitle: "A 48% drawdown at 150% IV — spreads, stops, and the vega trap",
  icon: "🌋",
  color: "teal-500",
  level: 2,
  track: "case-study",
  ticker: "NBIS",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "selling-the-exact-top",
      title: "Selling the exact top",
      subtitle: "139% AROC, 12% of cushion, and a 48% drawdown starting tomorrow",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `On **June 18, 2026** NBIS closed at **$${topBar.close}** — the highest close in the entire dataset. That same scan offered the **$252.50 put expiring June 26** for **$${top252.mid.toFixed(3)}**: delta ${top252.delta.toFixed(2)}, **${top252.aroc}% AROC**, ${(((topBar.close - 252.5) / topBar.close) * 100).toFixed(1)}% of downside cushion, and only ${top252.volume} contracts of volume.\n\nThe catalyst: *"${top252.catalyst}"*\n\nRead that line again. "Premium rich at ${(top252.iv * 100).toFixed(0)}% IV" is the scanner describing a stock the options market was pricing for a move of roughly ±${(((top252.iv * Math.sqrt(top252.dte / 365)) * 100)).toFixed(0)}% over the ${top252.dte} days you'd be holding. The ${(((topBar.close - 252.5) / topBar.close) * 100).toFixed(1)}% cushion was inside that range from the start.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "NBIS — the top and the week after (real bars)",
            bars: bars(t, "2026-06-12", "2026-06-30"),
            lines: [{ price: 252.5, label: "252.50 strike", color: "sky" }],
            markers: [
              { date: "2026-06-18", label: `top ${topBar.close}`, color: "violet" },
              { date: "2026-06-26", label: `exp ${top252Expiry.close}`, color: "red", below: true },
            ],
            shadeAfter: "2026-06-26",
            caption: `Eight sessions from the high to $${top252Expiry.close} — $${(252.5 - top252Expiry.close).toFixed(2)}/sh in the money (the June 26 low was $${top252Expiry.low}). Loss: $${(top252Loss * 100).toFixed(0)} per contract against the $${(top252.mid * 100).toFixed(0)} collected.`,
          },
        },
        {
          type: "text",
          content: `That was the beginning, not the end. NBIS kept falling to a **$${crashBar.close}** close on July 29 — **${(((crashBar.close - topBar.close) / topBar.close) * 100).toFixed(1)}%** from the day this put was sold. Anyone who took assignment at $252.50 and held sat through a ${(((crashBar.close - (252.5 - top252.mid)) / (252.5 - top252.mid)) * 100).toFixed(0)}% drawdown on the effective basis.\n\nThe scanner had shown this contract the day before too, on June 17 with NBIS at $${priorBar.close}, for $${top252Prior.mid.toFixed(3)}. Five cents of extra credit for waiting a day and selling $${(topBar.close - priorBar.close).toFixed(2)} higher — which tells you how little the premium cared about the entry timing that everyone obsesses over.`,
        },
        {
          type: "callout",
          style: "warning",
          content:
            "High IV is not a discount, it is a forecast. When the chain prices 120%+ implied volatility, a 12% cushion is not conservative — it is roughly a one-standard-deviation bet with the payoff capped at the credit and the loss uncapped.",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nbis-top-1",
              question: `The 252.50 put paid ${top252.aroc}% annualized on a ${(((topBar.close - 252.5) / topBar.close) * 100).toFixed(1)}% cushion. What does that pairing actually tell you?`,
              options: [
                "It was an unusually generous mispricing",
                "The premium is high precisely because the market expects moves large enough to blow through that cushion — the yield is the market's estimate of the risk, not a free lunch",
                "The scanner made an arithmetic error",
                "AROC above 100% always signals a good trade",
              ],
              correctIndex: 1,
              explanation: `Premium is priced off implied volatility, and this row carried ${(top252.iv * 100).toFixed(0)}% IV. A ${top252.aroc}% annualized yield on a ${(((topBar.close - 252.5) / topBar.close) * 100).toFixed(1)}% buffer is the market telling you it thinks that buffer gets tested. Eight days later NBIS was $${top252Expiry.close}.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "place-the-stop",
      title: "You place the stop",
      subtitle: "Short the 252.50 put at the top — where do you get out?",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `You're short the **$252.50 put** from June 18, credit $${top252.mid.toFixed(3)}, expiring June 26. It's now **June 22** and NBIS closed $${jun22Bar.close} — still ${(((jun22Bar.close - 252.5) / jun22Bar.close) * 100).toFixed(1)}% above your strike, still fine on paper.\n\nSet a stop on the underlying and reveal the last four sessions.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-12", "2026-06-26"),
            visibleUntil: "2026-06-22",
            strike: 252.5,
            credit: top252.mid,
            entryDate: "2026-06-18",
            expiry: "2026-06-26",
            guide: { min: 252.5, max: 266 },
            explanation: `A stop at or just above the strike ($252.50–$266, roughly June 16's range of $${barOn(t, "2026-06-16").low.toFixed(2)}–$${barOn(t, "2026-06-16").close.toFixed(2)}) is the zone that still gets you out for something close to the credit. NBIS closed $${barOn(t, "2026-06-23").close} on the 23rd, $${barOn(t, "2026-06-24").close} on the 24th and $${barOn(t, "2026-06-25").close} on the 25th — three sessions of warning — then **gapped open at $${top252Expiry.open}** on expiry day and closed $${top252Expiry.close}. Below the strike there is no clean exit left: you're paying intrinsic value into a gap. Note what a stop above the strike costs on a normal week, though — NBIS traded $${barOn(t, "2026-06-23").low} intraday on June 23 and bounced to $${barOn(t, "2026-06-23").close}. Stops on a name this volatile get hit often.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "On a stock printing 120%+ IV, the distance between 'a stop that never triggers spuriously' and 'a stop that still limits the loss' can be zero. That is a sizing signal, not a stop-placement problem: if no stop fits, the position is too big.",
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "same-strike-two-expiries",
      title: "Same strike, two expiries",
      subtitle: "One scan, June 22 — the only variable is time",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The June 22 scan surfaced the **$240 put twice**, on two different expiries. Same underlying, same strike, same day, same ${(((jun22Bar.close - 240) / jun22Bar.close) * 100).toFixed(1)}% cushion. The only thing you're choosing is how long you're exposed.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: `NBIS at $${jun22Bar.close}. Which $240 put do you sell?`,
            goal: "Income — you intend to hold to expiry rather than manage actively",
            a: {
              label: `A · $240 put, ${jun240Short.dte}d`,
              date: "2026-06-22",
              side: "put",
              strike: 240,
              expiry: "2026-07-02",
              dte: jun240Short.dte,
              bid: jun240Short.bid,
              ask: jun240Short.ask,
              mid: jun240Short.mid,
              delta: jun240Short.delta,
              iv: jun240Short.iv,
              aroc: jun240Short.aroc,
              volume: jun240Short.volume,
              juiciness: jun240Short.juiciness,
              note: jun240Short.catalyst,
            },
            b: {
              label: `B · $240 put, ${jun240Long.dte}d`,
              date: "2026-06-22",
              side: "put",
              strike: 240,
              expiry: "2026-07-10",
              dte: jun240Long.dte,
              bid: jun240Long.bid,
              ask: jun240Long.ask,
              mid: jun240Long.mid,
              delta: jun240Long.delta,
              iv: jun240Long.iv,
              aroc: jun240Long.aroc,
              volume: jun240Long.volume,
              juiciness: jun240Long.juiciness,
              note: jun240Long.catalyst,
            },
            correct: "b",
            explanation: `Both lost. B lost less. A settled July 2 at $${jul02Bar.close} — $${(240 - jul02Bar.close).toFixed(2)} ITM against $${jun240Short.mid.toFixed(2)} collected, a **$${((240 - jul02Bar.close - jun240Short.mid) * 100).toFixed(0)}** loss. B settled July 10 at $${jul10Bar.close} — $${(240 - jul10Bar.close).toFixed(2)} ITM against $${jun240Long.mid.toFixed(3)}, a **$${((240 - jul10Bar.close - jun240Long.mid) * 100).toFixed(0)}** loss. The extra $${(jun240Long.mid - jun240Short.mid).toFixed(3)}/sh of credit absorbed more of the move than the extra week added to it. But note what you'd have paid for that: B's market was $${jun240Long.bid.toFixed(2)} / $${jun240Long.ask.toFixed(2)} — a ${spreadPct(jun240Long).toFixed(0)}% spread on ${jun240Long.volume} contracts of volume, versus ${spreadPct(jun240Short).toFixed(0)}% on ${jun240Short.volume} for A. The extra credit is only real if you get filled near the mid.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The two expiries, on one chart (real bars)",
            bars: bars(t, "2026-06-22", "2026-07-10"),
            lines: [{ price: 240, label: "240 strike (both)", color: "sky" }],
            markers: [
              { date: "2026-06-22", label: "entry", color: "violet" },
              { date: "2026-07-02", label: `A exp ${jul02Bar.close}`, color: "red", below: true },
              { date: "2026-07-08", label: `low ${jul08Bar.low}`, color: "amber", below: true },
              { date: "2026-07-10", label: `B exp ${jul10Bar.close}`, color: "red" },
            ],
            caption: `B's extra week was not calm: NBIS traded down to $${jul08Bar.low} on July 8, putting $${(240 - jul08Bar.low).toFixed(2)} of intrinsic into the contract — ${((240 - jul08Bar.low) / jun240Long.mid).toFixed(1)}× the credit — before recovering into its expiry. Less loss at the end, more pain in the middle.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content:
            "Longer-dated short puts collect more credit and therefore break even lower, but they hold you through more of the path. If you run a mark-based stop, that extra path is exactly where you get stopped out of a trade that would have finished better.",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nbis-dte-1",
              question: "A had the higher AROC yet lost more dollars than B. How is that consistent?",
              options: [
                "AROC was computed incorrectly for A",
                "AROC annualizes the yield per day of collateral use — it says nothing about how far the stock travels before you get your collateral back",
                "B was a different strike",
                "A had a wider spread, which reduced its return",
              ],
              correctIndex: 1,
              explanation: `A paid $${jun240Short.mid.toFixed(2)} for ${jun240Short.dte} days (${jun240Short.aroc}% annualized), B paid $${jun240Long.mid.toFixed(3)} for ${jun240Long.dte} days (${jun240Long.aroc}%). A is the better rate. But a rate only converts to money if you keep the credit — and on a stock that fell ${(((crashBar.close - topBar.close) / topBar.close) * 100).toFixed(0)}% over the following weeks, neither did.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "stop-market-vs-stop-limit",
      title: "Stop-market vs stop-limit on a wide book",
      subtitle: "What a 22%-wide spread does to an exit plan",
      estimatedMinutes: 8,
      sections: [
        {
          type: "text",
          content: `NBIS options do not trade like SPY options. Here are four real rows from this dataset, with the spread expressed as a percentage of the mid you'd see on the screen:\n\n• **Jun 9 — $180 put, Jun 18 expiry.** $${wide180.bid.toFixed(2)} / $${wide180.ask.toFixed(2)}, mid $${wide180.mid.toFixed(2)} — **${spreadPct(wide180).toFixed(0)}% wide** on ${wide180.volume?.toLocaleString()} contracts.\n• **Jun 12 — $197.50 put, Jun 26 expiry.** $${wide1975.bid.toFixed(2)} / $${wide1975.ask.toFixed(2)}, mid $${wide1975.mid.toFixed(2)} — **${spreadPct(wide1975).toFixed(0)}% wide** on ${wide1975.volume} contracts.\n• **Jul 17 — $140 put, Jul 24 expiry.** $${wide140.bid.toFixed(2)} / $${wide140.ask.toFixed(2)}, mid $${wide140.mid.toFixed(2)} — **${spreadPct(wide140).toFixed(0)}% wide** on ${wide140.volume} contracts.\n• **Jul 24 — $160 put, Jul 31 expiry.** $${wide160.bid.toFixed(2)} / $${wide160.ask.toFixed(2)}, mid $${wide160.mid.toFixed(2)} — **${spreadPct(wide160).toFixed(0)}% wide** on ${wide160.volume?.toLocaleString()} contracts.\n\nThe July 24 row is not thinly traded — ${wide160.volume?.toLocaleString()} contracts changed hands. It is simply a $${(wide160.ask - wide160.bid).toFixed(2)}-wide market, which is **$${((wide160.ask - wide160.bid) * 100).toFixed(0)} per contract** of pure friction between the two sides.`,
        },
        {
          type: "text",
          content: `Now put a stop on it. You sold the $160 put on **July 24** with NBIS at $${wide160Entry.close}, and you run the standard rule: buy it back at **2× the credit**, or $${(wide160.mid * 2).toFixed(2)}.\n\n**Stop-market.** Once the trigger prints, the order becomes a market order. On a $${(wide160.ask - wide160.bid).toFixed(2)}-wide book you buy at the offer, and in fast conditions the offer widens further. Your trigger says $${(wide160.mid * 2).toFixed(2)}; your fill is whatever the far side happens to be — plausibly the full $${(wide160.ask - wide160.bid).toFixed(2)} above the bid that triggered you, or **$${((wide160.ask - wide160.bid) * 100).toFixed(0)}** of slippage on top of the loss you already accepted.\n\n**Stop-limit.** You cap the fill at $${(wide160.mid * 2).toFixed(2)} and refuse to pay up. Now you have the opposite exposure: on a gap, the market opens through your limit and the order simply never fills. You are still short, with no protection, exactly when you wanted it most.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "What NBIS did next (real bars)",
            bars: bars(t, "2026-07-22", "2026-07-31"),
            lines: [{ price: 160, label: "160 strike", color: "sky" }],
            markers: [
              { date: "2026-07-24", label: "entry", color: "violet" },
              { date: "2026-07-29", label: `low ${crashBar.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${jul31Bar.close}`, color: "emerald" },
            ],
            caption: `Three sessions after entry NBIS closed $${crashBar.close} — the strike went from ${(((wide160Entry.close - 160) / wide160Entry.close) * 100).toFixed(1)}% out of the money to $${(160 - crashBar.close).toFixed(2)} in the money, and traded as low as $${crashBar.low}. Then it reversed and expired at $${jul31Bar.close}, $${(jul31Bar.close - 160).toFixed(2)} OTM. The put was worthless.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `Follow the whole sequence through. At the July 29 low the contract carried $${(160 - crashBar.low).toFixed(2)} of intrinsic — ${((160 - crashBar.low) / wide160.mid).toFixed(1)}× the credit, so the 2× stop was touched. The stop-market fills near the panic low and pays the spread on the way out. The stop-limit doesn't fill. Holding kept the entire $${(wide160.mid * 100).toFixed(0)}. In this instance the order that failed was the order that saved you — which is luck, not a system.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nbis-stop-1",
              question: "Given a book this wide, what is the most defensible way to run risk on the position?",
              options: [
                "Use a stop-market so you are guaranteed to get out",
                "Use a stop-limit so you are guaranteed not to overpay",
                "Size the position so that no exit is mandatory, and use the underlying's price — not the option's mark — as the decision trigger",
                "Trade the same contract without any risk rule",
              ],
              correctIndex: 2,
              explanation:
                "Stop-market guarantees a fill at an unknown price; stop-limit guarantees a price with an unknown fill. On a wide, volatile book neither is reliable, so the risk has to be controlled before entry — through size — and the trigger should reference the stock, which trades continuously and tightly, rather than an option mark that can move on spread and IV alone.",
            },
            {
              id: "nbis-stop-2",
              question: `The $160 put's screen mid was $${wide160.mid.toFixed(2)}. What did a seller realistically collect?`,
              options: [
                `$${wide160.mid.toFixed(2)} — the mid is the fair price`,
                `Closer to the $${wide160.bid.toFixed(2)} bid, since a seller crossing the spread hits the bid — around ${(((wide160.mid - wide160.bid) / wide160.mid) * 100).toFixed(0)}% less than the screen figure`,
                `$${wide160.ask.toFixed(2)} — sellers receive the ask`,
                "The mid, minus commission only",
              ],
              correctIndex: 1,
              explanation: `Unless someone meets you inside the spread, a seller receives the bid: $${wide160.bid.toFixed(2)} against a $${wide160.mid.toFixed(2)} mid. That alone drags the row's ${wide160.aroc}% AROC down to roughly ${((wide160.aroc ?? 0) * (wide160.bid / wide160.mid)).toFixed(0)}% before you have taken a single unit of risk.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "the-vega-trap",
      title: "The stock went up and your put got more expensive",
      subtitle: "Two scans of one contract, four days apart",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `The **$150 put expiring July 31** was scanned twice. Look at what changed between them:\n\n• **NBIS close** — $${jul16Bar.close} on Jul 16, $${jul20Bar.close} on Jul 20.\n• **Mid** — $${iv150Early.mid.toFixed(2)} → $${iv150Later.mid.toFixed(2)}.\n• **Implied vol** — ${(iv150Early.iv * 100).toFixed(1)}% → ${(iv150Later.iv * 100).toFixed(1)}%.\n• **Delta** — ${iv150Early.delta.toFixed(4)} → ${iv150Later.delta.toFixed(4)}.\n• **Days to expiry** — ${iv150Early.dte} → ${iv150Later.dte}.\n\nNBIS rose **${(((jul20Bar.close - jul16Bar.close) / jul16Bar.close) * 100).toFixed(1)}%** and four days of theta burned off — both of which should have made a short put cheaper. Instead the contract got **${(((iv150Later.mid - iv150Early.mid) / iv150Early.mid) * 100).toFixed(0)}% more expensive.**\n\nThe reason is in the IV row: implied volatility rose ${((iv150Later.iv - iv150Early.iv) * 100).toFixed(1)} points. Vega overwhelmed delta and theta combined.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "150 strike — the path that resolved it (real bars)",
            bars: bars(t, "2026-07-15", "2026-07-31"),
            lines: [{ price: 150, label: "150 strike", color: "emerald" }],
            markers: [
              { date: "2026-07-16", label: "scan 1", color: "violet", below: true },
              { date: "2026-07-20", label: "scan 2", color: "violet" },
              { date: "2026-07-29", label: `low ${crashBar.low}`, color: "red", below: true },
              { date: "2026-07-31", label: `exp ${jul31Bar.close}`, color: "emerald" },
            ],
            caption: `Both sellers were right in the end — NBIS expired at $${jul31Bar.close}, $${(jul31Bar.close - 150).toFixed(2)} above the strike, and both kept their full credit ($${(iv150Early.mid * 100).toFixed(0)} and $${(iv150Later.mid * 100).toFixed(0)}). It was not a quiet ride, though: the July 29 low of $${crashBar.low} traded $${(150 - crashBar.low).toFixed(2)} through the strike two sessions before expiry, and NBIS closed that session at $${crashBar.close}. Everything either seller earned came from where the stock happened to be on one Friday.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "A short put's mark can rise while everything about your thesis is going right. If your risk rule is 'buy back at 2× the mark', an IV expansion can trigger it on a day the stock rallied — you get stopped out by volatility, not by being wrong.",
        },
        {
          type: "quiz",
          questions: [
            {
              id: "nbis-vega-1",
              question: `Between the two scans NBIS rose ${(((jul20Bar.close - jul16Bar.close) / jul16Bar.close) * 100).toFixed(1)}% and the $150 put's mid rose from $${iv150Early.mid.toFixed(2)} to $${iv150Later.mid.toFixed(2)}. Which Greek explains it?`,
              options: [
                "Delta — the put moved with the stock",
                "Theta — time decay reversed",
                "Vega — implied volatility rose from " + (iv150Early.iv * 100).toFixed(1) + "% to " + (iv150Later.iv * 100).toFixed(1) + "%, and the vega gain outweighed the delta and theta losses",
                "Gamma — the strike was near the money",
              ],
              correctIndex: 2,
              explanation: `Delta (${iv150Early.delta.toFixed(2)}) on a ${(((jul20Bar.close - jul16Bar.close) / jul16Bar.close) * 100).toFixed(1)}% rally and four days of theta both push a short put's value down. The only input that moved the other way was implied volatility, up ${((iv150Later.iv - iv150Early.iv) * 100).toFixed(1)} points — and on a contract with this much vega, that dominated.`,
            },
            {
              id: "nbis-vega-2",
              question: "What does this imply about premium-based stops on high-IV names?",
              options: [
                "They should be tightened to react faster",
                "They are unaffected by implied volatility",
                "They can fire on IV expansion alone, so on names like this the stop is better anchored to the underlying's price or to a thesis level",
                "They should be replaced by wider delta limits",
              ],
              correctIndex: 2,
              explanation: `A 2×-mark rule on the July 16 entry means buying back at $${(iv150Early.mid * 2).toFixed(2)}. The mid reached $${iv150Later.mid.toFixed(2)} on a day NBIS was *up* ${(((jul20Bar.close - jul16Bar.close) / jul16Bar.close) * 100).toFixed(1)}% — already ${(iv150Later.mid / iv150Early.mid).toFixed(1)}× and well on the way. Anchoring to the stock avoids being taken out by a volatility repricing that has nothing to do with your strike.`,
            },
          ],
        },
      ],
    },
  ], t, {
    "selling-the-exact-top": {
      kind: "short-put",
      entryDate: "2026-06-18",
      strike: 252.5,
      expiry: "2026-06-26",
      credit: top252.mid,
      volume: top252.volume,
      note: `At ${(top252.iv * 100).toFixed(0)}% IV the defense starts before any order: a cushion inside a one-σ move is a sizing problem. When no stop placement fits between "fires spuriously" and "limits nothing", the playbook's answer is a smaller position — or none.`,
    },
    "place-the-stop": {
      kind: "short-put",
      entryDate: "2026-06-18",
      strike: 252.5,
      expiry: "2026-06-26",
      credit: top252.mid,
      volume: top252.volume,
    },
    "same-strike-two-expiries": {
      kind: "short-put",
      entryDate: "2026-06-22",
      strike: 240,
      expiry: "2026-07-10",
      credit: jun240Long.mid,
      volume: jun240Long.volume,
      note: "This block defends pick B, the longer expiry. A's orders would read the same with its own credit — and would have fired on the same break.",
    },
    "stop-market-vs-stop-limit": {
      kind: "short-put",
      entryDate: "2026-07-24",
      strike: 160,
      expiry: "2026-07-31",
      credit: wide160.mid,
      volume: wide160.volume,
      note: "This is the whipsaw case the lesson describes: the defense fires near the low of a move that then reverses into a worthless expiry. That cost is the insurance premium — the alternative was discovering on a different path what a strike-sized loss feels like on a book this wide.",
    },
    "the-vega-trap": {
      kind: "short-put",
      entryDate: "2026-07-16",
      strike: 150,
      expiry: "2026-07-31",
      credit: iv150Early.mid,
      volume: iv150Early.volume,
      note: "Note which trigger fires here and when: not the premium stop on the July 20 vega pop the lesson dissects, but the close-basis line during the late-July washout. Anchoring the primary trigger to the stock is exactly what kept the IV expansion from stopping you out on a green day.",
    },
  }),
};
