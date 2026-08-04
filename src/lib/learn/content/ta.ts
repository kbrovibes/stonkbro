import type { Module } from "@/lib/learn/curriculum";

export const TA_MODULES: Module[] = [
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

  // ─── MODULE 10: RSI & MOMENTUM ──────────────────────────────────────,
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

  // ─── MODULE 11: CANDLESTICK PATTERNS ────────────────────────────────,
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

  // ─── MODULE 12: TA + GREEKS MASTERY ─────────────────────────────────,
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

  // ─── MODULE 13: LONG VS SHORT ──────────────────────────────────────────,
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

  // ─── MODULE 14: MOVING AVERAGES ──────────────────────────────────────,
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

  // ─── MODULE 15: MACD ─────────────────────────────────────────────────,
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

  // ─── MODULE 16: BOLLINGER BANDS ───────────────────────────────────────,
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

  // ─── MODULE 17: IV RANK ───────────────────────────────────────────────,
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

  // ─── MODULE 18: OPTIONS ENTRY FRAMEWORK ──────────────────────────────,
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
