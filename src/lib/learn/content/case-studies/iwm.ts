// IWM case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/IWM.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/IWM.json";
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

// ── Window shape: the calmest ticker in the dataset ────────────────────────
const first = barOn(t, "2026-05-01");
const last = barOn(t, "2026-08-05");
const ddPeak = barOn(t, "2026-05-06"); // 286.80 — the high before the only real dip
const ddTrough = barOn(t, "2026-05-19"); // 273.00 — the low close of the whole window
const ddPct = ((ddTrough.close - ddPeak.close) / ddPeak.close) * 100;

// ── Case 1 + 2 + 3: the May 6 put board (same day, same delta) ─────────────
const may280 = findPut(t, "2026-05-06", 280, "2026-05-15"); // 9 DTE, 22.5% AROC
const may275 = findPut(t, "2026-05-06", 275, "2026-05-22"); // 16 DTE, 17.1% AROC
const may271 = findPut(t, "2026-05-05", 271, "2026-05-22");
const may271Entry = barOn(t, "2026-05-05");
const shortExpiry = barOn(t, "2026-05-15"); // 277.60 — the 280 put finished ITM here
const longExpiry = barOn(t, "2026-05-22"); // 285.12 — the 275 put expired worthless
const worstLow = barOn(t, "2026-05-19").low; // 270.63 — deepest wick of the window

// ── Case 4: the 182% AROC that had no bid ─────────────────────────────────
const ghost287 = findPut(t, "2026-06-24", 287, "2026-07-01");
const ghostEntry = barOn(t, "2026-06-24");
const ghostExpiry = barOn(t, "2026-07-01");
const ghostWorstLow = Math.min(
  ...bars(t, "2026-06-25", "2026-07-01").map((b) => b.low)
);

// ── Case 5: 17 real scans of one call ─────────────────────────────────────
const decay = contractSeries(t, "call", 305, "2026-09-18");
const decayFirst = decay[0];
const decayLast = decay[decay.length - 1];
const decayStart = barOn(t, decayFirst.date);
const decayEnd = barOn(t, decayLast.date);
const decayPct = ((decayLast.mid - decayFirst.mid) / decayFirst.mid) * 100;

// ── Case 6: covered-call strike + DTE against the summer rally ────────────
const cc77 = findCall(t, "2026-06-05", 290, "2026-08-21");
const cc105 = findCall(t, "2026-06-05", 290, "2026-09-18");
const ccEntry = barOn(t, "2026-06-05");
const ccCapped = 290 - ccEntry.close + cc77.mid; // per-share total if called away
const ccShares = last.close - ccEntry.close; // per-share total holding naked long

export const IWM_CASES: Module = {
  id: "cs-iwm",
  title: "IWM Case Studies",
  subtitle: "A 4.8% max drawdown, a 182% AROC with no bid, and 17 scans of one call decaying",
  icon: "🧊",
  color: "blue-500",
  level: 2,
  track: "case-study",
  ticker: "IWM",
  universe: "opportunity",
  lessons: [
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "the-calm-side-of-premium",
      title: "The calm side of premium selling",
      subtitle: "The ticker you scrolled past because the numbers looked small",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `You never traded IWM. The scanner surfaced it constantly anyway — the Russell 2000 ETF was one of the most-scanned names in the window, and almost every row looked *boring*.\n\nOver ${bars(t).length} trading days it went from **$${first.close}** to **$${last.close}** (+${(((last.close - first.close) / first.close) * 100).toFixed(1)}%). The single worst stretch — the only one worth naming — was **May 6 → May 19**: $${ddPeak.close.toFixed(2)} down to $${ddTrough.close.toFixed(2)}. That's **${ddPct.toFixed(2)}%**.\n\nFor comparison, that is the *entire* downside an IWM put seller had to survive in three months.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "IWM — the whole window (real bars)",
            bars: bars(t),
            lines: [
              { price: ddPeak.close, label: `peak ${ddPeak.close.toFixed(2)}`, color: "amber" },
              { price: ddTrough.close, label: `trough ${ddTrough.close.toFixed(2)}`, color: "sky" },
            ],
            markers: [
              { date: "2026-05-19", label: "-4.8%", color: "red", below: true },
              { date: "2026-08-05", label: `${last.close}`, color: "emerald" },
            ],
            caption: `One dip worth naming, then a grind to $${last.close}. An index ETF averages away the single-name gap risk that shows up in every other module in this track — and the option chain prices that in.`,
          },
        },
        {
          type: "text",
          content: `Here is what "boring" pays. On **May 5** (IWM at $${may271Entry.close}) the scanner offered the **$${may271.strike} put expiring May 22** — ${pctOtm(may271.strike, may271Entry.close)}% out of the money, delta ${may271.delta.toFixed(2)}, IV ${(may271.iv * 100).toFixed(0)}%, ${may271.dte} days out — for **$${may271.mid.toFixed(2)}**.\n\nThat's $${(may271.mid * 100).toFixed(0)} per contract against $${((may271.strike * 100) / 1000).toFixed(1)}k of collateral: ${may271.aroc}% annualized. On a single name a 0.20-delta put often pays two to four times that. The gap *is* the risk difference, quoted.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "iwm-calm-1",
              question: `A 0.20-delta put on IWM and a 0.20-delta put on a high-beta single name imply roughly the same chance of finishing ITM. Why is IWM's credit so much smaller?`,
              options: [
                "IWM options are less liquid, so market makers pay less",
                "Delta describes the odds, not the size of the move — the index's realized moves are far smaller, so the same odds are reached much closer to the money and are worth less",
                "Index options have no time value",
                "The scanner scores index tickers lower",
              ],
              correctIndex: 1,
              explanation: `Delta is the probability-ish number; premium is priced off expected *magnitude*. IWM's worst close-to-close drawdown here was ${ddPct.toFixed(1)}%, so a 0.20-delta strike sits only a few percent away and is cheap. The small credit isn't money left on the table — it's the correctly quoted price of a much smaller tail.`,
            },
          ],
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "Judge a premium against the instrument's own distribution, not against the juiciest row on your screen. An index CSP and a momentum-name CSP are two different businesses that happen to share a ticker format.",
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "top-of-the-aroc-column",
      title: "Top of the AROC column",
      subtitle: "Two puts, one scan day, nearly identical delta — one lost money",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**May 6, 2026.** IWM closes at **$${ddPeak.close.toFixed(2)}** — a level it won't see again for three weeks — with RSI at ${may280.rsi}. Both of these came off that day's scan, and their deltas are within ${Math.abs(may280.delta - may275.delta).toFixed(3)} of each other. Only one of them is a good trade.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Same day, same underlying, same delta. Which put do you sell?",
            goal: "Income on an index — collect the credit, avoid assignment",
            a: {
              label: "A · $280 put",
              date: "2026-05-06",
              side: "put",
              strike: 280,
              expiry: "2026-05-15",
              dte: may280.dte,
              bid: may280.bid,
              ask: may280.ask,
              mid: may280.mid,
              delta: may280.delta,
              iv: may280.iv,
              aroc: may280.aroc,
              volume: may280.volume,
              note: `${pctOtm(280, ddPeak.close)}% OTM`,
            },
            b: {
              label: "B · $275 put",
              date: "2026-05-06",
              side: "put",
              strike: 275,
              expiry: "2026-05-22",
              dte: may275.dte,
              bid: may275.bid,
              ask: may275.ask,
              mid: may275.mid,
              delta: may275.delta,
              iv: may275.iv,
              aroc: may275.aroc,
              volume: may275.volume,
              note: `${pctOtm(275, ddPeak.close)}% OTM`,
            },
            correct: "b",
            explanation: `A's extra ${((may280.aroc ?? 0) - (may275.aroc ?? 0)).toFixed(1)} points of AROC came from being ${(pctOtm(275, ddPeak.close) - pctOtm(280, ddPeak.close)).toFixed(1)} percentage points closer to the money over ${may275.dte - may280.dte} fewer days — not from a better edge. IWM closed May 15 at $${shortExpiry.close.toFixed(2)}: A finished $${(280 - shortExpiry.close).toFixed(2)}/sh ITM, a net **-$${((280 - shortExpiry.close - may280.mid) * 100).toFixed(2)}** per contract after the $${may280.mid.toFixed(2)} credit. B took the same slide, dipped to $${worstLow} intraday on May 19, and still expired worthless on May 22 at $${longExpiry.close} — the full $${(may275.mid * 100).toFixed(0)} kept. B was also the thinner quote (${may275.volume} contracts traded that day vs ${may280.volume}), so size it accordingly.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Both strikes, one slide (real bars)",
            bars: bars(t, "2026-05-01", "2026-05-22"),
            lines: [
              { price: 280, label: "A: 280 strike", color: "red" },
              { price: 275, label: "B: 275 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-05-06", label: "entry", color: "violet" },
              { date: "2026-05-15", label: `A exp ${shortExpiry.close.toFixed(2)}`, color: "red", below: true },
              { date: "2026-05-22", label: `B exp ${longExpiry.close.toFixed(2)}`, color: "emerald" },
            ],
            caption: `Seven extra days and five extra dollars of distance was the entire difference between -$${((280 - shortExpiry.close - may280.mid) * 100).toFixed(2)} and +$${(may275.mid * 100).toFixed(0)}. Nothing about the thesis changed.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `AROC is a *rate*: credit ÷ collateral, annualized by DTE. Shortening the expiry inflates it mechanically. Sorting a chain by AROC quietly sorts it by "closest strike, fewest days" — which is also the order of most-likely-to-be-tested.`,
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "the-wick-that-stops-you-out",
      title: "The wick that stops you out",
      subtitle: "You now own the winning put. Where do you cut it?",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `You picked B: short the **$275 put, May 22 expiry**, sold May 6 for **$${may275.mid.toFixed(2)}** (delta ${may275.delta.toFixed(2)}, ${may275.aroc}% AROC). The catalyst line read: *"${may275.catalyst}"*\n\nNine days later the index has rolled over and is sitting near the strike. Set your stop before you scroll — the chart hides everything after May 15.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-05-01", "2026-05-22"),
            visibleUntil: "2026-05-15",
            strike: 275,
            credit: may275.mid,
            entryDate: "2026-05-06",
            expiry: "2026-05-22",
            guide: { min: 268, max: 270.5 },
            explanation: `IWM broke the strike on May 18 (low $${barOn(t, "2026-05-18").low}) and bottomed at **$${worstLow}** on May 19 — then closed May 22 at $${longExpiry.close}, and the put expired worthless. Any stop between the strike and $${worstLow} paid to exit a winner. The recommended zone sits under the wick: on a ticker whose worst drawdown of the quarter was ${ddPct.toFixed(1)}%, the stop has to sit outside the noise band or it *is* the noise band.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `The premium-based rule doesn't rescue you here either. A 2×–3× credit stop on this trade means buying back at $${(2 * may275.mid).toFixed(2)}–$${(3 * may275.mid).toFixed(2)}. At the May 19 low the put's *intrinsic value alone* was $${(275 - worstLow).toFixed(2)} — ${((275 - worstLow) / may275.mid).toFixed(1)}× the credit, before a cent of the three remaining days of time value. The 2× rule fires, and three sessions later the index is back up ${(((longExpiry.close - ddTrough.close) / ddTrough.close) * 100).toFixed(1)}%.`,
        },
        {
          type: "text",
          content: `This is the opposite of the single-name lesson, and both are true:\n• On a name that can lose a third of its value, a stop is what stops one trade from erasing a year.\n• On an index that has never moved ${Math.abs(ddPct).toFixed(0)}% against you in a quarter, a stop copied from that playbook converts ordinary chop into realized losses.\n\nThe stop belongs where the *thesis* dies. Here the thesis was "the Russell doesn't fall ${(((ddPeak.close - 275) / ddPeak.close) * 100).toFixed(1)}% in ${may275.dte} days" — and it never did, on a closing basis.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "iwm-stop-1",
              question: `Same 2× credit stop rule, two tickers. Why does it protect a PLTR put seller and hurt an IWM put seller?`,
              options: [
                "Index options decay faster, so stops trigger sooner",
                "A fixed multiple of credit is a fixed distance in premium, but the credit itself is tiny on an index — so 2× credit is reached by a routine wick rather than a thesis-breaking move",
                "IWM has no support levels to anchor a stop",
                "Stops always work better on higher-priced underlyings",
              ],
              correctIndex: 1,
              explanation: `The credit scales with expected move; the *stop distance* should too. $${may275.mid.toFixed(2)} of credit on a ${ddPct.toFixed(1)}%-drawdown instrument means 2× credit sits inside one bad session. Calibrate the exit to the instrument's own volatility — or use a level-based stop below the range instead of a premium multiple.`,
            },
          ],
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "the-aroc-with-no-bid",
      title: "182% AROC with no bid",
      subtitle: "The juiciest row in the whole IWM file was a quote artifact",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**June 24, 2026**, IWM at $${ghostEntry.close}. The scanner surfaces the **$${ghost287.strike} put expiring July 1** — ${ghost287.dte} DTE, ${pctOtm(ghost287.strike, ghostEntry.close)}% OTM, delta ${ghost287.delta.toFixed(2)} — with **${ghost287.aroc}% AROC** and a juiciness score of ${ghost287.juiciness}, the highest of any IWM row in the window.\n\nThen you look at the quote:\n\n• **Bid $${ghost287.bid.toFixed(2)} / Ask $${ghost287.ask.toFixed(2)}** — a spread of $${(ghost287.ask - ghost287.bid).toFixed(2)}, or ${(((ghost287.ask - ghost287.bid) / ghost287.mid) * 100).toFixed(0)}% of the mid.\n• Mid **$${ghost287.mid.toFixed(2)}** — the number every downstream calculation used, including that $${(ghost287.mid * 100).toFixed(0)} "premium" and the ${ghost287.aroc}% AROC.\n• Day volume: **${ghost287.volume}** contracts.`,
        },
        {
          type: "callout",
          style: "warning",
          content: `With a $0.00 bid there is no buyer at any price the mid implies. The mid of a 0.00 × 20.00 market is arithmetic, not a price. Every metric derived from it — premium, AROC, juiciness, the whole ranking — inherits the fiction and puts this row at the top of your screen.`,
        },
        {
          type: "text",
          content: `**What actually happened:** the trade "worked". IWM never came near $${ghost287.strike} — the lowest low between entry and expiry was $${ghostWorstLow}, and July 1 closed at **$${ghostExpiry.close}**. The put expired worthless.\n\nAnd you would not have collected $${(ghost287.mid * 100).toFixed(0)}. You'd have collected whatever a market maker actually paid — somewhere north of $0.00 and nowhere near the mid. The realized AROC on this "182%" trade is unknowable from the data, which is precisely the problem.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "iwm-ghost-1",
              question: `You are short this ${ghost287.strike} put and it moves against you. You have a stop order resting. What does a **stop-market** do in a $${ghost287.bid.toFixed(2)} × $${ghost287.ask.toFixed(2)} market?`,
              options: [
                `Fills at the mid, $${ghost287.mid.toFixed(2)}`,
                `Fills at the ask — the only live price — which on this spread means paying up to $${ghost287.ask.toFixed(2)} to close a position you were credited a fraction of`,
                "Cancels automatically because the spread is too wide",
                "Fills at the bid",
              ],
              correctIndex: 1,
              explanation: `A buy-stop to close becomes a market order and crosses the spread. On a ${(((ghost287.ask - ghost287.bid) / ghost287.mid) * 100).toFixed(0)}%-of-mid spread that fill can cost several times the credit. A stop-limit avoids the terrible fill but may never fill at all — leaving you in the position you were trying to exit. Neither is good; the fix happens at entry, by not selling contracts whose exit doesn't exist.`,
            },
            {
              id: "iwm-ghost-2",
              question: `Which liquidity check would have removed this row from consideration before you ever looked at its AROC?`,
              options: [
                "Reject any contract more than 3% OTM",
                "Reject any contract with fewer than 7 DTE",
                "Reject any contract with a zero bid, or a bid-ask spread above ~10% of mid, or negligible day volume — this row failed all three",
                "Reject any contract with delta below 0.20",
              ],
              correctIndex: 2,
              explanation: `Bid > 0, spread as a fraction of mid, and volume are cheap filters that run before any return math. This contract had a $0.00 bid, a ${(((ghost287.ask - ghost287.bid) / ghost287.mid) * 100).toFixed(0)}% spread, and ${ghost287.volume} contracts of volume. Apply the liquidity screen first, then rank what survives.`,
            },
          ],
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "watching-theta-work",
      title: "Watching theta work, 17 scans in a row",
      subtitle: "The same call, scanned every session — decay as an observed series",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `Most decay lessons show you a smooth textbook curve. This one is the real thing: the **$${decayFirst.strike} call expiring ${decayFirst.expiry}** was scanned ${decay.length} times between ${decayFirst.date} and ${decayLast.date}, and here is every one of those marks.\n\nScrub through it. Watch three numbers at once — the mid, the dashed IV line, and the delta underneath.`,
        },
        {
          type: "interactive",
          component: "premium-decay-scrubber",
          props: {
            title: `${decay.length} real scans of one contract`,
            side: "call",
            strike: decayFirst.strike,
            expiry: decayFirst.expiry,
            series: decay.map((p) => ({
              date: p.date,
              dte: p.dte,
              mid: p.mid,
              iv: p.iv,
              delta: p.delta,
            })),
            caption: `From ${decayFirst.dte} DTE to ${decayLast.dte} DTE the mid fell from $${decayFirst.mid.toFixed(2)} to $${decayLast.mid.toFixed(2)} (${decayPct.toFixed(0)}%) while IV drifted from ${(decayFirst.iv * 100).toFixed(1)}% to ${(decayLast.iv * 100).toFixed(1)}%. Note the bumps: on ${decay[7].date} the mid jumped to $${decay[7].mid.toFixed(2)} before resuming its slide. Decay is a trend, not a schedule.`,
          },
        },
        {
          type: "text",
          content: `The detail that makes this worth studying: **the underlying went up.** IWM closed at $${decayStart.close} on ${decayFirst.date} and $${decayEnd.close} on ${decayLast.date} — up ${(((decayEnd.close - decayStart.close) / decayStart.close) * 100).toFixed(2)}%.\n\nA ${decayFirst.delta.toFixed(2)}-delta call should have gained roughly $${(decayFirst.delta * (decayEnd.close - decayStart.close)).toFixed(2)} from that move alone. It lost **$${(decayFirst.mid - decayLast.mid).toFixed(2)}** instead. The ${decayFirst.dte - decayLast.dte} days that came off the clock, plus ${((decayFirst.iv - decayLast.iv) * 100).toFixed(1)} points of IV compression, drained about $${(decayFirst.mid - decayLast.mid + decayFirst.delta * (decayEnd.close - decayStart.close)).toFixed(2)} of extrinsic value — enough to erase the directional gain and leave the $${(decayFirst.mid - decayLast.mid).toFixed(2)} net loss.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content: `Flip the sign and that's the seller's ledger: **+$${((decayFirst.mid - decayLast.mid) * 100).toFixed(0)} per contract in ${decayFirst.dte - decayLast.dte} days, while the index rallied.** Selling premium on a calm underlying doesn't need direction to work — it needs the underlying to not move *fast*, and it needs you to still be in the position when the clock runs out.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "iwm-decay-1",
              question: `The underlying rose ${(((decayEnd.close - decayStart.close) / decayStart.close) * 100).toFixed(2)}% and the call still lost ${Math.abs(decayPct).toFixed(0)}% of its value. What did the work?`,
              options: [
                "Delta went negative",
                `${decayFirst.dte - decayLast.dte} days of time decay plus a drop in implied volatility from ${(decayFirst.iv * 100).toFixed(1)}% to ${(decayLast.iv * 100).toFixed(1)}% — both push an option's extrinsic value down regardless of direction`,
                "The strike moved further out of the money",
                "Volume dried up, so the quote fell",
              ],
              correctIndex: 1,
              explanation: `This call was all extrinsic value (strike $${decayFirst.strike}, index around $${decayEnd.close}). Extrinsic value is time × volatility, and both shrank. Delta added about $${(decayFirst.delta * (decayEnd.close - decayStart.close)).toFixed(2)} in the buyer's favor and was swamped. That asymmetry — being right on direction and still losing — is what you're paid for when you're on the other side.`,
            },
          ],
        },
      ],
    },
    // ── 6 ──────────────────────────────────────────────────────────────
    {
      id: "the-cap-that-cost-almost-nothing",
      title: "The cap that cost almost nothing",
      subtitle: "Selling a call against 100 shares into the biggest rally of the window",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `**June 5, 2026.** IWM has just dropped from an intraday $${ccEntry.high.toFixed(2)} to close at **$${ccEntry.close}** — its worst session of the month. You hold 100 shares and want income. The scan shows the **$${cc77.strike} call** (${(((290 - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}% above spot) at two different expiries.`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Same strike, two expiries. Which call do you sell against your shares?",
            goal: "Income from a covered call — keep the shares if you can",
            a: {
              label: "A · Aug 21",
              date: "2026-06-05",
              side: "call",
              strike: 290,
              expiry: "2026-08-21",
              dte: cc77.dte,
              bid: cc77.bid,
              ask: cc77.ask,
              mid: cc77.mid,
              delta: cc77.delta,
              iv: cc77.iv,
              volume: cc77.volume,
              note: `$${(cc77.mid / cc77.dte).toFixed(3)}/day of premium`,
            },
            b: {
              label: "B · Sep 18",
              date: "2026-06-05",
              side: "call",
              strike: 290,
              expiry: "2026-09-18",
              dte: cc105.dte,
              bid: cc105.bid,
              ask: cc105.ask,
              mid: cc105.mid,
              delta: cc105.delta,
              iv: cc105.iv,
              volume: cc105.volume,
              note: `$${(cc105.mid / cc105.dte).toFixed(3)}/day of premium`,
            },
            correct: "a",
            explanation: `B pays $${(cc77.mid - cc105.mid).toFixed(2)} *less* for ${cc105.dte - cc77.dte} *more* days of obligation — $${(cc77.mid / cc77.dte).toFixed(3)}/day versus $${(cc105.mid / cc105.dte).toFixed(3)}/day, a ${(((cc77.mid / cc77.dte - cc105.mid / cc105.dte) / (cc105.mid / cc105.dte)) * 100).toFixed(0)}% better rate for A. Extrinsic value grows with the square root of time, so doubling DTE never doubles the credit; you're renting your upside out at a worse price the further you go. B's one real advantage is liquidity (${cc105.volume} contracts traded vs ${cc77.volume}) — worth a wider look before sizing, but not worth ${cc105.dte - cc77.dte} extra days of cap.`,
          },
        },
        {
          type: "text",
          content: `**What actually happened.** IWM ran from $${ccEntry.close} to **$${last.close}** by August 5 — a ${(((last.close - ccEntry.close) / ccEntry.close) * 100).toFixed(1)}% move, the largest advance in the dataset, and the exact scenario covered-call sellers dread.\n\nRun the two ledgers per share:\n• **Shares alone:** +$${ccShares.toFixed(2)}\n• **Shares + the $${cc77.strike} call:** $${(290 - ccEntry.close).toFixed(2)} of capped appreciation + $${cc77.mid.toFixed(2)} credit = **+$${ccCapped.toFixed(2)}**, an effective sale price of $${(290 + cc77.mid).toFixed(2)}\n\nThe cap cost **$${(ccShares - ccCapped).toFixed(2)}/share** — $${((ccShares - ccCapped) * 100).toFixed(0)} per contract, or ${(((ccShares - ccCapped) / ccShares) * 100).toFixed(0)}% of the move.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The rally, against the cap (real bars)",
            bars: bars(t, "2026-06-05", "2026-08-05"),
            lines: [
              { price: 290, label: "290 strike", color: "amber" },
              { price: Number((290 + cc77.mid).toFixed(2)), label: "effective sale", color: "emerald" },
            ],
            markers: [
              { date: "2026-06-05", label: "sold call", color: "violet" },
              { date: "2026-08-05", label: `${last.close}`, color: "sky" },
            ],
            caption: `Price spent most of July below the effective sale price of $${(290 + cc77.mid).toFixed(2)} and only cleared it in the final two sessions. One honest caveat: the August 21 expiry is past the end of the dataset, so this is the ledger as of the last observed bar (August 5), not a settled result.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content: `That is the whole case for covered calls on an index. The same ${cc77.delta.toFixed(2)}-delta call sold against a name that can rip 40% in a quarter surrenders multiples of the credit. Here, the worst-case rally in three months cost $${(ccShares - ccCapped).toFixed(2)}/share against a $${cc77.mid.toFixed(2)} credit collected up front — and every quieter path in between would have kept the premium *and* the shares.`,
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "Six cases, one theme: IWM's numbers are small in both directions. That symmetry is the product. The mistakes that show up here aren't dramatic losses — they're importing a single-name playbook (chase the AROC, stop at 2× credit, trust the mid) into an instrument that doesn't behave like one.",
        },
      ],
    },
  ],
};
