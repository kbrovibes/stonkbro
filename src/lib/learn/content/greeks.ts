import type { Module } from "@/lib/learn/curriculum";

export const GREEKS_MODULES: Module[] = [
  {
    id: "options-refresher",
    title: "Options Refresher",
    subtitle: "Quick recap of the fundamentals before we dive into Greeks",
    icon: "🔄",
    color: "stone-500",
    level: 1,
    lessons: [
      {
        id: "refresher-basics",
        title: "Calls, Puts & Rights",
        subtitle: "A fast visual recap of option basics",
        estimatedMinutes: 3,
        sections: [
          {
            type: "callout",
            style: "tip",
            content:
              "You probably know this — we're just syncing vocabulary before we dive into the Greeks.",
          },
          {
            type: "text",
            content:
              "A **call option** gives the holder the right (not obligation) to **buy** 100 shares at the strike price before expiration. A **put option** gives the right to **sell** 100 shares at the strike price.\n\nThe buyer pays a **premium** for this right. The seller (writer) collects the premium and takes on the obligation.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "long-call", strike: 100, premium: 3 },
          },
          {
            type: "text",
            content:
              "**Moneyness** describes where the stock price sits relative to the strike:\n\n• **ITM (In The Money)** — Call: stock > strike. Put: stock < strike. Has intrinsic value.\n• **ATM (At The Money)** — Stock ≈ strike. Maximum extrinsic (time) value.\n• **OTM (Out of The Money)** — Call: stock < strike. Put: stock > strike. Entire premium is extrinsic.",
          },
          {
            type: "text",
            content:
              "**Intrinsic value** = the real, exercise-now value. For a $100 call with stock at $105, intrinsic = $5.\n\n**Extrinsic value** = everything else — time value + volatility premium. This is the part the Greeks help you understand and manage.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Every Greek measures how one of the pricing factors changes the extrinsic value of an option. Master the Greeks, and you master the extrinsic.",
          },
        ],
      },
      {
        id: "refresher-pricing",
        title: "What Moves Option Prices",
        subtitle: "The five factors that set every option's price",
        estimatedMinutes: 3,
        sections: [
          {
            type: "text",
            content:
              "Option pricing models (Black-Scholes, binomial) boil down to **five inputs**:\n\n1. **Stock price** — where the underlying is right now\n2. **Strike price** — the contract's exercise price\n3. **Time to expiration** — how long until the option expires\n4. **Implied volatility** — the market's forecast of future price movement\n5. **Interest rates** — the risk-free rate (usually Treasury yields)",
          },
          {
            type: "visual",
            component: "option-chain-sim",
            props: { showFactors: true },
          },
          {
            type: "text",
            content:
              "Change any one of these inputs, and the option price changes. The **Greeks** are simply the partial derivatives — they measure **how much** the price changes for a unit change in each factor:\n\n• **Delta (Δ)** → stock price sensitivity\n• **Gamma (Γ)** → delta's rate of change\n• **Theta (Θ)** → time decay\n• **Vega (ν)** → volatility sensitivity\n• **Rho (ρ)** → interest rate sensitivity",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The Greeks aren't abstract math — they're your dashboard gauges. Each one tells you a specific risk you're taking (or selling) with every position.",
          },
          {
            type: "text",
            content:
              "**Quick recap before the quiz:**\n\nAn option's premium has two components:\n• **Intrinsic value** — the real, exercise-now value. For a $100 call with stock at $105, intrinsic = $5.\n• **Extrinsic value** — everything else: time value + volatility premium. An OTM option's entire premium is extrinsic.\n\nThe Greeks primarily describe how the extrinsic portion responds to each pricing factor.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "refresher-q1",
                question:
                  "A $50 call option with the stock trading at $53 has how much intrinsic value?",
                options: ["$0", "$3", "$50", "$53"],
                correctIndex: 1,
                explanation:
                  "Intrinsic value for a call = stock price - strike price = $53 - $50 = $3. The option is $3 in the money.",
              },
              {
                id: "refresher-q2",
                question:
                  "Which part of an option's premium do the Greeks primarily help you analyze?",
                options: [
                  "Intrinsic value",
                  "Extrinsic (time) value",
                  "Strike price",
                  "Dividend yield",
                ],
                correctIndex: 1,
                explanation:
                  "The Greeks measure how extrinsic value changes with each pricing factor. Intrinsic value is simply the difference between stock and strike.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 2: DELTA ───────────────────────────────────────────────,
  {
    id: "delta",
    title: "Delta (Δ)",
    subtitle: "Price sensitivity and directional exposure",
    icon: "📐",
    color: "blue-500",
    level: 1,
    lessons: [
      {
        id: "delta-basics",
        title: "What Delta Tells You",
        subtitle: "The most intuitive Greek — how much your option moves with the stock",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Delta measures **how much an option's price changes when the underlying stock moves $1**.\n\nIf a call has a delta of 0.50, it gains roughly $0.50 (per share, so $50 per contract) when the stock rises $1. Since each contract controls 100 shares:\n\n**Dollar change = delta × $1 × 100 shares**",
          },
          {
            type: "text",
            content:
              "**Call deltas** range from **0 to +1.0**:\n• Deep OTM call → delta near 0 (barely moves with stock)\n• ATM call → delta near 0.50\n• Deep ITM call → delta near 1.0 (moves almost dollar-for-dollar)\n\n**Put deltas** range from **-1.0 to 0**:\n• Deep OTM put → delta near 0\n• ATM put → delta near -0.50\n• Deep ITM put → delta near -1.0",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Delta tells you your directional exposure. Positive delta = bullish (you profit when the stock rises). Negative delta = bearish. The magnitude tells you how much exposure.",
          },
          {
            type: "visual",
            component: "delta-curve",
            props: { showCallAndPut: true },
          },
          {
            type: "text",
            content:
              "**Selling** an option flips the delta sign. Selling a 0.30 delta call gives you -0.30 delta exposure — you now profit slightly when the stock drops or stays flat.",
          },
        ],
      },
      {
        id: "delta-probability",
        title: "Delta as Probability",
        subtitle: "A quick shortcut every premium seller uses",
        estimatedMinutes: 4,
        sections: [
          {
            type: "text",
            content:
              "Delta roughly approximates the **probability that the option expires in the money**.\n\nA 0.30 delta call has approximately a 30% chance of finishing ITM. A 0.70 delta call has roughly a 70% chance. This isn't mathematically exact, but it's close enough for practical decision-making.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "When you sell a 0.30 delta put (cash-secured put), you're choosing a strike with roughly a 70% chance of expiring worthless — meaning you keep the premium 7 out of 10 times. This is why delta guides strike selection for premium sellers.",
          },
          {
            type: "text",
            content:
              "**Why this matters for CSPs and covered calls:**\n\n• Selling a 0.16 delta put → ~84% win rate, but smaller premium\n• Selling a 0.30 delta put → ~70% win rate, larger premium\n• Selling a 0.50 delta put → ~50% win rate, maximum extrinsic value\n\nThe delta you choose is a direct trade-off between probability of profit and premium collected.",
          },
          {
            type: "text",
            content:
              "**Important caveat:** Delta as probability assumes log-normal price distribution. In reality, stocks can gap, crash, or squeeze — tail risks are underpriced. Delta probability is a useful heuristic, not a guarantee.",
          },
        ],
      },
      {
        id: "delta-curve",
        title: "Delta Across Strikes",
        subtitle: "How delta changes from deep OTM to deep ITM",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Delta doesn't change in a straight line across strikes — it follows an **S-curve** (technically the cumulative normal distribution). The steepest part of the curve is at the money.",
          },
          {
            type: "interactive",
            component: "strike-slider",
            props: { showDelta: true, stockPrice: 100 },
          },
          {
            type: "text",
            content:
              "**How delta shifts with time to expiration:**\n\n• **Far from expiration (60+ DTE):** The delta curve is gentle and gradual. OTM options still have meaningful delta because there's time for the stock to move.\n• **Near expiration (< 7 DTE):** The curve steepens dramatically. Options snap to either 0 or 1.0 delta. ATM options have the most unstable delta — this is gamma risk (next module).",
          },
          {
            type: "visual",
            component: "delta-curve",
            props: { compareDTE: [7, 30, 90] },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "When you see the delta curve flatten with more time, that's telling you: longer-dated options respond more smoothly to stock moves. Shorter-dated options become binary — either worthless or fully ITM.",
          },
        ],
      },
      {
        id: "delta-sizing",
        title: "Delta and Position Sizing",
        subtitle: "Think in delta-equivalent shares, not contracts",
        estimatedMinutes: 4,
        sections: [
          {
            type: "text",
            content:
              "Every options position can be converted to **delta-equivalent shares** — the number of shares of stock that would give you the same directional exposure.\n\n**Delta-equivalent shares = delta × 100 × number of contracts**\n\nExamples:\n• 1 contract of a 0.30 delta call = 30 equivalent shares\n• 5 contracts of a 0.50 delta put = -250 equivalent shares\n• 2 contracts of a 0.80 delta call = 160 equivalent shares",
          },
          {
            type: "text",
            content:
              "**Portfolio delta** is the sum of all your position deltas. If you hold:\n\n• 100 shares of AAPL (+100 delta)\n• 1 short 0.30 delta call (-30 delta)\n• Total portfolio delta: +70\n\nYou're effectively long 70 shares. A $1 move in AAPL changes your portfolio by about $70. This is exactly a covered call — you've reduced your directional exposure by selling the call.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Thinking in delta-equivalent shares lets you compare wildly different positions on the same scale. A LEAPS call with 0.80 delta is similar to owning 80 shares — but with much less capital.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "delta-q1",
                question:
                  "A call option has a delta of 0.45. If the stock rises $2, approximately how much does the option price increase per share?",
                options: ["$0.45", "$0.90", "$2.00", "$45.00"],
                correctIndex: 1,
                explanation:
                  "Delta × stock move = 0.45 × $2 = $0.90 per share. Per contract (100 shares), that's $90.",
              },
              {
                id: "delta-q2",
                question:
                  "You sell a cash-secured put with a delta of -0.25. What is the approximate probability it expires worthless (you keep the premium)?",
                options: ["25%", "50%", "75%", "100%"],
                correctIndex: 2,
                explanation:
                  "A -0.25 delta put has approximately a 25% chance of expiring ITM, so about a 75% chance of expiring worthless. You keep the full premium 75% of the time (approximately).",
              },
              {
                id: "delta-q3",
                question:
                  "You own 3 contracts of a 0.60 delta call. How many delta-equivalent shares do you have?",
                options: ["60", "180", "300", "600"],
                correctIndex: 1,
                explanation:
                  "Delta-equivalent shares = 0.60 × 100 × 3 contracts = 180 shares.",
              },
              {
                id: "delta-q4",
                question:
                  "As expiration approaches, what happens to the delta of an ATM call?",
                options: [
                  "It gradually falls to 0",
                  "It stays near 0.50",
                  "It becomes more volatile, snapping between 0 and 1",
                  "It rises to 1.0",
                ],
                correctIndex: 2,
                explanation:
                  "Near expiration, ATM delta becomes extremely sensitive to small price changes (high gamma). The option rapidly flips between being worthless (delta 0) and deep ITM (delta 1).",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 3: GAMMA ───────────────────────────────────────────────,
  {
    id: "gamma",
    title: "Gamma (Γ)",
    subtitle: "The rate of change of delta — acceleration, not speed",
    icon: "⚡",
    color: "amber-500",
    level: 1,
    lessons: [
      {
        id: "gamma-basics",
        title: "Delta's Accelerator",
        subtitle: "If delta is speed, gamma is acceleration",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Gamma measures **how fast delta changes** when the stock moves $1. It's the second derivative of option price with respect to stock price.\n\nThink of it like driving: **delta is your speed, gamma is your acceleration**. A high-gamma position means your delta (directional exposure) is changing rapidly.",
          },
          {
            type: "text",
            content:
              "If a call has:\n• Delta = 0.40\n• Gamma = 0.05\n\nWhen the stock rises $1, the new delta becomes approximately 0.45 (0.40 + 0.05). When the stock falls $1, delta drops to about 0.35.\n\nGamma is always **positive for long options** (both calls and puts) and **negative for short options**.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Gamma is highest for ATM options and decreases as you move deeper ITM or OTM. ATM options are the most reactive to stock price changes — their delta is shifting the fastest.",
          },
          {
            type: "visual",
            component: "gamma-curve",
            props: { dte: 30, stockPrice: 100 },
          },
          {
            type: "text",
            content:
              "**Why gamma matters:**\n\n• **Long gamma** (you own options): Your position self-adjusts favorably. If the stock rises, your delta increases (more bullish). If it falls, your delta decreases (less bullish). You accelerate into winners and decelerate into losers.\n• **Short gamma** (you sold options): The opposite. Your position self-adjusts against you. Winners slow down, losers accelerate.",
          },
        ],
      },
      {
        id: "gamma-risk",
        title: "Gamma Near Expiration",
        subtitle: "Why the last week before expiry is dangerous for sellers",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "As expiration approaches, gamma for ATM options **explodes**. A near-expiration ATM option can have gamma 3-5x higher than the same strike with 30+ DTE.\n\nThis means ATM delta is swinging wildly — from 0.30 to 0.70 on a $1 move. For short option sellers, this is **gamma risk**: your position can go from comfortable to painful in minutes.",
          },
          {
            type: "interactive",
            component: "dte-slider",
            props: { showGamma: true, strike: 100, stockPrice: 100 },
          },
          {
            type: "text",
            content:
              "**Pin risk** is a specific gamma risk near expiration. When a stock is trading right at a popular strike (say $100), the ATM gamma is enormous. Market makers who are short these options face massive delta swings and must hedge frantically — which itself causes choppy, unpredictable price action around that strike.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "This is why most premium sellers close or roll positions before the final week. The premium remaining is small, but the gamma risk is enormous. Collecting the last 10% of premium isn't worth the 50%+ increase in risk.",
          },
          {
            type: "text",
            content:
              "**Gamma risk by DTE:**\n\n• **45 DTE:** Gamma is moderate and manageable\n• **14 DTE:** Gamma starts to ramp up\n• **7 DTE:** Gamma is 2-3x higher than at 45 DTE for ATM\n• **1 DTE:** Gamma is extreme — delta can flip from 0.20 to 0.80 intraday",
          },
        ],
      },
      {
        id: "gamma-trading",
        title: "Gamma Scalping & Long Gamma",
        subtitle: "When you want gamma — and how professionals use it",
        estimatedMinutes: 4,
        sections: [
          {
            type: "text",
            content:
              "**Being long gamma** means you own options (typically ATM straddles or strangles). Your delta automatically adjusts in your favor: as the stock moves up, your position gets more bullish; as it drops, it gets more bearish.\n\n**Gamma scalping** exploits this: buy a straddle, then repeatedly delta-hedge by trading shares. Each time the stock swings, you lock in a small profit from the delta change. The cost is theta decay — you're paying time premium for the right to scalp gamma.",
          },
          {
            type: "text",
            content:
              "**When to want positive gamma (long options):**\n• You expect a big move but don't know the direction\n• You want convex payoffs (limited loss, unlimited gain)\n• Implied volatility is cheap relative to expected movement\n\n**When to want negative gamma (short options):**\n• You expect the stock to stay range-bound\n• You want to collect theta and can manage the risk\n• Implied volatility is elevated relative to expected movement",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Gamma and theta are natural enemies. Long gamma positions pay theta. Short gamma positions collect theta. This is the core trade-off in options: do you want to pay for acceleration (gamma) or collect rent (theta)?",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "gamma-q1",
                question:
                  "A call has delta of 0.35 and gamma of 0.04. If the stock rises $2, what is the approximate new delta?",
                options: ["0.37", "0.39", "0.43", "0.70"],
                correctIndex: 2,
                explanation:
                  "New delta ≈ old delta + (gamma × stock move) = 0.35 + (0.04 × 2) = 0.43. Note: this is an approximation since gamma itself changes.",
              },
              {
                id: "gamma-q2",
                question:
                  "Where is gamma highest on the options chain?",
                options: [
                  "Deep in the money",
                  "At the money",
                  "Deep out of the money",
                  "It's the same everywhere",
                ],
                correctIndex: 1,
                explanation:
                  "Gamma peaks at the money where delta is changing most rapidly. Deep ITM and deep OTM options have low gamma because their deltas are already near their limits (1 or 0).",
              },
              {
                id: "gamma-q3",
                question:
                  "Why do most premium sellers close positions before the final week?",
                options: [
                  "To free up buying power",
                  "Because gamma spikes make ATM positions extremely risky",
                  "Because theta decay stops working",
                  "To avoid dividend risk",
                ],
                correctIndex: 1,
                explanation:
                  "Near expiration, ATM gamma explodes, making delta extremely unstable. A small stock move can turn a winning position into a big loser. The remaining premium isn't worth the gamma risk.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 4: THETA ───────────────────────────────────────────────,
  {
    id: "theta",
    title: "Theta (Θ)",
    subtitle: "Time decay — the silent premium eroder",
    icon: "⏳",
    color: "emerald-500",
    level: 1,
    lessons: [
      {
        id: "theta-basics",
        title: "Time is Money",
        subtitle: "How options lose value every single day",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Theta measures **how much an option's price decreases per day**, all else being equal. It's expressed as a negative number for long options because time passing hurts the holder.\n\nIf a call has theta of -0.05, it loses $0.05 per share ($5 per contract) every day from time decay alone.",
          },
          {
            type: "text",
            content:
              "**For option buyers:** Theta is your enemy. Every day you hold, you lose a little value — even if the stock doesn't move. You need the stock to move enough in your direction to overcome theta.\n\n**For option sellers:** Theta is your friend. You collect premium upfront, and every day that passes reduces the value of the option you sold. If the stock stays still, you profit from theta alone.",
          },
          {
            type: "visual",
            component: "theta-decay",
            props: { dte: 60, strike: 100, premium: 4.5 },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Theta is not constant — it accelerates as expiration approaches. An option that loses $3 of time value over 60 days doesn't lose $0.05/day uniformly. It might lose $0.02/day in the first month and $0.08/day in the last week.",
          },
        ],
      },
      {
        id: "theta-curves",
        title: "The Decay Curve",
        subtitle: "Time decay is non-linear — and that changes everything",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "The time value component of an option decays roughly proportional to the **square root of time remaining**. This creates the characteristic decay curve: slow at first, then accelerating dramatically.\n\n**Key milestones:**\n• 60→45 DTE: Slow, steady decay (~20% of time value lost)\n• 45→30 DTE: Moderate acceleration (~20% more lost)\n• 30→14 DTE: Noticeable acceleration (~25% more lost)\n• 14→0 DTE: Rapid decay (~35% lost in final two weeks)",
          },
          {
            type: "interactive",
            component: "dte-slider",
            props: { showTheta: true, showDecayCurve: true },
          },
          {
            type: "text",
            content:
              "**ATM vs OTM theta:**\n\nATM options have the highest absolute theta because they have the most extrinsic value to lose. OTM options have less extrinsic value, so less theta in dollar terms — but they can still lose 100% of their value.\n\nDeep ITM options have almost no theta because they're mostly intrinsic value, which doesn't decay.",
          },
          {
            type: "text",
            content:
              "**Weekend theta:** Options theoretically decay 7 days a week (calendar days), even though markets are only open 5. In practice, market makers often price in weekend decay on Friday afternoon. This means Friday closing and Monday opening prices already reflect the weekend theta. Some traders sell options on Friday to capture weekend decay.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Understanding the decay curve is essential for timing entries. Selling options at 45 DTE and buying them back at 21 DTE captures about 33% of the premium while avoiding the volatile final weeks. This is the \"sweet spot\" most premium sellers target.",
          },
        ],
      },
      {
        id: "theta-strategies",
        title: "Selling Theta",
        subtitle: "How to build strategies around time decay",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Every popular premium-selling strategy is fundamentally a theta trade:\n\n**Covered Calls:** Own 100 shares, sell an OTM call. Collect theta on the short call while stock position provides delta.\n\n**Cash-Secured Puts (CSPs):** Sell an OTM put, keep cash as collateral. Pure theta collection with a willingness to buy the stock at a discount.\n\n**Credit Spreads:** Sell a near-ATM option, buy a further-OTM option for protection. Net theta positive with defined risk.\n\n**Iron Condors:** Sell both a put spread and a call spread. Maximum theta collection in range-bound markets.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "This is why stonkbro focuses on 30-45 DTE for premium-selling strategies. It's the sweet spot: theta decay is starting to accelerate, but you're not yet exposed to the extreme gamma of the final weeks.",
          },
          {
            type: "text",
            content:
              "**Ideal DTE for theta collection:**\n\n• **Open position:** 30-45 DTE — theta acceleration begins, manageable gamma\n• **Target close:** 50-75% of max profit or 14-21 DTE remaining\n• **Avoid holding:** < 7 DTE unless the position is deep OTM (gamma risk outweighs remaining theta)",
          },
          {
            type: "text",
            content:
              "**Theta per day at different DTEs (ATM, $100 stock, 30% IV):**\n\nApproximate daily decay per contract:\n• 45 DTE: ~$8/day\n• 30 DTE: ~$10/day\n• 14 DTE: ~$15/day\n• 7 DTE: ~$21/day\n• 1 DTE: ~$50/day\n\nThe daily theta increases, but so does the risk. This is the theta-gamma tradeoff in action.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "theta-q1",
                question:
                  "An option has theta of -0.08. How much value does one contract lose per day from time decay?",
                options: ["$0.08", "$0.80", "$8.00", "$80.00"],
                correctIndex: 2,
                explanation:
                  "Theta is per share, and each contract is 100 shares. Daily decay = $0.08 × 100 = $8.00 per contract per day.",
              },
              {
                id: "theta-q2",
                question:
                  "When does theta decay accelerate the most?",
                options: [
                  "60-45 DTE",
                  "45-30 DTE",
                  "30-14 DTE",
                  "14-0 DTE",
                ],
                correctIndex: 3,
                explanation:
                  "Theta decay accelerates non-linearly, with the steepest acceleration in the final 14 days. Roughly 35% of total time value is lost in the last two weeks.",
              },
              {
                id: "theta-q3",
                question:
                  "Why is 30-45 DTE considered the sweet spot for selling options?",
                options: [
                  "Maximum premium collected",
                  "Theta acceleration begins without extreme gamma risk",
                  "Delta is most stable",
                  "Implied volatility is highest",
                ],
                correctIndex: 1,
                explanation:
                  "At 30-45 DTE, theta decay is accelerating meaningfully, so your sold options lose value quickly. But gamma is still manageable, so delta won't whip around dangerously.",
              },
              {
                id: "theta-q4",
                question:
                  "Which options have the highest absolute theta?",
                options: [
                  "Deep ITM options",
                  "ATM options",
                  "Deep OTM options",
                  "All options have equal theta",
                ],
                correctIndex: 1,
                explanation:
                  "ATM options have the most extrinsic (time) value, so they have the most value to lose from time decay. Deep ITM options are mostly intrinsic value (no decay). Deep OTM options have some extrinsic value but less than ATM.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 5: VEGA ────────────────────────────────────────────────,
  {
    id: "vega",
    title: "Vega (ν)",
    subtitle: "Volatility sensitivity — the most misunderstood Greek",
    icon: "🌊",
    color: "purple-500",
    level: 1,
    lessons: [
      {
        id: "vega-basics",
        title: "Volatility Sensitivity",
        subtitle: "How implied volatility changes your option's value",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Vega measures **how much an option's price changes for a 1 percentage point change in implied volatility (IV)**.\n\nIf a call has vega of 0.12 and IV rises from 30% to 31%, the option price increases by $0.12 per share ($12 per contract). If IV drops from 30% to 28%, the option loses $0.24 per share ($24 per contract).",
          },
          {
            type: "text",
            content:
              "**Key vega characteristics:**\n\n• Vega is always positive for long options (both calls and puts)\n• ATM options have the highest vega\n• Longer-dated options have higher vega than shorter-dated\n• Vega decreases as you move deeper ITM or OTM\n\nThis makes intuitive sense: ATM, long-dated options have the most uncertainty, so they're most sensitive to changes in expected volatility.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Vega isn't an official Greek letter — it's named after the star. Unlike delta and theta, which change by the minute, vega often makes its biggest moves around events: earnings, FDA decisions, or market-wide fear spikes.",
          },
          {
            type: "visual",
            component: "vega-impact",
            props: { showVegaByStrike: true },
          },
        ],
      },
      {
        id: "vega-vol",
        title: "IV Crush & Expansion",
        subtitle: "The event-driven force that makes or breaks trades",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**IV Crush** is the rapid drop in implied volatility after an anticipated event (usually earnings). Before earnings, uncertainty pushes IV up. Once the news is out — regardless of direction — uncertainty resolves and IV drops sharply.\n\nExample: A stock at $100 with earnings tomorrow might have 60% IV. The day after earnings, IV might drop to 30%. If you owned a $100 call with vega of 0.15:\n\nVega impact = 0.15 × (30 - 60) = -$4.50 per share = **-$450 per contract**\n\nThe stock could move $5 in your direction and you'd still lose money because the IV crush overwhelms the delta gain.",
          },
          {
            type: "interactive",
            component: "vol-slider",
            props: { showIVCrush: true, preEarningsIV: 60, postEarningsIV: 30 },
          },
          {
            type: "text",
            content:
              "**IV Rank and IV Percentile:**\n\n• **IV Rank** = (Current IV - 52-week low IV) / (52-week high IV - 52-week low IV). If IV has ranged from 20% to 60% and is currently at 40%, IV Rank = 50%.\n• **IV Percentile** = % of trading days in the past year with lower IV. If IV is higher than 80% of days, IV percentile = 80%.\n\nBoth help you assess: **is IV currently cheap or expensive?**",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Buying options before earnings = paying inflated vega. Even if you get the direction right, IV crush can wipe out your gains. Experienced traders who want earnings exposure often use spreads to reduce vega exposure.",
          },
        ],
      },
      {
        id: "vega-strategies",
        title: "Trading Volatility",
        subtitle: "Going long or short vol — on purpose",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Long vega strategies** (profit from rising IV):\n\n• **Straddles/strangles before events:** Buy ATM calls and puts when IV is low relative to expected movement\n• **Calendar spreads (buy back month):** The longer-dated option has more vega, so you're net long vega\n• **When to go long vega:** IV rank below 20%, upcoming catalyst, market complacency (low VIX)",
          },
          {
            type: "text",
            content:
              "**Short vega strategies** (profit from falling IV):\n\n• **Iron condors in high IV:** Sell both a call spread and put spread. High IV means more premium collected, and you profit when IV drops.\n• **Strangles/straddles (short):** Maximum vega exposure to IV contraction\n• **When to go short vega:** IV rank above 50%, after an IV spike, mean-reversion environments",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "IV tends to mean-revert. High IV periods tend to fall back to average, and low IV periods tend to rise. This mean-reversion gives short vega strategies (selling premium in high IV) a structural edge over time.",
          },
          {
            type: "text",
            content:
              "**Vega vs theta — the dual income:**\n\nWhen you sell options in high IV, you benefit twice:\n1. **Theta:** Time decay collects premium daily\n2. **Vega:** If IV drops (mean-reverts), you profit from the vega contraction too\n\nThis is why selling premium in high IV environments is the bread and butter of most options income strategies.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "vega-q1",
                question:
                  "An option has vega of 0.10 and IV drops from 40% to 35%. What is the price impact per share?",
                options: ["+$0.50", "-$0.50", "+$5.00", "-$5.00"],
                correctIndex: 1,
                explanation:
                  "Vega × IV change = 0.10 × (35 - 40) = 0.10 × (-5) = -$0.50 per share. IV dropped, so long option loses value.",
              },
              {
                id: "vega-q2",
                question:
                  "Why can buying calls before earnings be unprofitable even if the stock moves in your direction?",
                options: [
                  "Delta decreases after earnings",
                  "IV crush reduces option value more than delta gains",
                  "Theta stops working during earnings",
                  "Gamma becomes negative",
                ],
                correctIndex: 1,
                explanation:
                  "IV crush after earnings can be massive (30%+ drop). The vega loss from IV contraction can easily overwhelm the delta gain from a favorable stock move.",
              },
              {
                id: "vega-q3",
                question:
                  "Which options have the highest vega?",
                options: [
                  "Short-dated ATM",
                  "Short-dated OTM",
                  "Long-dated ATM",
                  "Long-dated OTM",
                ],
                correctIndex: 2,
                explanation:
                  "Vega increases with time to expiration (more time = more sensitivity to vol assumptions) and is highest at the money. Long-dated ATM options have maximum vega exposure.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 6: RHO & MINOR GREEKS ─────────────────────────────────,
  {
    id: "rho-minors",
    title: "Rho & Minor Greeks",
    subtitle: "Interest rates, charm, vanna, and volga",
    icon: "🔬",
    color: "rose-500",
    level: 1,
    lessons: [
      {
        id: "rho",
        title: "Rho and Interest Rates",
        subtitle: "The least exciting Greek — until rates spike",
        estimatedMinutes: 3,
        sections: [
          {
            type: "text",
            content:
              "Rho measures **how much an option's price changes for a 1% change in risk-free interest rates**.\n\n• **Calls have positive rho:** Higher rates → higher call prices (because the present value of paying the strike later is lower)\n• **Puts have negative rho:** Higher rates → lower put prices\n\nFor short-dated options, rho is negligible. But for LEAPS (1-2 year options), rho can matter. A LEAPS call with rho of 0.15 gains $0.15/share ($15/contract) for each 1% rate increase.",
          },
          {
            type: "text",
            content:
              "**When rho matters:**\n\n• LEAPS and long-dated options (6+ months)\n• Periods of rapid rate changes (like 2022-2023 hiking cycle)\n• Large notional positions\n\nFor most retail traders selling 30-45 DTE options, rho is effectively zero. You can safely ignore it for typical positions.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If you're trading LEAPS for a PMCC (Poor Man's Covered Call), keep rho in mind. A rate cut cycle could slightly decrease your LEAPS call value, while a rate hike cycle would help. But delta and vega will still dominate.",
          },
        ],
      },
      {
        id: "minor-greeks",
        title: "Charm, Vanna & Volga",
        subtitle: "Second-order Greeks for the curious",
        estimatedMinutes: 4,
        sections: [
          {
            type: "text",
            content:
              "The \"minor\" Greeks are derivatives of derivatives — they measure how the primary Greeks change:\n\n**Charm (delta decay)** = how delta changes as time passes (∂Δ/∂t)\n• An OTM call's delta decreases over time (less likely to expire ITM)\n• An ITM call's delta increases toward 1.0 over time\n• Charm explains why you need to adjust delta hedges daily\n\n**Vanna** = how delta changes with volatility (∂Δ/∂σ) or equivalently how vega changes with stock price\n• When IV spikes, OTM option deltas increase (they act more like ATM)\n• When IV drops, OTM deltas decrease (more likely to expire worthless)\n• Vanna is why a vol spike can change your entire position's directional profile",
          },
          {
            type: "text",
            content:
              "**Volga (vomma)** = how vega changes with volatility (∂ν/∂σ)\n• OTM options have positive volga — their vega increases as IV rises\n• This creates a feedback loop: rising IV → higher vega → even more sensitivity to further IV increases\n• Volga explains why OTM options can spike dramatically in a vol event\n\nThese second-order Greeks mostly matter for:\n• Market makers managing large books\n• Multi-leg strategies with many strikes\n• Understanding why your P&L doesn't perfectly match first-order Greek predictions",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "These matter for advanced multi-leg positions and institutional-scale portfolios. For individual trades, focus on delta, gamma, theta, and vega. Come back to these once you're managing 10+ positions simultaneously.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "rho-q1",
                question:
                  "For which type of option does rho have the most significant impact?",
                options: [
                  "Weekly options",
                  "Monthly options (30 DTE)",
                  "LEAPS (1+ year)",
                  "All equally affected",
                ],
                correctIndex: 2,
                explanation:
                  "Rho's impact scales with time to expiration. LEAPS have the most exposure to interest rate changes because the rate assumption compounds over a longer period.",
              },
              {
                id: "rho-q2",
                question:
                  "What does charm measure?",
                options: [
                  "How gamma changes with time",
                  "How delta changes as time passes",
                  "How vega changes with volatility",
                  "How theta changes with stock price",
                ],
                correctIndex: 1,
                explanation:
                  "Charm measures the rate of change of delta with respect to time (∂Δ/∂t). It explains why OTM option deltas drift toward 0 and ITM option deltas drift toward 1 as expiration approaches.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 7: GREEKS IN CONCERT ──────────────────────────────────,
  {
    id: "greeks-combined",
    title: "Greeks in Concert",
    subtitle: "Real positions have all Greeks at once — learn to read the full picture",
    icon: "🎼",
    color: "cyan-500",
    level: 1,
    lessons: [
      {
        id: "greek-interactions",
        title: "How Greeks Interact",
        subtitle: "No Greek exists in isolation",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "In a real trade, all Greeks are active simultaneously. A single position change can affect multiple Greeks:\n\n**When the stock moves $1 up:**\n• Your P&L changes by delta × $100\n• Delta itself changes by gamma\n• Theta and vega shift slightly (via charm and vanna)\n\n**When 1 day passes:**\n• You lose theta in time value\n• Delta shifts via charm (OTM deltas decrease)\n• Gamma increases (for ATM, near expiry)\n• Vega decreases (less time = less vol sensitivity)",
          },
          {
            type: "visual",
            component: "greek-table",
            props: {
              positions: [
                { type: "long-call", strike: 105, dte: 30, iv: 0.3 },
                { type: "short-put", strike: 95, dte: 30, iv: 0.3 },
              ],
            },
          },
          {
            type: "text",
            content:
              "**Common Greek tradeoffs:**\n\n1. **Gamma vs Theta:** You can't have positive gamma (favorable delta adjustment) without paying theta. Buyers get gamma, sellers get theta.\n\n2. **Delta vs Vega:** An ATM straddle starts delta-neutral but is heavily long vega. You might be flat on direction but very exposed to vol changes.\n\n3. **Theta vs Vega:** Selling options gives you positive theta but negative vega. If IV spikes, your short options increase in value — temporarily overwhelming your theta gains.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The best traders don't optimize one Greek in isolation. They build positions with a target Greek profile: desired directional exposure (delta), acceptable acceleration risk (gamma), positive daily income (theta), and appropriate volatility exposure (vega).",
          },
        ],
      },
      {
        id: "greek-neutral",
        title: "Greek-Neutral Strategies",
        subtitle: "Zeroing out specific risks to isolate others",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**Delta-neutral:** Position with net delta near zero. You're not betting on direction — you're betting on something else (volatility, time decay, or gamma).\n\nExample: Buy 100 shares (+100 delta), buy 2 ATM puts with -0.50 delta each (-100 delta). Net delta = 0. Now you profit from gamma if the stock moves big in either direction.",
          },
          {
            type: "text",
            content:
              "**Gamma-neutral:** Harder to achieve. Requires combining options at different strikes/expirations since gamma varies across the chain. Market makers aim for gamma-neutral books to avoid large delta swings.\n\n**Vega-neutral:** Combine long and short options at different expirations. A calendar spread can be roughly delta-neutral and gamma-neutral while being long vega (back month vega > front month vega).\n\nIn practice, you can neutralize 1-2 Greeks but rarely all at once. Each neutralization costs you either premium or upside.",
          },
          {
            type: "text",
            content:
              "**Delta-hedging in practice:**\n\nMarket makers continuously delta-hedge by trading shares. If they sell 10 calls at 0.40 delta (-400 delta), they buy 400 shares to get back to delta-neutral. As the stock moves and delta changes (via gamma), they adjust the hedge.\n\nThis continuous hedging is what creates the link between implied volatility and option prices — and it's why gamma matters so much for hedging costs.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "You don't need to be perfectly Greek-neutral. The goal is to understand which Greeks drive your P&L so you're not surprised. A covered call has delta risk (stock drops) and short gamma risk, but positive theta. That's a deliberate tradeoff.",
          },
        ],
      },
      {
        id: "real-examples",
        title: "Real Trade Greek Profiles",
        subtitle: "What your actual strategies look like through the Greek lens",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Let's examine the Greeks of strategies you'll actually trade in stonkbro:\n\n**Covered Call** (long 100 shares + short 1 OTM call):\n• Delta: +60 to +80 (bullish, but capped)\n• Gamma: Slightly negative (short call gamma)\n• Theta: Positive (collecting time decay)\n• Vega: Slightly negative (short volatility)\n\nProfile: Moderately bullish, income-focused, wants stock to drift up slowly.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "covered-call", strike: 105, premium: 3, stockPrice: 100 },
          },
          {
            type: "text",
            content:
              "**Cash-Secured Put** (short 1 OTM put, cash reserved):\n• Delta: +15 to +35 (slightly bullish)\n• Gamma: Negative (short put gamma)\n• Theta: Positive\n• Vega: Negative\n\nProfile: Neutral to slightly bullish, income-focused, willing to buy stock at lower price.\n\n**PMCC** (long deep ITM LEAPS call + short near-term OTM call):\n• Delta: +40 to +70 (moderately bullish)\n• Gamma: Mixed (long from LEAPS, short from near-term)\n• Theta: Positive (short call decays faster than LEAPS)\n• Vega: Net positive (LEAPS has much more vega than short call)\n\nProfile: Bullish, leveraged, benefits from rising IV.",
          },
          {
            type: "text",
            content:
              "**Iron Condor** (short put spread + short call spread):\n• Delta: Near zero (direction neutral)\n• Gamma: Negative (short gamma on both sides)\n• Theta: Positive (maximum theta collection)\n• Vega: Negative (profits from falling IV)\n\nProfile: Range-bound, income-focused, wants the stock to stay between strikes. Best in high IV environments.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "combined-q1",
                question:
                  "A covered call position has which Greek profile?",
                options: [
                  "Positive delta, positive gamma, positive theta",
                  "Positive delta, negative gamma, positive theta",
                  "Negative delta, negative gamma, positive theta",
                  "Positive delta, positive gamma, negative theta",
                ],
                correctIndex: 1,
                explanation:
                  "A covered call is long stock (positive delta) but has sold a call (negative gamma from the short option). The short call provides positive theta (time decay income).",
              },
              {
                id: "combined-q2",
                question:
                  "Why does a PMCC have net positive vega?",
                options: [
                  "Both legs are long options",
                  "The LEAPS call has much higher vega than the short-term call",
                  "Short calls always have positive vega",
                  "Vega is always positive for multi-leg positions",
                ],
                correctIndex: 1,
                explanation:
                  "Longer-dated options have higher vega. The LEAPS (1+ year) has significantly more vega than the short near-term call. Net vega = LEAPS vega - short call vega = positive.",
              },
              {
                id: "combined-q3",
                question:
                  "An iron condor profits most in which environment?",
                options: [
                  "Strong trend, low volatility",
                  "Strong trend, high volatility",
                  "Range-bound, low volatility",
                  "Range-bound, high volatility (with IV mean-reverting down)",
                ],
                correctIndex: 3,
                explanation:
                  "Iron condors want the stock to stay in a range (they're delta-neutral with negative gamma) AND they're short vega, so they profit when IV drops. Entering in high IV and watching it mean-revert down is the ideal setup.",
              },
              {
                id: "combined-q4",
                question:
                  "Which Greeks are natural enemies (you can't have both positive)?",
                options: [
                  "Delta and vega",
                  "Gamma and theta",
                  "Delta and theta",
                  "Vega and rho",
                ],
                correctIndex: 1,
                explanation:
                  "Gamma and theta are natural enemies. Long options give you positive gamma (favorable delta adjustment) but negative theta (time decay costs). Short options give you positive theta but negative gamma. You can't collect theta rent AND have favorable gamma acceleration.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 8: APPLIED GREEKS MASTERY ─────────────────────────────,
  {
    id: "mastery",
    title: "Applied Greeks Mastery",
    subtitle: "Put it all together with real positions and a final exam",
    icon: "🏆",
    color: "yellow-500",
    level: 1,
    lessons: [
      {
        id: "pmcc-greeks",
        title: "PMCC Greek Deep Dive",
        subtitle: "Build a PMCC position and watch the Greeks evolve",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "The **Poor Man's Covered Call (PMCC)** replaces the 100 shares with a deep ITM LEAPS call. Let's build one and study every Greek.\n\n**Example setup** (stock at $100):\n• Buy 1 LEAPS call: $80 strike, 365 DTE, delta 0.80, cost $25\n• Sell 1 short call: $110 strike, 30 DTE, delta 0.25, credit $1.50\n\n**Net cost:** $23.50/share ($2,350 vs $10,000 for 100 shares)",
          },
          {
            type: "interactive",
            component: "position-builder",
            props: { strategy: "pmcc", stockPrice: 100 },
          },
          {
            type: "text",
            content:
              "**Greek profile at entry:**\n• Delta: +0.80 - 0.25 = **+0.55** (moderately bullish)\n• Gamma: +0.01 (LEAPS) - 0.03 (short) = **-0.02** (slightly negative)\n• Theta: -0.02 (LEAPS) + 0.05 (short) = **+0.03** ($3/day income)\n• Vega: +0.25 (LEAPS) - 0.10 (short) = **+0.15** (long volatility)\n\n**As stock moves up to $108:**\n• LEAPS delta rises toward 0.90 → more profit per dollar\n• Short call delta rises toward 0.45 → more drag\n• Net delta might drop to +0.45\n• Consider rolling the short call up and out",
          },
          {
            type: "text",
            content:
              "**Ideal Greek profile for PMCC:**\n• Delta: 0.40-0.60 (meaningful but not excessive directional exposure)\n• Theta: Positive (the entire point — generate income from the short call)\n• Vega: Moderately positive (benefits from IV expansion; at risk from IV crush)\n• Gamma: Slightly negative is fine; avoid highly negative gamma (roll before short call goes ATM)\n\n**Roll triggers:**\n• Short call at 0.50+ delta → roll up to restore delta balance\n• Short call at < $0.20 → take the win, sell the next month\n• LEAPS at < 0.70 delta → evaluate if stock thesis still intact",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "The PMCC's secret weapon is vega. Unlike a covered call (which is short vega from the short call against delta-1 shares), the PMCC's LEAPS has huge positive vega. An IV spike helps your LEAPS more than it hurts your short call.",
          },
        ],
      },
      {
        id: "portfolio-greeks",
        title: "Portfolio-Level Greeks",
        subtitle: "Aggregate Greeks across all positions for a portfolio-wide view",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Real portfolios have multiple positions. **Portfolio Greeks** are simply the sum of individual position Greeks:\n\n**Example 3-position portfolio:**\n• AAPL covered call: delta +65, gamma -2, theta +8, vega -5\n• MSFT CSP: delta +25, gamma -3, theta +6, vega -4\n• TSLA PMCC: delta +55, gamma -2, theta +3, vega +15\n\n**Portfolio totals:**\n• Delta: +145 (moderately bullish overall)\n• Gamma: -7 (short gamma — need range-bound markets)\n• Theta: +17 ($17/day income)\n• Vega: +6 (slight long vol bias from TSLA PMCC)",
          },
          {
            type: "interactive",
            component: "greek-calculator",
            props: { mode: "portfolio" },
          },
          {
            type: "text",
            content:
              "**Portfolio risk assessment using Greeks:**\n\n• **Delta too high?** Add a bear put spread or sell more calls\n• **Gamma too negative?** Reduce short options near ATM or buy protective options\n• **Theta not enough?** Sell more premium (but check gamma impact)\n• **Vega exposure unexpected?** Balance long-dated and short-dated options\n\nThe goal isn't to zero everything out — it's to have a Greek profile that matches your market outlook. Bullish? Keep delta positive. Think vol will drop? Stay short vega. Want daily income? Maximize theta while keeping gamma manageable.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Portfolio Greeks are your cockpit instruments. Check them daily. When your portfolio delta gets too large in one direction, or gamma becomes dangerously negative, you need to adjust — just like a pilot correcting course.",
          },
        ],
      },
      {
        id: "final-exam",
        title: "Final Assessment",
        subtitle: "Test your mastery — 80% required to pass",
        estimatedMinutes: 10,
        sections: [
          {
            type: "text",
            content:
              "Congratulations on making it through the full Greeks curriculum! This final assessment covers all modules. You need **80% (8/10 correct)** to earn your Greeks Mastery badge.\n\nTake your time — there's no time limit. The questions test both conceptual understanding and practical application.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "final-q1",
                question:
                  "You sell a 0.20 delta put at 30 DTE. Which statement best describes your position?",
                options: [
                  "You have roughly an 80% chance of keeping the full premium, with positive theta and negative gamma",
                  "You have a 20% chance of profit and positive gamma",
                  "You are delta-neutral with maximum theta",
                  "You need the stock to drop for maximum profit",
                ],
                correctIndex: 0,
                explanation:
                  "A short 0.20 delta put has ~80% probability of expiring OTM (you keep premium). As a short option, you have positive theta (collect time decay) and negative gamma (delta moves against you if stock moves).",
              },
              {
                id: "final-q2",
                question:
                  "Stock XYZ is at $100. A $100 call has delta 0.50, gamma 0.04, theta -0.06, and vega 0.12. If the stock rises $3 and nothing else changes, what's the approximate option price change per share?",
                options: ["$1.50", "$1.68", "$1.86", "$2.00"],
                correctIndex: 1,
                explanation:
                  "Using the Taylor expansion: price change ≈ (delta × move) + (0.5 × gamma × move²) = (0.50 × 3) + (0.5 × 0.04 × 9) = 1.50 + 0.18 = $1.68. Gamma adds $0.18 beyond what delta alone predicts — this is the convexity benefit of owning options.",
              },
              {
                id: "final-q3",
                question:
                  "Why do options traders say 'gamma and theta are natural enemies'?",
                options: [
                  "High gamma options always have high theta",
                  "Long gamma positions pay theta; short gamma positions collect theta",
                  "Gamma cancels out theta mathematically",
                  "They affect different types of options",
                ],
                correctIndex: 1,
                explanation:
                  "Long options (positive gamma) always have negative theta — you pay time decay for the benefit of favorable delta adjustments. Short options (negative gamma) collect theta. You can't have both positive gamma and positive theta in the same position.",
              },
              {
                id: "final-q4",
                question:
                  "A stock reports earnings tonight. The ATM straddle is priced at $8. After earnings, IV drops from 80% to 35%. The stock moves $6. Did the straddle buyer likely profit?",
                options: [
                  "Yes — the $6 move exceeds breakeven",
                  "No — IV crush likely destroyed more value than the $6 move added",
                  "Yes — gamma always benefits straddle buyers",
                  "Impossible to determine",
                ],
                correctIndex: 1,
                explanation:
                  "The straddle cost $8. A $6 stock move adds roughly $6 in intrinsic value to one side. But IV dropping from 80% to 35% (a 45-point crush) with high vega could easily subtract $4-6 in extrinsic value. Net: the straddle buyer likely lost money or barely broke even despite a $6 move. The stock needed to move more than $8 AND overcome IV crush.",
              },
              {
                id: "final-q5",
                question:
                  "You're managing a PMCC. Your LEAPS call has delta 0.85 and your short call has delta 0.40. The stock keeps rising. What should you do?",
                options: [
                  "Nothing — let both expire",
                  "Buy back the short call since it's losing money",
                  "Roll the short call up and out to a higher strike and later expiration",
                  "Sell the LEAPS to lock in profits",
                ],
                correctIndex: 2,
                explanation:
                  "When the short call delta reaches 0.40+, it's getting close to ATM and eating into your LEAPS gains. Rolling up (higher strike) and out (later expiration) restores your Greek balance: lower short call delta, more theta to collect, and keeps the position working.",
              },
              {
                id: "final-q6",
                question:
                  "Portfolio Greeks: You hold 3 covered calls (net delta +180) and 2 CSPs (net delta +50). Your total portfolio delta is +230. You're worried about a pullback. What's the most efficient hedge?",
                options: [
                  "Sell all positions",
                  "Buy 2-3 ATM puts to reduce delta toward +100",
                  "Switch to only CSPs",
                  "Buy more covered calls to increase theta",
                ],
                correctIndex: 1,
                explanation:
                  "Buying ATM puts (delta -0.50 each, so -50 per contract) lets you reduce delta efficiently. 2-3 puts would bring delta from +230 to roughly +80-130 — less directional exposure. This adds negative delta without unwinding existing positions, and the puts also provide positive gamma (protection) against a sharp drop.",
              },
              {
                id: "final-q7",
                question:
                  "Which scenario produces the worst outcome for a short iron condor?",
                options: [
                  "Stock stays range-bound and IV slowly drops",
                  "Stock breaks through one wing with an IV spike",
                  "Stock stays flat and IV stays flat",
                  "Time passes with no stock movement",
                ],
                correctIndex: 1,
                explanation:
                  "An iron condor is short gamma (loses when stock moves big) AND short vega (loses when IV spikes). A large directional move PLUS an IV spike is the worst-case: you lose on delta/gamma from the breakout AND on vega from the vol expansion. Double pain.",
              },
              {
                id: "final-q8",
                question:
                  "At 5 DTE, an ATM call has very high gamma. Why is this dangerous for someone who is short this call?",
                options: [
                  "The theta is too large to collect",
                  "The delta can swing from 0.20 to 0.80 on a small move, making the loss unpredictable",
                  "Vega increases near expiration",
                  "Rho becomes the dominant Greek",
                ],
                correctIndex: 1,
                explanation:
                  "High gamma near expiration means delta is extremely unstable. The short call's delta can rapidly swing, causing large P&L swings from small stock moves. The position becomes unpredictable and hard to manage — this is the core of gamma risk for sellers.",
              },
              {
                id: "final-q9",
                question:
                  "A LEAPS call with 400 DTE has rho of 0.20 and vega of 0.30. Interest rates rise 1% and IV drops 2% simultaneously. What is the net price change per share?",
                options: [
                  "+$0.20", "-$0.40", "+$0.80", "-$0.60"
                ],
                correctIndex: 1,
                explanation:
                  "Rho impact: 0.20 × +1% rate increase = +$0.20. Vega impact: 0.30 × (-2% IV drop) = -$0.60. Net: +$0.20 - $0.60 = -$0.40 per share. Even though rates helped, the IV contraction hurt more. This illustrates why vega usually dominates rho for LEAPS.",
              },
              {
                id: "final-q10",
                question:
                  "You want to construct a position that collects $15/day in theta, has delta between +50 and +100, and minimizes vega exposure. Which combination best achieves this?",
                options: [
                  "3 ATM covered calls",
                  "5 deep OTM CSPs",
                  "2 covered calls + 1 iron condor",
                  "1 PMCC + 2 long straddles",
                ],
                correctIndex: 2,
                explanation:
                  "2 covered calls give ~delta +130, theta +10, vega slightly negative. Adding 1 iron condor gives ~delta 0, theta +6, vega negative. Combined: delta ~+130 (a bit high but close), theta ~+16 (meets target), vega more negative (minimized since the iron condor's short vega partially offsets any remaining long vega). The PMCC + straddles would be very long vega. Deep OTM CSPs might not generate enough theta. ATM covered calls have too much delta.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 9: SUPPORT & RESISTANCE ─────────────────────────────────,
];
