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
        | "ta-greeks-chart"
        | "long-short-diagram"
        | "sma-chart"
        | "macd-chart"
        | "bollinger-bands-chart"
        | "iv-rank-gauge"
        | "decision-tree-widget";
      props?: Record<string, unknown>;
    }
  | {
      type: "interactive";
      component:
        | "strike-slider"
        | "dte-slider"
        | "vol-slider"
        | "position-builder"
        | "greek-calculator"
        | "long-short-diagram"
        | "sma-chart"
        | "macd-chart"
        | "bollinger-bands-chart"
        | "iv-rank-gauge"
        | "decision-tree-widget";
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
  level: 1 | 2;
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

  // ─── MODULE 3: GAMMA ───────────────────────────────────────────────
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

  // ─── MODULE 4: THETA ───────────────────────────────────────────────
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

  // ─── MODULE 5: VEGA ────────────────────────────────────────────────
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

  // ─── MODULE 6: RHO & MINOR GREEKS ─────────────────────────────────
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

  // ─── MODULE 7: GREEKS IN CONCERT ──────────────────────────────────
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

  // ─── MODULE 8: APPLIED GREEKS MASTERY ─────────────────────────────
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

  // ─── MODULE 9: SUPPORT & RESISTANCE ─────────────────────────────────
  {
    id: "support-resistance",
    title: "Support & Resistance",
    subtitle: "Learn to read the price levels where buyers and sellers clash",
    icon: "📊",
    color: "indigo-500",
    level: 1,
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
          {
            type: "quiz",
            questions: [
              {
                id: "sr-basics-q1",
                question:
                  "Why does a previous high tend to act as resistance the next time price approaches it?",
                options: [
                  "Because price always reverts to round numbers",
                  "Because traders who bought near the previous high but didn't sell are looking to exit at breakeven",
                  "Because the SEC enforces resistance levels",
                  "Because moving averages always cluster there",
                ],
                correctIndex: 1,
                explanation:
                  "Market memory. Traders who got caught buying near a prior peak are mentally anchored to that price as breakeven. When price returns, they sell — adding supply right at that level. Combined with new traders who recognize the level and short it, you get a wall of selling exactly where price stalled before.",
              },
              {
                id: "sr-basics-q2",
                question:
                  "Which of these would create the strongest support level?",
                options: [
                  "A single touch at $100 last week on average volume",
                  "Three bounces at $100 across the last six months on heavy volume",
                  "A round number that price has never visited",
                  "The 5-day moving average",
                ],
                correctIndex: 1,
                explanation:
                  "Multiple touches + heavy volume + recency all stack to make support stronger. One touch establishes a possible level; three touches confirm it as a real zone where buyers consistently show up. The volume tells you those bounces had real institutional participation.",
              },
            ],
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
          {
            type: "callout",
            style: "tip",
            content:
              "**Worked example — drawing a zone:**\n\nMSFT bounces happen at $401.20, $399.85, and $400.40 across three different weeks. Don't draw a line at $400.15 (the average) — draw a **zone from $399.50 to $401.50**. When MSFT trades back into that band, that's your support test. Treat hits anywhere in the zone as the same level.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sr-drawing-q1",
                question:
                  "A stock has touched the $50 level four times: twice at $49.80, once at $50.30, once at $49.95. How should you draw this support?",
                options: [
                  "A single horizontal line at $49.80 (the lowest touch)",
                  "A zone from roughly $49.50 to $50.50 capturing all four touches",
                  "Skip it — the touches aren't at exactly the same price",
                  "A line at $50.00 only",
                ],
                correctIndex: 1,
                explanation:
                  "Real support is a zone, not a line. The four touches cluster around $50 within ~50 cents — that's a high-conviction zone. Drawing a single line at the lowest touch makes you miss two of the four reactions and fixates you on a precision the market doesn't honor.",
              },
              {
                id: "sr-drawing-q2",
                question:
                  "Which level would you give the most weight when planning a CSP entry?",
                options: [
                  "A 4-hour-chart level from yesterday with one touch",
                  "A weekly-chart level with three touches across the last 12 months",
                  "A 1-minute-chart level from this morning",
                  "A level from 5 years ago with one touch",
                ],
                correctIndex: 1,
                explanation:
                  "Higher timeframe + multiple touches + recency. A weekly level with three confirmed bounces in the last year is exactly what institutional traders watch. The 5-year-old level is too stale; the intraday levels are too noisy for swing-style options selling.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "sr-breakouts-q1",
                question:
                  "Stock breaks above $100 resistance, rallies to $103, then pulls back to $100.20 on light volume and bounces. What does this tell you?",
                options: [
                  "The breakout failed — sell immediately",
                  "Classic role reversal: old resistance ($100) is now acting as support; the breakout is healthy",
                  "Random noise, ignore it",
                  "The stock is forming a new resistance at $103",
                ],
                correctIndex: 1,
                explanation:
                  "This is the textbook breakout-retest. Price broke through, pulled back to test the old level, and found buyers. The light pullback volume is the giveaway — sellers aren't panicking, they're just digesting. The retest entry here is often a higher-probability setup than chasing the initial breakout.",
              },
              {
                id: "sr-breakouts-q2",
                question:
                  "How would you distinguish a real breakout from a bull trap?",
                options: [
                  "Real breakouts always happen on Mondays",
                  "Real breakouts come with a clear close above the level on volume 50%+ above average",
                  "Bull traps only happen on small-cap stocks",
                  "Wait for an analyst upgrade",
                ],
                correctIndex: 1,
                explanation:
                  "Volume is the truth-teller. A breakout on average or weak volume is suspicious — it's just price probing the level without real participation. A close (not just an intraday wick) above the level with surge volume tells you institutions are actually moving size through it.",
              },
            ],
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
    level: 1,
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
          {
            type: "callout",
            style: "tip",
            content:
              "**Worked example — RSI calculation intuition:**\n\nOver 14 days, a stock has 9 up days averaging +$1.20 and 5 down days averaging -$0.40.\n\n• Avg gain = $1.20, avg loss = $0.40\n• RS = 1.20 / 0.40 = 3.0\n• RSI = 100 - (100 / (1 + 3.0)) = 100 - 25 = **75**\n\nRSI of 75 means up moves have been roughly 3× larger than down moves on average over the lookback. The stock is overbought — but in a strong uptrend, that's normal, not a sell signal.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-basics-q1",
                question:
                  "RSI = 78 on a stock that has been ripping higher for three weeks. What's the right read?",
                options: [
                  "Sell short — overbought always means reversal",
                  "Strong momentum; in an uptrend, RSI can stay overbought for weeks",
                  "RSI is broken on this ticker",
                  "Buy puts immediately",
                ],
                correctIndex: 1,
                explanation:
                  "Overbought ≠ sell signal. Strong uptrends consistently print RSI above 70 — that's what strength looks like in oscillator form. The classic mistake is shorting strong trends just because RSI says 'overbought'. Wait for divergence or a real break, not just a number.",
              },
              {
                id: "rsi-basics-q2",
                question:
                  "Why might you switch from a 14-period RSI to a 21-period RSI?",
                options: [
                  "To get more frequent buy/sell signals",
                  "To get smoother readings with fewer false signals — better for longer-term position trading",
                  "Because 14-period RSI doesn't work on tech stocks",
                  "To detect intraday scalps",
                ],
                correctIndex: 1,
                explanation:
                  "Longer lookback = more averaging = smoother indicator with fewer whipsaws. You get fewer signals but each carries more weight. Position traders holding for weeks/months prefer 21-period; scalpers might use 7-period for sensitivity.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-divergence-q1",
                question:
                  "A stock prints a higher high at $120 (vs. previous $115), but RSI peaks at 65 (vs. previous 78). What is happening?",
                options: [
                  "Bullish divergence — buy more",
                  "Bearish divergence — momentum is weakening despite the new high",
                  "Hidden bullish divergence — uptrend continues",
                  "RSI is just lagging",
                ],
                correctIndex: 1,
                explanation:
                  "Classic bearish divergence: price made a new high but momentum (RSI) couldn't match its previous peak. Fewer buyers are participating in this leg up — the trend is running on fumes. That's a heads-up to tighten stops or take profits, not a reason to add longs.",
              },
              {
                id: "rsi-divergence-q2",
                question:
                  "Hidden bullish divergence shows up. What does it tell you about the trend?",
                options: [
                  "The trend is reversing",
                  "The uptrend is intact — pullbacks are buying opportunities, not warnings",
                  "RSI is broken",
                  "Sell immediately",
                ],
                correctIndex: 1,
                explanation:
                  "Hidden divergence signals trend continuation, not reversal. In hidden bullish, price makes a higher low while RSI makes a lower low — translation: the pullback ran momentum down, but buyers stepped in earlier than last time. The trend is still healthy and dips are dippable.",
              },
              {
                id: "rsi-divergence-q3",
                question:
                  "You spot textbook bearish divergence on the daily. The pattern formed three days ago. Should you short now?",
                options: [
                  "Yes — divergence is a precise timing signal",
                  "No — wait for price confirmation (broken trendline, breakdown candle, support break) before acting",
                  "Yes, but only after the next earnings report",
                  "No — divergence is fake",
                ],
                correctIndex: 1,
                explanation:
                  "Divergence is a heads-up that momentum is fading, not a timing trigger. Trends can grind on for weeks after divergence appears. Wait for price to actually do something — break a trendline, lose a support level, print a reversal candle. Combine the divergence warning with a real price trigger.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-strategies-q1",
                question:
                  "You want to sell a CSP on a stock you'd be happy to own. RSI sits at 28. Strike below current price aligns with a known support zone. What should you do?",
                options: [
                  "Wait — never sell puts on oversold stocks",
                  "Sell the put — oversold + support = rich premium and high probability the stock bounces",
                  "Buy the stock outright instead",
                  "Sell a covered call",
                ],
                correctIndex: 1,
                explanation:
                  "This is the textbook CSP entry. Oversold RSI inflates put premiums (fear pricing in), and the alignment with support gives you a level where buyers historically appear. You either keep a fat premium when it bounces or get assigned at a price you wanted anyway.",
              },
              {
                id: "rsi-strategies-q2",
                question:
                  "In a strong, trending bull market, what RSI range is typical for healthy pullbacks?",
                options: [
                  "RSI drops to 10-20",
                  "RSI bottoms around 40-50, not below",
                  "RSI must hit 0",
                  "RSI doesn't apply in trends",
                ],
                correctIndex: 1,
                explanation:
                  "Trends shift the RSI range. In a strong uptrend, RSI tends to bounce between 40-90 — pullbacks rarely take it below 40. So 40-50 in a bull market is functionally what 'oversold' means in that regime. Waiting for RSI 30 in a strong uptrend means you'll never enter.",
              },
            ],
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
    level: 1,
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
          {
            type: "callout",
            style: "tip",
            content:
              "**Worked example:** A daily candle opens at $100, hits a high of $108 intraday, drops to a low of $99, and closes at $101.\n\n• Body = $100 → $101 (small green body, $1 tall)\n• Upper wick = $101 → $108 (long, $7)\n• Lower wick = $99 → $100 (short, $1)\n\nThe story: buyers tried to push higher, got slammed back down by sellers, and barely held the open. A long upper wick like this near resistance is a bearish warning even though the candle technically closed green.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "candle-basics-q1",
                question:
                  "A daily candle opens at $50, closes at $48, with a high of $50.20 and a low of $46. What does the long lower wick tell you?",
                options: [
                  "Sellers were in complete control all day",
                  "Buyers stepped in at the low and pushed price back up before close",
                  "There was no trading activity in the middle of the day",
                  "Price gapped down from the previous day",
                ],
                correctIndex: 1,
                explanation:
                  "The candle reached $46 intraday but closed at $48 — that $2 lower wick shows buyers rejected the lower prices. The body is still red (close < open), so sellers won the day overall, but buyers showed up at $46. That rejection is the early signal worth watching.",
              },
              {
                id: "candle-basics-q2",
                question:
                  "Which candle shows the strongest bullish conviction?",
                options: [
                  "Small green body, long upper wick, long lower wick",
                  "Large green body, no wicks (close = high)",
                  "Doji with long wicks on both sides",
                  "Small red body with a long upper wick",
                ],
                correctIndex: 1,
                explanation:
                  "A large green body with no upper wick means buyers controlled the entire period and the close was the high. Sellers couldn't push price down at all. This is the textbook strong-conviction bullish candle — sometimes called a Marubozu.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "candle-single-q1",
                question:
                  "A stock has been trending up for two weeks. Today it prints a hammer-shaped candle. Should you call it a hammer?",
                options: [
                  "Yes — the shape is what defines the pattern",
                  "No — the same shape after an uptrend is a hanging man, a bearish warning",
                  "Yes, but only on the daily timeframe",
                  "It depends on the volume",
                ],
                correctIndex: 1,
                explanation:
                  "Same shape, opposite meaning depending on context. A hammer needs a preceding downtrend (rejection of lower prices = reversal). The same long-lower-wick candle after an uptrend is a hanging man — sellers are starting to test the rally. Pattern + location is what gives the candle meaning.",
              },
              {
                id: "candle-single-q2",
                question:
                  "Yesterday: large red candle from $100 → $95. Today: green candle that opens at $94 and closes at $101. Is this a bullish engulfing?",
                options: [
                  "No — today opened below yesterday's close, so it doesn't qualify",
                  "Yes — today's body ($94 → $101) completely engulfs yesterday's body ($100 → $95)",
                  "No — engulfing requires identical opens and closes",
                  "Yes, but only if volume doubled",
                ],
                correctIndex: 1,
                explanation:
                  "Bullish engulfing requires today's body to completely cover yesterday's body. Today's body spans $94 → $101, which fully wraps yesterday's $95 → $100 body. The opening below the prior close is normal and doesn't disqualify it — what matters is the body coverage.",
              },
              {
                id: "candle-single-q3",
                question:
                  "You see a textbook doji on a 1-minute chart of a thinly traded stock. How much weight should you give it?",
                options: [
                  "A lot — a doji always signals indecision",
                  "Very little — 1-minute candles on low volume are mostly noise",
                  "It's a strong reversal signal",
                  "Wait for two more dojis to confirm",
                ],
                correctIndex: 1,
                explanation:
                  "Pattern reliability scales with timeframe and volume. A daily doji on a heavily traded stock is meaningful. A 1-minute doji on thin volume is statistically indistinguishable from random noise. Stick to daily and weekly charts for pattern-based decisions.",
              },
            ],
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
          {
            type: "callout",
            style: "tip",
            content:
              "**Worked example — Morning Star on AAPL:**\n\n• Day 1: AAPL $180 → $172 large red candle (sellers in control, -4.4%)\n• Day 2: Opens at $171, closes at $171.50, tiny body (the indecision pivot)\n• Day 3: Opens at $172, closes at $178 large green candle (buyers seize control, +3.5%)\n\nDay 3's close at $178 is well into Day 1's body ($180 → $172). Three candles, three acts — exhaustion, indecision, reversal. If this happens at a known support level with rising volume on Day 3, that's an A+ setup for selling a put or buying calls.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "candle-multi-q1",
                question:
                  "A morning star pattern requires the third candle to close where, relative to the first candle?",
                options: [
                  "Above the first candle's high",
                  "Well into the first candle's body (recovering most of the loss)",
                  "Exactly at the first candle's open",
                  "Anywhere green will do",
                ],
                correctIndex: 1,
                explanation:
                  "The third candle's strength is what makes it a morning star. Closing well into the first candle's body shows buyers reclaimed most of the territory sellers took. A weak third candle that barely closes above the second's open isn't a true morning star — it's just three candles in a row.",
              },
              {
                id: "candle-multi-q2",
                question:
                  "Three Black Crows is the bearish mirror of which pattern?",
                options: [
                  "Morning Star",
                  "Three White Soldiers",
                  "Bearish Engulfing",
                  "Hanging Man",
                ],
                correctIndex: 1,
                explanation:
                  "Three Black Crows = three consecutive red candles with minimal lower wicks, showing sustained selling pressure. It's the direct mirror of Three White Soldiers (three consecutive green candles with minimal upper wicks) — same shape, opposite direction.",
              },
              {
                id: "candle-multi-q3",
                question:
                  "A bullish harami forms — small green candle inside the prior red candle's body. What follow-through would confirm the reversal?",
                options: [
                  "A green candle the next day that breaks above the harami's high",
                  "Another doji",
                  "A gap down at next open",
                  "Volume dropping by half",
                ],
                correctIndex: 0,
                explanation:
                  "Harami patterns are early warnings, not confirmations. A green follow-through candle that breaks above the harami's high is what tells you buyers are actually taking control. Without follow-through, the harami can fade — that's why it's considered weaker than engulfing or morning star.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "candle-context-q1",
                question:
                  "A bullish engulfing candle prints in the middle of a sideways range, no support nearby, RSI at 50, on average volume. How would you rate this signal?",
                options: [
                  "A+ setup — engulfing is always reliable",
                  "Mediocre — the pattern is there but the context is missing",
                  "Bearish — engulfing in a range means breakdown",
                  "Strong, because RSI at 50 is neutral",
                ],
                correctIndex: 1,
                explanation:
                  "Engulfing in the middle of a range with no confluence is just noise. The signal needs a meaningful level (support/resistance), supportive momentum (oversold RSI for bullish), and volume confirmation. Without those, you're trading the shape — and shapes alone are coin flips.",
              },
              {
                id: "candle-context-q2",
                question:
                  "Why do candle patterns work better on daily charts than on 5-minute charts for swing trading?",
                options: [
                  "Daily candles have more pixels in chart software",
                  "Higher timeframes filter noise and reflect more institutional participation",
                  "5-minute candles can't form patterns",
                  "Daily candles are required by the SEC",
                ],
                correctIndex: 1,
                explanation:
                  "Each daily candle aggregates 6.5 hours of price action — including institutional decisions, news reactions, and end-of-day positioning. Lower timeframes are dominated by algorithmic noise and small retail orders, so patterns there have much lower signal-to-noise.",
              },
              {
                id: "candle-context-q3",
                question:
                  "Triple confluence for a bullish reversal would include which three signals?",
                options: [
                  "MACD cross, golden cross, P/E ratio",
                  "Bullish candle pattern, key support level, oversold RSI",
                  "Volume spike, IV rank, earnings date",
                  "Delta, gamma, theta",
                ],
                correctIndex: 1,
                explanation:
                  "Triple confluence stacks three independent signals: a candle pattern showing real-time rejection, a horizontal support level showing historical demand, and oversold RSI showing momentum stretched to one extreme. When all three line up in the same direction, the win rate jumps materially.",
              },
            ],
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
    level: 1,
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
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Worked example — A+ CSP setup:**\n\nNVDA pulls back to $480, which is the 200-day EMA and a 3-touch horizontal support. RSI dips to 32. Today prints a hammer candle with a long lower wick that closes above the $480 level on heavy volume.\n\n• Level: ✓ ($480 support, multiple touches)\n• Momentum: ✓ (RSI 32 — oversold)\n• Confirmation candle: ✓ (hammer with rejection wick)\n\nSell a 30-DTE 0.30-delta put with strike at or just below $480. You're collecting fat premium (oversold IV expansion), at a level where buyers historically appear, with a candle telling you they're appearing right now. This is the setup TA + Greeks is built for.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ta-entry-q1",
                question:
                  "You want to sell a covered call. The stock is up 20% in 3 weeks, RSI is 78, and price has stalled at a known resistance level. What strike makes sense?",
                options: [
                  "ATM strike with high premium and high assignment risk",
                  "Strike at or just above the resistance level — paid for the cap, with TA-supported odds",
                  "Strike 50% above current price",
                  "Don't sell — wait for RSI to drop",
                ],
                correctIndex: 1,
                explanation:
                  "Resistance + overbought RSI = stock is likely to stall or pull back. A strike at the resistance level gives you a cushion (the level should hold), rich premium (overbought = high IV), and clear thinking about when you'd be assigned (only if it breaks the resistance, which is a real signal).",
              },
              {
                id: "ta-entry-q2",
                question:
                  "Stock hits support, but the only candles printing are red with no rejection wicks. What does that tell you about selling a put here?",
                options: [
                  "Sell the put immediately — support always holds",
                  "Wait — without a confirmation candle (hammer, engulfing, etc.), support might break",
                  "Buy the stock instead",
                  "Switch to a different ticker",
                ],
                correctIndex: 1,
                explanation:
                  "The candles are telling you in real-time that buyers haven't actually shown up yet. Support is a historical level, but the current candles say sellers are still in control. Wait for a rejection candle that proves buyers are stepping in — otherwise you're trusting a level that's about to fail.",
              },
            ],
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
          {
            type: "quiz",
            questions: [
              {
                id: "ta-synergy-q1",
                question:
                  "You have high confidence that a support level will hold. How does that affect your delta choice for a CSP?",
                options: [
                  "Sell a lower-delta (further OTM) put for safety",
                  "Sell a higher-delta (closer to ATM) put — your TA conviction justifies the larger premium",
                  "Delta doesn't matter when TA is involved",
                  "Always sell 0.16 delta regardless",
                ],
                correctIndex: 1,
                explanation:
                  "TA conviction translates directly into delta selection. If you genuinely believe the support level is strong (multiple touches, heavy volume, recent), you can sell a higher-delta put and collect more premium. Your TA analysis is the edge — delta is just how you size into it.",
              },
              {
                id: "ta-synergy-q2",
                question:
                  "A stock has been consolidating tightly for two weeks (low IV). You expect a breakout. What's the better play: sell options or buy options?",
                options: [
                  "Sell options — time decay works for you",
                  "Buy options — low IV means cheap premiums, and vega will expand on the breakout",
                  "Do nothing until after the breakout",
                  "Sell puts and calls both",
                ],
                correctIndex: 1,
                explanation:
                  "Consolidation compresses IV. Buying options before a breakout means you're long vega at cheap prices — if the breakout happens, IV expands and your options gain value from both the directional move AND the vega expansion. Selling options before a breakout is the wrong side: you're short vega right before it's about to increase.",
              },
              {
                id: "ta-synergy-q3",
                question:
                  "Your short put strike is at $100 — the same as a major support level — with 5 days to expiry. The stock is trading at $101. What should you be thinking?",
                options: [
                  "Perfect setup — support will hold and you'll keep premium",
                  "Maximum danger zone: gamma is extreme, one down day could put you deep ITM rapidly. Consider closing or rolling out.",
                  "Do nothing — theta will save you",
                  "Sell more puts to average in",
                ],
                correctIndex: 1,
                explanation:
                  "ATM + 5 DTE = maximum gamma. A single $2 move on $101 stock puts you $1 ITM. At major support levels, the stock can knife through on a fake-out before bouncing, and with 5 DTE your option has almost no time value left to absorb that move. This is when you manage risk — close or roll — not when you sit and hope.",
              },
            ],
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
  // ─── LEVEL 2: STRATEGY & SELECTION ────────────────────────────────────

  // ─── MODULE 13: LONG VS SHORT ──────────────────────────────────────────
  {
    id: "long-short",
    title: "Long vs Short — Trading Direction",
    subtitle: "Understand bullish and bearish bets before you size your first options trade",
    icon: "↕️",
    color: "sky-500",
    level: 2,
    lessons: [
      {
        id: "long-short-basics",
        title: "Long & Short Explained",
        subtitle: "What 'long' and 'short' really mean — and why it's not just about stocks",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**The two sides of every trade**\n\nEvery trade in the market has two sides. When someone buys a stock expecting it to rise, they are **long**. When someone profits if the stock falls, they are **short**. These terms apply to stocks, options, futures — everything.\n\n• **Long** = you own something and benefit if the price goes UP\n• **Short** = you've sold something you don't own and benefit if the price goes DOWN",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Long and short describe your DIRECTIONAL BIAS — not the size of your position. You can be 'long' with just 1 share or 1 option contract.",
          },
          {
            type: "visual",
            component: "long-short-diagram",
            props: {},
          },
          {
            type: "text",
            content:
              "**Real Example: AAPL at $175**\n\nIn November 2023, AAPL was trading around $175. If you believed Apple would rally into the holiday quarter:\n\n• **Long stock**: Buy 100 shares at $175 = $17,500 invested. If AAPL hits $185, you make $1,000.\n• **Long call**: Buy 1 AAPL $175 call for $3.50 = $350 invested. If AAPL hits $185, the call might be worth $10+ = $650+ profit on $350 invested (185% return).\n• **Short stock**: Borrow and sell 100 shares at $175. If AAPL falls to $165, you buy back for $16,500 = $1,000 profit. But if AAPL goes to $185, you LOSE $1,000.\n\nThe option gave you more leverage — but also more risk. The stock investor has unlimited upside. The short seller has unlimited downside.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Short selling stocks has UNLIMITED loss potential. If you short a $10 stock and it goes to $100, you lose $90/share. Options limit your loss to the premium paid — which is why many traders prefer buying puts instead of shorting stock.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ls-basics-q1",
                question: "You buy 1 TSLA $200 call option. What is your directional bias?",
                options: [
                  "Bearish — you profit if TSLA falls",
                  "Bullish — you profit if TSLA rises above $200 + premium",
                  "Neutral — calls don't have directional bias",
                  "It depends on the expiration date",
                ],
                correctIndex: 1,
                explanation:
                  "Buying a call option is a bullish trade. You profit if the stock rises above your strike price plus the premium paid. If you paid $5 for the $200 call, your breakeven is $205. Below that at expiration, you lose some or all of the $500 paid.",
              },
              {
                id: "ls-basics-q2",
                question: "A friend says 'I shorted SPY.' What happened when SPY went up 2% that day?",
                options: [
                  "They made 2% profit",
                  "They lost approximately 2% on their position",
                  "Nothing — short positions aren't affected by price changes",
                  "They made 4% because short positions are leveraged",
                ],
                correctIndex: 1,
                explanation:
                  "Short positions profit when the price FALLS. If SPY went UP 2%, the short seller lost approximately 2% on their position — they would need to buy back SPY at a higher price than they sold it.",
              },
            ],
          },
        ],
      },
      {
        id: "long-short-options",
        title: "Long & Short in Options",
        subtitle: "Four core positions — long call, short call, long put, short put",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**The four option positions**\n\nWith options, you can be long OR short on calls OR puts. This creates four combinations, each with a different directional view:\n\n• **Long Call** — Bullish. You buy the right to purchase stock at the strike. You profit if stock rises.\n• **Short Call** — Bearish (or neutral). You sell someone the right to buy. You profit if stock stays flat or falls.\n• **Long Put** — Bearish. You buy the right to sell stock at the strike. You profit if stock falls.\n• **Short Put** — Bullish (or neutral). You sell someone the right to sell. You profit if stock stays flat or rises.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Memory trick: Buying (long) = limited loss, unlimited-ish gain. Selling (short) = limited gain (the premium), potentially large loss. This is why sellers collect premium upfront — they take on the risk.",
          },
          {
            type: "text",
            content:
              "**Real Example: NVDA earnings (Feb 2024)**\n\nBefore NVDA's February 2024 earnings, IV was extremely high (IV rank ~90). The stock was at ~$625.\n\n• A **long call** buyer paid $40/contract for a $650 call. After earnings smashed expectations and NVDA jumped to $700+, the call was worth $80+. 100% gain.\n• A **short put** seller collected $30/contract for a $580 put. Since NVDA moved UP, the put expired worthless. The seller kept the $3,000 premium.\n• A **long put** buyer who paid $25 for a $600 put lost everything when the stock rallied hard.\n\nSame event, three very different outcomes based on direction AND whether you were buying or selling.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "long-call", showBreakeven: true },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ls-options-q1",
                question: "You sell a $150 AAPL put for $3.00. What is your maximum possible gain?",
                options: [
                  "Unlimited — the stock could fall to zero",
                  "$300 per contract — the premium you collected",
                  "$14,700 — the stock price minus the premium",
                  "It depends on delta",
                ],
                correctIndex: 1,
                explanation:
                  "When you sell a put, your maximum gain is the premium collected — in this case $300 per contract ($3.00 × 100 shares). The put can only expire worthless (your best case) or have intrinsic value (your loss). You can't make more than what you collected upfront.",
              },
            ],
          },
        ],
      },
      {
        id: "long-short-when",
        title: "When to Go Long vs Short",
        subtitle: "Practical signals for choosing your directional bias",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Picking your side**\n\nDeciding to go long or short is your most important decision. Get the direction wrong and no amount of smart options selection will save you. Here is a simple framework:\n\n**Go LONG (bullish) when:**\n• Stock is at or near support with evidence of buying\n• RSI is oversold (under 30) and reversing\n• Moving averages are trending upward (SMA50 > SMA200)\n• Positive news catalyst coming (earnings beat, product launch)\n• Sector is in favor (e.g., tech during AI boom)\n\n**Go SHORT (bearish) when:**\n• Stock is at resistance with evidence of selling\n• RSI is overbought (above 70) and reversing\n• Moving averages are trending downward (SMA50 < SMA200)\n• Negative catalyst (earnings miss, regulatory risk)\n• Sector rotation out of the industry",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The trend is your friend. Most profitable options trades align with the larger trend. Short-term mean reversion trades work too, but they are harder to time. When in doubt, trade WITH the trend.",
          },
          {
            type: "text",
            content:
              "**Real Example: META in 2022 vs 2023**\n\n**2022 — Bear case:**\nMETA fell from $340 to $88. The signs were clear: SMA50 crossed below SMA200 (death cross) in January 2022. RSI stayed in oversold territory repeatedly. Anyone buying long calls was crushed. The right trade: buy puts, sell covered calls, or sell calls against existing positions.\n\n**2023 — Bull case:**\nMETA recovered from $88 to $380. The reversal signal: stock bounced off multi-year lows, SMA50 crossed BACK above SMA200 (golden cross) in mid-2023. RSI recovered above 50. Long calls and bull call spreads were highly profitable.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "You don't need to be right about exact prices. You just need to be right about DIRECTION and TIMING. Options amplify correct directional bets. They also amplify mistakes — which is why risk management matters.",
          },
        ],
      },
    ],
  },

  // ─── MODULE 14: MOVING AVERAGES ──────────────────────────────────────
  {
    id: "moving-averages",
    title: "Moving Averages (SMA & EMA)",
    subtitle: "Trend-following indicators that help you stay on the right side of the market",
    icon: "📈",
    color: "violet-500",
    level: 2,
    lessons: [
      {
        id: "sma-basics",
        title: "What is a Moving Average?",
        subtitle: "Smoothing out price noise to see the underlying trend",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**The noise problem**\n\nStock prices are noisy. On any given day, a stock might swing 2-3% for no fundamental reason — algorithmic rebalancing, options expiration, index reweighting. This noise makes it hard to see what's actually happening with the underlying trend.\n\n**Moving averages solve this.** They take the average price over a rolling window — the last 20 days, or 50 days, or 200 days — and smooth out the noise. The result is a cleaner line that shows the direction of the trend.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "SMA (Simple Moving Average): the average closing price over the last N days, updated each day. When price > SMA, the stock is in an uptrend. When price < SMA, it's in a downtrend.",
          },
          {
            type: "visual",
            component: "sma-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**The three key SMAs traders watch:**\n\n• **SMA20** — 20-day average. Shows short-term trend. Fast-moving. Used for day trading and swing trades.\n• **SMA50** — 50-day average. Medium-term trend. The most commonly watched institutional level. Bounce off SMA50 = high-probability support.\n• **SMA200** — 200-day average. Long-term trend. The master trend indicator. Stocks above SMA200 = bull territory. Below = bear territory.\n\n**Real example: SPY (S&P 500 ETF)**\n\nSPY's SMA200 at ~$440 in late 2023 was the key dividing line between bull and bear markets. Every dip to the SMA200 in the 2023 rally was a buying opportunity. The SMA200 held as support four separate times before the market broke higher.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sma-basics-q1",
                question: "AAPL has been above its SMA200 for 3 months. What does this suggest?",
                options: [
                  "AAPL is in a long-term uptrend",
                  "AAPL is in a long-term downtrend",
                  "AAPL is exactly at fair value",
                  "Moving averages don't work on individual stocks",
                ],
                correctIndex: 0,
                explanation:
                  "When a stock stays above its SMA200 for an extended period, it signals a long-term uptrend. The SMA200 acts as dynamic support — institutional buyers often step in when price dips toward this level. Being above SMA200 is a prerequisite for many institutional buy programs.",
              },
            ],
          },
        ],
      },
      {
        id: "sma-signals",
        title: "The Golden Cross & Death Cross",
        subtitle: "The two most powerful SMA crossover signals in trading",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**SMA crossovers as trend change signals**\n\nWhen two moving averages cross, it signals a potential trend change. The most famous crossovers involve the SMA50 and SMA200:\n\n**Golden Cross:** SMA50 crosses ABOVE SMA200\n→ Signals a shift from bear to bull trend\n→ Historically, a strong buy signal for long-term bullish bets\n\n**Death Cross:** SMA50 crosses BELOW SMA200\n→ Signals a shift from bull to bear trend\n→ Warning sign: consider defensive positions or puts",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Real-world Golden Cross example: SPY's Golden Cross in February 2023, after the 2022 bear market. SMA50 crossed back above SMA200. SPY went from ~$400 to $480+ over the next 12 months. Long calls on SPY after the golden cross were very profitable.",
          },
          {
            type: "text",
            content:
              "**EMA vs SMA — what's the difference?**\n\n**EMA (Exponential Moving Average)** gives more weight to recent prices. It reacts faster to price changes than SMA.\n\n• **SMA20**: treats every day in the last 20 equally\n• **EMA20**: recent days count more than older days\n\nFor **options trading**, both work. Most professional options traders use EMA for shorter-term (20-day) signals and SMA for longer-term (50/200-day) trend identification.\n\n**When to use each:**\n• Day/swing trading: EMA12, EMA26 (these are also what power MACD)\n• Position sizing decisions: SMA50, SMA200\n• Identifying overall market regime: SMA200",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sma-signals-q1",
                question: "TSLA's SMA50 just crossed below its SMA200. What signal does this send?",
                options: [
                  "Golden cross — buy calls aggressively",
                  "Death cross — be cautious on long positions, consider puts",
                  "No meaningful signal — crossovers are random",
                  "A signal to buy puts immediately with max leverage",
                ],
                correctIndex: 1,
                explanation:
                  "SMA50 crossing below SMA200 is a death cross — a bearish signal suggesting the medium-term trend has turned down relative to the long-term trend. This doesn't mean crash immediately, but it suggests being cautious with bullish positions and potentially favoring put protection or lower delta calls. Note: death crosses sometimes produce whipsaws, so always combine with other signals.",
              },
            ],
          },
        ],
      },
      {
        id: "sma-options",
        title: "Using SMAs to Time Options Trades",
        subtitle: "Specific entry rules: when SMA levels create high-probability options setups",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**SMAs as options entry triggers**\n\nMoving averages are not just academic — they generate specific, actionable options trade signals:\n\n**Setup 1: Bounce off SMA50 (high probability)**\nWhen a stock in an uptrend pulls back to its SMA50 and shows signs of bouncing (reversal candle, volume confirmation):\n→ BUY calls 30-45 DTE, delta 0.40-0.60\n→ Example: AAPL at SMA50 in July 2023, bounced from $178 to $195 in 3 weeks\n\n**Setup 2: Bounce off SMA200 (highest conviction)**\nWhen the broader market or a key stock touches SMA200 and holds:\n→ BUY call spreads for defined risk\n→ Example: SPY touching SMA200 in October 2023, then rallying 12% in 6 weeks\n\n**Setup 3: Selling premium near SMA resistance**\nWhen a stock in a downtrend rallies up to its SMA50 (now acting as resistance):\n→ SELL covered calls at or slightly above SMA50\n→ Or SELL call credit spreads at the SMA50 level",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "SMA levels create self-fulfilling prophecies. Millions of traders watch the same levels. Institutional algorithms are programmed to buy at SMA50/SMA200. This shared attention makes these levels more reliable than random price points.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "SMAs lag price. They are based on past data. During fast breakdowns (like March 2020), the SMA200 doesn't protect you. Always combine SMA signals with RSI, volume, and broader market context.",
          },
        ],
      },
    ],
  },

  // ─── MODULE 15: MACD ─────────────────────────────────────────────────
  {
    id: "macd",
    title: "MACD — Momentum Decoded",
    subtitle: "Catch trend changes before they're obvious using the most popular momentum indicator",
    icon: "⚡",
    color: "fuchsia-500",
    level: 2,
    lessons: [
      {
        id: "macd-basics",
        title: "What MACD Measures",
        subtitle: "The gap between two moving averages — and why that gap matters",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**MACD = Moving Average Convergence Divergence**\n\nMACD is built from three components:\n\n• **MACD Line** = EMA12 minus EMA26 (the difference between fast and slow averages)\n• **Signal Line** = 9-period EMA of the MACD line (a smoothed version of MACD)\n• **Histogram** = MACD minus Signal (shows momentum strength visually)\n\nWhen the fast EMA (12-day) is above the slow EMA (26-day), MACD is positive — momentum is bullish. When MACD is negative — momentum is bearish.\n\nThe MAGIC is in the crossover: when MACD crosses above the Signal line, a bullish momentum shift is happening. When MACD crosses below Signal, bearish momentum is building.",
          },
          {
            type: "visual",
            component: "macd-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**Real Example: AAPL earnings setup (Q1 2024)**\n\nBefore Apple's February 2024 earnings, MACD was showing bearish divergence — price made a new high but MACD didn't confirm it. This was a warning sign. AAPL dropped 5% after earnings. Traders watching MACD had early warning to reduce call exposure or buy put protection before the event.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "macd-basics-q1",
                question: "The MACD line just crossed ABOVE the signal line from below. What does this typically indicate?",
                options: [
                  "Bearish momentum building — consider puts",
                  "Bullish momentum shift — consider calls",
                  "Volatility is about to spike — buy straddles",
                  "The stock is at fair value",
                ],
                correctIndex: 1,
                explanation:
                  "When the MACD line crosses above the signal line, it means the short-term average (EMA12) is accelerating faster than the longer-term signal. This is a bullish momentum signal — upward price momentum is building. Many traders use this as a trigger to enter bullish positions or buy calls.",
              },
            ],
          },
        ],
      },
      {
        id: "macd-options",
        title: "MACD for Options Entry & Exit",
        subtitle: "Translate MACD signals into specific options trade decisions",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**MACD → Options trades**\n\n**Bullish MACD cross (MACD > Signal, turning positive):**\n→ Buy calls 30-45 DTE, delta 0.45-0.60\n→ Example: SPY MACD bullish cross in January 2023 → rally from $380 to $420\n\n**Bearish MACD cross (MACD < Signal, turning negative):**\n→ Buy puts OR sell covered calls against existing positions\n→ Example: QQQ MACD bearish cross in July 2023 signaled a 7% pullback\n\n**MACD Divergence (most powerful signal):**\n→ Price makes new high, MACD does NOT → bearish divergence → fade the move\n→ Price makes new low, MACD does NOT → bullish divergence → look for reversal\n\n**Histogram expanding:**\n→ Momentum strengthening → trend continuation likely → let winning trades run\n\n**Histogram shrinking/flipping:**\n→ Momentum fading → consider taking profits or reducing position size",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "MACD works best on daily charts for options trading. Using MACD on 5-minute charts produces too many false signals. For longer-dated options (45-90 DTE), weekly MACD can confirm the bigger trend direction.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "macd-options-q1",
                question: "TSLA's price just hit a 3-month high, but MACD is making a lower high than its previous peak. What's this called, and what should you consider?",
                options: [
                  "A golden cross — time to buy more calls",
                  "Bearish MACD divergence — the rally may be running out of steam, consider reducing call exposure",
                  "A death cross — close all positions immediately",
                  "A bullish signal — MACD always lags price",
                ],
                correctIndex: 1,
                explanation:
                  "This is classic bearish MACD divergence — price is making new highs but momentum (MACD) is not confirming the move. This often precedes a reversal or at minimum a slowdown. It doesn't mean sell everything immediately, but it's a warning to reduce risk: tighten stops, take partial profits on calls, or add some put protection.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 16: BOLLINGER BANDS ───────────────────────────────────────
  {
    id: "bollinger-bands",
    title: "Bollinger Bands",
    subtitle: "Volatility-based bands that reveal when options are cheap or expensive",
    icon: "〰️",
    color: "pink-500",
    level: 2,
    lessons: [
      {
        id: "bb-basics",
        title: "Reading Bollinger Bands",
        subtitle: "Price channels built from standard deviation — a visual IV gauge",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**What are Bollinger Bands?**\n\nBollinger Bands are three lines plotted on a price chart:\n\n• **Middle Band** = SMA20 (20-day simple moving average)\n• **Upper Band** = SMA20 + (2 × standard deviation)\n• **Lower Band** = SMA20 − (2 × standard deviation)\n\nThe bands expand when volatility is high (price swings are large) and contract when volatility is low (price is range-bound). Statistically, price stays within the bands about 95% of the time.\n\n**The key insight for options traders:** Band width = implied volatility proxy. Wide bands = expensive options. Narrow bands (squeeze) = cheap options.",
          },
          {
            type: "visual",
            component: "bollinger-bands-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**Real Example: AAPL Bollinger Squeeze before iPhone launches**\n\nBefore major Apple events (iPhone announcements, WWDC), AAPL often enters a Bollinger Squeeze — the bands tighten as price consolidates. This has historically preceded a significant move in either direction. Options traders who recognize the squeeze can buy straddles or strangles (bets on a big move) before the bands expand.\n\n**Example:** August 2023, AAPL Bollinger Bands squeezed for 3 weeks before the iPhone 15 event. After the announcement, AAPL moved 4-6%. A straddle purchased during the squeeze (when IV was low) profited from the expansion.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "bb-basics-q1",
                question: "Bollinger Bands on NVDA have been very wide for 2 weeks (2x their normal width). What does this tell you about options pricing?",
                options: [
                  "Options are cheap — good time to buy calls or puts",
                  "Options are expensive — IV is elevated, better to sell premium",
                  "Band width doesn't correlate with options pricing",
                  "NVDA stock is overvalued and will crash",
                ],
                correctIndex: 1,
                explanation:
                  "Wide Bollinger Bands indicate high realized volatility, which typically means implied volatility (and therefore options prices) are also elevated. When options are expensive, selling premium (covered calls, cash-secured puts, iron condors) is more attractive than buying. You collect more premium and benefit from IV mean reversion.",
              },
            ],
          },
        ],
      },
      {
        id: "bb-options",
        title: "Bollinger Bands + Options Strategy",
        subtitle: "Squeeze = buy options. Wide bands = sell options. Here's how.",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Connecting Bollinger Bands to options strategy**\n\n**Bollinger Squeeze → BUY options (straddle, strangle, or directional):**\n• Bands narrow to historically low width\n• Low IV = cheap options\n• A big move is coming (you don't know which direction)\n• Strategy: Buy a straddle (ATM call + ATM put) or wait for a directional signal then buy calls/puts\n• Example: SPY squeeze in October 2023 before the Fed meeting → straddle captured a 3% move\n\n**Wide Bands → SELL options:**\n• Bands at historically high width\n• High IV = expensive options (you collect more premium)\n• Stock is likely to mean-revert (slow down its moves)\n• Strategy: Sell covered calls, cash-secured puts, or iron condors\n• Example: After TSLA earnings 2023, IV spiked, bands expanded. IV crush the next day killed option buyers but rewarded sellers.\n\n**Band Touches:**\n• Price touches upper band repeatedly without closing above = resistance forming → consider bearish positions\n• Price touches lower band repeatedly without closing below = support forming → consider bullish positions",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Bollinger Bands are the visual equivalent of IV rank. Squeeze = low IV rank (buy options). Wide bands = high IV rank (sell options). When you understand this connection, you're thinking like a professional options trader.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "The Bollinger Squeeze Signal: When the bands are at their narrowest in 6 months AND you see a directional breakout (confirmed by RSI or MACD), that's a high-conviction entry. Buy options in the direction of the breakout.",
          },
        ],
      },
    ],
  },

  // ─── MODULE 17: IV RANK ───────────────────────────────────────────────
  {
    id: "iv-rank",
    title: "IV Rank — When to Buy vs Sell",
    subtitle: "The single most important number for deciding your options strategy",
    icon: "🎯",
    color: "green-500",
    level: 2,
    lessons: [
      {
        id: "iv-rank-basics",
        title: "Understanding IV Rank",
        subtitle: "Are options cheap or expensive right now? IV rank tells you in one number.",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Implied Volatility vs IV Rank**\n\nImplied Volatility (IV) tells you the market's expected move. But a 40% IV on TSLA might be low for TSLA while the same 40% IV on AAPL might be very high for AAPL.\n\nThis is why **IV Rank** exists. IV Rank compares today's IV to its own history over the past 52 weeks:\n\n**IV Rank = (Current IV − 52-week low IV) / (52-week high IV − 52-week low IV) × 100**\n\nResult: 0-100 scale.\n• **IV Rank 0-25**: Options are historically CHEAP → Buy options\n• **IV Rank 25-75**: Options are fairly priced → Depends on direction\n• **IV Rank 75-100**: Options are historically EXPENSIVE → Sell options",
          },
          {
            type: "interactive",
            component: "iv-rank-gauge",
            props: {},
          },
          {
            type: "text",
            content:
              "**Real Examples:**\n\n• **TSLA, August 2023 (IV Rank ~82):** TSLA had a big earnings miss and the stock crashed. IV spiked to multi-month highs. IV rank hit 82. Selling puts (premium selling) was the right play as the stock stabilized and IV crushed back to normal. A $250 put sold at $12/contract was worth $3 a week later (75% profit in 7 days).\n\n• **AAPL, October 2023 (IV Rank ~18):** Before a product announcement, AAPL's IV was historically low. IV rank was just 18. Buying calls was the right play since options were cheap. A $175 call for $2.50 went to $8 in 10 days (220% return) as both the stock moved and IV expanded.\n\n• **SPY, Flat market October 2024 (IV Rank ~45):** SPY's IV rank at 45 is neutral territory. No strong edge for buyers or sellers. Focus on directional conviction rather than IV edge.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "IV Rank is the most important number you look at before placing an options trade. Low IV rank → buy options (premium is cheap). High IV rank → sell options (premium is rich, and IV tends to mean-revert).",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ivr-basics-q1",
                question: "NVDA has an IV Rank of 88 today after a big earnings move. Which strategy makes more sense?",
                options: [
                  "Buy calls — the stock just moved big, more upside coming",
                  "Sell a cash-secured put — IV is historically high, premium is rich",
                  "Buy a straddle — high IV means more movement ahead",
                  "Avoid options entirely when IV rank is high",
                ],
                correctIndex: 1,
                explanation:
                  "With IV Rank at 88, options are historically expensive. Implied volatility tends to mean-revert (fall back to average levels) after spikes, causing IV crush. Selling premium (like a cash-secured put) takes advantage of this: you collect inflated premium and profit as IV drops back to normal. Buying options when IV rank is high is usually a losing strategy because even if the stock moves right, the IV crush can offset your gains.",
              },
            ],
          },
        ],
      },
      {
        id: "iv-rank-strategy",
        title: "Building Strategy Around IV Rank",
        subtitle: "The complete buy-vs-sell decision tree using IV rank as your anchor",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**The IV-Strategy Matrix**\n\nCombine IV Rank with your directional view to pick the right strategy:\n\n**Bullish + Low IV Rank (<30):**\n→ Buy calls or bull call spreads\n→ Options are cheap, limited risk on defined cost\n→ Best case: stock rises AND IV expands (double profit)\n\n**Bullish + High IV Rank (>70):**\n→ Sell cash-secured puts OR sell put spreads\n→ Collect rich premium, benefit from IV crush\n→ You want the stock to stay flat or go higher\n\n**Bearish + Low IV Rank (<30):**\n→ Buy puts\n→ Options are cheap, limited cost to bet on decline\n\n**Bearish + High IV Rank (>70):**\n→ Sell covered calls OR sell call spreads\n→ Collect rich premium from elevated IV\n\n**Neutral + High IV Rank (>70):**\n→ Iron condor or strangle\n→ Profit from IV crush + range-bound stock movement",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "IV Rank doesn't tell you direction. A stock can have IV Rank 90 and still move 30% in one direction. Always combine IV rank with directional analysis (SMA, RSI, support/resistance) before placing a trade.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ivr-strategy-q1",
                question: "You're bullish on META and IV Rank is 15 (historically cheap). Which trade structure is most appropriate?",
                options: [
                  "Sell a covered call — collect premium while bullish",
                  "Buy a call or bull call spread — options are cheap, limited risk with defined upside",
                  "Sell a put spread — high premium collection opportunity",
                  "Buy an iron condor — capture the range",
                ],
                correctIndex: 1,
                explanation:
                  "With low IV Rank (15), options are historically cheap. When you're bullish AND options are cheap, buying calls or bull call spreads is the right play. You're getting levered upside exposure for a low price. Selling premium (covered calls, put spreads) makes sense when IV is HIGH — not when it's low, because you'd be collecting minimal premium for the risk taken.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE 18: OPTIONS ENTRY FRAMEWORK ──────────────────────────────
  {
    id: "entry-framework",
    title: "The Options Entry Framework",
    subtitle: "Combine RSI, moving averages, IV rank, and P&L structure into one decision system",
    icon: "🗺️",
    color: "red-500",
    level: 2,
    lessons: [
      {
        id: "ef-signals",
        title: "Signal Stacking — When Stars Align",
        subtitle: "The best trades have multiple indicators pointing the same direction",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**The signal stacking approach**\n\nNo single indicator is reliable in isolation. RSI can stay overbought for weeks. SMA50 bounces can fail. MACD crossovers produce false signals. The edge comes from **stacking multiple signals in the same direction**.\n\n**A high-conviction bullish setup requires 3+ signals:**\n1. Stock above SMA200 (in bull territory) ✓\n2. RSI recovering from below 40, now rising ✓\n3. MACD turning bullish (crossover or positive histogram) ✓\n4. Price at or near support (SMA50, prior resistance turned support) ✓\n5. IV Rank low (<30) — options are cheap ✓\n\nWhen 4-5 of these align, you have a high-probability trade setup.\n\n**Real Example: SPY October 2023**\nSPY touched SMA200 → RSI was at 38 (recovering from oversold) → MACD histogram went from negative to positive → IV rank at 28 (options cheap). All four signals aligned. SPY rallied 12% over the next 6 weeks.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Signal stacking is not about waiting for perfection. 3 of 5 signals is usually enough. 4 of 5 is exceptional. 5 of 5 is rare and you should size up when it happens.",
          },
          {
            type: "text",
            content:
              "**A high-conviction bearish setup requires 3+ signals:**\n1. Stock below SMA200 (in bear territory) ✓\n2. RSI above 65 and rolling over (overbought and fading) ✓\n3. MACD bearish crossover or negative histogram expanding ✓\n4. Price at or near resistance (SMA50, prior support turned resistance) ✓\n5. IV Rank low (<30) — puts are cheap ✓\n\n**Real Example: TSLA early 2022**\nTSLA broke below SMA200 → RSI bounced to 65 at the SMA200 (resistance) and rolled → MACD crossed below signal → IV rank at 22 (puts cheap). The signal stack said: buy puts. TSLA fell from $800 to $300 over the next 12 months.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ef-signals-q1",
                question: "A stock is above SMA200, RSI is at 32 (recovering), MACD just crossed bullish, and IV rank is 20. What's the quality of this setup?",
                options: [
                  "Poor — RSI at 32 means the stock is collapsing",
                  "Moderate — only one signal is bullish",
                  "High-conviction bullish — 4 signals are stacked in the same direction",
                  "Cannot determine quality without knowing the stock name",
                ],
                correctIndex: 2,
                explanation:
                  "This is a high-conviction bullish setup with 4 signals aligned: (1) above SMA200 = bull territory, (2) RSI at 32 recovering from oversold = mean reversion buy signal, (3) MACD bullish crossover = momentum confirmation, (4) low IV rank = cheap options. This is exactly the type of setup to size up on with long calls or bull call spreads.",
              },
            ],
          },
        ],
      },
      {
        id: "ef-decision-tree",
        title: "The Decision Tree",
        subtitle: "A step-by-step system for choosing the right trade every time",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "**The 5-question trade decision framework**\n\nBefore placing any options trade, answer these five questions in order:\n\n**Q1: What is the trend? (SMA200)**\n→ Stock above SMA200 = bull bias\n→ Stock below SMA200 = bear bias\n→ Stock at SMA200 = wait for resolution\n\n**Q2: What is momentum doing? (MACD)**\n→ MACD positive and rising = bull momentum\n→ MACD negative and falling = bear momentum\n→ MACD flat/crossover zone = be cautious\n\n**Q3: What is the near-term entry quality? (RSI)**\n→ RSI < 35 in a bull trend = high-quality long entry (oversold dip)\n→ RSI > 65 in a bear trend = high-quality short entry (overbought bounce)\n→ RSI 40-60 = mid-range, momentum direction matters more\n\n**Q4: Are we at a key level? (Support/Resistance)**\n→ At support in bull trend = buy signal\n→ At resistance in bear trend = sell signal\n→ No nearby level = wait\n\n**Q5: Are options cheap or expensive? (IV Rank)**\n→ IV Rank < 30 = buy options (calls or puts)\n→ IV Rank > 70 = sell options (covered calls, puts, condors)\n→ IV Rank 30-70 = use defined-risk spreads",
          },
          {
            type: "interactive",
            component: "decision-tree-widget",
            props: {},
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Write down your answers to these 5 questions before every trade. If you can't answer at least 4 of them clearly, you don't have enough conviction. Wait for a better setup.",
          },
        ],
      },
      {
        id: "ef-real-trades",
        title: "Real Trade Walkthroughs",
        subtitle: "Three complete trade examples using the full framework — SPY, NVDA, TSLA",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**Trade 1: SPY Bull Call Spread (October 2023)**\n\nQ1 Trend: SPY touched SMA200 and held → bullish signal ✓\nQ2 Momentum: MACD histogram turned green after being negative for 3 weeks ✓\nQ3 Entry quality: RSI at 36, recovering from oversold → strong dip buy ✓\nQ4 Level: SMA200 = strong multi-year support ✓\nQ5 IV Rank: 28 (cheap options) → buy options, not sell ✓\n\n**Trade:** Buy SPY $430/$440 bull call spread (30 DTE) for $2.80\n**Result:** SPY rallied from $418 to $455 in 6 weeks. Spread expired worth $10. Return: 257%.\n\n---\n\n**Trade 2: NVDA Covered Call (February 2024)**\n\nQ1 Trend: NVDA above SMA200, strong uptrend ✓\nQ2 Momentum: MACD positive but histogram shrinking → momentum slowing\nQ3 Entry quality: RSI at 78 (overbought) → stock due for pause\nQ4 Level: NVDA at prior resistance at $650\nQ5 IV Rank: 75 (expensive options) → sell options ✓\n\n**Trade:** Sell NVDA $700 covered call (21 DTE) for $18/contract\n**Result:** NVDA stayed below $700 for 3 weeks. Call expired worthless. $1,800 premium collected per 100 shares.\n\n---\n\n**Trade 3: TSLA Long Put (January 2024)**\n\nQ1 Trend: TSLA below SMA200 after failing to reclaim it → bearish ✓\nQ2 Momentum: MACD negative and accelerating downward ✓\nQ3 Entry quality: RSI at 62 (bounced to resistance zone, rolling over) ✓\nQ4 Level: TSLA at SMA50 which is below SMA200 → resistance, not support ✓\nQ5 IV Rank: 22 (cheap options) → buy puts ✓\n\n**Trade:** Buy TSLA $220 put (45 DTE) for $8.50\n**Result:** TSLA fell from $250 to $180 over 5 weeks. Put went from $8.50 to $42. Return: 394%.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "These are historical examples. Past performance doesn't guarantee future results. The framework improves your odds, but no system wins 100% of the time. Use defined risk trades (spreads, long options) to limit downside on trades that don't work out.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ef-trades-q1",
                question: "You're analyzing QQQ: above SMA200, RSI at 45, MACD neutral, no nearby support/resistance, IV rank at 55. What should you do?",
                options: [
                  "Buy calls immediately — QQQ is in a bull trend",
                  "Sell puts — IV rank above 50 is high enough",
                  "Wait — only 1-2 signals are present, not enough conviction for a trade",
                  "Buy an iron condor — neutral RSI means range-bound",
                ],
                correctIndex: 2,
                explanation:
                  "This setup has only one clear signal (above SMA200). RSI is neutral (45), MACD is neutral, there's no key level, and IV rank at 55 doesn't clearly favor buyers or sellers. The best trade is no trade — waiting for more signals to align. Forcing a trade in a low-signal environment is how traders lose money to commissions and bad timing. Patience is a skill.",
              },
              {
                id: "ef-trades-q2",
                question: "AAPL reports earnings next week. IV rank is currently 82. You're mildly bullish. What's the best strategy?",
                options: [
                  "Buy calls — you're bullish so calls make sense",
                  "Sell a put spread (bull put spread) — collect rich premium, profit if AAPL stays flat or rises",
                  "Buy a straddle — earnings = big move",
                  "Do nothing — never trade during earnings",
                ],
                correctIndex: 1,
                explanation:
                  "With IV rank at 82, options are very expensive — premium sellers have the edge. You're mildly bullish, so a bull put spread (selling a put, buying a lower-strike put for protection) lets you: (1) collect rich premium from the high IV, (2) profit if AAPL goes up OR stays flat, and (3) benefit from IV crush after earnings. Buying calls at IV rank 82 is dangerous — even if you're right about direction, IV crush after earnings can wipe out your gains.",
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
