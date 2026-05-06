export type LessonSection =
  | { type: "text"; content: string }
  | { type: "callout"; style: "tip" | "warning" | "key-concept"; content: string }
  | {
      type: "visual";
      component:
        | "delta-curve"
        | "gamma-curve"
        | "theta-decay"
        | "vega-impact"
        | "pnl-diagram"
        | "greek-table"
        | "option-chain-sim"
        | "support-resistance-chart"
        | "rsi-chart"
        | "candlestick-chart"
        | "ta-greeks-chart";
      props?: Record<string, unknown>;
    }
  | {
      type: "interactive";
      component:
        | "strike-slider"
        | "dte-slider"
        | "vol-slider"
        | "position-builder"
        | "greek-calculator";
      props?: Record<string, unknown>;
    }
  | { type: "quiz"; questions: QuizQuestion[] };

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  sections: LessonSection[];
};

export type Module = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  lessons: Lesson[];
};

export const CURRICULUM: Module[] = [
  // ─── MODULE 1: OPTIONS REFRESHER ───────────────────────────────────
  {
    id: "options-refresher",
    title: "Options Refresher",
    subtitle: "Quick recap of the fundamentals before we dive into Greeks",
    icon: "🔄",
    color: "stone-500",
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
              {
                id: "refresher-q3",
                question:
                  "Which Greek measures sensitivity to implied volatility?",
                options: ["Delta", "Gamma", "Theta", "Vega"],
                correctIndex: 3,
                explanation:
                  "Vega measures how much an option's price changes for a 1% change in implied volatility.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 2: DELTA ───────────────────────────────────────────────
  {
    id: "delta",
    title: "Delta (Δ)",
    subtitle: "Price sensitivity and directional exposure",
    icon: "📐",
    color: "blue-500",
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

  // ─── MODULE 3: GAMMA ───────────────────────────────────────────────
  {
    id: "gamma",
    title: "Gamma (Γ)",
    subtitle: "The rate of change of delta — acceleration, not speed",
    icon: "⚡",
    color: "amber-500",
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

  // ─── MODULE 4: THETA ───────────────────────────────────────────────
  {
    id: "theta",
    title: "Theta (Θ)",
    subtitle: "Time decay — the silent premium eroder",
    icon: "⏳",
    color: "emerald-500",
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

  // ─── MODULE 5: VEGA ────────────────────────────────────────────────
  {
    id: "vega",
    title: "Vega (ν)",
    subtitle: "Volatility sensitivity — the most misunderstood Greek",
    icon: "🌊",
    color: "purple-500",
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

  // ─── MODULE 6: RHO & MINOR GREEKS ─────────────────────────────────
  {
    id: "rho-minors",
    title: "Rho & Minor Greeks",
    subtitle: "Interest rates, charm, vanna, and volga",
    icon: "🔬",
    color: "rose-500",
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

  // ─── MODULE 7: GREEKS IN CONCERT ──────────────────────────────────
  {
    id: "greeks-combined",
    title: "Greeks in Concert",
    subtitle: "Real positions have all Greeks at once — learn to read the full picture",
    icon: "🎼",
    color: "cyan-500",
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

  // ─── MODULE 8: APPLIED GREEKS MASTERY ─────────────────────────────
  {
    id: "mastery",
    title: "Applied Greeks Mastery",
    subtitle: "Put it all together with real positions and a final exam",
    icon: "🏆",
    color: "yellow-500",
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

  // ─── MODULE 9: SUPPORT & RESISTANCE ─────────────────────────────────
  {
    id: "support-resistance",
    title: "Support & Resistance",
    subtitle: "Learn to read the price levels where buyers and sellers clash",
    icon: "📊",
    color: "indigo-500",
    lessons: [
      {
        id: "sr-basics",
        title: "Support & Resistance Fundamentals",
        subtitle: "Why prices bounce at certain levels",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Support** is a price level where buying pressure consistently overwhelms selling pressure, causing the price to bounce upward. **Resistance** is the opposite — a level where sellers overpower buyers and push the price back down.\n\nThink of support as a floor and resistance as a ceiling. These levels form because of market memory: traders remember where they bought or sold before, and they tend to act again at those same prices.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "basics", showBounces: true },
          },
          {
            type: "text",
            content:
              "**Why do these levels work?**\n\n• **Supply and demand zones** — At support, demand exceeds supply. At resistance, supply exceeds demand.\n• **Anchoring bias** — Traders anchor to round numbers and previous significant prices.\n• **Self-fulfilling prophecy** — Because so many traders watch the same levels, their collective actions reinforce those levels.\n• **Institutional orders** — Large funds often place limit orders at key levels, creating walls of liquidity.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Support and resistance are the foundation of technical analysis. Nearly every other TA tool — trendlines, channels, patterns — is built on the concept of price reacting at key levels.",
          },
          {
            type: "text",
            content:
              "**How support and resistance form:**\n\n1. **Previous highs and lows** — A stock that peaked at $150 three times creates strong resistance at $150.\n2. **Consolidation zones** — Areas where price traded sideways for an extended period become both support and resistance.\n3. **Gap levels** — Price gaps often act as future support or resistance.\n4. **Moving averages** — The 50-day and 200-day moving averages frequently act as dynamic support/resistance.",
          },
        ],
      },
      {
        id: "sr-drawing",
        title: "Drawing Key Levels",
        subtitle: "How to identify and mark the levels that matter",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Not all support and resistance levels are created equal. The best levels share specific characteristics that make them more likely to hold when price returns to test them.",
          },
          {
            type: "text",
            content:
              "**Rules for identifying strong levels:**\n\n• **Multiple touches** — The more times price has bounced off a level, the stronger it is. Two touches establish a level; three or more confirm it.\n• **Recency** — Recent levels are more relevant than levels from years ago. Markets evolve, and old levels lose their power.\n• **Volume** — High volume at a level means more traders have positions there, making it more significant.\n• **Timeframe** — Levels visible on weekly and monthly charts are stronger than those only visible on 5-minute charts.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "drawing", showTouches: true },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Support and resistance are zones, not exact lines. A stock with support at $100 might bounce at $99.50, $100.20, or $100.75. Draw a zone rather than fixating on a single price.",
          },
          {
            type: "text",
            content:
              "**Round numbers as psychological levels:**\n\nPrices ending in $50, $100, $200, $500, and $1,000 carry extra significance. These are psychological barriers because:\n\n• Traders place limit orders at round numbers\n• Options strikes cluster at round numbers\n• Media coverage increases (\"Stock X breaks $100!\")\n• Mental accounting — investors think in round numbers\n\nFor example, when AAPL approached $200, it stalled multiple times before breaking through — that round number acted as a psychological ceiling.",
          },
          {
            type: "text",
            content:
              "**Volume confirmation:**\n\nAlways check volume at your levels. A support bounce on high volume is far more reliable than one on low volume. Look for:\n\n• **Volume spikes at bounces** — Confirms real buying/selling interest\n• **Volume profile (if available)** — Shows where the most shares changed hands\n• **Declining volume on approach** — Suggests the move toward the level is losing steam",
          },
        ],
      },
      {
        id: "sr-breakouts",
        title: "Breakouts & Retests",
        subtitle: "What happens when levels break — and the traps to watch for",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Support and resistance levels don't hold forever. When they break, the move can be explosive — and one of the most important concepts in TA kicks in: **role reversal**.",
          },
          {
            type: "text",
            content:
              "**Role Reversal: Support becomes Resistance (and vice versa)**\n\nWhen a support level breaks, it often becomes the new resistance. When resistance breaks, it often becomes the new support. This happens because:\n\n• Traders who bought at the old support are now underwater and want to sell at breakeven\n• The old level becomes a new reference point for the market\n• Institutional orders that were supporting the price are now gone\n\nThis is one of the most reliable patterns in technical analysis.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "breakout", showRoleReversal: true },
          },
          {
            type: "text",
            content:
              "**The Breakout Retest Pattern:**\n\n1. Price approaches resistance\n2. Price breaks above resistance on strong volume\n3. Price pulls back to the old resistance (now new support)\n4. Price bounces off the new support and continues higher\n\nThis retest gives you a second chance to enter — and it's often a better entry than chasing the breakout itself.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "False breakouts (also called bull traps or bear traps) are extremely common. Price briefly breaks through a level, triggers stop losses and breakout orders, then reverses sharply. Always wait for confirmation — a close above/below the level on strong volume — before trading a breakout.",
          },
          {
            type: "text",
            content:
              "**Volume on breakout confirmation:**\n\n• **Valid breakout** — Volume surges 50%+ above average as price breaks the level. The move has conviction.\n• **False breakout** — Volume is average or below average. The move lacks participation and is likely to fail.\n• **Re-test on low volume** — If price pulls back to the broken level on declining volume, the breakout is healthy. Buyers aren't panicking.",
          },
        ],
      },
      {
        id: "sr-quiz",
        title: "Support & Resistance Quiz",
        subtitle: "Test your understanding of key levels",
        estimatedMinutes: 3,
        sections: [
          {
            type: "quiz",
            questions: [
              {
                id: "sr-q1",
                question:
                  "A stock has bounced off the $85 level four times over the past six months. What does this indicate?",
                options: [
                  "Strong resistance at $85",
                  "Strong support at $85",
                  "The stock is overbought",
                  "A breakout is imminent",
                ],
                correctIndex: 1,
                explanation:
                  "When price bounces upward off a level multiple times, that level is support — buying pressure consistently overwhelms selling at that price. Four touches over six months makes this a strong, well-established support level.",
              },
              {
                id: "sr-q2",
                question:
                  "A stock breaks below its $50 support level on high volume. When it rallies back to $50, what is the most likely outcome?",
                options: [
                  "$50 will act as support again and the stock bounces higher",
                  "$50 will act as resistance and the stock gets rejected",
                  "The stock will gap above $50",
                  "Volume won't matter at this level anymore",
                ],
                correctIndex: 1,
                explanation:
                  "Role reversal: when support breaks, it typically becomes resistance. Traders who bought at $50 are now underwater and looking to sell at breakeven, creating selling pressure at that level.",
              },
              {
                id: "sr-q3",
                question:
                  "Which of the following is the strongest sign of a valid breakout above resistance?",
                options: [
                  "Price briefly pokes above the level intraday then closes below",
                  "Price closes above the level on below-average volume",
                  "Price closes above the level on volume 2x the 20-day average",
                  "Price gaps above the level on a weekend with no news",
                ],
                correctIndex: 2,
                explanation:
                  "A valid breakout requires conviction. A close above the level (not just an intraday poke) on significantly above-average volume confirms that real buyers are pushing the price through. Low volume breakouts frequently fail.",
              },
              {
                id: "sr-q4",
                question:
                  "Why are round numbers like $100 or $200 often significant support/resistance levels?",
                options: [
                  "Options expire at round numbers",
                  "The SEC requires reporting at round numbers",
                  "Traders psychologically anchor to round numbers and place orders there",
                  "Algorithms only trade at round numbers",
                ],
                correctIndex: 2,
                explanation:
                  "Round numbers are psychological levels. Traders naturally think in round numbers, place limit orders there, and media coverage intensifies when stocks approach them. This concentration of orders creates real supply/demand zones at these levels.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 10: RSI & MOMENTUM ──────────────────────────────────────
  {
    id: "rsi-momentum",
    title: "RSI & Momentum",
    subtitle: "Measure the speed and strength of price moves with RSI",
    icon: "📈",
    color: "teal-500",
    lessons: [
      {
        id: "rsi-basics",
        title: "Understanding RSI",
        subtitle: "The Relative Strength Index explained from first principles",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "The **Relative Strength Index (RSI)** is a momentum oscillator that measures the speed and magnitude of recent price changes. Developed by J. Welles Wilder in 1978, it's one of the most widely used technical indicators.\n\nRSI oscillates between **0 and 100**. The standard interpretation:\n\n• **Above 70** — Overbought (price may have risen too fast)\n• **Below 30** — Oversold (price may have fallen too fast)\n• **Between 30-70** — Neutral territory",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { showZones: true, period: 14 },
          },
          {
            type: "text",
            content:
              "**How RSI is calculated (conceptually):**\n\n1. Look at the last 14 periods (default setting)\n2. Separate the price changes into **up moves** and **down moves**\n3. Calculate the average gain and average loss over those 14 periods\n4. **RS** = Average Gain ÷ Average Loss\n5. **RSI** = 100 - (100 ÷ (1 + RS))\n\nWhen up moves dominate, RS is large, and RSI approaches 100. When down moves dominate, RS is small, and RSI approaches 0.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Overbought doesn't mean sell — strong stocks can stay overbought for weeks. RSI above 70 in a strong uptrend often means momentum is powerful, not that a reversal is imminent. Context matters more than the number.",
          },
          {
            type: "text",
            content:
              "**RSI settings:**\n\n• **14-period** is the standard default. Works well for swing trading (days to weeks).\n• **7-period** is more sensitive — generates more signals but also more false signals. Better for short-term trading.\n• **21-period** is smoother — fewer signals but more reliable. Better for position trading.\n\nMost traders start with the 14-period default and only adjust if they have a specific reason to.",
          },
        ],
      },
      {
        id: "rsi-divergence",
        title: "RSI Divergence",
        subtitle: "One of RSI's most powerful signals — when price and momentum disagree",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**Divergence** occurs when price and RSI move in opposite directions. It's a warning sign that the current trend may be losing momentum — and it's one of the most powerful signals RSI produces.",
          },
          {
            type: "text",
            content:
              "**Bullish Divergence (buy signal):**\n\n• Price makes a **lower low** (new swing low below the previous low)\n• RSI makes a **higher low** (RSI bottoms higher than its previous bottom)\n\nThis means: even though price went lower, the selling momentum actually decreased. Sellers are losing steam, and a reversal upward may be coming.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { mode: "divergence", divergenceType: "bullish" },
          },
          {
            type: "text",
            content:
              "**Bearish Divergence (sell signal):**\n\n• Price makes a **higher high** (new swing high above the previous high)\n• RSI makes a **lower high** (RSI peaks lower than its previous peak)\n\nThis means: even though price went higher, the buying momentum actually decreased. Buyers are losing enthusiasm, and a pullback may be coming.",
          },
          {
            type: "text",
            content:
              "**Hidden Divergence (trend continuation):**\n\nLess well-known but equally valuable:\n\n• **Hidden bullish divergence** — Price makes a higher low, RSI makes a lower low. The uptrend is intact and likely to continue.\n• **Hidden bearish divergence** — Price makes a lower high, RSI makes a higher high. The downtrend is intact.\n\nHidden divergence signals trend continuation rather than reversal. It tells you that a pullback within a trend is a buying opportunity, not the start of a reversal.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Divergence is a warning signal, not a timing signal. It tells you the trend is weakening, but it doesn't tell you exactly when the reversal will happen. Always wait for price confirmation (a break of a trendline, a key candle pattern, or a support/resistance break) before acting on divergence.",
          },
        ],
      },
      {
        id: "rsi-strategies",
        title: "RSI Trading Strategies",
        subtitle: "Practical ways to use RSI — especially for options sellers",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "RSI can be used in two fundamentally different ways, depending on market conditions:\n\n**1. Mean Reversion (range-bound markets)**\n• Buy when RSI drops below 30 (oversold)\n• Sell when RSI rises above 70 (overbought)\n• Works best when the stock is trading sideways in a range\n\n**2. Trend Following (trending markets)**\n• In uptrends, RSI tends to stay between 40-90. Buy dips to 40-50.\n• In downtrends, RSI tends to stay between 10-60. Sell rallies to 50-60.\n• Don't fight the trend — overbought in an uptrend is bullish, not bearish.",
          },
          {
            type: "text",
            content:
              "**RSI + Support/Resistance Combo:**\n\nRSI is most powerful when combined with support and resistance levels:\n\n• Price hits support AND RSI is oversold → Strong buy signal\n• Price hits resistance AND RSI is overbought → Strong sell signal\n• Price hits support but RSI is neutral → Weaker signal, wait for more confirmation\n\nThe overlap of multiple signals (confluence) dramatically improves your probability of success.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { mode: "strategy", showSupportResistance: true },
          },
          {
            type: "text",
            content:
              "**RSI for Options Entry Timing:**\n\nFor options sellers (the stonkbro approach), RSI is particularly valuable:\n\n• **Selling puts (CSPs)** — Wait for RSI to drop below 30 on a stock you want to own. You're selling insurance when fear is highest and premiums are richest.\n• **Selling covered calls** — Wait for RSI to rise above 70 on a stock you own. Premium is rich when the stock has run up, and a pullback is more likely.\n• **PMCC management** — Use RSI to time rolling your short call. If RSI is high, roll up aggressively. If RSI is low, give the position room.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "stonkbro's scoring engine incorporates momentum signals similar to RSI. When you see high explosive potential scores, the scoring engine has already detected the kind of momentum setups RSI would highlight — think of them as complementary tools.",
          },
        ],
      },
      {
        id: "rsi-quiz",
        title: "RSI & Momentum Quiz",
        subtitle: "Check your momentum knowledge",
        estimatedMinutes: 3,
        sections: [
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-q1",
                question:
                  "A stock is in a strong uptrend and RSI has been above 70 for two weeks. What does this most likely indicate?",
                options: [
                  "The stock will crash imminently",
                  "Strong momentum — the uptrend has conviction",
                  "RSI is broken and should be recalibrated",
                  "You should immediately buy puts",
                ],
                correctIndex: 1,
                explanation:
                  "In strong uptrends, RSI can remain overbought for extended periods. This indicates powerful momentum, not an imminent reversal. Fighting a strong trend by shorting just because RSI is overbought is one of the most common mistakes traders make.",
              },
              {
                id: "rsi-q2",
                question:
                  "Price makes a lower low but RSI makes a higher low. What type of signal is this?",
                options: [
                  "Bearish divergence — trend will continue down",
                  "Hidden bullish divergence — trend continuation",
                  "Bullish divergence — potential reversal upward",
                  "RSI failure swing",
                ],
                correctIndex: 2,
                explanation:
                  "This is classic bullish divergence. Price went lower, but momentum (RSI) didn't confirm the new low. Selling pressure is decreasing even though price hit a new low, suggesting a potential reversal upward.",
              },
              {
                id: "rsi-q3",
                question:
                  "When is the ideal time to sell a cash-secured put using RSI as a guide?",
                options: [
                  "When RSI is above 70 (overbought)",
                  "When RSI is at exactly 50 (neutral)",
                  "When RSI is below 30 (oversold) on a stock you want to own",
                  "RSI doesn't matter for options selling",
                ],
                correctIndex: 2,
                explanation:
                  "Selling puts when RSI is oversold means you're selling insurance when fear is highest — premiums are rich, and the stock is more likely to bounce. You get paid more for the same obligation, and you're buying the stock at a better price if assigned.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 11: CANDLESTICK PATTERNS ────────────────────────────────
  {
    id: "candlesticks",
    title: "Candlestick Patterns",
    subtitle: "Read the story that each candle tells about buyer/seller battles",
    icon: "🕯️",
    color: "orange-500",
    lessons: [
      {
        id: "candle-basics",
        title: "Reading Candlesticks",
        subtitle: "The four data points in every candle — and what they reveal",
        estimatedMinutes: 4,
        sections: [
          {
            type: "text",
            content:
              "Every candlestick represents a battle between buyers and sellers over a specific time period. It encodes four pieces of information:\n\n• **Open** — The price at the start of the period\n• **High** — The highest price reached during the period\n• **Low** — The lowest price reached during the period\n• **Close** — The price at the end of the period",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "anatomy", showLabels: true },
          },
          {
            type: "text",
            content:
              "**The Body:**\n\nThe thick part of the candle is the body. It shows the range between open and close.\n\n• **Green/white (bullish)** — Close > Open. Buyers won this period.\n• **Red/black (bearish)** — Close < Open. Sellers won this period.\n• **Large body** — Decisive victory for one side. Strong conviction.\n• **Small body** — Neither side dominated. Indecision.",
          },
          {
            type: "text",
            content:
              "**The Wicks (Shadows):**\n\nThe thin lines above and below the body are wicks (also called shadows). They tell you about rejection.\n\n• **Long upper wick** — Price went high but sellers pushed it back down. Rejection of higher prices.\n• **Long lower wick** — Price went low but buyers pushed it back up. Rejection of lower prices.\n• **No wicks** — The open or close was the extreme. Very strong conviction in that direction.\n\nThe wick tells you what happened during the period that the body doesn't show. A candle with a tiny body and a huge lower wick says: \"Sellers tried hard, but buyers completely rejected those prices.\"",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Reading candles is about understanding the narrative. Each candle tells a micro-story of the buyer/seller battle. String several together and you get a plot — trend, reversal, or continuation.",
          },
        ],
      },
      {
        id: "candle-single",
        title: "Single Candle Patterns",
        subtitle: "Doji, hammer, engulfing — the patterns every trader must know",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "Single candle patterns are the building blocks of candlestick analysis. They signal shifts in market psychology at critical moments.",
          },
          {
            type: "text",
            content:
              "**Doji — Indecision**\n\nOpen and close are nearly identical (tiny or no body). The market opened, moved around, and closed right where it started. Neither buyers nor sellers could maintain control.\n\n• At the top of an uptrend → Bullish momentum stalling, possible reversal\n• At the bottom of a downtrend → Bearish momentum stalling, possible reversal\n• In the middle of a range → Just indecision, less meaningful",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "single-patterns", patterns: ["doji", "hammer", "engulfing"] },
          },
          {
            type: "text",
            content:
              "**Hammer / Hanging Man**\n\nSmall body at the top with a long lower wick (2x+ body length). No or tiny upper wick.\n\n• **Hammer** (at support / after downtrend) — Sellers pushed price down hard, but buyers rejected those lows and pushed price back up. Bullish reversal signal.\n• **Hanging Man** (at resistance / after uptrend) — Same shape, opposite context. The long lower wick shows sellers are starting to appear. Bearish warning.",
          },
          {
            type: "text",
            content:
              "**Engulfing Candles**\n\n• **Bullish engulfing** — A large green candle completely engulfs the previous red candle's body. Buyers overwhelmed sellers. Powerful reversal signal at support.\n• **Bearish engulfing** — A large red candle completely engulfs the previous green candle's body. Sellers overwhelmed buyers. Powerful reversal signal at resistance.",
          },
          {
            type: "text",
            content:
              "**Spinning Top**\n\nSmall body with relatively equal upper and lower wicks. Similar to a doji but with a slightly larger body. Signals indecision — the market is churning. After a strong trend, a spinning top suggests the trend is losing momentum.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Context matters more than the pattern itself. A hammer at a major support level after a 20% decline is a completely different signal than a hammer in the middle of nowhere on no volume.",
          },
        ],
      },
      {
        id: "candle-multi",
        title: "Multi-Candle Patterns",
        subtitle: "Morning star, three soldiers, and other powerful formations",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Multi-candle patterns tell a more complete story than single candles. They show a sequence of events — a narrative of shifting control between buyers and sellers.",
          },
          {
            type: "text",
            content:
              "**Morning Star (Bullish Reversal — 3 candles):**\n\n1. Large red candle (sellers in control)\n2. Small-bodied candle that gaps down (indecision — a doji or spinning top)\n3. Large green candle that closes well into the first candle's body (buyers take over)\n\nThe morning star tells the story of sellers exhausting themselves, a moment of indecision, then buyers seizing control. It's most powerful at support levels.\n\n**Evening Star** is the bearish mirror — large green, small indecision, large red. Most powerful at resistance.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "multi-patterns", patterns: ["morning-star", "three-soldiers"] },
          },
          {
            type: "text",
            content:
              "**Three White Soldiers (Bullish Continuation):**\n\nThree consecutive green candles, each opening within the previous body and closing higher. Each candle has minimal upper wick. This shows steady, strong buying pressure — not a spike, but sustained commitment from buyers.\n\n**Three Black Crows** is the bearish mirror — three consecutive red candles with minimal lower wicks, showing sustained selling pressure.",
          },
          {
            type: "text",
            content:
              "**Harami (\"Pregnant\" in Japanese):**\n\n• **Bullish harami** — After a red candle, a small green candle forms entirely within the previous candle's body. The large red candle is the \"mother\" and the small green is the \"baby.\" Sellers are losing control.\n• **Bearish harami** — After a green candle, a small red candle forms within it. Buyers are losing momentum.\n\nHarami patterns are less reliable than engulfing or morning/evening stars, so look for confirmation (a follow-through candle in the expected direction).",
          },
          {
            type: "text",
            content:
              "**Tweezer Tops and Bottoms:**\n\n• **Tweezer bottom** — Two candles with nearly identical lows. The first is bearish, the second is bullish. Both tested the same low and rejected it. Strong support confirmation.\n• **Tweezer top** — Two candles with nearly identical highs. The first is bullish, the second is bearish. Both tested the same high and got rejected. Strong resistance confirmation.\n\nTweezers work because they show the market testing a level twice and failing to break through both times.",
          },
        ],
      },
      {
        id: "candle-context",
        title: "Candlesticks in Context",
        subtitle: "Combining candle patterns with support, RSI, and volume",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "A candlestick pattern in isolation is a coin flip. A candlestick pattern at the right level, with the right volume, and the right momentum reading becomes a high-probability trade setup.",
          },
          {
            type: "text",
            content:
              "**Candles at Support/Resistance:**\n\nThe most reliable candle signals occur at key support and resistance levels:\n\n• Hammer at major support → High probability bullish reversal\n• Bearish engulfing at major resistance → High probability bearish reversal\n• Doji at support after an RSI oversold reading → Triple confluence\n\nIf you see a textbook candle pattern but it's not at a meaningful level, the signal is much weaker. Location, location, location.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "context", showSupportResistance: true, showRSI: true },
          },
          {
            type: "text",
            content:
              "**Volume Confirmation:**\n\n• Reversal patterns (hammer, engulfing, morning star) are strongest on **above-average volume**. High volume means real participation in the reversal.\n• A beautiful hammer pattern on thin volume? Probably not reliable.\n• Volume should increase on the reversal candle compared to the preceding candles.",
          },
          {
            type: "text",
            content:
              "**Timeframe Selection:**\n\nCandle patterns on higher timeframes are more reliable:\n\n• **Daily candles** — The standard for swing trading. Most pattern descriptions assume daily charts.\n• **Weekly candles** — Even more reliable but fewer signals. Great for confirming daily signals.\n• **4-hour candles** — Good for shorter-term trades. More signals but lower reliability.\n• **1-minute/5-minute** — High noise, low reliability for pattern-based trading.\n\nFor options selling with stonkbro, daily and weekly charts are your primary timeframes.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Never trade a candle pattern in isolation. The pattern is one piece of evidence — combine it with support/resistance, volume, and RSI for a complete picture. The best trades have three or more factors lining up in the same direction.",
          },
        ],
      },
      {
        id: "candle-quiz",
        title: "Candlestick Patterns Quiz",
        subtitle: "Test your pattern recognition",
        estimatedMinutes: 3,
        sections: [
          {
            type: "quiz",
            questions: [
              {
                id: "candle-q1",
                question:
                  "A candle has a tiny body at the top with a very long lower wick. It appears at a major support level after a 15% decline. What is this pattern and what does it suggest?",
                options: [
                  "Hanging man — bearish continuation",
                  "Hammer — potential bullish reversal",
                  "Doji — complete indecision",
                  "Shooting star — bearish reversal",
                ],
                correctIndex: 1,
                explanation:
                  "This is a hammer. The long lower wick shows sellers pushed the price down during the period, but buyers rejected those lower prices and pushed it back up. At a major support level after a significant decline, this is a strong bullish reversal signal. The same shape at resistance would be called a hanging man.",
              },
              {
                id: "candle-q2",
                question:
                  "What defines a bullish engulfing pattern?",
                options: [
                  "A small green candle followed by a larger green candle",
                  "A red candle followed by a green candle whose body completely covers the red candle's body",
                  "Two green candles of equal size",
                  "A green candle with no wicks",
                ],
                correctIndex: 1,
                explanation:
                  "A bullish engulfing pattern requires a red (bearish) candle followed by a green (bullish) candle whose body completely engulfs the previous candle's body. This shows buyers overwhelmed the sellers — whatever the sellers accomplished in the previous period was completely erased and then some.",
              },
              {
                id: "candle-q3",
                question:
                  "You spot a beautiful morning star pattern on the daily chart, but the volume on the third candle (the large green candle) is 60% below average. What should you do?",
                options: [
                  "Buy immediately — the pattern is clear",
                  "Wait for volume confirmation on a follow-through day",
                  "Sell short instead",
                  "Switch to a 5-minute chart for better accuracy",
                ],
                correctIndex: 1,
                explanation:
                  "Reversal patterns without volume confirmation are unreliable. The morning star shape is there, but without participation (volume), it could easily fail. Wait for a follow-through day with stronger volume before acting. Pattern + volume = conviction.",
              },
              {
                id: "candle-q4",
                question:
                  "Why is a hammer at a major support level with RSI below 30 considered a high-probability setup?",
                options: [
                  "Because three indicators is always better than one",
                  "Because the hammer guarantees a reversal at support",
                  "Because you have triple confluence: price rejection (hammer), key level (support), and extreme momentum (oversold RSI)",
                  "Because RSI below 30 means the stock must go up",
                ],
                correctIndex: 2,
                explanation:
                  "Triple confluence — three independent signals all pointing the same direction — dramatically improves the probability of success. The hammer shows real-time price rejection, support shows a historically significant level, and oversold RSI shows momentum has stretched too far. No single signal guarantees anything, but the overlap of three is powerful.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 12: TA + GREEKS MASTERY ─────────────────────────────────
  {
    id: "ta-greeks-combined",
    title: "TA + Greeks Mastery",
    subtitle: "Combine technical analysis with Greeks for precision options trading",
    icon: "🎯",
    color: "lime-500",
    lessons: [
      {
        id: "ta-entry",
        title: "Using TA for Options Entry",
        subtitle: "How support, resistance, and RSI improve your options timing",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Technical analysis transforms options trading from guessing to systematic decision-making. Instead of randomly selling a put, you sell it at a level where the odds are in your favor.",
          },
          {
            type: "text",
            content:
              "**Timing CSP Entries at Support:**\n\nWhen selling cash-secured puts, your ideal scenario is getting assigned at a great price — or collecting premium when the stock bounces. Support levels tell you where to strike:\n\n• Identify the nearest strong support level below current price\n• Sell your put with a strike at or just below that support\n• If the stock holds support (likely), you keep premium\n• If it breaks support (unlikely at a strong level), you buy at a level that historically attracted buyers\n\nThis is dramatically better than picking a strike randomly or just going X% out of the money.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "csp-entry", showSupport: true },
          },
          {
            type: "text",
            content:
              "**Selling Covered Calls at Resistance:**\n\nWhen selling covered calls, you want the stock to stay below your strike. Resistance levels tell you where the stock is likely to stall:\n\n• Identify the nearest strong resistance level above current price\n• Sell your call with a strike at or near that resistance\n• If the stock stalls at resistance (likely), you keep premium and your shares\n• Even if it breaks through, you've sold at a historically significant level\n\nPairing strikes with resistance levels gives you an edge that purely delta-based strike selection misses.",
          },
          {
            type: "text",
            content:
              "**Using RSI for Entry Timing:**\n\n• **CSP entry** — Wait for RSI below 35 before opening. Oversold stocks have richer put premiums (higher IV) and better bounce probability.\n• **Covered call entry** — Wait for RSI above 65 before selling calls. Overbought stocks have richer call premiums.\n• **PMCC short call roll** — If RSI is screaming overbought (80+), consider rolling your short call up. If RSI is oversold, sit tight or roll down for more premium.",
          },
          {
            type: "text",
            content:
              "**Candlestick Confirmation for Options Timing:**\n\nDon't sell the put the moment the stock hits support. Wait for a confirmation candle:\n\n• Hammer or bullish engulfing at support → Sell the put now (confirmation)\n• Stock at support but candles are all red, no rejection wicks → Wait. Support might break.\n• Morning star at support with RSI oversold → This is as good as it gets. Sell that put.\n\nThe candle tells you whether the support is actually holding in real-time, not just historically.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "The best options entries have three things: a key support/resistance level, an RSI extreme, and a confirmation candle. You won't always get all three — but the more confluence you have, the better your edge.",
          },
        ],
      },
      {
        id: "ta-greeks-synergy",
        title: "TA + Greeks Synergy",
        subtitle: "How delta, theta, vega, and gamma behave at key technical levels",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Now we connect the two worlds. Each Greek has a specific relationship with technical analysis levels that, once understood, gives you a significant edge in positioning.",
          },
          {
            type: "text",
            content:
              "**Delta at Support/Resistance Levels:**\n\nDelta measures directional exposure. At key technical levels, you can use delta to calibrate your conviction:\n\n• **High confidence support holds** → Sell puts with higher delta (closer to ATM). You collect more premium because you're comfortable with assignment at this level.\n• **Less confident about support** → Sell puts with lower delta (further OTM). You sacrifice premium for safety.\n• **Selling calls at resistance** → Higher delta if you believe resistance will hold firmly. Lower delta if you think it might break through.\n\nTA gives you the conviction level; delta translates that conviction into position sizing.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "synergy", showGreeks: true, showLevels: true },
          },
          {
            type: "text",
            content:
              "**Theta Collection Windows:**\n\nTheta decay accelerates in the final 30-45 days before expiration. Combine this with TA timing:\n\n• Open theta positions (CSPs, covered calls) **30-45 DTE** when a stock just bounced off support or got rejected at resistance\n• The TA event gives you directional confidence; the 30-45 DTE window maximizes your theta decay rate\n• If a stock is at support with 45 DTE, you have the ideal setup: high probability of a bounce + rapid time decay working for you",
          },
          {
            type: "text",
            content:
              "**Vega Around Breakouts:**\n\nVega measures sensitivity to implied volatility. Breakouts and breakdowns are volatility events:\n\n• **Before a breakout** — IV often compresses as the stock consolidates. Options are cheaper. Good time to buy options (long vega) if you expect a breakout.\n• **After a breakout** — IV can spike or collapse depending on the move. If you're selling options (short vega), wait for the IV spike post-breakout, then sell into the elevated premiums.\n• **Failed breakouts** — IV spikes on the false breakout, then collapses as the stock reverses. Perfect for short vega strategies like iron condors.",
          },
          {
            type: "text",
            content:
              "**Gamma Risk at Key Levels:**\n\nGamma is highest for ATM options near expiration. When the stock is sitting right at a key support/resistance level near expiration:\n\n• **Gamma risk is extreme** — Small moves cause large delta changes\n• **Pin risk** — Stocks sometimes \"pin\" to a strike near expiration, especially at round numbers\n• If your short strike is right at a major support/resistance level with 5 DTE, your gamma risk is maximum. Consider closing or rolling.\n\nThe intersection of high gamma (ATM + near expiration) and a key technical level is the most dangerous spot for short options. Respect it.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "When your short strike aligns with a major support/resistance level in the final week before expiration, gamma risk is extreme. This is the single most dangerous configuration for options sellers. Either close the position or roll it out in time.",
          },
        ],
      },
      {
        id: "ta-final",
        title: "Comprehensive Assessment",
        subtitle: "Final assessment covering TA + Greeks integration",
        estimatedMinutes: 10,
        sections: [
          {
            type: "text",
            content:
              "This final assessment tests your integrated understanding of technical analysis and options Greeks. Each question requires you to combine multiple concepts — just like real trading requires synthesizing information from different sources.\n\nTake your time. These questions are designed to challenge you.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ta-final-q1",
                question:
                  "AAPL is trading at $195 with strong support at $185 (tested 4 times). RSI is at 28. You want to sell a cash-secured put. Which strike is most appropriate?",
                options: [
                  "$195 (ATM) to collect maximum premium",
                  "$185 (at support) to align with the key level",
                  "$170 (deep OTM) to minimize any risk",
                  "$200 (above current price) for maximum premium",
                ],
                correctIndex: 1,
                explanation:
                  "The $185 strike aligns with strong support that's been tested 4 times. With RSI at 28 (oversold), the stock is likely to bounce. If assigned at $185, you're buying at a level where buyers have repeatedly stepped in. ATM ($195) offers more premium but no technical edge. Deep OTM ($170) sacrifices too much premium. $200 is ITM and makes no strategic sense.",
              },
              {
                id: "ta-final-q2",
                question:
                  "You own 100 shares of MSFT at $420. There's strong resistance at $450 (rejected 3 times). RSI is at 72. You want to sell a covered call. What's the optimal approach?",
                options: [
                  "Sell the $440 call — below resistance for extra safety",
                  "Sell the $450 call — at resistance where the stock is likely to stall",
                  "Sell the $460 call — above resistance in case it breaks through",
                  "Don't sell any calls — RSI overbought means a crash is coming",
                ],
                correctIndex: 1,
                explanation:
                  "The $450 strike aligns with triple-tested resistance. RSI at 72 confirms the stock is overbought, increasing the probability that it stalls at or before resistance. Selling at resistance maximizes premium while aligning with the technical picture. $440 works but leaves premium on the table. $460 ignores the resistance level's significance.",
              },
              {
                id: "ta-final-q3",
                question:
                  "A stock shows bullish divergence on RSI (price lower low, RSI higher low) right at a major support level. A hammer candle forms on 2x average volume. What is the significance of this setup?",
                options: [
                  "One bullish signal — moderately interesting",
                  "Two confirming signals — decent setup",
                  "Four-factor confluence — extremely high probability bullish setup",
                  "Conflicting signals — stay out",
                ],
                correctIndex: 2,
                explanation:
                  "This is four-factor confluence: (1) major support level, (2) bullish RSI divergence, (3) hammer candle pattern, and (4) above-average volume confirmation. Each factor independently suggests a bounce. Together, they create one of the highest-probability setups in technical analysis. This would be an excellent time to sell a cash-secured put.",
              },
              {
                id: "ta-final-q4",
                question:
                  "Your short put has a strike at $100 — which is also a major support level. There are 4 days to expiration and the stock is at $101. What is your primary risk concern?",
                options: [
                  "Theta decay — you're losing time value",
                  "Vega — implied volatility might spike",
                  "Gamma — small price moves will cause large delta swings with the stock near your strike at a key level",
                  "Rho — interest rates might change",
                ],
                correctIndex: 2,
                explanation:
                  "With 4 DTE, the stock at $101 (near your $100 strike), and $100 being a major support/resistance level, gamma risk is your primary concern. Your delta will swing violently with small price moves because you're near ATM and near expiration. If the stock dips below $100 (breaking support), your position could go from slightly profitable to deeply underwater in hours. This is the most dangerous configuration for short options sellers.",
              },
              {
                id: "ta-final-q5",
                question:
                  "A stock has been consolidating in a tight range for 3 weeks. Implied volatility has compressed. It's approaching a major resistance level. You expect a breakout. Which strategy best exploits this setup?",
                options: [
                  "Sell an iron condor — collect premium in the range",
                  "Buy a straddle or strangle — you're long vega before the expected volatility expansion",
                  "Sell a naked put — collect premium below support",
                  "Sell a covered call at resistance — collect premium if it stalls",
                ],
                correctIndex: 1,
                explanation:
                  "If you expect a breakout, you want to be long vega (buying options) before IV expands. A straddle or strangle profits from a large move in either direction with expanding IV. Selling an iron condor would be the worst choice — you'd be short vega right before a volatility event. The breakout could blow through your short strike.",
              },
              {
                id: "ta-final-q6",
                question:
                  "You see a bearish engulfing candle at resistance with RSI at 75. You sell a covered call 30 DTE with a strike at resistance. Which Greeks are working in your favor?",
                options: [
                  "Delta only",
                  "Theta only",
                  "Delta and theta — directional bias from TA plus time decay",
                  "Gamma and vega",
                ],
                correctIndex: 2,
                explanation:
                  "Your TA analysis (bearish engulfing at resistance, overbought RSI) gives you directional conviction that the stock will stall or pull back — that's delta working for you (the stock staying below your strike). At 30 DTE, theta decay is accelerating, steadily reducing your option's value. Both Greeks are aligned with your thesis. Gamma and vega are actually working against you (gamma risk if the stock approaches your strike, and any IV expansion would increase your short call's value).",
              },
              {
                id: "ta-final-q7",
                question:
                  "When combining stonkbro's explosive potential score with technical analysis, which approach is most effective?",
                options: [
                  "Ignore TA — the scoring engine already incorporates everything",
                  "Use TA to override the score — if the chart looks bad, skip the stock",
                  "Use the score for stock selection and TA for entry timing — the score identifies what to trade, TA tells you when",
                  "Only trade stocks with low scores at support levels",
                ],
                correctIndex: 2,
                explanation:
                  "The most effective approach uses each tool for what it does best. stonkbro's scoring engine identifies stocks with explosive potential — it answers 'what.' Technical analysis provides entry timing — it answers 'when.' A high-scoring stock at a key support level with RSI oversold and a confirmation candle is the complete package: the right stock at the right time.",
              },
              {
                id: "ta-final-q8",
                question:
                  "You're managing a PMCC (Poor Man's Covered Call). The stock just broke above a major resistance level on 3x average volume. RSI is at 68 and rising. Your short call is $10 above the breakout level with 20 DTE. What should you do?",
                options: [
                  "Close the entire position — the breakout will blow through your short call",
                  "Roll the short call up and out — the breakout is valid (high volume) and the stock has room to run, but your 20 DTE short call needs more room",
                  "Do nothing — the short call is $10 above and will expire worthless",
                  "Sell more short calls to increase premium",
                ],
                correctIndex: 1,
                explanation:
                  "A breakout on 3x volume is a valid, high-conviction breakout — the stock is likely to continue higher. RSI at 68 is elevated but not extreme, confirming room to run. Your short call is only $10 above the breakout level with 20 DTE, which means the stock could reach it. Rolling up and out gives the position room to breathe while collecting additional premium from the time extension. Doing nothing is risky with a valid breakout. Closing the entire position forfeits your long LEAPS position unnecessarily.",
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────

/** Check if a lesson contains a quiz section */
export function hasQuiz(lesson: Lesson): boolean {
  return lesson.sections.some((s) => s.type === "quiz");
}

/** Get the next lesson in the curriculum, or null if at the end */
export function getNextLesson(
  curriculum: Module[],
  currentModuleId: string,
  currentLessonId: string
): { moduleId: string; lessonId: string } | null {
  for (let mi = 0; mi < curriculum.length; mi++) {
    const mod = curriculum[mi];
    if (mod.id !== currentModuleId) continue;

    const lessonIdx = mod.lessons.findIndex((l) => l.id === currentLessonId);
    if (lessonIdx === -1) return null;

    // Next lesson in same module
    if (lessonIdx < mod.lessons.length - 1) {
      return {
        moduleId: mod.id,
        lessonId: mod.lessons[lessonIdx + 1].id,
      };
    }

    // First lesson of next module
    if (mi < curriculum.length - 1) {
      return {
        moduleId: curriculum[mi + 1].id,
        lessonId: curriculum[mi + 1].lessons[0].id,
      };
    }

    // End of curriculum
    return null;
  }

  return null;
}

/** Progress record from the database */
export type LearnProgress = {
  id: string;
  user_id: string;
  module_id: string;
  lesson_id: string;
  completed: boolean;
  quiz_score: number | null;
  quiz_answers: Record<string, number> | null;
  scroll_position: number | null;
  time_spent_seconds: number;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
};

/** Calculate completion percentage for a module (0-100) */
export function calculateModuleCompletion(
  progress: LearnProgress[],
  moduleId: string,
  module: Module
): number {
  const totalLessons = module.lessons.length;
  if (totalLessons === 0) return 0;

  const completedLessons = module.lessons.filter((lesson) =>
    progress.some(
      (p) =>
        p.module_id === moduleId &&
        p.lesson_id === lesson.id &&
        p.completed
    )
  ).length;

  return Math.round((completedLessons / totalLessons) * 100);
}
