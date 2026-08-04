import type { Module } from "@/lib/learn/curriculum";

// All dollar figures below are rounded, illustrative teaching examples — real
// option prices depend on live implied volatility, rates, and dividends. The
// numbers are chosen to be internally consistent and directionally accurate,
// not to quote any specific contract on any specific day.

export const LEVERAGE_MODULES: Module[] = [
  // ─── MODULE: OPTIONS LEVERAGE IN THE REAL WORLD ────────────────────
  {
    id: "leverage-lab",
    title: "Options Leverage in the Real World",
    subtitle:
      "Why a 2% stock move can turn into a 40%+ option move — and how to harness it without blowing up",
    icon: "🚀",
    color: "purple-500",
    level: 2,
    lessons: [
      // ── LESSON 1 ──────────────────────────────────────────────────
      {
        id: "lev-real-world-move",
        title: "How a 2% Stock Move Becomes a 40% Option Move",
        subtitle:
          "The exact math behind the day your calls jumped while the stock barely budged",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "You saw it happen: **MSFT rose 2%** and your calls jumped **40% or more**. That is not luck and it is not a glitch — it is *leverage*, and once you can compute it you can go hunting for it on purpose.\n\nThe whole effect comes from one number you already met: **delta** (how many dollars the option moves for each $1 the stock moves). An option that costs a small fraction of the stock, but moves a meaningful fraction of the stock, multiplies your percentage return. Let's walk one trade end to end.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The engine of option leverage: you pay for a small slice of the stock's price (the premium) but you capture a large slice of the stock's *movement* (via delta). Small cost + big participation = amplified percentage return.",
          },
          {
            type: "text",
            content:
              "**The setup (illustrative).** MSFT is trading at **$500**. You buy the **$510 call** with **30 days to expiration (DTE)**. It costs **$8.00 per share** (so $800 for one contract of 100 shares) and has a **delta of 0.40**.\n\nDelta 0.40 means: for the *first* $1 MSFT moves up, this call gains about **$0.40**.",
          },
          {
            type: "visual",
            component: "delta-curve",
            props: { strike: 510, spot: 500, delta: 0.4 },
          },
          {
            type: "text",
            content:
              "**MSFT rises 2%, from $500 to $510 (a $10 move). Walk the math:**\n\n• **Delta gain** — the straight-line part: 0.40 × $10 = **+$4.00**.\n• **Gamma kicker** — delta is not fixed. As MSFT climbs toward $510, the call's delta itself rises (say from 0.40 toward 0.55). Averaged over the move, that curvature adds roughly **+$0.50** more than the straight-line estimate. (Gamma is the Greek that measures how fast delta changes.)\n\nSo the call goes from **$8.00 → about $12.50**. That is **+$4.50 on an $8.00 option = +56%** — from a **+2%** move in the stock.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "long-call", strike: 510, premium: 8 },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Effective leverage ≈ delta × stock price ÷ option price.** For this call: 0.40 × $500 ÷ $8 = **25×**. That means the option moves about 25 times the stock's *percentage* move for small moves. Stock +2% → roughly +50% before gamma, +56% after. The 40%+ you saw was this formula in action.",
          },
          {
            type: "text",
            content:
              "**Recreate the $510 call yourself.** In the Strike Explorer below, set **DTE 30** and **IV ~25%**, then drag the strike until **delta reads ≈ 0.40** — that's the ~2%-OTM ($510) strike from the example. Check two things against the numbers above:\n\n1. Compute **delta × spot ÷ premium** — you should land near the **25×** leverage.\n2. Now nudge the stock up ~2% with the spot control and watch the option's **percentage** gain balloon past +50% while the stock barely moved.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If a 2% stock nudge threw off a ~50%+ option gain, you've just reproduced the day your calls 'ripped' from first principles — no magic, just delta × spot ÷ premium. Slide the strike further OTM and watch that leverage number climb even higher (and the odds quietly fall).",
          },
          {
            type: "text",
            content:
              "**Now the trade-off: leverage versus probability.** Same +$10 MSFT move, three different strikes. Deeper in-the-money = more delta, higher cost, lower leverage, but higher odds of paying off. Further out-of-the-money = less delta, cheaper, higher leverage, but lower odds.\n\n| Strike | Type | Delta | Premium | $ gain on MSFT +2% | % gain | Effective leverage | Odds of finishing ITM |\n|---|---|---|---|---|---|---|---|\n| $470 | Deep ITM | 0.85 | $34.00 | +$8.80 | **+26%** | ~12× | High |\n| $510 | Near ATM | 0.40 | $8.00 | +$4.50 | **+56%** | ~25× | Medium |\n| $530 | OTM | 0.15 | $2.50 | +$1.75 | **+70%** | ~30× | Low |\n\nRead it left to right: the $530 call posts the biggest *percentage* pop, but it is a low-probability bet that needs the move to actually reach it. The $470 call is boring and expensive, but it behaves almost like the stock and rarely disappoints. The $510 call is the balanced middle — the one most people mean when they say 'my calls ripped.'",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**The honest mirror.** Leverage is symmetric. If MSFT *falls* 2% ($500 → $490) instead of rising, the $510 call drops from $8.00 to about **$4.40 — a −45% loss** in a single session (delta works against you; gamma and one day of theta cushion it slightly). A 2% dip in the stock, nearly half your money gone. Never look at the +56% without looking at this.",
          },
          {
            type: "text",
            content:
              "**Why expensive premium blunts leverage (illustrative NVDA-style example).** High-implied-volatility (high-IV) names carry fat premiums, and premium is the *denominator* in the leverage formula — so fatter premium means less leverage per unit of delta.\n\nSay NVDA trades at **$150**. You buy a 30-DTE **$153 call** with **delta 0.40**. Because NVDA's IV is ~55% (versus MSFT's ~25%), that call costs **$6.00**, not the ~$3.30 an equally-priced low-IV name would charge.\n\n• Effective leverage = 0.40 × $150 ÷ $6.00 = **~10×** (versus ~18× if the same call cost $3.30).\n• NVDA +2% ($150 → $153): gain ≈ 0.40 × $3 + $0.20 gamma = **+$1.40** → +$1.40 on $6.00 = **+23%**.\n\nSame +2% move, same 0.40 delta — but **+23% instead of +42%**, purely because you overpaid in premium. You also now carry more IV-crush risk (Lesson 3). Cheap-looking high-IV calls are often the *worst* leverage.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** Open any real option chain in stonkbro. For three strikes on the same expiry, compute delta × stock price ÷ premium. That single number ranks the strikes by leverage in seconds — before you risk a dollar. Write the three numbers down and notice how the OTM strike's leverage climbs while its odds fall.",
          },
        ],
      },
      // ── LESSON 2 ──────────────────────────────────────────────────
      {
        id: "lev-leaps",
        title: "LEAPS: Renting Conviction for a Year",
        subtitle:
          "Control 100 shares of upside for a fraction of the cash — and understand exactly what you give up",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "**LEAPS** (Long-Term Equity AnticiPation Securities) are just options with a **long runway — 9 to 24 months** to expiration. That long life changes everything: theta (time decay) bleeds slowly, and a deep-in-the-money LEAPS behaves almost like owning the stock, for a fraction of the cash.\n\nThink of it as *renting* your bullish conviction for a year instead of *buying* the shares outright.",
          },
          {
            type: "text",
            content:
              "**The setup (illustrative).** You're bullish on MSFT at **$500**. Two ways to get 100 shares of upside exposure:\n\n• **Buy 100 shares:** 100 × $500 = **$50,000** of cash tied up.\n• **Buy one Jan-2028 $450 LEAPS call** (about 18 months out), **delta ~0.75**, costing **$95.00 per share = $9,500** for one contract.\n\nThe LEAPS controls the same 100 shares of directional exposure for **$9,500 instead of $50,000** — leaving **$40,500** of your capital free (to earn Treasury-bill yield, or as dry powder for a dip).",
          },
          {
            type: "text",
            content:
              "**What happens in each scenario (one contract = 100 shares):**\n\n| Scenario | 100 Shares ($50,000) | 1 LEAPS ($9,500) |\n|---|---|---|\n| MSFT **+20%** → $600 | +$10,000 (**+20%**) | ≈ +$6,700 (**+70%**) |\n| MSFT **flat** for 6 months | ≈ $0 | ≈ −$1,700 (**−18%**, theta) |\n| MSFT **−20%** → $400 | −$10,000 (**−20%**) | ≈ −$7,400 (**−78%**) |\n\nThe LEAPS crushes the shares on the way up in *percentage* terms (+70% vs +20%) because you put up so much less cash. But two things bite you: it **bleeds if the stock goes nowhere**, and it **falls much faster in percentage terms** on the way down.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "long-call", strike: 450, premium: 95 },
          },
          {
            type: "text",
            content:
              "**Why the numbers land where they do:**\n\n• **+20% ($600):** the LEAPS is now deep ITM (intrinsic $600 − $450 = $150) with some time value left → worth ~$162. From $95 that's +$67/share = **+$6,700**. It captured about two-thirds of the stock's $100 move in dollars, on one-fifth the cash.\n• **Flat:** the $95 premium was $50 intrinsic ($500 − $450) plus **$45 of time value (extrinsic)**. Sit still for 6 months and a chunk of that time value melts — roughly $17 → LEAPS ~$78. That −$1,700 is the **rent** you pay for leverage.\n• **−20% ($400):** now below the $450 strike, so intrinsic is $0 and only fading time value remains (~$21). But your loss is **capped at the $9,500 you paid** — the stock could keep falling to $300 and you'd owe nothing more, whereas the shareholder keeps bleeding dollar-for-dollar.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Why deep-ITM (delta 0.70–0.80) is the standard for stock replacement.** The deeper ITM you go, the *smaller* the time-value slice as a share of premium — so **less theta bleed and less IV sensitivity**. A 0.75-delta LEAPS tracks the stock closely and behaves like a discounted share. A 0.40-delta long-dated call is a *speculation*, not a stock replacement — it decays faster and needs a real move to work.",
          },
          {
            type: "text",
            content:
              "**Build the LEAPS in the tool.** In the Strike Explorer, push **DTE to its maximum**, set **IV ~30%**, and drag the strike **deep in the money** (well below spot) until **delta ≈ 0.75**. Two things to read off it:\n\n1. Subtract intrinsic (spot − strike) from the premium — the leftover is the **time value**, i.e. your annual 'rent.' Notice how *small* that slice is at deep-ITM.\n2. Now drag DTE downward and watch that time-value slice shrink toward zero, slowly at first. That slow bleed is exactly why a deep-ITM LEAPS behaves like a discounted share.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If your 0.75-delta LEAPS carried only a thin sliver of time value while a hypothetical 0.40-delta strike carried a fat one, you've proven why deep-ITM is the stock-replacement standard: you're paying for movement, not for a lottery ticket that theta eats. That thin rent is what a monthly PMCC call is designed to cover.",
          },
          {
            type: "text",
            content:
              "**Across a full year of theta:** time decay is not linear. A 0.75-delta LEAPS loses its time value **slowly early, faster near the end**. That is exactly why you don't hold a LEAPS into its final few months — you either roll it out to a new long-dated expiry or convert to shares before theta accelerates.\n\n**The PMCC connection.** You don't have to eat that theta passively. In a **Poor Man's Covered Call (PMCC)** you hold the LEAPS as your long 'stock' and **sell a short-dated out-of-the-money call against it every month**. The premium you collect each month offsets — often fully — the LEAPS's time decay. stonkbro's PMCC pages structure exactly this pairing: pick the LEAPS, then find the best monthly call to sell against it.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** For a stock you already like, price a ~15-month LEAPS at the 0.75-delta strike and compare its cost to 100 shares. Then note the time-value portion (premium minus intrinsic) — that dollar figure is your annual 'rent.' If a monthly PMCC call could cover roughly one-twelfth of it each month, the LEAPS is close to carrying itself.",
          },
        ],
      },
      // ── LESSON 3 ──────────────────────────────────────────────────
      {
        id: "lev-losing-ways",
        title: "The Dark Side: How Leveraged Longs Actually Lose",
        subtitle:
          "Three ways to be right about the stock and still lose all your money",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "The seductive part of the last two lessons was the upside. Now the discipline. Long options lose money in ways that surprise beginners because **you can be directionally correct and still go to zero.** Here are the three classic killers, each with real numbers.",
          },
          {
            type: "text",
            content:
              "**(a) Theta bleed — right direction, too slow.**\n\nMSFT is at **$500**. You buy a 3-month (~90 DTE) **$520 call** for **$10.00**. Your breakeven at expiration is strike + premium = **$530**, i.e. MSFT must rise **+6%** just to get your money back.\n\nOver the next three months MSFT does rise — to **$520 (+4%)**. You were *right*: the stock went up. But at expiration the $520 call is exactly at-the-money, intrinsic value **$0**, and all the time value has decayed away. The call expires **worthless: −100%**.\n\nYou nailed the direction and lost everything, because the move wasn't **big enough, fast enough** to clear breakeven before time ran out. Time decay is the tax on being early or timid.",
          },
          {
            type: "visual",
            component: "theta-decay",
            props: { strike: 520, dte: 90 },
          },
          {
            type: "text",
            content:
              "**(b) IV crush — right direction, wrong volatility.**\n\nThis one ambushes people around **earnings**. A stock is at **$200** the day before it reports. Implied volatility is jacked to **60%** because the market expects a big swing, so the 7-DTE **$200 call** costs a fat **$8.00** (delta ~0.50).\n\nEarnings drop. The stock rises **+3% to $206** — good news, you were right. But the uncertainty is now resolved, so **IV collapses from 60% to 35%**. Watch the components fight each other:\n\n| Component | Effect on the call |\n|---|---|\n| Delta gain (stock +$6) | **+$3.00** |\n| IV crush (60 → 35) | **−$3.75** |\n| One day of theta | **−$0.25** |\n| **Net** | **≈ −$1.00 → about −12%** |\n\nStock up 3%, option *down* 12%. You bought insurance-priced premium and the premium deflated the instant the event passed. **Vega** (sensitivity to IV) beat delta.",
          },
          {
            type: "visual",
            component: "vega-impact",
            props: { ivFrom: 60, ivTo: 35 },
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Buying short-dated options into a known event (earnings, FDA decision, Fed day) means buying peak IV. Even a correct directional call frequently loses to the IV crush that follows. If you must play the event, size it as a lottery ticket, not a position.",
          },
          {
            type: "text",
            content:
              "**(c) The −100% — the OTM lottery ticket.**\n\nMSFT is at **$500**. A weekly **$540 call** (far out-of-the-money) costs just **$0.80** with **delta 0.05**. It feels cheap and the payoff fantasy is huge.\n\nMSFT has a solid week and climbs to **$512 (+2.4%)** — but never gets near $540. At Friday expiration it is worthless. **−100%.** Most far-OTM weeklies expire worthless; that is the base rate, not the exception.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Position-sizing rule.** Treat every long option's cost as money you have *already spent and could set on fire.* Cap total premium-at-risk across all long options at a small slice of your portfolio (e.g. **≤5%**), and any single OTM lottery bet at **≤1–2%**. Then a string of −100% outcomes is a scratch, not a crater. Leverage magnifies the *account* only if the *position* was small enough to survive being wrong.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** Before your next long-option order, write down its full cost and ask: 'If this goes to zero, is that number less than X% of my account?' If not, buy fewer contracts or a cheaper structure. Do the subtraction *before* the trade, never after.",
          },
        ],
      },
      // ── LESSON 4 ──────────────────────────────────────────────────
      {
        id: "lev-framework",
        title: "Choosing Strike and Expiry Like an Engineer",
        subtitle: "A repeatable decision framework instead of a gut feeling",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "Picking a call is a design problem with three inputs: **how big a move**, **by when**, and **with what confidence.** Nail those and the strike and expiry almost choose themselves. Here is the framework.",
          },
          {
            type: "text",
            content:
              "**Step 1 — State the thesis in numbers.** Vague bullishness picks bad options. Force yourself to fill in: *'I think [stock] moves about [X%] over the next [N weeks], and I'm [low/medium/high] confidence.'* If you can't fill that in, you don't have a trade yet.",
          },
          {
            type: "text",
            content:
              "**Step 2 — Map confidence to a delta band.**\n\n| Your conviction | Delta band | What you're buying |\n|---|---|---|\n| High — this is basically a stock bet | **0.70+** | Stock replacement (LEAPS-style), low leverage, high odds |\n| Medium — a real directional lean | **0.40–0.55** | Balanced leverage — the Lesson 1 sweet spot |\n| Low — a cheap shot at a big move | **<0.25** | Lottery ticket, high leverage, low odds, size tiny |\n\nHigher conviction earns *more* delta (more stock-like, safer), not less. Beginners do this backwards — they buy cheap far-OTM calls on their *best* ideas and waste the edge to theta.",
          },
          {
            type: "visual",
            component: "decision-tree-widget",
            props: { topic: "strike-selection" },
          },
          {
            type: "text",
            content:
              "**Step 3 — Set expiry to at least 2× your expected timeline.** If your thesis says the move happens over **6 weeks**, buy at least **12 weeks (≈90 DTE)** of expiration. The buffer is not optional — it is your defense against Lesson 3's theta bleed. Being right but a few weeks early should cost you some time value, not 100% of your premium.",
          },
          {
            type: "text",
            content:
              "**Step 4 — Check IV before you pay.** Use an **IV-rank gauge**: it tells you where today's implied volatility sits versus the stock's own past year (0% = cheapest in a year, 100% = most expensive).\n\n• **IV rank low** (say <30): premium is cheap — straight long calls are attractive.\n• **IV rank high** (say >70): premium is expensive and prone to crush — prefer a spread (buy one call, sell a higher one to recoup premium) or simply wait. Don't buy peak-IV calls right before earnings expecting the direction alone to save you.",
          },
          {
            type: "visual",
            component: "iv-rank-gauge",
            props: { ivRank: 72 },
          },
          {
            type: "text",
            content:
              "**Feel the three delta bands in your hands.** Before the paper exercise, walk the bands in the Strike Explorer. Set **DTE 60**, **IV 30%**, then drag the strike to hit each band in turn:\n\n• Deep ITM until **delta ≈ 0.75** — the high-conviction stock replacement.\n• Near the money until **delta ≈ 0.45** — the balanced Lesson-1 sweet spot.\n• Far OTM until **delta ≈ 0.20** — the lottery ticket.\n\nAt each stop, read the premium and compute delta × spot ÷ premium. Watch cost fall and leverage rise as you step down the bands.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If the deep-ITM strike felt expensive and boring while the far-OTM one was cheap and thrilling, you've felt the beginner's trap in your hands: people spend their *best* ideas on the cheap thrill and hand the edge to theta. Higher conviction earns *more* delta, not less.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** Take a stock you have a view on right now and run all four steps on paper: write the move/timeline/confidence, pick the delta band, double the timeline for DTE, and read the IV rank. You should finish with one specific strike and one specific expiration — and a reason for each.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "lev-quiz-1",
                question:
                  "MSFT is at $500. The $510 call trades at $8.00 with delta 0.40. What is its effective leverage (delta × stock price ÷ option price)?",
                options: ["About 5×", "About 12×", "About 25×", "About 40×"],
                correctIndex: 2,
                explanation:
                  "0.40 × $500 ÷ $8.00 = 25×. The option moves roughly 25 times the stock's percentage move for small moves.",
              },
              {
                id: "lev-quiz-2",
                question:
                  "Same $510 call (delta 0.40, price $8.00). MSFT rises 2% ($500 → $510). Ignoring the gamma kicker, roughly what is the option's percentage gain from the delta gain alone?",
                options: ["About +12%", "About +25%", "About +50%", "About +100%"],
                correctIndex: 2,
                explanation:
                  "Delta gain = 0.40 × $10 = $4.00 on an $8.00 option = +50%. The gamma kicker then pushes the real figure toward +56%.",
              },
              {
                id: "lev-quiz-3",
                question:
                  "That same $510 call cost $8.00. If MSFT instead falls 2% in a day, roughly what happens to the call?",
                options: [
                  "It gains about 45% (options always rise)",
                  "It is unchanged — 2% is too small to matter",
                  "It loses about 45%, falling to roughly $4.40",
                  "It loses exactly 2%, matching the stock",
                ],
                correctIndex: 2,
                explanation:
                  "Leverage is symmetric. A 2% drop costs the call about 45% (to ~$4.40); gamma and a day of theta cushion it just short of the mirror-image of the +56% upside.",
              },
              {
                id: "lev-quiz-4",
                question:
                  "You have HIGH conviction and want an option that behaves almost like owning the stock (stock replacement). Which delta band do you pick?",
                options: [
                  "Delta below 0.25 (cheap OTM)",
                  "Delta 0.40–0.55 (balanced)",
                  "Delta 0.70+ (deep ITM)",
                  "Delta doesn't matter for stock replacement",
                ],
                correctIndex: 2,
                explanation:
                  "High conviction earns more delta. A 0.70+ delta option tracks the stock closely with less theta and IV risk — the standard for stock replacement.",
              },
              {
                id: "lev-quiz-5",
                question:
                  "Your thesis is that the move plays out over about 6 weeks. Applying the 'DTE ≥ 2× timeline' rule, what is the minimum expiration you should buy?",
                options: [
                  "About 3 weeks",
                  "About 6 weeks",
                  "About 12 weeks (~90 DTE)",
                  "About 1 week (weeklies)",
                ],
                correctIndex: 2,
                explanation:
                  "Double the expected timeline: 6 weeks × 2 = 12 weeks (~90 DTE). The buffer protects you from theta if the move arrives a little late.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: CRASHES & BLOODBATHS: THE PLAYBOOK ────────────────────
  {
    id: "crash-playbook",
    title: "Crashes & Bloodbaths: The Playbook",
    subtitle:
      "Read a selloff, defend your positions when it's moving fast, and get paid for other people's fear",
    icon: "🩸",
    color: "rose-500",
    level: 2,
    lessons: [
      // ── LESSON 1 ──────────────────────────────────────────────────
      {
        id: "crash-anatomy",
        title: "Anatomy of a Drawdown",
        subtitle: "How selloffs actually unfold, and what the numbers mean",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "A **drawdown** (a peak-to-trough decline) has a rhythm. Learn it once and you stop panicking at the first red candle and start recognizing where in the sequence you are.\n\n**The typical stages:**\n\n1. **Leaders crack first.** The biggest winners — the crowded, most-loved names — roll over before the index does. Money quietly leaves the front-runners.\n2. **Correlations go to 1.** Normally your stocks move on their own news. In a real selloff, *everything* falls together — good companies and bad, all red. Diversification stops helping exactly when you want it to.\n3. **Capitulation.** A final flush on **huge volume** — forced sellers and margin calls dumping at any price. Ugly, but it is often near the bottom, not the start.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { pattern: "capitulation" },
          },
          {
            type: "text",
            content:
              "**What does SPY −2% in a day actually mean?** The S&P 500 (SPY tracks it) falls 2%+ in a day a **handful of times in a typical year** — uncomfortable but not rare. It is roughly a 1.3-standard-deviation day. For scale, the 2020 COVID crash saw several −7% to −12% days in a row, and the 2022 bear market ground out dozens of −2% days over the year. A single −2% is a *warning to pay attention*, not automatically a crisis.",
          },
          {
            type: "text",
            content:
              "**Why your stock down 5% on a market down 2% is mostly beta, not news.** **Beta** measures how much a stock amplifies the market's move. Expected stock move ≈ **beta × market move**.\n\n*Illustrative:* your stock has a beta of **1.4**. Market is **−2%**, so its *expected* move is 1.4 × −2% = **−2.8%** for no company-specific reason at all. If it's actually down **−5%**, only about **−2.2%** is idiosyncratic (its own story). Most of the pain is just the market yanking a high-beta name around. Before you sell in fear, subtract the beta portion — often there's no news at all.",
          },
          {
            type: "text",
            content:
              "**Read the rollover.** Stage one of a drawdown is the trend quietly turning over — the leaders crack and the long-term trend rolls down. Here's a chart at that moment.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "death-cross",
              question:
                "The 50-day moving average has just crossed below the 200-day as this name rolls over off its highs. What is this, and how much weight does it carry here?",
              options: [
                "A golden cross — the selloff is over",
                "A death cross — the short-term trend has dropped beneath the long-term one, a bearish context signal that confirms a rollover already underway (it lags, so it's not a precise top)",
                "A capitulation bottom — buy aggressively",
                "A Bollinger squeeze",
              ],
              correctIndex: 1,
              explanation:
                "50-day crossing below the 200-day is a death cross: the trend has rolled over. In a genuine drawdown (not a choppy range) it's meaningful context, but it lags — it confirms damage already done rather than calling the exact top.",
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you read that as a trend that has already rolled over — context, not a precise timing signal — you're placing it correctly in the drawdown sequence: leaders crack and the averages cross *after* the damage starts, which is why the next stages (correlations to 1, then capitulation) still lie ahead.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**VIX in plain English.** The VIX is the market's expected annualized volatility. Divide it by ~16 to get the expected **daily** move: VIX 16 ≈ 1%/day, VIX 32 ≈ 2%/day, VIX 48 ≈ 3%/day. Calm markets sit near 12–15. Above ~30 is fear; above ~40 is outright panic (and, as Lesson 3 shows, opportunity for sellers).",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** Next time a holding drops hard, look up its beta, multiply by the day's SPY move, and compare to the actual drop. If the actual drop is close to beta × market, it's noise. If it's far worse, go read the news — that's where the real signal is.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**In stonkbro:** the market-monitor alerts are wired to exactly these thresholds — a sharp SPY drop and a VIX spike are what trigger the notification you wished you'd gotten last month. When one fires, open **/bloodbath**: it ranks which of your names took the most damage and how much of it was market-wide versus name-specific.",
          },
        ],
      },
      // ── LESSON 2 ──────────────────────────────────────────────────
      {
        id: "crash-defense",
        title: "Defense: Limiting Losses When It's Moving Fast",
        subtitle: "Stops, rolls, and hedges — the mechanics, not the platitudes",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "When a selloff accelerates you don't have time to invent a plan. This lesson is the toolkit: **stops** to cap losses automatically, **rolling** to defend short puts, and **hedges** to insure what you keep. Each with the exact mechanics.",
          },
          {
            type: "text",
            content:
              "**Stop-market vs stop-limit — and the gap-through trap.**\n\n• A **stop-market** order becomes a *market* order the instant price touches your stop. It **guarantees you exit, but not the price.**\n• A **stop-limit** order becomes a *limit* order at your stop. It **guarantees your price, but not that you exit.**\n\n*Worked example (illustrative).* You hold a stock at **$100** and set a stop at **$95**. Overnight, bad news. The stock **gaps down and opens at $88** — it never traded at $95, it jumped straight past it.\n\n| Order type | What happens at the $88 open |\n|---|---|\n| **Stop-market** ($95 stop) | Fills near **$88**. You're out — worse than hoped, but out. |\n| **Stop-limit** ($95 stop, $94 limit) | Won't sell below $94, so it **doesn't fill**. You still hold as it keeps dropping. |\n\nIn a fast crash, a stop-limit can leave you holding the exact bag you were trying to drop. That's the trade-off: stop-market protects your *exit*, stop-limit protects your *price*.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Rule of thumb: for *risk control* in a fast market, prefer a **stop-market** (or a stop-limit with a wide limit) — being out at a bad price beats being trapped in a worse one. Save tight stop-limits for calm, liquid conditions where gaps are unlikely.",
          },
          {
            type: "text",
            content:
              "**Where to place the stop — under support, not on round numbers.** Place stops just **below a support level** (a price the stock has bounced from before), and specifically **below the round number** everyone else clusters at — because that cluster is exactly where stops get run and then reverse.\n\n*Illustrative:* stock at **$100**, clear support at **$92**, and its **ATR** (Average True Range — the typical daily swing) is **$3**. Don't put the stop at $90 (round, crowded) or at $99 (inside one day's normal noise — you'll get shaken out). Put it around **$91**: just under the $92 support and about 3× ATR below entry, so ordinary volatility won't trigger it but a genuine breakdown will.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { support: 92, stop: 91 },
          },
          {
            type: "text",
            content:
              "**Rolling a short put down-and-out instead of panic-buying it back.** Say you **sold a $95 put for $2.00** credit and the stock falls to **$90**. That put is now worth **$6.00** — a $4 unrealized loss. Panic option: buy it back at $6, locking in **−$4.00**.\n\nBetter, *if you still like the stock*: **roll it down and out.**\n\n| Action | Cash flow |\n|---|---|\n| Buy back the $95 put | **−$6.00** (debit) |\n| Sell next month's $90 put | **+$5.00** (credit) |\n| **Net roll cost** | **−$1.00** |\n\nFor a net **$1.00 debit** you lowered your obligation strike from $95 to $90 and bought a month of time. Your total credits are now $2.00 + $5.00 − $6.00 = **$1.00 net collected**, and if you're assigned it's at **$90, not $95**. You turned a forced $4 loss into a managed position — but only roll if you'd genuinely be happy owning the shares at the lower strike.",
          },
          {
            type: "text",
            content:
              "**Hedges: protective puts and collars, with the cost math.**\n\n• **Protective put** — insurance on shares you own. Own 100 shares at **$100**; buy a 60-DTE **$95 put for $2.50**. That sets a **floor at $95**: below it, the put gains dollar-for-dollar as the stock falls. Cost is **$2.50 = 2.5% for two months** (~15%/yr — real insurance isn't free).\n• **Collar** — finance the put by capping upside. Keep the $95 protective put **and sell a $108 call for $2.00**. Net hedge cost drops to **$0.50**, but your upside is capped at **$108**. Cheap protection in exchange for giving away the far upside.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "protective-put", strike: 95, premium: 2.5 },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself — place a stop in your brokerage (generic steps).** This is exactly what stonkbro means by a 'set a stop at X / limit Y' alert. In your broker: (1) open the position, (2) choose **Sell**, (3) set order type to **Stop** (stop-market) or **Stop-Limit**, (4) enter the **stop price** (and a **limit price** if stop-limit), (5) set duration to **GTC** (good-till-canceled) so it persists overnight, (6) review and submit. Do it once on a small position now, before you need it in a hurry.",
          },
        ],
      },
      // ── LESSON 3 ──────────────────────────────────────────────────
      {
        id: "crash-offense",
        title: "Offense: Getting Paid for Fear",
        subtitle: "Why capitulation is the best time to sell puts on quality",
        estimatedMinutes: 12,
        sections: [
          {
            type: "text",
            content:
              "Everything so far was defense. Now offense. When markets panic, **implied volatility spikes**, and IV is the fuel in every option premium. That means the scariest moments pay option *sellers* the most. If you have cash and a shopping list, a crash is when you get paid to be patient.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Fear premium.** IV and put premiums move together. At capitulation, cash-secured puts (CSPs) on quality names pay their **highest yields of the cycle** — you're being paid a fat premium to promise to buy a good company at a discount. That's the trade the fear is handing you.",
          },
          {
            type: "text",
            content:
              "**Worked example (illustrative).** A quality name you'd love to own falls **−12% in a week**, from **$220 to $194**, on market-wide fear (not a broken business). IV has jumped from ~25% to ~55%.\n\nYou sell the **30-delta put** at the **$180 strike, 30 DTE**:\n\n| | Calm market (IV 25%) | Panic (IV 55%) |\n|---|---|---|\n| Premium collected | ~$2.00 | **~$6.00** |\n| Yield on $18,000 collateral (30 days) | ~1.1% | **~3.3%** |\n\nThat's roughly **3× the normal yield** for the same strike, purely from fear. Two good outcomes: the stock stabilizes and you **keep the $600** premium, or you're assigned and **own a quality name at $180** — a net **$174** after premium, a **~21% discount** to where it traded a week ago.",
          },
          {
            type: "visual",
            component: "iv-rank-gauge",
            props: { ivRank: 88 },
          },
          {
            type: "text",
            content:
              "**But not every falling stock is a gift — run the falling-knife checklist first.** 'Falling knife' = a stock dropping so fast that catching it cuts you. Before selling that put or buying that dip, three questions:\n\n1. **Is it at support?** Is the price near a level it has bounced from before, or in free-fall with nothing beneath it?\n2. **Is the drop idiosyncratic or market-wide?** Market-wide fear on a good company mean-reverts. A *company-specific* disaster (fraud, guidance cut, broken thesis) can keep falling — that knife has no floor.\n3. **Is RSI washed out?** RSI (Relative Strength Index) below ~30 means deeply oversold — seller exhaustion is more likely near there than at the first down day.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { rsi: 24 },
          },
          {
            type: "text",
            content:
              "**Question 1 of the checklist — is it at support?** Before you catch any knife, you have to judge whether it's falling into a floor or into thin air. Read the chart below.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "A hard-selling stock has dropped into a level it has bounced from several times before, and buying is appearing again. For a put-seller running the falling-knife checklist, what does this satisfy?",
              options: [
                "Nothing — a stock in a selloff can never be at support",
                "Checklist question 1 (is it at support?) is a yes — it's falling into a tested floor, not thin air, which is one of the three green lights for selling a cash-secured put here",
                "It's a death cross, so avoid it",
                "It guarantees the bottom is in",
              ],
              correctIndex: 1,
              explanation:
                "Falling into a repeatedly-tested support level (not free-falling with nothing beneath it) satisfies question 1 of the knife checklist. Combined with a market-wide drop and a washed-out RSI, that's the BUY_DIP profile where selling a cash-secured put pays you the fear premium.",
            },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If you recognized the tested floor as a green light — while remembering it's only one of three checks (support, market-wide vs idiosyncratic, washed-out RSI) — you're running the checklist the way /bloodbath does. A support bounce alone isn't the trade; support plus beta-driven fear plus oversold is.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**This is what stonkbro's /bloodbath verdicts encode.** **BUY_DIP** = at support, drop is market-wide beta, RSI washed out — the fear premium is worth grabbing. **NIBBLE** = mixed signals, so start small. **WAIT** = idiosyncratic damage or no support yet — don't catch this knife. The verdict is the checklist, automated.",
          },
          {
            type: "text",
            content:
              "**Scale in by thirds.** Nobody calls the exact bottom. So don't try — **deploy in three tranches** instead: **1/3 now** (at your first BUY_DIP signal), **1/3 if it drops another ~5%**, **1/3 at capitulation or the first real reversal**. If it bounces from tranche one, you're in with a profit. If it keeps falling, you have dry powder to average into a better price instead of being fully committed at the top of the fall.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this yourself.** Keep a written 'crash shopping list' of 3–5 quality names and the discount price you'd happily own each at. When /bloodbath flags one BUY_DIP, check it against your list, run the three-question knife check, and sell a cash-secured put at your target price — collecting the fear premium while you wait to be paid or to buy the discount. Decide the list *before* the panic, when you can think.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "crash-quiz-1",
                question:
                  "Your stock has a beta of 1.4 and the market falls 2% today. Roughly how much of a decline is 'expected' from beta alone, before any company news?",
                options: ["About −0.7%", "About −2.0%", "About −2.8%", "About −5.0%"],
                correctIndex: 2,
                explanation:
                  "Expected move ≈ beta × market move = 1.4 × −2% = −2.8%. If the stock is down more than that, the excess is the idiosyncratic (news) part worth investigating.",
              },
              {
                id: "crash-quiz-2",
                question:
                  "You hold a stock at $100 with a stop-MARKET order at $95. Overnight bad news gaps it down and it opens at $88. What most likely happens?",
                options: [
                  "It sells at exactly $95, your stop price",
                  "It fills near $88 — you exit, but below your stop",
                  "The order is canceled because $95 never traded",
                  "It sells at $100, the prior close",
                ],
                correctIndex: 1,
                explanation:
                  "A stop-market guarantees exit, not price. When price gaps past $95, it becomes a market order and fills near the $88 open. A stop-limit at $94 would instead not fill, leaving you still holding.",
              },
              {
                id: "crash-quiz-3",
                question:
                  "The VIX is at 48. Using the 'divide by ~16' rule, what daily move is the market roughly pricing in — and what does that level signal?",
                options: [
                  "About 0.5%/day — calm markets",
                  "About 1%/day — normal conditions",
                  "About 3%/day — outright panic",
                  "About 6%/day — impossible, VIX can't reach 48",
                ],
                correctIndex: 2,
                explanation:
                  "48 ÷ 16 ≈ 3% expected daily move. A VIX in the 40s signals panic — which is exactly when fear premium makes cash-secured puts on quality names pay the most.",
              },
              {
                id: "crash-quiz-4",
                question:
                  "A quality stock is down 12% on market-wide fear, sitting at support, with RSI at 24. Which stonkbro /bloodbath verdict best fits, and what's the offensive move?",
                options: [
                  "WAIT — do nothing until it fully recovers",
                  "BUY_DIP — sell a cash-secured put to collect the elevated fear premium",
                  "SELL — dump any shares immediately",
                  "WAIT — the drop being market-wide means avoid it",
                ],
                correctIndex: 1,
                explanation:
                  "At support + market-wide (not idiosyncratic) drop + washed-out RSI is the BUY_DIP profile. Selling a cash-secured put collects 3×-normal premium and either keeps the premium or buys the quality name at a discount.",
              },
            ],
          },
        ],
      },
    ],
  },
];
