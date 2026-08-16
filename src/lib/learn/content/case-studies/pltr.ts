// PLTR case studies — every number below is a real scanner snapshot or price
// bar from src/lib/learn/v2-data/PLTR.json (May–Aug 2026). Lookups throw at
// build time if a referenced contract/date isn't in the dataset.

import raw from "@/lib/learn/v2-data/PLTR.json";
import { bars, barOn, findPut, type V2Ticker } from "@/lib/learn/v2";
import type { Module } from "@/lib/learn/curriculum";
import { withDefenses } from "./defense-sections";

const t = raw as V2Ticker;

// ── Case 1 + 2: the June slide ─────────────────────────────────────────────
// 2026-06-01: PLTR closes 160.65 (the top). Scanner offers the 150 put,
// 06-12 expiry, catalyst claims a "$156 support level".
const june150 = findPut(t, "2026-06-01", 150, "2026-06-12");
const juneTop = barOn(t, "2026-06-01");
const june150Expiry = barOn(t, "2026-06-12");

// 2026-06-15: the 125 put, 06-26 expiry — breached 06-22, closed 12.07 ITM.
const june125 = findPut(t, "2026-06-15", 125, "2026-06-26");
const june125Entry = barOn(t, "2026-06-15");
const june125Expiry = barOn(t, "2026-06-26");

// ── Case 3: earnings-eve entries (2026-05-04, earnings in 3d) ──────────────
const may135 = findPut(t, "2026-05-04", 135, "2026-05-15");
const may130 = findPut(t, "2026-05-04", 130, "2026-05-15");
const mayEntry = barOn(t, "2026-05-04");
const mayExpiry = barOn(t, "2026-05-15");

// ── Case 5: the verified winner (2026-07-09, 120 put) ─────────────────────
const july120 = findPut(t, "2026-07-09", 120, "2026-07-17");
const julyEntry = barOn(t, "2026-07-09");
const julyExpiry = barOn(t, "2026-07-17");

// Shared aftermath facts (real bars).
const worstJuneLow = barOn(t, "2026-06-25").low; // 106.37
const lastBar = t.prices[t.prices.length - 1];

export const PLTR_CASES: Module = {
  id: "cs-pltr",
  title: "PLTR Case Studies",
  subtitle: "A 33% drawdown, a failed 'support floor', and the wheel that recovered",
  icon: "📈",
  color: "emerald-500",
  level: 2,
  track: "case-study",
  ticker: "PLTR",
  universe: "traded",
  lessons: withDefenses([
    // ── 1 ──────────────────────────────────────────────────────────────
    {
      id: "support-floor-that-wasnt",
      title: "The support floor that wasn't",
      subtitle: "Selling the top with a thesis that died in 24 hours",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `On **June 1, 2026**, PLTR closed at **$${juneTop.close}** — what turned out to be the exact top of its summer range. The scanner surfaced the **$150 put expiring June 12** for **$${june150.mid.toFixed(2)}** credit (delta ${june150.delta.toFixed(2)}, ${june150.aroc}% AROC, juiciness ${june150.juiciness}).\n\nThe catalyst line read: *"${june150.catalyst}"*`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "PLTR — the June slide (real bars)",
            bars: bars(t, "2026-05-26", "2026-06-26"),
            lines: [
              { price: 150, label: "150 strike", color: "sky" },
              { price: 156, label: "claimed support", color: "amber" },
            ],
            markers: [
              { date: "2026-06-01", label: "entry", color: "violet" },
              { date: "2026-06-12", label: "expiry", color: "red", below: true },
            ],
            shadeAfter: "2026-06-12",
            caption: `The "$156 support" was breached the very next session (June 2 low: $${barOn(t, "2026-06-02").low}). By expiry PLTR closed at $${june150Expiry.close} — the put finished $${(150 - june150Expiry.close).toFixed(2)}/sh in the money against $${june150.mid.toFixed(2)} collected.`,
          },
        },
        {
          type: "callout",
          style: "warning",
          content: `That's a **$${((150 - june150Expiry.close - june150.mid) * 100).toFixed(0)} loss per contract** on a trade that offered $${(june150.mid * 100).toFixed(0)} of premium. One losing entry like this erases ${Math.floor((150 - june150Expiry.close - june150.mid) / june150.mid)} winners of the same size.`,
        },
        {
          type: "text",
          content: `What was actually wrong at entry?\n• The "support level" ($156) sat **above** the short strike — by the time price tested the thesis, the trade was already losing.\n• Entry came after a near-vertical run to $${juneTop.close} — selling puts into euphoria means selling when IV (and premium) *look* attractive but mean-reversion risk is highest.\n• A ${june150.dte}-day expiry left no room to be wrong.`,
        },
        {
          type: "quiz",
          questions: [
            {
              id: "pltr-sf-1",
              question: `The catalyst cited "$156 support" for a $150 short put. What is the structural problem?`,
              options: [
                "The support level was too far below the strike",
                "If support at $156 fails, price is already through it before the $150 strike is even tested — the thesis breaks before the trade does",
                "Support levels don't matter for puts",
                "The premium was too small to matter",
              ],
              correctIndex: 1,
              explanation:
                "Support at $156 was the last defense above the strike. Once it failed (the very next day), there was nothing between price and the strike. A support-based thesis should sit meaningfully below your strike, not above it.",
            },
            {
              id: "pltr-sf-2",
              question: `PLTR closed at $${june150Expiry.close} on expiry day. Ignoring early management, what was the seller's approximate P&L per contract?`,
              options: [
                `+$${(june150.mid * 100).toFixed(0)} — the premium collected`,
                `-$${((150 - june150Expiry.close) * 100).toFixed(0)} — the intrinsic value`,
                `-$${((150 - june150Expiry.close - june150.mid) * 100).toFixed(0)} — intrinsic loss minus premium collected`,
                "Zero — puts expire worthless",
              ],
              correctIndex: 2,
              explanation: `Loss = (strike − close − credit) × 100 = (150 − ${june150Expiry.close} − ${june150.mid.toFixed(2)}) × 100 ≈ $${((150 - june150Expiry.close - june150.mid) * 100).toFixed(0)}. The credit softens, but never caps, a short put's downside.`,
            },
          ],
        },
      ],
    },
    // ── 2 ──────────────────────────────────────────────────────────────
    {
      id: "place-the-stop",
      title: "You place the stop",
      subtitle: "Same slide, two weeks later — where would you have cut it?",
      estimatedMinutes: 7,
      sections: [
        {
          type: "text",
          content: `Two weeks into the slide, on **June 15** (close $${june125Entry.close}), the scanner offered the **$125 put expiring June 26** for **$${june125.mid.toFixed(2)}** (delta ${june125.delta.toFixed(2)}, juiciness ${june125.juiciness}). The catalyst: *"${june125.catalyst}"* — sound familiar?\n\nThis time, *you* manage the trade. Set your stop on the chart, then see the real outcome.`,
        },
        {
          type: "interactive",
          component: "place-the-stop",
          props: {
            bars: bars(t, "2026-06-08", "2026-06-26"),
            visibleUntil: "2026-06-18",
            strike: 125,
            credit: june125.mid,
            entryDate: "2026-06-15",
            expiry: "2026-06-26",
            guide: { min: 126.5, max: 129.5 },
            explanation: `The claimed floor was $130. A stop just below it ($126.50–$129.50) respects the thesis: if the "support" that justified the trade fails, the trade is wrong — exit. PLTR broke $125 on June 22, hit $${worstJuneLow} on June 25, and closed expiry at $${june125Expiry.close}: $${(125 - june125Expiry.close).toFixed(2)}/sh ITM versus $${june125.mid.toFixed(2)} collected. A premium-based rule (buy back at 2–3× credit) would have exited around the same time.`,
          },
        },
        {
          type: "callout",
          style: "key-concept",
          content:
            "A stop on a short put isn't about the option price alone — it's tied to the *reason* you sold it. If the trade's thesis was a support level, the stop belongs where that thesis dies, and 2–3× the collected credit is the premium-side backstop.",
        },
      ],
    },
    // ── 3 ──────────────────────────────────────────────────────────────
    {
      id: "earnings-eve-picker",
      title: "Earnings-eve premium: pick your poison",
      subtitle: "Two real contracts, three days before earnings",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `**May 4, 2026**, PLTR at $${mayEntry.close}, earnings in 3 days. IV is pumped and the scanner shows juicy AROC on everything. Two real candidates from that scan, same expiry (May 15):`,
        },
        {
          type: "interactive",
          component: "contract-picker",
          props: {
            prompt: "Which put do you sell into earnings?",
            goal: "Income — collect elevated premium, avoid assignment",
            a: {
              label: "A · $135 put",
              date: "2026-05-04",
              side: "put",
              strike: 135,
              expiry: "2026-05-15",
              dte: may135.dte,
              bid: may135.bid,
              ask: may135.ask,
              mid: may135.mid,
              delta: may135.delta,
              iv: may135.iv,
              aroc: may135.aroc,
              volume: may135.volume,
              note: may135.catalyst,
            },
            b: {
              label: "B · $130 put",
              date: "2026-05-04",
              side: "put",
              strike: 130,
              expiry: "2026-05-15",
              dte: may130.dte,
              bid: may130.bid,
              ask: may130.ask,
              mid: may130.mid,
              delta: may130.delta,
              iv: may130.iv,
              aroc: may130.aroc,
              volume: may130.volume,
              note: may130.catalyst,
            },
            correct: "b",
            explanation: `PLTR dropped ${(((mayEntry.close - barOn(t, "2026-05-05").close) / mayEntry.close) * 100).toFixed(1)}% the next session and traded as low as $${barOn(t, "2026-05-13").low} on May 13. At expiry it closed $${mayExpiry.close}: the $135 put finished $${(135 - mayExpiry.close).toFixed(2)} ITM (though the $${may135.mid.toFixed(2)} credit still covered it — barely), while the $130 put survived by $${(mayExpiry.close - 130).toFixed(2)} after dipping through the strike intraday. The extra ${((may135.aroc ?? 0) - (may130.aroc ?? 0)).toFixed(0)} points of AROC bought a 0.30-delta earnings gamble that spent a week underwater.`,
          },
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "What earnings actually did (real bars)",
            bars: bars(t, "2026-05-01", "2026-05-15"),
            lines: [
              { price: 135, label: "A: 135 strike", color: "red" },
              { price: 130, label: "B: 130 strike", color: "emerald" },
            ],
            markers: [
              { date: "2026-05-04", label: "entry", color: "violet" },
              { date: "2026-05-05", label: "-6.9%", color: "red", below: true },
            ],
            caption: `Both strikes were stress-tested. B (130) held on a closing basis; A (135) spent the back half of the trade ITM. "Elevated IV" is compensation for exactly this.`,
          },
        },
        {
          type: "callout",
          style: "tip",
          content:
            "Selling puts into earnings isn't automatically wrong — but size the strike for the gap, not the AROC column. The higher-AROC contract is higher-AROC *because* the market prices a bigger move.",
        },
      ],
    },
    // ── 4 ──────────────────────────────────────────────────────────────
    {
      id: "assignment-aftermath",
      title: "Deep ITM at expiry: panic, or take the shares?",
      subtitle: "What actually happened after the 125 put got assigned",
      estimatedMinutes: 6,
      sections: [
        {
          type: "text",
          content: `Back to the June 15 trade: the **$125 put** (credit $${june125.mid.toFixed(2)}) arrives at June 26 expiry with PLTR at **$${june125Expiry.close}** — $${(125 - june125Expiry.close).toFixed(2)}/sh in the money. Three days earlier it looked even worse: the June 25 low was $${worstJuneLow}, $${(125 - worstJuneLow).toFixed(2)} through the strike.\n\nThe choices on the table:\n• **Panic-close near the low** — lock in roughly -$${((125 - worstJuneLow - june125.mid) * 100).toFixed(0)}/contract.\n• **Take assignment** at $125 — effective basis $${(125 - june125.mid).toFixed(2)} with the stock at $${june125Expiry.close}.\n• **Keep wheeling** — the dataset's next comparable short put was the July 7 $125 (July 17 expiry) at $${findPut(t, "2026-07-07", 125, "2026-07-17").mid.toFixed(2)}.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "The recovery you'd have missed (real bars)",
            bars: bars(t, "2026-06-15", "2026-08-05"),
            lines: [
              { price: 125, label: "strike / assignment", color: "sky" },
              { price: Number((125 - june125.mid).toFixed(2)), label: "effective basis", color: "emerald" },
            ],
            markers: [
              { date: "2026-06-25", label: `low ${worstJuneLow}`, color: "red", below: true },
              { date: "2026-07-17", label: "next expiry", color: "amber" },
            ],
            caption: `Assigned at an effective $${(125 - june125.mid).toFixed(2)} basis, the position was back above water by mid-July (July 17 close: $${julyExpiry.close}) and up ${(((lastBar.close - (125 - june125.mid)) / (125 - june125.mid)) * 100).toFixed(0)}% by August 5 ($${lastBar.close.toFixed(2)}).`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "pltr-aa-1",
              question: "What made taking assignment defensible here (rather than lucky)?",
              options: [
                "PLTR always goes back up",
                "It was a wheel ticker the trader already wanted to own, the loss was defined and sized, and closing at the panic low crystallized the worst price",
                "Assignment resets the premium collected",
                "Deep ITM puts can't be closed early",
              ],
              correctIndex: 1,
              explanation:
                "Assignment is a position choice, not a failure state — *if* the ticker is one you sized to own. The mistake window was earlier: no stop as the thesis broke. Once deep ITM at expiry, selling into the June 25 panic low was the worst of the three options on this real path.",
            },
          ],
        },
        {
          type: "callout",
          style: "warning",
          content:
            "Careful with the survivorship lesson here: this recovery is one real path, not a law. The stop lesson (case 2) is what keeps you out of situations where you *need* the recovery.",
        },
      ],
    },
    // ── 5 ──────────────────────────────────────────────────────────────
    {
      id: "textbook-winner",
      title: "The textbook winner",
      subtitle: "High juiciness, strike below the panic low — the arc of a clean CSP",
      estimatedMinutes: 5,
      sections: [
        {
          type: "text",
          content: `**July 9, 2026**: PLTR at $${julyEntry.close}, two weeks after the $${worstJuneLow} bottom. The scanner's pick: **$120 put, July 17 expiry** for **$${july120.mid.toFixed(2)}** — delta ${july120.delta.toFixed(2)}, ${july120.aroc}% AROC, juiciness ${july120.juiciness}. Note the geometry: the strike sat *below* the June panic low.`,
        },
        {
          type: "visual",
          component: "case-price-chart",
          props: {
            title: "Strike under the low that mattered (real bars)",
            bars: bars(t, "2026-06-22", "2026-07-17"),
            lines: [
              { price: 120, label: "120 strike", color: "emerald" },
              { price: worstJuneLow, label: `June low ${worstJuneLow}`, color: "amber" },
            ],
            markers: [
              { date: "2026-07-09", label: "entry", color: "violet" },
              { date: "2026-07-17", label: `exp ${julyExpiry.close}`, color: "emerald", below: true },
            ],
            caption: `The put expired worthless with PLTR at $${julyExpiry.close} — $${(july120.mid * 100).toFixed(0)}/contract kept in 8 days, and the position was never ITM on a closing basis.`,
          },
        },
        {
          type: "quiz",
          questions: [
            {
              id: "pltr-tw-1",
              question: "What separated this entry from the June 1 'support floor' trade in case 1?",
              options: [
                "Higher premium collected",
                "The strike was defended by a *tested* level below it (the June panic low), entered after the washout — not a hopeful line above the strike at the top of a run",
                "Shorter time to expiry",
                "Lower implied volatility",
              ],
              correctIndex: 1,
              explanation:
                "Same ticker, same strategy, same scanner — opposite outcomes. The difference was where the strike sat relative to *proven* price levels and where in the swing the entry happened. That's the whole case-study track in one sentence.",
            },
          ],
        },
      ],
    },
  ], t, {
    "support-floor-that-wasnt": {
      kind: "short-put",
      entryDate: "2026-06-01",
      strike: 150,
      expiry: "2026-06-12",
      credit: june150.mid,
      volume: june150.volume,
      support: { level: 156, label: `"$156 support" the catalyst leaned on` },
    },
    "place-the-stop": {
      kind: "short-put",
      entryDate: "2026-06-15",
      strike: 125,
      expiry: "2026-06-26",
      credit: june125.mid,
      volume: june125.volume,
      support: { level: 130, label: "claimed $130 floor from the catalyst" },
    },
    "earnings-eve-picker": {
      kind: "short-put",
      entryDate: "2026-05-04",
      strike: 130,
      expiry: "2026-05-15",
      credit: may130.mid,
      volume: may130.volume,
      note: "This block defends pick B — the $130. On an earnings entry the pre-placed orders matter double: the gap arrives overnight, when there is no chance to decide anything in real time.",
    },
    "assignment-aftermath": {
      kind: "short-put",
      entryDate: "2026-06-15",
      strike: 125,
      expiry: "2026-06-26",
      credit: june125.mid,
      volume: june125.volume,
      support: { level: 130, label: "claimed $130 floor from the catalyst" },
      note: "With this order in place from June 15, the whole expiry-day dilemma above never happens — the position closes on the breach, and the wheel restarts a week later at a strike the market has actually tested.",
    },
    "textbook-winner": {
      kind: "short-put",
      entryDate: "2026-07-09",
      strike: 120,
      expiry: "2026-07-17",
      credit: july120.mid,
      volume: july120.volume,
      support: { level: worstJuneLow, label: "June 25 panic low the strike sat under" },
    },
  }),
};
