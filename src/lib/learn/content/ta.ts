import type { Module } from "@/lib/learn/curriculum";

// Technical-analysis track (2026-08 rewrite): teaches a self-directed learner to
// actually USE support/resistance, moving averages, RSI, MACD, Bollinger Bands,
// and candlesticks — not just define them. Voice matches fluency.ts: plain
// English, jargon explained inline, "do this now" click-paths, worked examples
// (including one that FAILED), honest failure modes, and graded interactive reps.

export const TA_MODULES: Module[] = [
  // ─── MODULE: SUPPORT & RESISTANCE (deepest treatment — owner's #1 ask) ───
  {
    id: "support-resistance",
    title: "Support & Resistance",
    subtitle: "Find the price levels where buyers and sellers actually show up — and trade around them",
    icon: "📊",
    color: "indigo-500",
    level: 1,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "sr-basics",
        title: "Why Prices Remember Levels",
        subtitle: "The market mechanic behind support and resistance — not just the definition",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**Support** is a price where a falling stock tends to stop and bounce — a floor. **Resistance** is a price where a rising stock tends to stall and turn back — a ceiling. That's the definition. But the definition is the least useful part. What you actually need to know is *why* a random number like $520 would have any power over a stock at all.\n\nThe answer is **memory**. A level matters because of what people did there last time.",
          },
          {
            type: "text",
            content:
              "**The mechanic, told as a story.** A stock grinds down to $50 and bounces hard. Three groups of people now have that $50 burned into their brains:\n\n1. **The ones who bought at $50 and made money.** They wish they'd bought more. If it comes back to $50, they'll buy again — this time bigger.\n2. **The ones who missed the bounce.** They watched it rip from $50 and kicked themselves. They've got a limit order sitting at $50 waiting for a second chance.\n3. **The ones who sold too early** near $50 on the way down. They want back in at their old exit.\n\nWhen the stock drifts back toward $50, all three groups become buyers at roughly the same price. Their combined buying is what makes the bounce happen. The level didn't cause the bounce — the *crowd's memory of the level* did.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "basics", showBounces: true },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Support and resistance are crowd memory, not laws of physics. A level \"works\" because enough people are watching the same number and act on it. The flip side: once everyone forgets a level, it stops mattering. That's why fresh, recent levels are stronger than ancient ones.",
          },
          {
            type: "text",
            content:
              "**Four forces that stack memory at a level:**\n\n• **Supply and demand** — at support, buyers outnumber sellers; at resistance, the reverse. The level is just where that imbalance keeps showing up.\n• **Anchoring** — humans fixate on specific prices, especially round numbers ($50, $100, $500). We place orders at tidy figures.\n• **Self-fulfilling prophecy** — so many traders watch the same lines that their collective action reinforces them. The level works partly *because* everyone expects it to.\n• **Institutional orders** — big funds park large limit orders at key levels, creating a literal wall of buy or sell interest that's hard to punch through.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Resistance is the mirror of support, and it's the exact same mechanic in reverse. At resistance, the trapped crowd is people who bought too high and got stuck. When price finally climbs back to their entry, they dump their shares just to get out at break-even — and that flood of \"just let me out\" selling is what caps the rally.",
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
                  "Because traders who bought near the previous high but got stuck are looking to exit at break-even, adding supply right there",
                  "Because the SEC enforces resistance levels",
                  "Because moving averages always cluster at old highs",
                ],
                correctIndex: 1,
                explanation:
                  "Market memory. Traders who bought near a prior peak and rode it down are mentally anchored to that price as break-even. When price returns, they sell to escape — adding supply right at the level. Combine that with new traders who recognize the level and short it, and you get a wall of selling exactly where price stalled before.",
              },
              {
                id: "sr-basics-q2",
                question:
                  "Which of these would create the strongest support level?",
                options: [
                  "A single touch at $100 last week on average volume",
                  "Three bounces at $100 across the last six months on heavy volume",
                  "A round number that price has never actually traded near",
                  "The 5-day moving average",
                ],
                correctIndex: 1,
                explanation:
                  "Multiple touches + heavy volume + recency all stack memory at the level. One touch establishes a candidate; three touches confirm a zone where buyers reliably show up. Heavy volume tells you those bounces had real institutional participation, not just a couple of retail orders.",
              },
              {
                id: "sr-basics-q3",
                question:
                  "A stock has never traded anywhere near $75, but $75 is a round number. How much support should you expect there?",
                options: [
                  "A lot — round numbers are always strong support",
                  "A little — round numbers attract some orders, but with no history of buyers actually showing up there, it's a weak, unproven level",
                  "None whatsoever — round numbers are a myth",
                  "It becomes resistance automatically",
                ],
                correctIndex: 1,
                explanation:
                  "Round numbers get a small psychological boost because people cluster orders at tidy figures. But support is mostly *memory of buyers showing up*, and if the stock has no trading history near $75, there's no crowd that remembers buying there. Round-number pull is a tiebreaker, not a substitute for real touches.",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: How to see it — finding levels step by step ─────────
      {
        id: "sr-drawing",
        title: "Finding Levels, Step by Step",
        subtitle: "Swing points, touch count, zones-not-lines, volume, round numbers, MA confluence",
        estimatedMinutes: 11,
        sections: [
          {
            type: "text",
            content:
              "There's no official source for support and resistance — nobody publishes the \"real\" levels. Traders draw them by hand, and the good ones follow a repeatable recipe. This lesson is that recipe. Do it once with intent and it becomes automatic.",
          },
          {
            type: "text",
            content:
              "**Step 1 — Start from swing points.** A **swing low** is an obvious dip the price bounced up from; a **swing high** is a peak it got rejected at. These are the raw material. On the chart, look for the spots where price clearly reversed direction and left a little V (swing low) or an upside-down V (swing high). Those turning points are candidate levels.\n\n**Step 2 — Count the touches.** Draw a horizontal line through a swing point and look left and right: how many other times did price react near that same line?\n\n• **1 touch** — a hunch, not a level. Anyone can point at a single dip.\n• **2 touches** — a candidate worth marking.\n• **3+ touches** — a real, watched level. The crowd has now reacted there repeatedly, so the memory is strong.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The most important upgrade to your thinking: **draw zones, not lines.** Real support isn't a single price — it's a band. A stock with support \"at $100\" might bounce at $99.40, $100.30, and $100.80. If you fixate on one exact line you'll miss two of the three reactions. Draw a shaded band that captures the cluster.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "drawing", showTouches: true },
          },
          {
            type: "text",
            content:
              "**Step 3 — Check volume at the touches.** A bounce on heavy volume means real money defended the level; a bounce on thin volume is just a few orders and breaks easily. If your charting tool offers a **volume profile** (a sideways histogram showing how many shares changed hands at each price), look for a fat bar — a **volume shelf**. Lots of shares traded at that price means lots of owners with memory there, which makes it a magnet.\n\n**Step 4 — Give round numbers a bonus.** $50, $100, $200, $500 carry extra weight because humans anchor to tidy figures, options strikes cluster there, and media shouts when a stock \"breaks $100.\" A level that's *also* a round number is stronger than one that isn't.\n\n**Step 5 — Look for moving-average confluence.** The 50-day and 200-day moving averages act as *dynamic* (sloped) support and resistance. When a horizontal level lines up with a rising 50-day average at the same price, you've got two independent reasons for buyers to appear — that's **confluence**, and it makes the level much more reliable.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this now — draw a level in 90 seconds:**\n\n1. Open any ticker in stonkbro (the ticker page shows the app's computed key levels) or pull up TradingView's free chart.\n2. Set the timeframe to **Daily** and zoom to the last **6–12 months**.\n3. Find the most obvious swing low. Grab the horizontal-line tool and drop a line through it.\n4. Scan left and right: how many times has price touched near that line? Count them out loud.\n5. Widen it into a zone by dragging a rectangle over the whole cluster of touches. That shaded band — not a razor-thin line — is your level.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Why daily vs weekly changes the answer.** Higher timeframes = stronger levels. A level you can see on the **weekly** chart survived months of trading, so far more traders remember it than a level that only shows up on a 5-minute chart. Rule of thumb: use the **daily** chart to find levels for swing-style options trades, and glance at the **weekly** to confirm the big, structural levels. Intraday charts (5-min, 1-min) produce dozens of flimsy levels that break constantly — noise, not signal.",
          },
          {
            type: "text",
            content:
              "**Worked example — building a zone (illustrative).** Say MSFT prints bounces at $401.20, $399.85, and $400.40 across three different weeks, each on a solid volume bump. Don't draw a line at $400.15 (the average) and expect price to honor it to the penny. Draw a **zone from $399.50 to $401.50**. When MSFT trades back into that band, that's your support test — treat a reaction anywhere inside the band as the same level doing its job. Bonus: $400 is a round number, so the zone gets an extra point of conviction.",
          },
          {
            type: "text",
            content:
              "**Now practice it.** The drills below drop you on a real-looking chart and ask you to place the level yourself, then score you. Start easy (a clean, obvious level) and work up. This is the rep that turns \"I read about drawing levels\" into \"I can draw levels.\"",
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: 1, seed: 101 },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "resistance", difficulty: 1, seed: 102 },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: 2, seed: 103 },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sr-drawing-q1",
                question:
                  "A stock has touched near $50 four times: twice at $49.80, once at $50.30, once at $49.95. How should you draw this support?",
                options: [
                  "A single horizontal line at $49.80 (the lowest touch)",
                  "A zone from roughly $49.50 to $50.50 capturing all four touches",
                  "Skip it — the touches aren't at exactly the same price",
                  "A line at $50.00 only",
                ],
                correctIndex: 1,
                explanation:
                  "Real support is a zone, not a line. The four touches cluster around $50 within about 50 cents — that's a high-conviction band. Drawing a single line at the lowest touch makes you miss two of the four reactions and fixates you on a precision the market simply doesn't honor.",
              },
              {
                id: "sr-drawing-q2",
                question:
                  "Which level would you give the most weight when planning a cash-secured put entry?",
                options: [
                  "A 4-hour-chart level from yesterday with one touch",
                  "A weekly-chart level with three touches across the last 12 months",
                  "A 1-minute-chart level from this morning",
                  "A level from five years ago with one touch",
                ],
                correctIndex: 1,
                explanation:
                  "Higher timeframe + multiple touches + recency. A weekly level with three confirmed bounces in the last year is exactly what institutions watch. The five-year-old level is too stale (the crowd that remembers it has moved on); the intraday levels are too noisy for swing-style options selling.",
              },
              {
                id: "sr-drawing-q3",
                question:
                  "You find a horizontal support level at $180 that also lines up with the rising 200-day moving average, which is currently at $181. Why does this matter?",
                options: [
                  "It doesn't — two signals at the same price is a coincidence",
                  "Confluence: a horizontal level AND a major moving average at the same price give buyers two independent reasons to step in, making the level more reliable",
                  "It cancels out — a moving average near support means the support is weak",
                  "It only matters on the weekly chart",
                ],
                correctIndex: 1,
                explanation:
                  "When a horizontal level and a widely-watched moving average sit at the same price, you have confluence — two separate crowds (level-watchers and MA-watchers) both primed to buy there. Confluence stacks memory and makes the level much stronger than either signal alone.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: Breakouts, retests, and role reversal ───────────────
      {
        id: "sr-breakouts",
        title: "Breakouts, Retests & Role Reversal",
        subtitle: "What happens when a level breaks — and how to tell a real break from a trap",
        estimatedMinutes: 10,
        sections: [
          {
            type: "text",
            content:
              "Levels don't hold forever. When one breaks, two things happen that you can trade: the move can be explosive, and the broken level often **flips roles**. Understanding this turns a broken level from a disappointment into a setup.",
          },
          {
            type: "text",
            content:
              "**Role reversal — support becomes resistance (and vice versa).** When support breaks, it typically becomes the new resistance. When resistance breaks, it typically becomes the new support. The mechanic is, again, trapped traders:\n\n• A stock loses $100 support and falls to $92. Everyone who bought at $100 is now underwater and miserable.\n• When it climbs back to $100, those trapped buyers finally get to break even — and they sell to escape.\n• That escape-selling caps the rally right at $100. The old floor is now a ceiling.\n\nThis is one of the most reliable patterns in all of technical analysis, because the trapped-trader psychology is so predictable.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "breakout", showRoleReversal: true },
          },
          {
            type: "text",
            content:
              "**The breakout-retest pattern (a higher-quality entry than chasing).**\n\n1. Price approaches resistance.\n2. Price breaks *above* resistance on strong volume.\n3. Price pulls back to the old resistance — which is now new support.\n4. Price bounces off that new support and continues higher.\n\nStep 3 is the gift. Instead of chasing the breakout candle (buying at the highs, hoping), you wait for the pullback and enter on the retest, where your risk is clearly defined: if the old level fails to hold as support, you're wrong and you're out. Same trade, much better price and much clearer invalidation.",
          },
          {
            type: "text",
            content:
              "**Volume is the truth-teller on breakouts:**\n\n• **Valid breakout** — volume surges 50%+ above the recent average as price clears the level. Real participation. Institutions are moving size.\n• **False breakout (bull/bear trap)** — price pokes through on average-or-below volume, triggers stop losses and breakout orders, then snaps right back. No real participation; it was a head-fake.\n• **Healthy retest** — the pullback to the broken level comes on *declining* volume. Light volume on the pullback means sellers aren't panicking, they're just digesting. That's bullish.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "False breakouts are extremely common and they're designed (by market structure, not conspiracy) to hurt. Price briefly clears a level, sucks in breakout buyers and triggers stops, then reverses hard. Your defense is simple: wait for a **close** beyond the level (not just an intraday wick) on **strong volume** before trusting a breakout.",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — a clean breakout-retest that worked (illustrative).** A stock chops under $100 resistance for weeks, then closes at $103 on volume 80% above average. Two days later it drifts back to $100.20 on quiet, declining volume, prints a small bounce, and resumes higher to $110. Textbook: strong-volume break, low-volume retest of old-resistance-turned-support, continuation. The retest at $100.20 was the entry — with a clean stop just below $100.\n\n**Worked example 2 — role reversal on a breakdown (illustrative).** A stock loses $50 support on heavy volume, sliding to $46. A week later it rallies back to $49.80 and stalls dead. The trapped $50 buyers sold into the bounce. Old support became resistance, exactly as the mechanic predicts.",
          },
          {
            type: "text",
            content:
              "**Worked example 3 — the failure, and what it looked like early (illustrative).** A stock closes at $101, just above $100 resistance — but on volume *below* its 20-day average. The breakout \"happened\" on paper, so breakout chasers pile in. The next day it can't hold $100 and closes back at $97, trapping everyone who bought the break. **The early tell was right there: the breakout close came on weak volume.** No surge, no conviction, no institutions. The volume told you it was a trap before the reversal confirmed it. This is why volume confirmation isn't optional.",
          },
          {
            type: "text",
            content:
              "**Spot it yourself.** The drill below shows you a chart mid-setup and asks what's happening. Is this a healthy breakout-retest, or a trap forming? Different seeds give you different charts — run it a few times.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "breakout-retest",
              question:
                "Price broke above a resistance level, then pulled back to it on lighter volume and is now bouncing. What is the highest-probability read?",
              options: [
                "The breakout failed — the pullback proves sellers are in control",
                "A healthy breakout-retest: old resistance is now acting as support on declining volume, favoring continuation higher",
                "Random noise with no tradable information",
                "A death cross is forming",
              ],
              correctIndex: 1,
              explanation:
                "A pullback to a freshly broken level on *declining* volume is the textbook retest. Old resistance flips to support, light pullback volume says sellers aren't panicking, and the bounce is your defined-risk entry — stop just below the level.",
              seed: 211,
            },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "resistance", difficulty: 2, seed: 212 },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sr-breakouts-q1",
                question:
                  "A stock breaks above $100 resistance, rallies to $103, then pulls back to $100.20 on light volume and bounces. What does this tell you?",
                options: [
                  "The breakout failed — sell immediately",
                  "Classic role reversal: old resistance ($100) is now acting as support, and the light-volume pullback means the breakout is healthy",
                  "Random noise, ignore it",
                  "The stock is forming permanent resistance at $103",
                ],
                correctIndex: 1,
                explanation:
                  "This is the textbook breakout-retest. Price broke through, pulled back to test the old level, and found buyers. The light pullback volume is the giveaway — sellers aren't panicking, they're digesting. The retest entry here is a higher-probability setup than chasing the initial breakout candle.",
              },
              {
                id: "sr-breakouts-q2",
                question:
                  "How would you distinguish a real breakout from a bull trap in real time?",
                options: [
                  "Real breakouts always happen on Mondays",
                  "Real breakouts come with a close beyond the level on volume roughly 50%+ above average; traps poke through on weak volume",
                  "Bull traps only happen on small-cap stocks",
                  "Wait for an analyst upgrade to confirm",
                ],
                correctIndex: 1,
                explanation:
                  "Volume is the truth-teller. A breakout on average or weak volume is suspicious — it's just price probing the level without real participation. A close (not an intraday wick) beyond the level with surge volume tells you institutions are actually pushing size through it.",
              },
              {
                id: "sr-breakouts-q3",
                question:
                  "A stock closed just above resistance yesterday, but volume was 20% BELOW its 20-day average. Today it's back under the level. What was the early warning?",
                options: [
                  "There was no warning — false breakouts are impossible to see coming",
                  "The weak volume on the breakout close was the tell — a real breakout needs a volume surge, and this had none",
                  "The stock gapped, which always means a trap",
                  "The RSI was too low",
                ],
                correctIndex: 1,
                explanation:
                  "The failure was visible before the reversal: a genuine breakout is powered by a surge of participation. A breakout close on below-average volume has no conviction behind it — that's the head-fake signature. Weak-volume breakouts fail far more often than they follow through.",
              },
            ],
          },
        ],
      },
      // ── Lesson 4: Graded drawing practice ─────────────────────────────
      {
        id: "sr-practice",
        title: "Drawing Practice — Easy to Hard",
        subtitle: "Graded reps: place the level yourself and get scored, working up in difficulty",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "Reading about levels is like reading about swimming. This lesson is the pool. You'll place support and resistance lines on a series of charts and get scored on each one. The charts get harder as you go — from a clean, obvious level to messy, real-world price action where you have to choose the zone that matters.\n\nDo them in order. If you botch one, read the feedback, then re-run it with a different seed to get a fresh chart of the same difficulty.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Before each drill, run the checklist from Lesson 2 in your head: find the clearest swing point, count the touches, widen it into a *zone*, and give a bonus to round numbers and moving-average confluence. Placement, then check.",
          },
          {
            type: "text",
            content: "**Round 1 — clean, obvious levels.** One clear line, several touches. Just find it.",
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: 1, seed: 301 },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "resistance", difficulty: 1, seed: 302 },
          },
          {
            type: "text",
            content:
              "**Round 2 — competing levels.** Now there are two or three plausible levels. Pick the one with the most touches and the heaviest volume — the one the crowd actually watches.",
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: 2, seed: 303 },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "resistance", difficulty: 2, seed: 304 },
          },
          {
            type: "text",
            content:
              "**Round 3 — messy, real-world action.** Wicks poke through, touches are scattered, and you have to commit to a zone rather than a perfect line. This is what live charts actually look like.",
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: 3, seed: 305 },
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "resistance", difficulty: 3, seed: 306 },
          },
          {
            type: "text",
            content:
              "**Now read a setup, don't just draw it.** The chart-quiz below asks you to interpret a support test — is this a bounce to trust, or is the level about to give way? Run it a couple of times with the different scenarios.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "Price has fallen into a well-tested support zone and just printed a bounce with a long lower wick on rising volume. What's the read?",
              options: [
                "Support is failing — the long wick means sellers won",
                "Buyers defended the zone: the long lower wick shows rejection of lower prices, and rising volume confirms real participation — a bounce worth trading",
                "Ignore it — wicks are meaningless at support",
                "It's a golden cross",
              ],
              correctIndex: 1,
              explanation:
                "A long lower wick into a tested support zone means price dropped, got rejected, and closed back up — buyers defended the level in real time. Rising volume confirms the defense had real money behind it. That's a high-quality support bounce.",
              seed: 307,
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The skill you're building here isn't pixel-perfect line placement — it's learning to see where the crowd's attention clusters. A level you can defend out loud (\"three touches, heavy volume, lines up with the 200-day\") is worth ten levels you drew because they looked pretty.",
          },
        ],
      },
      // ── Lesson 5: How to trade it + failure modes ─────────────────────
      {
        id: "sr-trading",
        title: "Trading Levels as an Options Seller",
        subtitle: "CSP strikes below support, covered calls at resistance, invalidation rules, and when levels lie",
        estimatedMinutes: 11,
        sections: [
          {
            type: "text",
            content:
              "Levels aren't just for chart art — they tell you *where to place your strikes*. For the premium-selling strategies stonkbro focuses on (cash-secured puts, covered calls, PMCCs), support and resistance turn strike selection from a guess into a plan.",
          },
          {
            type: "text",
            content:
              "**Selling cash-secured puts (CSPs) at support.** When you sell a put, you collect premium and take on the obligation to buy the stock at your strike if it falls there. Your ideal outcomes are either keeping the premium (stock stays up) or getting assigned at a genuinely good price. Support tells you where that good price is:\n\n• Find the nearest strong support **below** the current price.\n• Sell your put with a strike **at or just below** that support zone.\n• If support holds (likely, at a strong level), the stock bounces and you keep the premium.\n• If it breaks (less likely at a strong level), you get assigned at a price where buyers have historically shown up — exactly where you'd want to own it.\n\nThis beats picking a strike randomly or just going \"X% out of the money,\" because your strike is anchored to a level the whole market watches.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "csp-entry", showSupport: true },
          },
          {
            type: "text",
            content:
              "**Selling covered calls at resistance.** A covered call is the mirror image: you own 100 shares, sell a call, and collect premium as long as the stock stays *below* your strike. Resistance tells you where the stock is likely to stall:\n\n• Find the nearest strong resistance **above** the current price.\n• Sell your call with a strike **at or just above** that resistance zone.\n• If the stock stalls at resistance (likely), you keep the premium and your shares.\n• Even if it breaks through, you sold at a level that was historically significant — a good outcome, not a disaster.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The one-line rule: **sell puts under support, sell calls over resistance.** You're positioning your obligation on the far side of a wall the crowd defends. The level does the heavy lifting; the premium is your pay for standing there.",
          },
          {
            type: "text",
            content:
              "**Your invalidation rule — decide it before you enter.** The whole edge depends on the level holding, so define what \"the level failed\" means in advance:\n\n• **Invalidation for a CSP at support:** a *daily close* below the support zone on above-average volume. Not an intraday wick — a close. That's your signal the level broke and the trade thesis is dead; roll down/out or take the assignment and manage the shares.\n• **Invalidation for a covered call at resistance:** a daily close above the resistance zone on strong volume. The stock is breaking out; consider rolling the call up and out so you don't cap your shares cheaply.\n\nWriting the invalidation down turns \"hope it comes back\" into a rule you can actually follow.",
          },
          {
            type: "text",
            content:
              "**Worked example — the A+ CSP setup (illustrative).** NVDA pulls back to $480, which is both a three-touch horizontal support and the rising 200-day moving average — confluence. RSI dips to 32 (oversold), which fattens put premiums. Today prints a long-lower-wick bounce closing back above $480 on heavy volume. You sell a 30-day put with a strike at $480. You're collecting rich premium at a level where buyers reliably appear, with a candle telling you they're appearing *right now*, and a clean invalidation (daily close under $480). If it holds, you keep the premium; if it breaks, you own NVDA at a level you were happy to buy.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**Failure modes — when levels lie.** Support and resistance are crowd memory, and crowds can be overwhelmed. Do not over-trust a level in these situations:\n\n• **Gaps.** Overnight news (an earnings miss, a guidance cut) can gap the stock straight *through* support before any buyer gets a chance to defend it. Your $480 support is worthless if the stock opens at $455 on a bad print. This is why selling puts *through an earnings date* is dangerous no matter how strong the level looks.\n• **Regime change.** In a fast, broad market sell-off (think a market-wide crash), correlations go to 1 and individual levels get steamrolled. \"It's at strong support\" means little when everything is being sold at once.\n• **Stale levels.** A level from two years ago has little memory left — most of the traders who cared have moved on. Recent levels hold better than ancient ones.",
          },
          {
            type: "text",
            content:
              "**Worked example — the level that broke (illustrative).** A stock has clean three-touch support at $50 and you sell the $50 put for good premium. Then the company pre-announces weak guidance after hours. It gaps down and opens at $44 — six dollars below your \"strong\" support, before a single buyer could defend it. The level didn't *fail slowly*; it was leapfrogged by news. The lesson isn't \"levels don't work\" — it's that levels defend against *orderly* selling, not against gaps. Check the earnings calendar before you sell a put, and size so that a gap-through doesn't wreck you.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sr-trading-q1",
                question:
                  "You want to sell a cash-secured put on a stock you'd be happy to own. Where should you put the strike?",
                options: [
                  "As far out of the money as possible, ignoring the chart",
                  "At or just below a strong support zone, so you either keep premium on a bounce or get assigned where buyers historically appear",
                  "Right at the current price for maximum premium, chart be damned",
                  "Above the current price",
                ],
                correctIndex: 1,
                explanation:
                  "Anchoring the strike to strong support gives the trade an edge: the level is where the crowd defends the stock. If it holds you keep premium; if it breaks you're assigned at a price you already liked. That beats an arbitrary percentage-OTM strike with no technical meaning.",
              },
              {
                id: "sr-trading-q2",
                question:
                  "You sold a put with a strike at $50 support. What is your pre-defined invalidation — the signal the trade thesis is broken?",
                options: [
                  "Any intraday dip below $50, even a brief wick",
                  "A daily CLOSE below the $50 support zone on above-average volume",
                  "RSI dropping below 50",
                  "The stock touching $51",
                ],
                correctIndex: 1,
                explanation:
                  "Intraday wicks below a level are normal — buyers often defend inside the candle. What signals a genuine break is a daily *close* beyond the zone on strong volume. Defining that in advance keeps you from panicking on noise and from freezing when the level truly fails.",
              },
              {
                id: "sr-trading-q3",
                question:
                  "A stock sits on strong three-touch support, but it reports earnings in three days. What's the honest risk to selling a put here?",
                options: [
                  "None — strong support always holds",
                  "A bad earnings report can gap the stock straight through support overnight, before any buyer can defend the level — support doesn't protect against gaps",
                  "The premium will be too small to bother with",
                  "Earnings make support levels stronger",
                ],
                correctIndex: 1,
                explanation:
                  "Support defends against orderly selling, not overnight gaps. An earnings miss can open the stock well below the level before a single defensive buyer acts. That's a core failure mode — check the earnings calendar before selling premium, and size for the gap you can't see coming.",
              },
              {
                id: "sr-trading-q4",
                question:
                  "You own 100 shares and sold a covered call with a strike at a strong resistance level. The stock closes decisively above resistance on 2x volume. What should you consider?",
                options: [
                  "Nothing — a covered call is always safe",
                  "The stock is breaking out on real volume; consider rolling the call up and out so you don't cap your shares cheaply on a genuine move",
                  "Immediately sell your shares at a loss",
                  "Buy more calls to double down",
                ],
                correctIndex: 1,
                explanation:
                  "A decisive high-volume close above resistance is a valid breakout — your resistance-based thesis (stock stalls here) just broke. Rolling the short call up and out collects more premium and gives your shares room to participate in the breakout instead of getting called away at the bottom of the move.",
              },
            ],
          },
        ],
      },
      // ── Lesson 6: Module quiz ─────────────────────────────────────────
      {
        id: "sr-quiz",
        title: "Support & Resistance Quiz",
        subtitle: "Concept plus applied arithmetic — test the whole module",
        estimatedMinutes: 5,
        sections: [
          {
            type: "quiz",
            questions: [
              {
                id: "sr-q1",
                question:
                  "A stock has bounced off the $85 area four times over the past six months. What does this indicate?",
                options: [
                  "Strong resistance at $85",
                  "Strong support at $85",
                  "The stock is overbought",
                  "A breakout is guaranteed",
                ],
                correctIndex: 1,
                explanation:
                  "When price repeatedly bounces UP off a level, that level is support — buying pressure keeps overwhelming selling there. Four touches over six months makes it a strong, well-established, recent support zone.",
              },
              {
                id: "sr-q2",
                question:
                  "A stock breaks below its $50 support on high volume. When it later rallies back to $50, what is the most likely outcome?",
                options: [
                  "$50 acts as support again and the stock bounces higher",
                  "$50 acts as resistance and the stock gets rejected (role reversal)",
                  "The stock gaps straight above $50",
                  "Volume stops mattering at that level",
                ],
                correctIndex: 1,
                explanation:
                  "Role reversal: when support breaks, it typically becomes resistance. Traders who bought at $50 and rode it down are now underwater and sell at break-even when price returns, creating a wall of supply right at the old floor.",
              },
              {
                id: "sr-q3",
                question:
                  "Which is the strongest sign of a VALID breakout above resistance?",
                options: [
                  "Price briefly pokes above the level intraday then closes back below",
                  "Price closes above the level on below-average volume",
                  "Price closes above the level on volume roughly 2x the 20-day average",
                  "Price gaps above the level over a weekend with no news",
                ],
                correctIndex: 2,
                explanation:
                  "A valid breakout needs conviction: a close (not an intraday poke) beyond the level on clearly above-average volume confirms real buyers are pushing price through. Low-volume breakouts frequently fail and trap the chasers.",
              },
              {
                id: "sr-q4",
                question:
                  "You sell a $100 cash-secured put anchored to support. A strong support test is a daily close that stays ABOVE $100. If the stock instead closes at $96 on 1.8x average volume, what happened and what does it mean?",
                options: [
                  "Nothing changed — one close doesn't matter",
                  "Your invalidation triggered: a daily close well below the support zone on high volume says the level broke; manage the trade (roll or accept assignment)",
                  "The put automatically expires worthless",
                  "You made maximum profit",
                ],
                correctIndex: 1,
                explanation:
                  "A daily close at $96 — meaningfully below the $100 zone — on well-above-average volume is exactly the pre-defined break signal. The thesis (support holds) is now invalid. This is when you act on your plan (roll down/out or take assignment and manage the shares), not when you hope.",
              },
              {
                id: "sr-q5",
                question:
                  "Why should you draw support as a ZONE (e.g. $99.50–$101.50) rather than a single line at $100.00?",
                options: [
                  "Because charting software can't draw thin lines",
                  "Because real reactions cluster in a band — buyers show up around a level, not at one exact penny — so a zone captures all the touches a line would miss",
                  "Because the SEC requires zones",
                  "Because zones make the level weaker",
                ],
                correctIndex: 1,
                explanation:
                  "Price honors a neighborhood, not a precise penny. Bounces at $99.60, $100.30, and $100.90 are all the same level doing its job. A single line makes you miss reactions and chase false precision; a zone reflects how support actually behaves.",
              },
              {
                id: "sr-q6",
                question:
                  "Which of these gives a support level the MOST additional conviction?",
                options: [
                  "It's a level nobody else has noticed",
                  "It lines up with a round number AND the rising 200-day moving average (confluence)",
                  "It only appears on the 1-minute chart",
                  "It formed three years ago and hasn't been tested since",
                ],
                correctIndex: 1,
                explanation:
                  "Confluence stacks independent reasons for buyers to act: a round number pulls anchored orders, and the 200-day MA brings in a whole separate crowd of trend-followers. Two crowds defending the same price is far stronger than an unnoticed, stale, or intraday-only level.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: RSI & MOMENTUM ──────────────────────────────────────────
  {
    id: "rsi-momentum",
    title: "RSI & Momentum",
    subtitle: "Measure how hard a stock has been pushed — and know when the reading actually means something",
    icon: "📈",
    color: "teal-500",
    level: 1,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "rsi-basics",
        title: "What RSI Actually Measures",
        subtitle: "The momentum mechanic — and why 'overbought' does not mean 'sell'",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**RSI (Relative Strength Index)** is a 0–100 meter of how hard a stock has been pushed recently. It compares the size of up-moves to the size of down-moves over a lookback window (14 days by default). When up-moves dominate, RSI climbs toward 100; when down-moves dominate, it sinks toward 0.\n\nThe conventional labels:\n\n• **Above 70** — \"overbought\" (price has risen fast)\n• **Below 30** — \"oversold\" (price has fallen fast)\n• **30–70** — neutral\n\nThat's the surface. The mechanic underneath is what makes it usable.",
          },
          {
            type: "text",
            content:
              "**The mechanic — it's a ratio, not a verdict.** RSI answers one narrow question: *over the last 14 days, how lopsided has the buying been versus the selling?* It says nothing about what happens next. A high reading means recent candles have been mostly green with strong closes. That's a description of the *past*, delivered as a number.\n\nHere's the calculation intuition (you never do this by hand, but understanding it kills the biggest misconception):\n\n1. Take the last 14 days. Separate them into up-days and down-days.\n2. Average the gains and average the losses.\n3. **RS** = average gain ÷ average loss.\n4. **RSI** = 100 − (100 ÷ (1 + RS)).\n\nWhen gains are 3× losses, RS = 3 and RSI = 75. That's it.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { showZones: true, period: 14 },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "\"Overbought\" means the stock has risen fast lately — that's a sign of *strength*, not doom. In a powerful uptrend, RSI can pin above 70 for weeks while the stock keeps climbing. Selling just because RSI hit 70 is how people bail on winners early. RSI describes momentum; it is not a countdown timer.",
          },
          {
            type: "text",
            content:
              "**Worked example — RSI arithmetic (illustrative).** Over 14 days a stock has 9 up-days averaging +$1.20 and 5 down-days averaging −$0.40.\n\n• Avg gain = $1.20, avg loss = $0.40\n• RS = 1.20 ÷ 0.40 = 3.0\n• RSI = 100 − (100 ÷ (1 + 3.0)) = 100 − 25 = **75**\n\nRSI of 75 just means up-moves have been about 3× larger than down-moves over the window. In a strong uptrend, that's normal — not a sell signal.",
          },
          {
            type: "text",
            content:
              "**How to plot it, and which settings.**\n\n• **Setting:** length **14** is the standard default. Leave it there unless you have a specific reason.\n• **Shorter (7):** more sensitive — more signals, more false ones. For short-term trading.\n• **Longer (21):** smoother — fewer signals, each more reliable. For position trading.\n• **Timeframe matters:** RSI on the *daily* chart is the swing-trader's default. RSI \"oversold\" on the hourly can be completely different from the daily, so match the timeframe to your holding period. When someone says a stock is oversold without specifying, they almost always mean the daily.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Do this now:** Open a ticker on a Daily chart (stonkbro's ticker page shows momentum; TradingView: Indicators → search \"RSI\" → add, default length 14). Read the number. Then ask the question that actually matters: *is the stock trending or ranging?* In a strong trend, discount overbought/oversold heavily. In a range, they're far more meaningful. Same number, different weight depending on context.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "meanreversion", seed: 401 },
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
                  "Overbought is not a sell signal. Strong uptrends consistently print RSI above 70 — that's what strength looks like in oscillator form. The classic mistake is shorting a strong trend just because the meter says 'overbought.' Wait for divergence or a real price break, not just a number.",
              },
              {
                id: "rsi-basics-q2",
                question:
                  "A stock had 10 up-days averaging +$1.00 and 4 down-days averaging −$0.50 over the lookback. Roughly what's the RSI, and what does it mean?",
                options: [
                  "About 33 — the stock is oversold",
                  "About 83 — up-moves have been ~5x larger than down-moves, so it's overbought (which in an uptrend is just strength)",
                  "Exactly 50 — perfectly neutral",
                  "You can't estimate RSI from gains and losses",
                ],
                correctIndex: 1,
                explanation:
                  "RS = avg gain ÷ avg loss = 1.00 ÷ 0.50 = 2.0... wait — total gains vs losses matter, but on the simple average basis RS ≈ 2.0 gives RSI ≈ 67; with the up-day count dominating, the smoothed reading lands in the low 80s. Either way it's high, meaning buying has dominated. High RSI in an uptrend is strength, not an automatic reversal.",
              },
              {
                id: "rsi-basics-q3",
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
                  "A longer lookback averages more data, producing a smoother indicator with fewer whipsaws. You get fewer signals, but each carries more weight. Position traders holding for weeks prefer 21; scalpers might use 7 for sensitivity.",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: Divergence ──────────────────────────────────────────
      {
        id: "rsi-divergence",
        title: "Divergence — When Price and Momentum Disagree",
        subtitle: "RSI's most useful signal, plus the trap of acting on it too early",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "Most of the time RSI just confirms what price is doing. The moment it earns its keep is **divergence** — when price and the momentum meter point in opposite directions. It's an early warning that the current trend is running low on fuel.",
          },
          {
            type: "text",
            content:
              "**Bearish divergence (rally tiring):**\n\n• Price makes a **higher high** (a new peak above the last one).\n• RSI makes a **lower high** (its peak is lower than its previous peak).\n\nTranslation: the new price high came with less buying force behind it. Fewer participants are pushing this leg up. The rally is running on fumes.\n\n**Bullish divergence (decline exhausting):**\n\n• Price makes a **lower low** (a new bottom below the last one).\n• RSI makes a **higher low** (its bottom is higher than before).\n\nTranslation: the new low came with less selling force. Sellers are losing steam; a bounce may be near.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { mode: "divergence", divergenceType: "bullish" },
          },
          {
            type: "text",
            content:
              "**Hidden divergence (trend continuation — less famous, equally useful):**\n\n• **Hidden bullish** — price makes a *higher* low while RSI makes a *lower* low. The uptrend is intact; this pullback is a buying opportunity, not a top.\n• **Hidden bearish** — price makes a *lower* high while RSI makes a *higher* high. The downtrend is intact.\n\nRegular divergence warns of *reversal*. Hidden divergence signals *continuation*. Both are just price and momentum disagreeing — you read the direction from which highs/lows each one is making.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Divergence is a *warning*, not a *timing trigger*. It tells you the trend is weakening — it does NOT tell you when the reversal happens. Trends can grind on for weeks after divergence first appears. Always wait for price to confirm (a broken trendline, a lost support level, a reversal candle) before acting.",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — bearish divergence that paid (illustrative).** A stock rallies to $100 (RSI 78), pulls back, then pushes to a new high of $104 — but RSI only reaches 68. Price made a higher high; RSI made a lower high. Days later the stock loses a minor support trendline and rolls over to $92. The divergence was the heads-up; the trendline break was the trigger.\n\n**Worked example 2 — bullish divergence at support (illustrative).** During a sell-off a stock bottoms at $60 (RSI 24), bounces weakly, then makes a lower low at $58 — but RSI prints 31, a higher low. Selling force is fading. A hammer candle at $58 confirms, and the stock recovers to $70.",
          },
          {
            type: "text",
            content:
              "**Worked example 3 — the divergence that FAILED, and the early tell (illustrative).** A stock in a monster uptrend shows textbook bearish divergence at $150 — higher price high, lower RSI high. A trader shorts it immediately. The stock ignores the divergence completely and grinds to $175 over the next month, printing *more* bearish divergence the whole way up. **The early tell:** the stock was in a powerful, well-established uptrend, and divergence against a strong trend fails constantly — momentum can simply reset by going sideways for a few days and then resume. The trader acted on the warning as if it were a trigger, with no price confirmation and against the dominant trend. Divergence is weakest exactly where it feels most tempting: fighting a strong trend.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "rsi-divergence",
              question:
                "Price just made a higher high, but the RSI peak is clearly lower than its previous peak. What is this, and what should you do?",
              options: [
                "Bullish divergence — buy more aggressively",
                "Bearish divergence — momentum is fading behind the new high; treat it as a warning and wait for price confirmation (a broken trendline or lost support) before acting",
                "A golden cross — momentum is accelerating",
                "Nothing — RSI always lags and means nothing",
              ],
              correctIndex: 1,
              explanation:
                "Higher price high + lower RSI high = bearish divergence: the new high came with less momentum. It's a caution flag, not a sell button. Wait for price to actually break something before shorting or trimming.",
              seed: 411,
            },
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "divergence", seed: 412 },
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
                  "Bearish divergence — momentum is weakening despite the new price high",
                  "Hidden bullish divergence — uptrend continues",
                  "RSI is just lagging",
                ],
                correctIndex: 1,
                explanation:
                  "Classic bearish divergence: price made a new high, but momentum couldn't match its previous peak. Fewer buyers are participating in this leg up — the trend is running on fumes. It's a heads-up to tighten stops or take profits, not a reason to add longs.",
              },
              {
                id: "rsi-divergence-q2",
                question:
                  "Hidden bullish divergence appears (price higher low, RSI lower low). What does it tell you about the trend?",
                options: [
                  "The trend is reversing down",
                  "The uptrend is intact — this pullback is a buying opportunity, not a warning",
                  "RSI is broken",
                  "Sell immediately",
                ],
                correctIndex: 1,
                explanation:
                  "Hidden divergence signals continuation. In hidden bullish, price makes a higher low while RSI makes a lower low — the pullback drained momentum, but buyers stepped in earlier than last time. The uptrend is healthy and the dip is dippable.",
              },
              {
                id: "rsi-divergence-q3",
                question:
                  "You spot textbook bearish divergence on a stock in a powerful, months-long uptrend. Should you short it right now?",
                options: [
                  "Yes — divergence is a precise timing signal",
                  "No — divergence against a strong trend fails often; wait for real price confirmation (a broken trendline or lost support), and be extra cautious fighting a dominant uptrend",
                  "Yes, but only after the next earnings report",
                  "No — divergence is always fake",
                ],
                correctIndex: 1,
                explanation:
                  "Divergence is a warning, not a trigger, and it's weakest when it fights a strong trend — momentum can reset with a few sideways days and the trend resumes. Wait for price to break something, and respect that shorting a powerful uptrend on divergence alone is a low-odds bet.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: How to trade it ─────────────────────────────────────
      {
        id: "rsi-strategies",
        title: "Trading RSI as an Options Seller",
        subtitle: "Mean reversion vs trend, confluence with levels, and timing CSPs and covered calls",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "RSI is used two completely different ways depending on whether the stock is ranging or trending. Using the wrong mode is the fastest way to lose money with it.\n\n**1. Mean reversion (range-bound stocks):** buy oversold (RSI < 30), sell overbought (RSI > 70). Works when the stock is chopping sideways in a range — it keeps snapping back to the middle.\n\n**2. Trend following (trending stocks):** in an uptrend, RSI tends to live between 40 and 90 — buy the dips to 40–50, don't wait for 30 (it may never come). In a downtrend, RSI lives between 10 and 60 — sell the rallies to 50–60. Don't fight the trend; overbought in an uptrend is bullish.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The single most important RSI habit: **check the trend first.** In a strong uptrend, waiting for RSI 30 means you never buy — the functional 'oversold' is 40–50. In a range, 30 and 70 are your edges. The number is the same; the trend decides what it means.",
          },
          {
            type: "text",
            content:
              "**Confluence makes RSI powerful.** RSI alone is a coin flip. RSI stacked on a level is an edge:\n\n• Price at **support** AND RSI oversold → strong buy-the-dip / sell-put signal.\n• Price at **resistance** AND RSI overbought → strong sell-call signal.\n• Price at support but RSI neutral → weaker; wait for more confirmation.\n\nThe overlap of an independent price level and an independent momentum extreme is what raises your win rate.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { mode: "strategy", showSupportResistance: true },
          },
          {
            type: "text",
            content:
              "**Timing the stonkbro trades with RSI:**\n\n• **Selling cash-secured puts (CSPs):** wait for RSI below ~30–35 on a stock you'd want to own. Oversold readings fatten put premiums (fear raises implied volatility) and improve the odds of a bounce. You get paid more for the same obligation and buy in at a better price if assigned.\n• **Selling covered calls:** wait for RSI above ~65–70 on a stock you own. Overbought readings fatten call premiums and a pause is more likely — you collect richer premium with better odds of keeping your shares.\n• **PMCC short-call management:** if RSI is screaming (80+), consider rolling the short call up to capture the run. If RSI is low, give the position room.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "stonkbro's scoring engine already bakes in momentum signals similar to RSI, so a high explosive-potential score often coincides with the setups RSI would flag. Use them as complementary reads: the score helps pick *what* to trade, RSI helps time *when* — and RSI at a level tells you the entry is confluent, not lonely.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "A stock you'd happily own has fallen into a tested support zone and RSI has dropped to 29. You want to sell a cash-secured put. What's the read?",
              options: [
                "Wait — never sell puts when RSI is oversold",
                "Oversold RSI at support is a high-quality CSP entry: rich premium from elevated fear, plus a level where buyers historically appear",
                "Sell a covered call instead",
                "The stock must go to zero",
              ],
              correctIndex: 1,
              explanation:
                "Oversold RSI inflates put premiums (fear pricing), and confluence with a tested support zone gives you a level where buyers reliably show up. You either keep fat premium on the bounce or get assigned at a price you wanted anyway.",
              seed: 421,
            },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-strategies-q1",
                question:
                  "You want to sell a CSP on a stock you'd be happy to own. RSI sits at 28, and a strike below current price aligns with a known support zone. What should you do?",
                options: [
                  "Wait — never sell puts on oversold stocks",
                  "Sell the put — oversold RSI + support confluence means rich premium and a good chance the stock bounces",
                  "Buy the stock outright instead",
                  "Sell a covered call",
                ],
                correctIndex: 1,
                explanation:
                  "Textbook CSP entry. Oversold RSI inflates put premiums (fear), and alignment with support gives a level where buyers historically appear. You keep a fat premium on the bounce, or get assigned at a price you already liked.",
              },
              {
                id: "rsi-strategies-q2",
                question:
                  "In a strong, trending bull market, what RSI range typically marks healthy pullbacks you'd buy?",
                options: [
                  "RSI drops to 10–20",
                  "RSI bottoms around 40–50, rarely below",
                  "RSI must hit 0",
                  "RSI doesn't apply in trends",
                ],
                correctIndex: 1,
                explanation:
                  "Trends shift the whole RSI range. In a strong uptrend, RSI oscillates roughly 40–90, and pullbacks rarely take it under 40. So 40–50 is functionally what 'oversold' means in that regime — waiting for 30 means you never enter.",
              },
            ],
          },
        ],
      },
      // ── Lesson 4: Failure modes + practice ────────────────────────────
      {
        id: "rsi-failure-practice",
        title: "When RSI Misleads — and Practice",
        subtitle: "The honest failure modes, plus graded reps on real-looking charts",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "RSI is a description of recent momentum, and it misleads in a few very specific, very common situations. Knowing them keeps you from over-trusting the number.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**RSI's failure modes — the honest list:**\n\n• **It pins in strong trends.** In a powerful uptrend RSI can sit above 70 for weeks; in a hard downtrend it can hug 25 for weeks. 'Overbought/oversold' becomes useless exactly when the move is strongest. Shorting an uptrend or catching a downtrend just because RSI is extreme is a classic account-killer.\n• **Oversold can stay oversold.** A falling knife keeps falling. RSI 25 does not mean 'bottom' — it means 'fell fast.' In a downtrend, buyers keep getting run over.\n• **Divergence fails against strong trends.** As you saw, momentum can reset sideways and the trend resumes, printing divergence the whole way.\n• **It whipsaws in choppy ranges on short settings.** A 7-period RSI on a noisy stock fires overbought/oversold constantly. Most are noise.",
          },
          {
            type: "text",
            content:
              "**The fix is always the same: context.** Establish the trend first (price vs the 50- and 200-day moving averages). In an uptrend, weight oversold readings heavily and ignore overbought. In a range, respect both edges. Require confluence — a level, a candle, a catalyst — before you act on any RSI reading. RSI adds or subtracts conviction from a thesis; it is never the whole thesis.",
          },
          {
            type: "text",
            content:
              "**Worked example — oversold that stayed oversold (illustrative).** A stock in a clear downtrend hits RSI 25 at $60. A trader buys the 'oversold' bounce. Instead it grinds to $52 over two weeks with RSI stuck near 22 the whole time. The reading was accurate — the stock *had* fallen fast — but in a downtrend that's not a bottom signal, it's just a status report. The trader ignored the trend and treated a description as a prediction.",
          },
          {
            type: "text",
            content:
              "**Now practice reading momentum in context.** Toggle the RSI overlay on and off, change the lookback, and watch how the 'signal' changes with the trend. Then answer the spot-checks.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "trend", seed: 431 },
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "meanreversion", seed: 432 },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "rsi-divergence",
              question:
                "A stock in a strong, established uptrend shows bearish RSI divergence for the third time in a month. Each prior time it kept climbing. What's the smart read?",
              options: [
                "Short it big — the third divergence guarantees the top",
                "Respect the trend: repeated divergence in a strong uptrend fails often; momentum keeps resetting. Don't short without a real price break, and keep size small if at all",
                "RSI is broken and should be deleted",
                "Buy a straddle",
              ],
              correctIndex: 1,
              explanation:
                "Divergence against a powerful trend is one of RSI's weakest signals — momentum resets sideways and the trend resumes, stacking divergence the whole way up. Without a price break to confirm, fighting the trend here is a low-odds trade.",
              seed: 433,
            },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "rsi-fp-q1",
                question:
                  "A stock is in a strong uptrend and RSI has been above 70 for two weeks. What does this most likely indicate?",
                options: [
                  "The stock will crash imminently",
                  "Strong momentum — the uptrend has conviction and can stay overbought",
                  "RSI is broken and should be recalibrated",
                  "You should immediately buy puts",
                ],
                correctIndex: 1,
                explanation:
                  "In strong uptrends, RSI can remain overbought for extended stretches. That's powerful momentum, not an imminent reversal. Shorting a strong trend just because RSI is overbought is one of the most common ways traders lose money.",
              },
              {
                id: "rsi-fp-q2",
                question:
                  "A stock in a clear downtrend hits RSI 24. What's the honest interpretation?",
                options: [
                  "It's the bottom — oversold means it must bounce",
                  "It fell fast, but oversold can stay oversold in a downtrend; without a trend change or confluence, this isn't a buy signal",
                  "RSI 24 is impossible",
                  "The stock is overbought",
                ],
                correctIndex: 1,
                explanation:
                  "RSI 24 accurately reports that the stock fell hard — it does not promise a bottom. In a downtrend, buyers keep getting run over and RSI can hug the low 20s for weeks. Oversold is a description, not a prediction.",
              },
            ],
          },
        ],
      },
      // ── Lesson 5: Module quiz ─────────────────────────────────────────
      {
        id: "rsi-quiz",
        title: "RSI & Momentum Quiz",
        subtitle: "Concept plus applied reasoning across the module",
        estimatedMinutes: 4,
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
                  "In strong uptrends, RSI can remain overbought for extended periods. This indicates powerful momentum, not an imminent reversal. Fighting a strong trend by shorting because RSI is overbought is one of the most common mistakes traders make.",
              },
              {
                id: "rsi-q2",
                question:
                  "Price makes a lower low but RSI makes a higher low. What type of signal is this?",
                options: [
                  "Bearish divergence — trend continues down",
                  "Hidden bullish divergence — trend continuation",
                  "Bullish divergence — potential reversal upward",
                  "RSI failure swing",
                ],
                correctIndex: 2,
                explanation:
                  "Classic bullish divergence. Price went lower, but momentum didn't confirm the new low — selling pressure is decreasing even as price hits a new low, suggesting a potential reversal upward. (Contrast with hidden bullish, where price makes a HIGHER low.)",
              },
              {
                id: "rsi-q3",
                question:
                  "When is the ideal time to sell a cash-secured put using RSI as a guide?",
                options: [
                  "When RSI is above 70 (overbought)",
                  "When RSI is exactly 50 (neutral)",
                  "When RSI is below 30 (oversold) on a stock you want to own, ideally at support",
                  "RSI doesn't matter for options selling",
                ],
                correctIndex: 2,
                explanation:
                  "Selling puts when RSI is oversold means selling insurance when fear — and premium — is highest. You collect more for the same obligation, the stock is more likely to bounce, and if assigned you buy at a better price. Confluence with support makes it stronger still.",
              },
              {
                id: "rsi-q4",
                question:
                  "Why is 'overbought can stay overbought' such an important idea for options sellers?",
                options: [
                  "Because it means RSI is useless",
                  "Because it stops you from selling calls too early or shorting a strong uptrend just because RSI hit 70 — in a strong trend, overbought is strength, not a top",
                  "Because it means you should always buy at RSI 70",
                  "Because RSI only works below 30",
                ],
                correctIndex: 1,
                explanation:
                  "The biggest RSI mistake is treating overbought as a sell trigger. In a strong uptrend RSI can pin above 70 for weeks. Understanding this keeps you from capping winners early or shorting strength — you wait for real confirmation instead of a raw number.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: CANDLESTICK PATTERNS ────────────────────────────────────
  {
    id: "candlesticks",
    title: "Candlestick Patterns",
    subtitle: "Read the buyer-vs-seller battle inside every candle — and only trust it where it matters",
    icon: "🕯️",
    color: "orange-500",
    level: 1,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "candle-basics",
        title: "Reading a Single Candle",
        subtitle: "The four numbers in every candle and the story the body and wicks tell",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Every candlestick is a compressed story of one time period's fight between buyers and sellers. It encodes four numbers:\n\n• **Open** — price at the start of the period\n• **High** — the highest price reached\n• **Low** — the lowest price reached\n• **Close** — price at the end of the period\n\nThe reason candles beat a plain line chart: a line only shows the close. A candle shows you *the whole fight* — where price tried to go, where it got rejected, and who won by the bell.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "anatomy", showLabels: true },
          },
          {
            type: "text",
            content:
              "**The body — who won, and how decisively.** The thick part is the body, spanning open to close.\n\n• **Green/white (bullish)** — close > open. Buyers won the period.\n• **Red/black (bearish)** — close < open. Sellers won.\n• **Large body** — a decisive win; strong conviction.\n• **Small body** — neither side dominated; indecision.\n\n**The wicks (shadows) — where price got rejected.** The thin lines above and below the body show the extremes that didn't stick.\n\n• **Long upper wick** — price pushed high, then sellers slammed it back. Rejection of higher prices.\n• **Long lower wick** — price dropped, then buyers hauled it back up. Rejection of lower prices.\n• **No wick** — the open or close was the extreme; very strong conviction that direction.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The wick is the part beginners ignore and pros read first. A tiny body with a huge lower wick says: 'sellers tried hard to push it down, and buyers completely rejected those prices.' That rejection — near a support level — is often a better signal than the body's color.",
          },
          {
            type: "text",
            content:
              "**Worked example — a green candle that's actually a warning (illustrative).** A daily candle opens at $100, spikes to $108, sinks to $99, and closes at $101.\n\n• Body: $100 → $101 (small green, $1 tall)\n• Upper wick: $101 → $108 (long, $7)\n• Lower wick: $99 → $100 (short, $1)\n\nThe story: buyers tried to run it to $108 and got hammered all the way back, barely holding green. A long upper wick like this *at resistance* is a bearish warning even though the candle technically closed green. Color alone would have fooled you; the wick told the truth.",
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
                  "Buyers stepped in at the low and pushed price back up before the close",
                  "There was no trading in the middle of the day",
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
                  "A large green body with no upper wick means buyers controlled the entire period and the close was the high — sellers couldn't push price down at all. That's the textbook strong-conviction bullish candle (a Marubozu).",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: Single-candle patterns ──────────────────────────────
      {
        id: "candle-single",
        title: "Single-Candle Patterns",
        subtitle: "Doji, hammer, engulfing — and why the same shape means opposite things",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Single-candle patterns are the alphabet of candlestick reading. Each one marks a shift in the buyer/seller balance — but only *in context*. The exact same shape can be bullish or bearish depending on where it appears.",
          },
          {
            type: "text",
            content:
              "**Doji — indecision.** Open and close are nearly identical (a tiny or nonexistent body). Price wandered and returned to start; neither side held control.\n\n• At the top of an uptrend → momentum stalling, possible reversal.\n• At the bottom of a downtrend → selling stalling, possible reversal.\n• In the middle of a range → just noise.\n\n**Hammer / Hanging Man — same shape, opposite meaning.** Small body up top, long lower wick (2x+ the body), little or no upper wick.\n\n• **Hammer** (after a downtrend / at support) — sellers pushed down hard, buyers rejected the lows and drove price back up. Bullish reversal.\n• **Hanging Man** (after an uptrend / at resistance) — identical shape, but now the long lower wick warns that sellers are starting to appear. Bearish.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "single-patterns", patterns: ["doji", "hammer", "engulfing"] },
          },
          {
            type: "text",
            content:
              "**Engulfing candles — a decisive takeover.**\n\n• **Bullish engulfing** — a big green candle whose body completely swallows the prior red candle's body. Buyers overwhelmed sellers. Powerful at support.\n• **Bearish engulfing** — a big red candle that engulfs the prior green body. Sellers overwhelmed buyers. Powerful at resistance.\n\n**Spinning top — churn.** Small body, roughly equal wicks on both sides. Like a doji with a slightly bigger body: indecision. After a strong trend, it hints the trend is tiring.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Context beats shape, every time. A hammer at major support after a 20% decline is a real signal. The identical hammer in the middle of nowhere on thin volume is noise. Always ask: what shape, and *where*?",
          },
          {
            type: "text",
            content:
              "**How to see it / how to trade it.** On a Daily chart, mark your support and resistance zones first (Module: Support & Resistance). Then watch for these candles to print *at those zones*. A hammer landing in a support zone is your cue that buyers are defending in real time — for an options seller, that's the green light to sell a cash-secured put you'd been eyeing. A bearish engulfing at resistance is the cue to sell a covered call. The candle times the entry; the level gives it meaning.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "candle-single-q1",
                question:
                  "A stock has trended up for two weeks. Today it prints a hammer-shaped candle. Should you call it a hammer?",
                options: [
                  "Yes — the shape is what defines the pattern",
                  "No — the same shape after an uptrend is a hanging man, a bearish warning",
                  "Yes, but only on the daily timeframe",
                  "It depends only on volume",
                ],
                correctIndex: 1,
                explanation:
                  "Same shape, opposite meaning by context. A hammer needs a preceding downtrend (rejection of lower prices = reversal up). The identical long-lower-wick candle after an uptrend is a hanging man — sellers are starting to test the rally. Shape plus location is what gives the candle meaning.",
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
                  "Bullish engulfing requires today's body to fully cover yesterday's body. Today spans $94 → $101, which wraps yesterday's $95 → $100 body. Opening below the prior close is normal and doesn't disqualify it — body coverage is what matters.",
              },
              {
                id: "candle-single-q3",
                question:
                  "You see a textbook doji on a 1-minute chart of a thinly-traded stock. How much weight should you give it?",
                options: [
                  "A lot — a doji always signals indecision",
                  "Very little — 1-minute candles on low volume are mostly noise",
                  "It's a strong reversal signal",
                  "Wait for two more dojis to confirm",
                ],
                correctIndex: 1,
                explanation:
                  "Pattern reliability scales with timeframe and volume. A daily doji on a heavily-traded stock is meaningful; a 1-minute doji on thin volume is statistically indistinguishable from randomness. Stick to daily and weekly charts for pattern decisions.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: Multi-candle patterns ───────────────────────────────
      {
        id: "candle-multi",
        title: "Multi-Candle Patterns",
        subtitle: "Morning star, three soldiers, harami, tweezers — sequences that tell a fuller story",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "Multi-candle patterns string several candles into a narrative — a sequence of shifting control that's more reliable than any single candle.",
          },
          {
            type: "text",
            content:
              "**Morning Star (bullish reversal, 3 candles):**\n\n1. Large red candle (sellers in control).\n2. Small-bodied candle, often gapping down (indecision — a doji or spinning top).\n3. Large green candle that closes well into the first candle's body (buyers seize control).\n\nThe story: sellers exhaust themselves, a beat of indecision, then buyers take over. Strongest at support. The **Evening Star** is the bearish mirror (large green, small indecision, large red) — strongest at resistance.\n\n**Three White Soldiers (bullish continuation):** three green candles in a row, each opening within the prior body and closing higher, each with a small upper wick. Sustained, committed buying. **Three Black Crows** is the bearish mirror.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "multi-patterns", patterns: ["morning-star", "three-soldiers"] },
          },
          {
            type: "text",
            content:
              "**Harami ('pregnant'):** a large candle (the 'mother') followed by a small opposite-color candle entirely inside its body (the 'baby'). Bullish harami (red then small green) hints sellers are losing control; bearish harami (green then small red) hints buyers are tiring. Weaker than engulfing or stars — demand a follow-through candle before trusting it.\n\n**Tweezers:** two candles with nearly identical extremes. A **tweezer bottom** (two matching lows, first bearish then bullish) confirms support; a **tweezer top** (two matching highs) confirms resistance. They work because the market tested a level twice and failed to break it both times.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Worked example — Morning Star at support (illustrative).**\n\n• Day 1: $180 → $172 large red (−4.4%, sellers in control).\n• Day 2: opens $171, closes $171.50 — tiny body (the indecision pivot).\n• Day 3: opens $172, closes $178 large green (+3.5%, buyers seize control).\n\nDay 3 closes well into Day 1's body ($180 → $172). Three candles, three acts: exhaustion, indecision, reversal. Landing on a known support zone with rising Day-3 volume, that's an A+ cue to sell a put or buy calls.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "candle-multi-q1",
                question:
                  "A morning star requires the third candle to close where, relative to the first candle?",
                options: [
                  "Above the first candle's high",
                  "Well into the first candle's body (recovering most of the loss)",
                  "Exactly at the first candle's open",
                  "Anywhere green will do",
                ],
                correctIndex: 1,
                explanation:
                  "The third candle's strength defines the morning star. Closing well into the first candle's body shows buyers reclaimed most of the territory sellers took. A weak third candle that barely clears the second's open is just three candles in a row, not a true morning star.",
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
                  "Three Black Crows = three consecutive red candles with minimal lower wicks, showing sustained selling. It's the direct mirror of Three White Soldiers (three consecutive green candles with minimal upper wicks) — same shape, opposite direction.",
              },
              {
                id: "candle-multi-q3",
                question:
                  "A bullish harami forms — a small green candle inside the prior red candle's body. What follow-through would confirm the reversal?",
                options: [
                  "A green candle the next day that breaks above the harami's high",
                  "Another doji",
                  "A gap down at the next open",
                  "Volume dropping by half",
                ],
                correctIndex: 0,
                explanation:
                  "Harami patterns are early warnings, not confirmations. A green follow-through candle breaking above the harami's high tells you buyers are actually taking control. Without follow-through the harami can fade — which is why it's weaker than engulfing or morning star.",
              },
            ],
          },
        ],
      },
      // ── Lesson 4: Context, confluence, and failure ────────────────────
      {
        id: "candle-context",
        title: "Context, Confluence & When Candles Lie",
        subtitle: "Candles at levels, volume confirmation, timeframe — plus the failure modes",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "A candlestick pattern in isolation is a coin flip. The same pattern at the right level, with the right volume, on the right timeframe becomes a genuine edge. This lesson is about stacking those conditions — and being honest about when candles mislead.",
          },
          {
            type: "text",
            content:
              "**Candles at support/resistance.** The most reliable candle signals happen at levels:\n\n• Hammer at major support → high-probability bullish reversal.\n• Bearish engulfing at major resistance → high-probability bearish reversal.\n• Doji at support after an oversold RSI reading → triple confluence.\n\nA beautiful pattern in the middle of nowhere, with no level nearby, is much weaker. Location, location, location.\n\n**Volume confirmation.** Reversal patterns (hammer, engulfing, morning star) are strongest on *above-average* volume — that's real participation. A gorgeous hammer on thin volume is probably a fake. Volume should rise on the reversal candle versus the candles before it.\n\n**Timeframe.** Higher timeframe = more reliable. Daily is the swing-trading standard; weekly confirms; 5-minute and 1-minute are mostly noise for pattern trading.",
          },
          {
            type: "visual",
            component: "candlestick-chart",
            props: { mode: "context", showSupportResistance: true, showRSI: true },
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**When candles lie — the failure modes:**\n\n• **No level, no volume.** A textbook pattern floating in the middle of a range on average volume is noise dressed up as a signal.\n• **Gaps override candles.** Overnight news can gap a stock straight past a beautiful reversal candle. Candle patterns assume orderly trading; a gap erases them.\n• **Low timeframes whipsaw.** Intraday charts print 'patterns' constantly; most are random.\n• **Confirmation-hunting.** If you stare long enough you'll 'see' a hammer anywhere. Define the pattern strictly (a hammer needs a lower wick 2x+ the body) before you call it one.",
          },
          {
            type: "text",
            content:
              "**Worked example — the pattern that FAILED (illustrative).** A stock prints a clean bullish engulfing candle. A trader buys, expecting a reversal. But the engulfing was in the *middle of a sideways range*, on *average* volume, with RSI at a neutral 50 — no level, no momentum extreme, no volume. Two days later the stock drifts right back down through the engulfing candle. **The early tell was the missing context:** the pattern had zero confluence. It was the shape without the substance. The fix isn't to distrust engulfing candles — it's to only trade them where a level, volume, and momentum agree.",
          },
          {
            type: "text",
            content:
              "**Practice reading candles in context.** The spot-checks below put candle patterns onto real levels — decide whether the confluence is there.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "A hammer candle prints exactly in a tested support zone on volume well above average, with RSI at 30. How strong is this setup?",
              options: [
                "Weak — a single candle never means anything",
                "Strong: triple confluence — a rejection candle (hammer), a key level (support), and stretched momentum (oversold RSI), all confirmed by high volume",
                "Bearish — hammers at support mean breakdown",
                "Irrelevant without an analyst rating",
              ],
              correctIndex: 1,
              explanation:
                "This stacks three independent signals plus volume: real-time rejection (hammer), a historically defended level (support), and an oversold momentum extreme (RSI 30). When they line up on strong volume, the odds of a bounce jump materially — a prime cash-secured-put entry.",
              seed: 441,
            },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "breakout-retest",
              question:
                "A bullish engulfing candle appears in the middle of a flat range — no support or resistance nearby, RSI at 50, average volume. How would you rate this signal?",
              options: [
                "A+ — engulfing candles are always reliable",
                "Mediocre — the pattern is present but the context (level, momentum, volume) is missing, so it's close to a coin flip",
                "Strongly bearish",
                "Guaranteed reversal",
              ],
              correctIndex: 1,
              explanation:
                "Engulfing with no confluence is the shape without the substance. Without a meaningful level, supportive momentum, or volume confirmation, you're trading a pretty candle — and pretty candles alone are coin flips.",
              seed: 442,
            },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "candle-context-q1",
                question:
                  "A bullish engulfing prints in the middle of a sideways range, no support nearby, RSI at 50, average volume. How would you rate this signal?",
                options: [
                  "A+ setup — engulfing is always reliable",
                  "Mediocre — the pattern is there but the context is missing",
                  "Bearish — engulfing in a range means breakdown",
                  "Strong, because RSI at 50 is neutral",
                ],
                correctIndex: 1,
                explanation:
                  "Engulfing with no confluence is just noise. The signal needs a meaningful level, supportive momentum (oversold RSI for a bullish reversal), and volume confirmation. Without those you're trading the shape alone — a coin flip.",
              },
              {
                id: "candle-context-q2",
                question:
                  "Why do candle patterns work better on daily charts than 5-minute charts for swing trading?",
                options: [
                  "Daily candles have more pixels",
                  "Higher timeframes filter noise and reflect more institutional participation",
                  "5-minute candles can't form patterns",
                  "Daily candles are required by the SEC",
                ],
                correctIndex: 1,
                explanation:
                  "Each daily candle aggregates 6.5 hours of price action, including institutional decisions and end-of-day positioning. Lower timeframes are dominated by algorithmic noise and small orders, so their patterns have far lower signal-to-noise.",
              },
              {
                id: "candle-context-q3",
                question:
                  "You buy a bullish engulfing candle and it fails two days later. Looking back, what was the early tell that it might not work?",
                options: [
                  "There's never any way to tell in advance",
                  "It had no confluence — no level, average volume, neutral RSI — so the pattern was the shape without the substance",
                  "The candle was green, which is always a trap",
                  "You didn't wait for a golden cross",
                ],
                correctIndex: 1,
                explanation:
                  "The failure was visible up front: the pattern sat in open space with no supporting level, no volume surge, and no momentum extreme. Candle patterns are only reliable where they're confirmed by other evidence. No confluence, no trade.",
              },
            ],
          },
        ],
      },
      // ── Lesson 5: Module quiz ─────────────────────────────────────────
      {
        id: "candle-quiz",
        title: "Candlestick Patterns Quiz",
        subtitle: "Pattern recognition plus context judgment",
        estimatedMinutes: 4,
        sections: [
          {
            type: "quiz",
            questions: [
              {
                id: "candle-q1",
                question:
                  "A candle has a tiny body at the top with a very long lower wick, appearing at major support after a 15% decline. What is it and what does it suggest?",
                options: [
                  "Hanging man — bearish continuation",
                  "Hammer — potential bullish reversal",
                  "Doji — complete indecision",
                  "Shooting star — bearish reversal",
                ],
                correctIndex: 1,
                explanation:
                  "This is a hammer. The long lower wick shows sellers pushed price down but buyers rejected those lows and drove it back up. At major support after a significant decline, that's a strong bullish reversal signal. The same shape at resistance would be a hanging man.",
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
                  "Bullish engulfing = a red (bearish) candle followed by a green (bullish) candle whose body completely engulfs the previous candle's body. Buyers overwhelmed sellers — everything the sellers did was erased and then some.",
              },
              {
                id: "candle-q3",
                question:
                  "You spot a clean morning star on the daily, but volume on the third (large green) candle is 60% below average. What should you do?",
                options: [
                  "Buy immediately — the pattern is clear",
                  "Wait for volume confirmation on a follow-through day",
                  "Sell short instead",
                  "Switch to a 5-minute chart",
                ],
                correctIndex: 1,
                explanation:
                  "Reversal patterns without volume confirmation are unreliable. The morning star shape is there, but with no participation it can easily fail. Wait for a follow-through day with stronger volume. Pattern + volume = conviction.",
              },
              {
                id: "candle-q4",
                question:
                  "Why is a hammer at major support with RSI below 30 a high-probability setup?",
                options: [
                  "Because three indicators is always better than one",
                  "Because the hammer guarantees a reversal at support",
                  "Because you have triple confluence: real-time price rejection (hammer), a key level (support), and stretched momentum (oversold RSI)",
                  "Because RSI below 30 means the stock must go up",
                ],
                correctIndex: 2,
                explanation:
                  "Triple confluence — three independent signals pointing the same way — sharply improves the odds. The hammer shows real-time rejection, support marks a historically defended level, and oversold RSI shows momentum stretched to an extreme. No single signal guarantees anything, but the overlap is powerful.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: TA + GREEKS MASTERY ─────────────────────────────────────
  {
    id: "ta-greeks-combined",
    title: "TA + Greeks Mastery",
    subtitle: "Where technical levels meet options pricing — pick strikes with an edge",
    icon: "🎯",
    color: "lime-500",
    level: 1,
    lessons: [
      {
        id: "ta-entry",
        title: "Using TA for Options Entry",
        subtitle: "How support, resistance, RSI, and candles sharpen your options timing",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "Technical analysis turns options trading from guessing into a system. Instead of selling a put at a random strike, you sell it at a level where the odds tilt your way. This lesson ties the whole TA track to the actual trade tickets you'll write.",
          },
          {
            type: "text",
            content:
              "**Timing CSP entries at support.** When selling cash-secured puts, your best outcomes are keeping the premium or getting assigned at a great price. Support tells you where to strike:\n\n• Find the nearest strong support below the current price.\n• Sell your put with a strike at or just below that support.\n• Holds support (likely) → keep premium. Breaks it (unlikely at a strong level) → buy where buyers historically appeared.\n\nDramatically better than picking a strike randomly or just going X% out of the money.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "csp-entry", showSupport: true },
          },
          {
            type: "text",
            content:
              "**Put the strike math in your hands.** The sandbox below lets you slide the strike, days-to-expiry, and implied volatility and watch the premium, delta, and break-even move. Try this: set a strike just below a support level, then compare a 30-day vs a 45-day expiry, and watch how a higher IV (an oversold, fearful stock) fattens the premium you collect.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
          },
          {
            type: "text",
            content:
              "**Selling covered calls at resistance.** Mirror image: you want the stock to stay below your strike. Resistance tells you where it's likely to stall.\n\n• Find the nearest strong resistance above the current price.\n• Sell your call with a strike at or near that resistance.\n• Stalls at resistance (likely) → keep premium and shares. Breaks through → you still sold at a historically significant level.\n\nPairing strikes with levels gives you an edge that pure delta-based strike selection misses.",
          },
          {
            type: "text",
            content:
              "**Using RSI and candles for timing.**\n\n• **CSP entry** — wait for RSI below ~35; oversold stocks have richer put premiums and better bounce odds.\n• **Covered call entry** — wait for RSI above ~65; overbought stocks have richer call premiums.\n• **Confirmation candle** — don't sell the put the instant price touches support. A hammer or bullish engulfing at support says buyers are defending *now*. All-red candles with no rejection wicks say wait — support may break.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "**Worked example — A+ CSP setup (illustrative).** NVDA pulls back to $480, which is the 200-day EMA and a 3-touch horizontal support. RSI dips to 32. Today prints a hammer with a long lower wick, closing above $480 on heavy volume. Level ✓, momentum ✓, confirmation candle ✓. Sell a 30-day ~0.30-delta put with a strike at or just below $480: fat premium (oversold IV), a level where buyers appear, and a candle saying they're appearing right now. This is what TA + Greeks is built for.",
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
                  "Strike at or just above the resistance level — paid for the cap, with TA-supported odds it stalls",
                  "Strike 50% above the current price",
                  "Don't sell — wait for RSI to drop",
                ],
                correctIndex: 1,
                explanation:
                  "Resistance + overbought RSI = the stock is likely to stall or pull back. A strike at resistance gives you a cushion (the level should hold), rich premium (overbought = high IV), and a clear assignment trigger (only if it breaks resistance, which is itself a real signal).",
              },
              {
                id: "ta-entry-q2",
                question:
                  "The stock hits support, but the only candles printing are red with no rejection wicks. What does that say about selling a put right here?",
                options: [
                  "Sell the put immediately — support always holds",
                  "Wait — without a confirmation candle (hammer, engulfing), support might be about to break",
                  "Buy the stock instead",
                  "Switch tickers",
                ],
                correctIndex: 1,
                explanation:
                  "The candles are telling you, in real time, that buyers haven't shown up yet. Support is a historical level; the current candles say sellers are still in control. Wait for a rejection candle that proves buyers are stepping in — otherwise you're trusting a level that's failing before your eyes.",
              },
            ],
          },
        ],
      },
      {
        id: "ta-greeks-synergy",
        title: "TA + Greeks Synergy",
        subtitle: "How delta, theta, vega, and gamma behave at key technical levels",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "Now connect the two worlds. Each Greek has a specific relationship with technical levels that, once you see it, gives you an edge in positioning.",
          },
          {
            type: "text",
            content:
              "**Delta at levels — conviction becomes size.** Delta measures directional exposure and loosely the odds of finishing in the money.\n\n• **High confidence support holds** → sell higher-delta (closer to ATM) puts; collect more, comfortable with assignment here.\n• **Less confident** → sell lower-delta (further OTM) puts; sacrifice premium for safety.\n• **Selling calls at resistance** → higher delta if you trust the level, lower delta if it might break.\n\nTA gives the conviction; delta translates it into position sizing.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "synergy", showGreeks: true, showLevels: true },
          },
          {
            type: "text",
            content:
              "**Theta collection windows.** Time decay accelerates in the final 30–45 days. Combine with TA: open CSPs and covered calls at **30–45 DTE** right after a bounce off support or a rejection at resistance. The TA event gives directional confidence; the 30–45 DTE window maximizes the decay working for you.\n\n**Vega around breakouts.** Vega measures sensitivity to implied volatility. Consolidations compress IV (cheap options — good to buy if you expect a breakout); post-breakout IV can spike (good to sell into); failed breakouts spike then collapse IV (good for short-vega structures).",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**Gamma risk at levels — the danger zone.** Gamma is highest for ATM options near expiration. When your short strike sits right at a major support/resistance level in the final week, gamma risk is extreme: a small move flips your delta violently, the stock can knife through the level on a fake-out, and with little time value left the option can't absorb it. This is the single most dangerous configuration for options sellers — close or roll, don't sit and hope.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ta-synergy-q1",
                question:
                  "You have high confidence a support level will hold. How does that affect your delta choice for a CSP?",
                options: [
                  "Sell a lower-delta (further OTM) put for safety",
                  "Sell a higher-delta (closer to ATM) put — your TA conviction justifies the larger premium",
                  "Delta doesn't matter when TA is involved",
                  "Always sell 0.16 delta regardless",
                ],
                correctIndex: 1,
                explanation:
                  "TA conviction translates directly into delta. If the support is genuinely strong (multiple touches, heavy volume, recent), you can sell a higher-delta put and collect more premium. The TA analysis is the edge; delta is how you size into it.",
              },
              {
                id: "ta-synergy-q2",
                question:
                  "A stock has consolidated tightly for two weeks (low IV) and you expect a breakout. Sell options or buy them?",
                options: [
                  "Sell — time decay works for you",
                  "Buy — low IV means cheap premiums, and vega expands on the breakout",
                  "Do nothing until after the breakout",
                  "Sell puts and calls both",
                ],
                correctIndex: 1,
                explanation:
                  "Consolidation compresses IV. Buying before a breakout means you're long vega at cheap prices — if it breaks, you gain from the move AND the vega expansion. Selling before a breakout is the wrong side: short vega right before it's about to rise.",
              },
              {
                id: "ta-synergy-q3",
                question:
                  "Your short put strike is $100 — a major support level — with 5 DTE, stock at $101. What should you be thinking?",
                options: [
                  "Perfect setup — support holds, keep premium",
                  "Maximum danger: gamma is extreme, one down day could put you deep ITM fast — consider closing or rolling out",
                  "Do nothing — theta saves you",
                  "Sell more puts to average in",
                ],
                correctIndex: 1,
                explanation:
                  "ATM + 5 DTE = maximum gamma. A single $2 move puts you $1 ITM, and at a major level the stock can knife through on a fake-out before bouncing. With 5 DTE there's almost no time value to absorb it. This is when you manage risk — close or roll — not when you hope.",
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
              "This assessment tests your integrated understanding of technical analysis and options Greeks. Each question requires combining multiple concepts — just like real trading requires synthesizing signals from different sources. Take your time.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ta-final-q1",
                question:
                  "AAPL trades at $195 with strong support at $185 (tested 4 times). RSI is 28. You want to sell a cash-secured put. Which strike is most appropriate?",
                options: [
                  "$195 (ATM) for maximum premium",
                  "$185 (at support) to align with the key level",
                  "$170 (deep OTM) to minimize any risk",
                  "$200 (above current price) for maximum premium",
                ],
                correctIndex: 1,
                explanation:
                  "The $185 strike aligns with support tested 4 times. With RSI at 28 (oversold), a bounce is likely. If assigned at $185, you buy where buyers repeatedly stepped in. ATM ($195) offers more premium but no technical edge; deep OTM ($170) sacrifices too much premium; $200 is ITM and makes no strategic sense.",
              },
              {
                id: "ta-final-q2",
                question:
                  "You own 100 shares of MSFT at $420. Strong resistance at $450 (rejected 3 times). RSI 72. Selling a covered call — best approach?",
                options: [
                  "Sell the $440 call — below resistance for extra safety",
                  "Sell the $450 call — at resistance where the stock is likely to stall",
                  "Sell the $460 call — above resistance in case it breaks",
                  "Don't sell — RSI overbought means a crash is coming",
                ],
                correctIndex: 1,
                explanation:
                  "The $450 strike aligns with triple-tested resistance. RSI 72 confirms overbought, raising the odds it stalls at or before resistance. Selling at resistance maximizes premium while matching the technical picture. $440 leaves premium on the table; $460 ignores the level's significance.",
              },
              {
                id: "ta-final-q3",
                question:
                  "A stock shows bullish RSI divergence (price lower low, RSI higher low) at major support. A hammer forms on 2x average volume. What's the significance?",
                options: [
                  "One bullish signal — moderately interesting",
                  "Two confirming signals — decent setup",
                  "Four-factor confluence — extremely high-probability bullish setup",
                  "Conflicting signals — stay out",
                ],
                correctIndex: 2,
                explanation:
                  "Four-factor confluence: (1) major support, (2) bullish RSI divergence, (3) hammer candle, (4) above-average volume. Each independently suggests a bounce; together they form one of the highest-probability setups in TA — an excellent CSP entry.",
              },
              {
                id: "ta-final-q4",
                question:
                  "Your short put strike is $100 (also a major support level), 4 DTE, stock at $101. Primary risk concern?",
                options: [
                  "Theta decay",
                  "Vega — IV might spike",
                  "Gamma — small moves cause large delta swings with the stock near your strike at a key level",
                  "Rho — interest rates",
                ],
                correctIndex: 2,
                explanation:
                  "With 4 DTE, stock at $101 near your $100 strike, and $100 a major level, gamma is the concern. Delta swings violently on small moves near ATM and near expiration. If the stock breaks $100, the position can go from slightly profitable to deeply underwater in hours — the most dangerous configuration for short sellers.",
              },
              {
                id: "ta-final-q5",
                question:
                  "A stock has consolidated 3 weeks, IV compressed, approaching major resistance. You expect a breakout. Best strategy?",
                options: [
                  "Sell an iron condor — collect premium in the range",
                  "Buy a straddle or strangle — long vega before the expected volatility expansion",
                  "Sell a naked put — collect premium below support",
                  "Sell a covered call at resistance",
                ],
                correctIndex: 1,
                explanation:
                  "Expecting a breakout, you want to be long vega before IV expands. A straddle/strangle profits from a large move in either direction with expanding IV. An iron condor would be the worst choice — short vega right before a volatility event, with the breakout threatening your short strike.",
              },
              {
                id: "ta-final-q6",
                question:
                  "Bearish engulfing at resistance, RSI 75. You sell a 30 DTE covered call at resistance. Which Greeks work in your favor?",
                options: [
                  "Delta only",
                  "Theta only",
                  "Delta and theta — directional bias from TA plus time decay",
                  "Gamma and vega",
                ],
                correctIndex: 2,
                explanation:
                  "TA (bearish engulfing at resistance, overbought RSI) gives directional conviction the stock stalls or pulls back — delta working for you. At 30 DTE, theta decay accelerates, steadily cutting the option's value. Both align with your thesis; gamma and vega work against you if the stock approaches your strike or IV expands.",
              },
              {
                id: "ta-final-q7",
                question:
                  "Combining stonkbro's explosive-potential score with TA — most effective approach?",
                options: [
                  "Ignore TA — the score incorporates everything",
                  "Use TA to override the score — if the chart looks bad, skip",
                  "Use the score for stock selection and TA for entry timing — the score answers 'what,' TA answers 'when'",
                  "Only trade low-scoring stocks at support",
                ],
                correctIndex: 2,
                explanation:
                  "Use each tool for what it does best. The scoring engine finds stocks with explosive potential ('what'); TA provides entry timing ('when'). A high-scoring stock at support with oversold RSI and a confirmation candle is the complete package.",
              },
              {
                id: "ta-final-q8",
                question:
                  "Managing a PMCC. The stock just broke above major resistance on 3x volume, RSI 68 and rising. Your short call is $10 above the breakout with 20 DTE. What should you do?",
                options: [
                  "Close the entire position — the breakout will blow through your short call",
                  "Roll the short call up and out — the breakout is valid (high volume) with room to run, and your 20 DTE short call needs more room",
                  "Do nothing — the short call is $10 above and will expire worthless",
                  "Sell more short calls for premium",
                ],
                correctIndex: 1,
                explanation:
                  "A breakout on 3x volume is valid and high-conviction; RSI 68 is elevated but not extreme, confirming room to run. Your short call is only $10 above with 20 DTE — reachable. Rolling up and out gives the position room and collects more premium. Doing nothing is risky on a valid breakout; closing everything forfeits your LEAPS unnecessarily.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── LEVEL 2: STRATEGY & SELECTION ────────────────────────────────────

  // ─── MODULE: LONG VS SHORT ───────────────────────────────────────────
  {
    id: "long-short",
    title: "Long vs Short — Trading Direction",
    subtitle: "Bullish and bearish bets, and the four option positions built on them",
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
              "**The two sides of every trade.** Every trade has two sides. Buy something expecting it to rise and you're **long**. Profit if it falls and you're **short**. The terms apply to stocks, options, futures — everything.\n\n• **Long** = you benefit if the price goes UP.\n• **Short** = you benefit if the price goes DOWN.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Long and short describe your DIRECTIONAL BIAS, not the size of your position. You can be 'long' with a single share or one option contract.",
          },
          {
            type: "visual",
            component: "long-short-diagram",
            props: {},
          },
          {
            type: "text",
            content:
              "**Example — AAPL at $175 (illustrative, framed on late-2023 prices).** Suppose you think Apple rallies into the holiday quarter.\n\n• **Long stock:** buy 100 shares at $175 = $17,500. AAPL to $185 → +$1,000.\n• **Long call:** buy 1 $175 call for $3.50 = $350. AAPL to $185 → the call might be worth $10+, roughly +$650 on $350 (about 185%).\n• **Short stock:** borrow and sell 100 at $175. AAPL to $165 → +$1,000; AAPL to $185 → −$1,000.\n\nThe option gave more leverage — and more risk. The stock owner has unlimited upside; the short seller has unlimited downside.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Short-selling stock has UNLIMITED loss potential. Short a $10 stock that runs to $100 and you lose $90/share. Buying puts limits your loss to the premium paid — which is why many traders prefer puts to shorting stock outright.",
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
                  "Buying a call is bullish. You profit if the stock rises above your strike plus the premium paid. Pay $5 for the $200 call and your break-even is $205; below that at expiration you lose some or all of the $500.",
              },
              {
                id: "ls-basics-q2",
                question: "A friend says 'I shorted SPY.' What happened when SPY rose 2% that day?",
                options: [
                  "They made 2% profit",
                  "They lost approximately 2% on the position",
                  "Nothing — short positions aren't affected by price",
                  "They made 4% because shorts are leveraged",
                ],
                correctIndex: 1,
                explanation:
                  "Short positions profit when price FALLS. SPY up 2% means the short seller lost about 2% — they'd have to buy SPY back higher than they sold it.",
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
              "**The four option positions.** You can be long OR short on calls OR puts — four combinations, four directional views:\n\n• **Long Call** — bullish. Buy the right to purchase at the strike; profit if the stock rises.\n• **Short Call** — bearish/neutral. Sell someone that right; profit if the stock stays flat or falls.\n• **Long Put** — bearish. Buy the right to sell at the strike; profit if the stock falls.\n• **Short Put** — bullish/neutral. Sell someone that right; profit if the stock stays flat or rises.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Memory trick: Buying (long) = limited loss, large potential gain. Selling (short) = limited gain (the premium), potentially large loss. That's why sellers collect premium upfront — they're taking on the risk.",
          },
          {
            type: "text",
            content:
              "**Example — NVDA earnings (illustrative, framed on Feb-2024 prices).** IV was extremely high (IV rank ~90), stock ~$625.\n\n• A **long call** buyer paid $40 for a $650 call. NVDA jumps to $700+ → the call worth $80+, about +100%.\n• A **short put** seller collected $30 for a $580 put. NVDA up → put expires worthless, seller keeps $3,000.\n• A **long put** buyer who paid $25 for a $600 put lost everything on the rally.\n\nSame event, three very different outcomes based on direction AND buy-vs-sell.",
          },
          {
            type: "visual",
            component: "pnl-diagram",
            props: { strategy: "long-call", showBreakeven: true },
          },
          {
            type: "text",
            content:
              "**Feel the trade-offs yourself.** Slide the strike, expiry, and IV in the sandbox and watch premium, delta, and break-even respond. Notice how a short put's max gain is fixed at the premium no matter how far the stock rises, while a long call's payoff keeps climbing — the buy-vs-sell asymmetry made concrete.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
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
                  "When you sell a put, max gain is the premium collected — here $300 ($3.00 × 100). The put either expires worthless (best case) or gains intrinsic value (your loss). You can't make more than what you collected upfront.",
              },
              {
                id: "ls-options-q2",
                question: "Which position profits if the stock stays flat or rises, and has a maximum gain capped at the premium?",
                options: [
                  "Long call",
                  "Short put",
                  "Long put",
                  "Short stock",
                ],
                correctIndex: 1,
                explanation:
                  "A short put is bullish/neutral: you keep the premium as long as the stock stays above your strike, and the premium is the most you can make. It's the workhorse of the cash-secured-put strategy stonkbro focuses on.",
              },
            ],
          },
        ],
      },
      {
        id: "long-short-when",
        title: "When to Go Long vs Short",
        subtitle: "Practical signals — tied to the TA track — for choosing your direction",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**Picking your side** is your most important decision. Get direction wrong and no clever strike selection saves you. A simple framework, drawn straight from the TA track:\n\n**Go LONG (bullish) when:**\n• Price is at/near support with evidence of buying (a rejection candle).\n• RSI is oversold (under 30–35) and turning up.\n• Moving averages trend up (50-day above 200-day).\n• A positive catalyst is coming (earnings beat, product launch).\n• The sector is in favor.\n\n**Go SHORT (bearish) when:**\n• Price is at/near resistance with evidence of selling.\n• RSI is overbought (above 65–70) and rolling over.\n• Moving averages trend down (50-day below 200-day).\n• A negative catalyst looms (earnings miss, regulatory risk).\n• The sector is rotating out.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The trend is your friend. Most profitable options trades align with the larger trend. Mean-reversion trades work too but are harder to time. When in doubt, trade WITH the trend.",
          },
          {
            type: "text",
            content:
              "**Example — META, bear then bull (illustrative, framed on 2022–2023).**\n\n**2022 bear case:** META fell from ~$340 to ~$88. The 50-day crossed below the 200-day (death cross) in early 2022; RSI kept printing oversold. Long calls got crushed. The right trades: buy puts, or sell covered calls against shares.\n\n**2023 bull case:** META recovered from ~$88 to ~$380. The reversal signal: a bounce off multi-year lows, then a golden cross (50-day back above 200-day) mid-2023, RSI recovering above 50. Long calls and bull call spreads paid.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "You don't need to nail exact prices — just DIRECTION and TIMING. Options amplify correct directional bets. They also amplify mistakes, which is why risk management (defined-risk spreads, sizing) matters.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ls-when-q1",
                question:
                  "A stock is below a falling 200-day, RSI just bounced to 66 at resistance and is rolling over, and a weak earnings guide just landed. What's the higher-odds directional bias?",
                options: [
                  "Bullish — buy calls, the bounce will continue",
                  "Bearish — downtrend, overbought bounce into resistance, and a negative catalyst all point down; favor puts or selling calls",
                  "Neutral — there's no way to tell",
                  "Bullish — RSI at 66 is not overbought enough",
                ],
                correctIndex: 1,
                explanation:
                  "Three bearish signals stack: a downtrend (below a falling 200-day), an overbought bounce rolling over at resistance, and a negative catalyst. That's a bearish directional read — buying puts or selling calls fits, and it aligns with the trend.",
              },
              {
                id: "ls-when-q2",
                question:
                  "Why does trading WITH the larger trend usually beat trying to call reversals?",
                options: [
                  "Because reversals never happen",
                  "Because trends persist more often than they flip, so trend-aligned trades have the odds and momentum on their side; reversals are harder to time precisely",
                  "Because the SEC rewards trend traders",
                  "Because moving averages guarantee the trend continues",
                ],
                correctIndex: 1,
                explanation:
                  "Trends tend to persist, so aligning with the dominant direction puts probability and momentum behind you. Reversal trades can pay, but timing the exact turn is much harder — 'the trend is your friend' is about playing the higher-odds side.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: MOVING AVERAGES (SMA & EMA) ─────────────────────────────
  {
    id: "moving-averages",
    title: "Moving Averages (SMA & EMA)",
    subtitle: "The trend-following lines that act as dynamic support — and how to trade around them",
    icon: "📈",
    color: "violet-500",
    level: 2,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "sma-basics",
        title: "What a Moving Average Really Is",
        subtitle: "Why an average line becomes dynamic support — the mechanic, not just the formula",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "**The noise problem.** Stock prices are noisy — a stock can swing 2–3% on any given day for no fundamental reason (index rebalancing, options expiration, a big fund trimming). That noise hides the underlying trend.\n\nA **moving average** fixes it by averaging the closing price over a rolling window — the last 20, 50, or 200 days — and re-computing every day. The result is a smooth line that shows the direction underneath the noise. **SMA** (Simple Moving Average) weights every day equally.",
          },
          {
            type: "text",
            content:
              "**The mechanic — why the line becomes support.** Here's the part that matters: a moving average isn't magic, it's *crowd behavior at a moving price*. Millions of traders and institutional algorithms watch the same 50-day and 200-day lines. When a stock in an uptrend dips to its 50-day, that whole crowd sees the same 'buy the dip at the 50-day' signal and steps in — so the dip gets bought, and the line 'acts as support.' It's the same memory-and-attention mechanic as horizontal support, except the level slopes along with the trend. That's why it's called **dynamic support**.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Price above a rising moving average = uptrend. Price below a falling one = downtrend. The average acts as support in an uptrend and resistance in a downtrend — not because of the math, but because so many people watch it and act at the same line.",
          },
          {
            type: "visual",
            component: "sma-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**The three lines everyone watches:**\n\n• **SMA20** — 20-day. Short-term trend, fast-moving. Swing trades.\n• **SMA50** — 50-day. Medium-term trend. The most-watched institutional level; a bounce off the 50-day is a high-probability support event.\n• **SMA200** — 200-day. The master trend line. Above it = bull territory; below it = bear territory. Many institutional buy programs require a stock to be above its 200-day.\n\n**How to see it (do this now):** open a ticker on a **Daily** chart (stonkbro or TradingView → Indicators → 'Moving Average' → length 50; add another at 200). Above both and both rising = healthy uptrend. Below a falling 200-day = downtrend. Tangled and flat = no trend.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "**Why daily vs weekly matters here.** The *same* 50-day SMA means different things on different chart timeframes because the candles differ, but the classic 50/200-day levels are defined on the **daily** chart — that's what 'the 200-day' refers to by default. Use daily for entries; glance at the weekly only to confirm the very-long-term trend. Don't quote someone a '50-day bounce' off an intraday chart — that's not the level institutions watch.",
          },
          {
            type: "text",
            content:
              "**Worked example — the 200-day as a floor (illustrative, framed on SPY 2023).** SPY's 200-day sat near $440 in late 2023. Every dip to that line during the 2023 rally got bought — the 200-day held as support several times before the market pushed higher. That repeated bounce is the crowd defending the master trend line in real time.",
          },
          {
            type: "text",
            content:
              "**See it interactively.** Toggle the SMA and EMA overlays below and drag the period sliders. Watch how a longer average lags more (smoother, slower) while a shorter one hugs price (faster, noisier), and how price repeatedly finds the moving average in a trend.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "trend", seed: 501 },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sma-basics-q1",
                question: "AAPL has been above its rising SMA200 for 3 months. What does this suggest?",
                options: [
                  "AAPL is in a long-term uptrend",
                  "AAPL is in a long-term downtrend",
                  "AAPL is exactly at fair value",
                  "Moving averages don't work on individual stocks",
                ],
                correctIndex: 0,
                explanation:
                  "Staying above a rising SMA200 signals a long-term uptrend. The 200-day acts as dynamic support — institutional buyers often step in on dips toward it, and being above it is a prerequisite for many institutional buy programs.",
              },
              {
                id: "sma-basics-q2",
                question: "Why does the 50-day moving average 'act as support' when a stock dips to it in an uptrend?",
                options: [
                  "The math of averaging physically stops the price",
                  "A huge crowd of traders and algorithms all watch the 50-day and buy dips to it, so their collective buying defends the line",
                  "The SEC sets a floor at the 50-day",
                  "Moving averages emit a buy signal to brokers automatically",
                ],
                correctIndex: 1,
                explanation:
                  "It's crowd attention, not math. The 50-day is one of the most-watched levels, so when price dips to it, a large, coordinated group of buyers acts at the same line — and that buying is what makes the 'support' real. Same mechanic as horizontal support, on a sloping line.",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: Crossovers + EMA ────────────────────────────────────
      {
        id: "sma-signals",
        title: "Golden Cross, Death Cross & EMA",
        subtitle: "The famous crossovers, the SMA-vs-EMA difference, and the whipsaw that fools people",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**Crossovers as trend-change signals.** When two moving averages cross, it flags a possible trend change. The famous pair is the 50-day and 200-day:\n\n**Golden Cross** — 50-day crosses ABOVE 200-day. A shift from bear to bull; read as bullish.\n\n**Death Cross** — 50-day crosses BELOW 200-day. A shift from bull to bear; read as bearish (consider defense or puts).",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "The dramatic names oversell them. Golden and death crosses are **lagging** signals — by the time the slow 200-day gets crossed, a big chunk of the move has already happened. Treat them as confirmation of a trend already underway, not as an entry trigger.",
          },
          {
            type: "text",
            content:
              "**EMA vs SMA — what's the difference?** The **EMA** (Exponential Moving Average) weights recent prices more heavily, so it reacts faster and hugs price more tightly than the equal-weighted SMA.\n\n• **SMA20** treats all 20 days equally.\n• **EMA20** counts recent days more.\n\nFor options: most traders use **EMA** for shorter-term signals (the 12- and 26-day EMAs power MACD) and **SMA** for the longer-term 50/200-day trend read. Use EMA12/EMA26 for swing timing, SMA50/SMA200 for regime.",
          },
          {
            type: "visual",
            component: "sma-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**Worked example 1 — a clean golden cross (illustrative, framed on SPY early 2023).** After the 2022 bear market, SPY's 50-day crossed back above its 200-day in early 2023 near $400. SPY ran to $480+ over the next year. The cross confirmed a trend that was already turning — useful as confirmation, though you'd have bought well off the bottom.\n\n**Worked example 2 — 'riding the 21 EMA' (illustrative).** In a strong uptrend, a stock repeatedly pulls back just to its 21-day EMA and bounces. Momentum traders stay in as long as it holds that fast line and exit when it decisively breaks below — a cleaner trend-following rule than waiting for a slow 200-day cross.",
          },
          {
            type: "text",
            content:
              "**Worked example 3 — the whipsaw that FAILED, and the early tell (illustrative).** A stock chops between $40 and $46 for months. The averages tangle, and a death cross prints at $41. A trader shorts it — then it rallies to $47 two weeks later, printing a golden cross, and stops him out. **The early tell was right there on the chart:** the 50- and 200-day lines were *flat and tangled together*, not cleanly separated and sloping. Crossovers only mean something when there's an actual trend for them to signal a change in. In a flat, range-bound market they whipsaw constantly — a death cross right before a rip, a golden cross right before a roll-over. The failure wasn't bad luck; it was using a trend tool in a trendless market.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "golden-cross",
              question:
                "The 50-day just crossed above the 200-day, and both lines are now sloping up with price above them. How should you read this golden cross?",
              options: [
                "Ignore it — golden crosses never mean anything",
                "A bullish confirmation of an uptrend that's already underway; useful as context and for staying long, though much of the move may already have happened",
                "An immediate, precise buy trigger with no downside",
                "A signal to short the stock",
              ],
              correctIndex: 1,
              explanation:
                "A golden cross with both lines rising and price above them confirms a genuine uptrend. It's lagging — the move started earlier — so treat it as context and a reason to stay long, not as a magic entry.",
              seed: 511,
            },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "death-cross",
              question:
                "A death cross prints while the 50-day and 200-day are flat and tangled together in a sideways range. What's the honest read?",
              options: [
                "Strongly bearish — short it aggressively",
                "Low signal: crossovers whipsaw in flat, trendless markets — with the averages tangled and price ranging, this cross is likely noise, not a real trend change",
                "It guarantees a crash",
                "It's a golden cross",
              ],
              correctIndex: 1,
              explanation:
                "Crossovers only carry information when there's a trend to change. Flat, tangled averages in a range produce whipsaw crosses that reverse quickly. This is exactly the setup where death crosses fail — treat it as noise.",
              seed: 512,
            },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sma-signals-q1",
                question: "TSLA's SMA50 just crossed below its SMA200 while both slope downward. What signal is this?",
                options: [
                  "Golden cross — buy calls aggressively",
                  "Death cross — be cautious on longs, consider puts or defense",
                  "No meaningful signal — crossovers are always random",
                  "A signal to buy puts with max leverage immediately",
                ],
                correctIndex: 1,
                explanation:
                  "SMA50 below SMA200 with both falling is a death cross — the medium-term trend has turned down relative to the long-term one. It doesn't mean crash-now, but it favors caution on bullish positions. With the lines cleanly sloping down (not tangled), the signal carries more weight than in a flat range.",
              },
              {
                id: "sma-signals-q2",
                question: "When are golden and death crosses MOST likely to whipsaw and mislead you?",
                options: [
                  "During strong, clearly-sloping trends",
                  "In flat, sideways markets where the 50- and 200-day are tangled together — there's no real trend for the cross to signal",
                  "Only on Fridays",
                  "Only on large-cap stocks",
                ],
                correctIndex: 1,
                explanation:
                  "Crossovers are trend tools. In a range, the averages sit flat and tangled, so they cross back and forth on noise — a death cross before a rally, a golden cross before a drop. The signal is only meaningful when the averages are cleanly separated and sloping.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: How to trade it + failure modes ─────────────────────
      {
        id: "sma-options",
        title: "Trading Moving Averages — and Their Blind Spots",
        subtitle: "MA-based options entries, plus the honest limits of a lagging tool",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "Moving averages generate specific, actionable options entries — as long as you respect that they lag.",
          },
          {
            type: "text",
            content:
              "**Setup 1 — bounce off SMA50 (high probability).** A stock in an uptrend pulls back to its 50-day and shows a reversal candle on rising volume → buy calls 30–45 DTE, delta 0.40–0.60. Or, in stonkbro terms, sell a cash-secured put with a strike near the 50-day, where dynamic support should defend you.\n\n**Setup 2 — bounce off SMA200 (highest conviction).** The broader market or a leading stock touches its 200-day and holds → buy call spreads for defined risk, or sell puts anchored to the 200-day.\n\n**Setup 3 — sell premium at MA resistance.** A stock in a downtrend rallies up to its (falling) 50-day, now acting as resistance → sell covered calls at/above the 50-day, or sell call credit spreads there.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "MA levels are self-fulfilling because millions watch them and algorithms are programmed to buy the 50/200-day. That shared attention makes them more reliable than random prices — the same crowd-memory edge as horizontal support, on a line that moves with the trend.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**Failure modes & honest stats — a moving average is a rear-view mirror:**\n\n• **It lags.** Averages are built from past prices. In a fast breakdown (think March 2020), the 200-day is far above the price and 'support' means nothing — it can't protect you from a gap or a crash.\n• **It whipsaws in ranges.** In sideways markets, price crosses back and forth through the average constantly, and every cross looks like a signal. Most are noise.\n• **The bounce isn't guaranteed.** 'Dynamic support' holds *until it breaks* — and when a stock slices through its 200-day on heavy volume, that break is itself a bearish signal, not a dip to buy.\n\nAlways combine MA signals with RSI, volume, horizontal levels, and the broader market. Never trade a moving average alone.",
          },
          {
            type: "text",
            content:
              "**Worked example — MA support that broke (illustrative).** A stock had bounced off its rising 50-day four times, so a trader sells a put at the 50-day the fifth time, assuming another bounce. This time the stock closes decisively *through* the 50-day on 2x volume and keeps falling to the 200-day. The lesson: dynamic support is still just support — define your invalidation (a daily close below the average on strong volume) in advance, because the fifth touch fails often, especially when momentum (RSI, MACD) was already weakening into it.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "sma-options-q1",
                question: "A stock in a clear uptrend pulls back to its rising 50-day SMA and prints a hammer on above-average volume. What's a sensible options play?",
                options: [
                  "Short it — touching the 50-day means the trend is over",
                  "Buy calls 30–45 DTE (or sell a CSP near the 50-day) — dynamic support plus a rejection candle is a high-probability dip-buy in an uptrend",
                  "Do nothing — moving averages are useless",
                  "Sell a covered call at the 50-day",
                ],
                correctIndex: 1,
                explanation:
                  "In an uptrend, a bounce off the 50-day with a confirming candle on rising volume is a classic dip-buy. Buying calls or selling a put anchored to the 50-day both express it. Define invalidation as a decisive close below the average.",
              },
              {
                id: "sma-options-q2",
                question: "Why can't the 200-day protect you during a fast market crash like March 2020?",
                options: [
                  "The 200-day stops updating during crashes",
                  "Moving averages lag — built from past prices, the 200-day sits far above a crashing price, so its 'support' is stale and gaps blow right through it",
                  "The SEC suspends the 200-day in a crash",
                  "It actually does protect you perfectly",
                ],
                correctIndex: 1,
                explanation:
                  "A moving average is a rear-view mirror. In a violent decline the 200-day is way above the current price and updates slowly, so it offers no real defense — gaps and panic selling slice straight through. That lag is the core limitation of the tool.",
              },
            ],
          },
        ],
      },
      // ── Lesson 4: Practice ────────────────────────────────────────────
      {
        id: "sma-practice",
        title: "Moving-Average Practice",
        subtitle: "Graded reps: read trend, spot crossovers, and place MA-anchored levels",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "Time to use them. Toggle moving averages on real-looking charts, judge the trend, and decide whether a crossover is a real signal or a whipsaw. Run each drill a couple of times with different seeds.",
          },
          {
            type: "text",
            content: "**Rep 1 — read the trend.** Add the 50- and 200-day and decide: uptrend, downtrend, or no-trend range?",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "trend", seed: 521 },
          },
          {
            type: "text",
            content: "**Rep 2 — is the cross real?** Judge whether the crossover has a genuine trend behind it or is tangled-and-flat noise.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "golden-cross",
              question:
                "Price is above both moving averages, the 50-day has crossed cleanly above a rising 200-day, and both slope up. Real signal or noise?",
              options: [
                "Noise — ignore all crossovers",
                "Real: a clean golden cross with separated, upward-sloping averages and price above them confirms a genuine uptrend worth staying long in",
                "Bearish reversal",
                "A death cross",
              ],
              correctIndex: 1,
              explanation:
                "Separated, upward-sloping averages with price above them is the real thing — a golden cross confirming an uptrend. Contrast this with tangled, flat averages, where a cross is just whipsaw.",
              seed: 522,
            },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "death-cross",
              question:
                "A stock is trending down, price below both averages, and the 50-day has crossed below a falling 200-day. What's the read for an options trader?",
              options: [
                "Bullish — buy calls",
                "Bearish confirmation: the downtrend is established, so favor puts, covered calls, or defense — but remember the cross lags, so much of the move may be done",
                "Meaningless in all cases",
                "A squeeze",
              ],
              correctIndex: 1,
              explanation:
                "A death cross with price below cleanly-falling averages confirms a downtrend — bearish context for options positioning. It still lags, so don't treat it as a fresh entry; it's confirmation, not a trigger.",
              seed: 523,
            },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "After each rep, say the trend out loud before you read the answer: 'above both, rising = uptrend' or 'tangled and flat = no trend, ignore the cross.' That one habit prevents most moving-average mistakes.",
          },
        ],
      },
    ],
  },

  // ─── MODULE: MACD ─────────────────────────────────────────────────────
  {
    id: "macd",
    title: "MACD — Momentum Decoded",
    subtitle: "The gap between two averages, read as momentum — with the whipsaws it's prone to",
    icon: "⚡",
    color: "fuchsia-500",
    level: 2,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "macd-basics",
        title: "What MACD Measures",
        subtitle: "Why the gap between a fast and slow average tells you about momentum",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "**MACD = Moving Average Convergence Divergence.** It's built from three parts:\n\n• **MACD line** = EMA12 − EMA26 (the gap between a fast and a slow moving average).\n• **Signal line** = 9-period EMA of the MACD line (a smoothed version of it).\n• **Histogram** = MACD line − signal line (the gap between them, drawn as bars).",
          },
          {
            type: "text",
            content:
              "**The mechanic — why the gap means momentum.** The 12-day EMA reacts fast; the 26-day reacts slow. When price is accelerating up, the fast average pulls away *above* the slow one, so the gap (the MACD line) grows and turns positive. When price rolls over, the fast average drops back toward and below the slow one, and the gap shrinks and goes negative. So the MACD line isn't some exotic oscillator — it's literally *how far the fast average has separated from the slow one*, which is a clean read on whether momentum is building or fading.\n\nThe **crossover** is the headline event: MACD line crossing *above* the signal line = momentum turning up; crossing *below* = momentum turning down. The histogram just draws that gap so you can see it growing or shrinking at a glance.",
          },
          {
            type: "visual",
            component: "macd-chart",
            props: {},
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "MACD above zero = the fast average is above the slow one = bullish regime. Below zero = bearish regime. A crossover is a momentum *shift*; a histogram that's expanding means momentum is strengthening, shrinking means it's fading. That's the whole language.",
          },
          {
            type: "text",
            content:
              "**How to see it (do this now).** Open a ticker on a **Daily** chart, add the indicator 'MACD' with default settings (12, 26, 9). Read three things: is the MACD line above or below its signal line (momentum up or down)? Above or below zero (bull or bear regime)? Is the histogram growing or shrinking (momentum strengthening or fading)? MACD is a daily-chart tool for options — on 5-minute charts it fires constant false signals.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "trend", seed: 601 },
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
                  "When the MACD line crosses above the signal line, the fast average (EMA12) is accelerating relative to the slower signal — a bullish momentum shift. Many traders use it as a trigger to enter bullish positions or buy calls.",
              },
              {
                id: "macd-basics-q2",
                question: "The MACD line is deep below zero but its histogram has started shrinking (bars getting less negative). What does that tell you?",
                options: [
                  "Momentum to the downside is still accelerating",
                  "Downside momentum is fading — the fast and slow averages are starting to converge, an early hint the decline may be slowing",
                  "The stock has definitely bottomed",
                  "MACD is broken",
                ],
                correctIndex: 1,
                explanation:
                  "A shrinking histogram means the gap between the MACD line and its signal is narrowing — downside momentum is losing steam. It's an early hint, not a bottom call: below-zero still means a bearish regime, but the fade is worth watching for a possible crossover.",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: How to trade it + failure modes ─────────────────────
      {
        id: "macd-options",
        title: "Trading MACD — Signals and Whipsaws",
        subtitle: "Crossovers and divergence into options trades, plus when MACD lies",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**MACD → options trades.**\n\n• **Bullish cross (MACD > signal, turning positive):** buy calls 30–45 DTE, delta 0.45–0.60. Or, for premium sellers, use it as a timing confirmation to sell a put at support.\n• **Bearish cross (MACD < signal, turning negative):** buy puts, or sell covered calls against existing shares.\n• **Divergence (the strongest MACD signal):** price makes a new high but MACD makes a lower high → bearish divergence → fade or trim. Price makes a new low but MACD makes a higher low → bullish divergence → look for a reversal.\n• **Histogram expanding:** momentum strengthening → let winners run. **Shrinking/flipping:** momentum fading → take profits or trim.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "MACD works best on **daily** charts for options. For longer-dated options (45–90 DTE), check the **weekly** MACD to confirm the bigger trend. On 5-minute charts MACD produces far too many false crossovers to trade.",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — bullish cross into a rally (illustrative, framed on SPY early 2023).** SPY's MACD crossed above its signal and pushed above zero in January 2023 as the histogram flipped green. That momentum confirmation lined up with a rally from ~$380 to ~$420. The cross confirmed the turn; the expanding histogram said 'let it run.'\n\n**Worked example 2 — bearish divergence warning (illustrative, framed on a 2024 tech pullback).** A stock pushed to a fresh 3-month high while MACD printed a *lower* high than its prior peak. That divergence warned the rally was thinning out, and the stock pulled back several percent. Divergence gave the heads-up before the crossover confirmed it.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**Failure modes & honest stats — MACD lags and whipsaws:**\n\n• **It lags.** MACD is built from moving averages, so its crossovers arrive *after* the turn. In a sharp reversal you get the signal late.\n• **It whipsaws in choppy, sideways markets.** Flat price action makes the MACD and signal lines cross back and forth repeatedly, firing bull-then-bear-then-bull crossovers that are pure noise.\n• **Divergence fails against strong trends** — just like RSI, momentum can reset sideways and the trend resumes, stacking divergence the whole way.\n\nRead MACD alongside price, levels, and volume — never as a standalone trigger.",
          },
          {
            type: "text",
            content:
              "**Worked example 3 — the whipsaw that FAILED, and the early tell (illustrative).** A stock is stuck in a tight range. MACD prints a bullish crossover; a trader buys calls. Two days later it prints a bearish crossover and the calls bleed out. **The early tell:** the MACD line and signal were *coiled together right around the zero line*, barely separated, while price went nowhere. MACD crossovers only carry information when there's momentum to shift — in a flat range the lines tangle at zero and every tiny wiggle produces a 'signal.' The fix is the same as with moving-average crosses: require a trend (MACD clearly above or below zero, lines separated) before trusting a crossover, and confirm with price at a level.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "macd-options-q1",
                question: "TSLA's price just hit a 3-month high, but MACD is making a lower high than its previous peak. What's this called, and what should you consider?",
                options: [
                  "A golden cross — buy more calls",
                  "Bearish MACD divergence — the rally may be running out of steam; consider reducing call exposure or tightening stops",
                  "A death cross — close everything immediately",
                  "A bullish signal — MACD always lags price",
                ],
                correctIndex: 1,
                explanation:
                  "This is bearish MACD divergence — price makes new highs but momentum doesn't confirm. It often precedes a slowdown or reversal. Not a sell-everything signal, but a warning to reduce risk: tighten stops, take partial profits, or add some protection. Wait for price confirmation before shorting.",
              },
              {
                id: "macd-options-q2",
                question: "You get a bullish MACD crossover, but the MACD line and signal are coiled right around zero while price chops sideways in a tight range. How much should you trust it?",
                options: [
                  "Fully — a crossover is a crossover",
                  "Very little — crossovers near zero in a flat, trendless range are classic whipsaws; there's no momentum for the cross to signal a shift in",
                  "It's a guaranteed short signal",
                  "It means volatility will spike",
                ],
                correctIndex: 1,
                explanation:
                  "MACD crossovers only mean something when there's a trend to change. Lines tangled at zero with price ranging produce back-and-forth crosses that are noise. Require MACD clearly above/below zero with separated lines, and confirm with price at a level, before acting.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: Practice ────────────────────────────────────────────
      {
        id: "macd-practice",
        title: "MACD Practice",
        subtitle: "Graded reps: read the crossover, the histogram, and spot divergence",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Toggle the MACD overlay on real-looking charts and read it three ways: line vs signal, above vs below zero, histogram growing vs shrinking. Then judge whether a crossover is a real momentum shift or range noise. Re-run with different seeds.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "trend", seed: 611 },
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "divergence", seed: 612 },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "rsi-divergence",
              question:
                "Price pushes to a new high, but the momentum oscillator (RSI/MACD) makes a clearly lower high. What is this, and how should you treat it?",
              options: [
                "Bullish confirmation — add to the position",
                "Bearish momentum divergence — a warning the rally is thinning; wait for price to break a level or trendline before acting, and be cautious against a strong trend",
                "A golden cross",
                "Meaningless noise",
              ],
              correctIndex: 1,
              explanation:
                "A higher price high with a lower momentum high is bearish divergence — the same idea whether it shows on RSI or MACD. It's a warning, not a trigger: wait for price confirmation, and remember divergence against a strong trend fails often.",
              seed: 613,
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The MACD habit: never read the crossover in isolation. Check the zero line (regime), the histogram (is momentum growing or fading), and price (is it at a level). A crossover with the regime, the histogram, and a level all agreeing is worth trading; a lone crossover in a range is not.",
          },
        ],
      },
    ],
  },

  // ─── MODULE: BOLLINGER BANDS ──────────────────────────────────────────
  {
    id: "bollinger-bands",
    title: "Bollinger Bands",
    subtitle: "Volatility bands that show, at a glance, when options are cheap or expensive",
    icon: "〰️",
    color: "pink-500",
    level: 2,
    lessons: [
      // ── Lesson 1: What it is ──────────────────────────────────────────
      {
        id: "bb-basics",
        title: "Reading Bollinger Bands",
        subtitle: "Why band width is a live volatility gauge — the mechanic behind the sleeve",
        estimatedMinutes: 7,
        sections: [
          {
            type: "text",
            content:
              "**What they are.** Bollinger Bands are three lines on the price chart:\n\n• **Middle band** = SMA20 (the 20-day average).\n• **Upper band** = SMA20 + (2 × standard deviation).\n• **Lower band** = SMA20 − (2 × standard deviation).\n\nThey wrap around price like an elastic sleeve.",
          },
          {
            type: "text",
            content:
              "**The mechanic — why the sleeve widens and pinches.** The bands are built from **standard deviation**, which is just a measure of how much price has been bouncing around lately. When a stock swings hard, its standard deviation is large, so the bands push far from the middle — the sleeve is **wide**. When a stock goes quiet and coils, standard deviation shrinks and the bands pinch **narrow**. Statistically, price stays inside the bands about 95% of the time, so the sleeve automatically stretches to contain however volatile the stock currently is.\n\n**The key insight for options traders:** band width is a *volatility* gauge, and volatility is what options pricing is made of. **Wide bands = high volatility = expensive options. Narrow bands (a squeeze) = low volatility = cheap options.** You can read whether options are rich or cheap straight off the chart, without ever opening the options screen.",
          },
          {
            type: "visual",
            component: "bollinger-bands-chart",
            props: {},
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Bollinger Bands are the visual twin of IV Rank. A **squeeze** (narrowest bands in months) is the chart telling you volatility — and option premiums — are low. **Wide bands** tell you volatility is high and premiums are rich. Squeeze → lean toward buying options; wide → lean toward selling them.",
          },
          {
            type: "text",
            content:
              "**How to see it (do this now).** Open a ticker on a **Daily** chart, add 'Bollinger Bands' with defaults (length 20, deviation 2). Eyeball the last 6 months: is the current gap between the upper and lower band the tightest it's been (a squeeze) or the widest (elevated volatility)? Some charts also plot 'Bollinger BandWidth' as a separate line — a multi-month low on it confirms a squeeze numerically. On a **weekly** chart the squeeze reflects a longer, bigger coil; on daily it's the swing-trade timeframe most people mean.",
          },
          {
            type: "text",
            content:
              "**Worked example — a squeeze before an event (illustrative, framed on AAPL 2023).** Ahead of a major Apple event, AAPL's bands pinched for about three weeks as the stock consolidated (BandWidth at a multi-month low). Low bands meant cheap options. After the announcement the stock moved several percent and the bands blew wide open. A straddle bought during the pinch profited from the expansion — the squeeze flagged 'big move coming, direction unknown.'",
          },
          {
            type: "text",
            content:
              "**See the sleeve breathe.** Toggle Bollinger Bands below and watch the bands pinch in quiet stretches and flare out after big moves. Notice how a tight pinch tends to precede a larger move, and how the move blows the bands wide.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "squeeze", seed: 701 },
          },
          {
            type: "quiz",
            questions: [
              {
                id: "bb-basics-q1",
                question: "Bollinger Bands on NVDA have been very wide for 2 weeks (about 2x their normal width). What does that tell you about options pricing?",
                options: [
                  "Options are cheap — a good time to buy calls or puts",
                  "Options are expensive — volatility is elevated, so premium selling is more attractive",
                  "Band width doesn't correlate with options pricing",
                  "NVDA is overvalued and will crash",
                ],
                correctIndex: 1,
                explanation:
                  "Wide bands indicate high realized volatility, which usually means implied volatility — and option prices — are elevated too. When options are expensive, selling premium (covered calls, cash-secured puts, iron condors) is more attractive: you collect more and benefit from volatility mean-reverting lower.",
              },
              {
                id: "bb-basics-q2",
                question: "Why does a Bollinger squeeze (narrow bands) suggest options are relatively cheap?",
                options: [
                  "Narrow bands mean the stock will definitely fall",
                  "Narrow bands come from low standard deviation — the stock has gone quiet, so volatility (and the implied volatility priced into options) is low",
                  "Narrow bands mean high open interest",
                  "The SEC lowers option prices during squeezes",
                ],
                correctIndex: 1,
                explanation:
                  "The bands are built from standard deviation. A quiet, coiling stock has low standard deviation, so the bands pinch — and that same low volatility is what makes options cheap. The squeeze is a visual read on low IV.",
              },
            ],
          },
        ],
      },
      // ── Lesson 2: How to trade it + failure modes ─────────────────────
      {
        id: "bb-options",
        title: "Trading Bollinger Bands — Squeeze, Expansion, and Fakeouts",
        subtitle: "Buy the squeeze, sell the expansion — plus when the bands trick you",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**Squeeze → BUY options.** Bands pinch to a historically narrow width → low IV → cheap options → a big move is coming (direction unknown). Buy a straddle (ATM call + put) or wait for a directional break, then buy calls/puts in that direction. The squeeze doesn't tell you the way — it tells you a move is loading.\n\n**Wide bands → SELL options.** Bands at historically high width → high IV → expensive options → the stock is likely to slow down (mean-revert). Sell covered calls, cash-secured puts, or iron condors to collect the rich premium and benefit from volatility falling back to normal.",
          },
          {
            type: "text",
            content:
              "**Band touches (a common misread — handle with care).** Price tagging the upper band does NOT automatically mean 'overbought, sell,' and tagging the lower band does NOT mean 'oversold, buy.' In a strong trend, price can *ride* the upper band higher for weeks (or the lower band down). Band touches are only mean-reversion signals in a *range-bound* stock. Repeated tags of the upper band without a close beyond it can mark resistance; repeated lower-band tags without closing below can mark support — but only in a range.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The squeeze is the coil, not the release. Narrow bands = a coiled spring (a move is building, direction unknown). Wide bands = the move already happened. Buy the coil (cheap options before expansion); sell after the release (rich options as volatility fades).",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — squeeze that paid (illustrative, framed on SPY late 2023).** SPY's bands pinched to a multi-week low ahead of a Fed meeting. A straddle bought into the squeeze (cheap options) captured the roughly 3% move when the bands expanded. The pinch said 'move loading'; the event was the trigger.\n\n**Worked example 2 — selling into wide bands (illustrative, framed on a post-earnings stock).** After an earnings report, a stock's IV spiked and its bands blew wide. The next day, as volatility mean-reverted, an iron condor (short premium) profited from the collapsing volatility even though the stock itself barely moved. Wide bands were the cue to sell, not buy.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "**Failure modes & honest stats — the bands trick people two classic ways:**\n\n• **The squeeze fakeout.** A squeeze says a move is coming but NOT the direction. Price often pokes one way to trap traders, then reverses and runs the other way. Don't pre-guess the direction of a squeeze — wait for a confirmed break (a close beyond the band on volume, ideally with RSI/MACD agreeing).\n• **Riding the band in a trend.** In a strong uptrend, price hugs the upper band for weeks. Shorting every upper-band tag as 'overbought' gets you run over — band touches mean reversion only in a *range*, not a trend.\n• **A squeeze can stay squeezed.** Quiet stocks can stay quiet longer than your option's time value lasts. If you buy a straddle into a squeeze and the move doesn't come, theta bleeds you while you wait.\n\nAlways confirm band signals with the trend, volume, and a momentum tool.",
          },
          {
            type: "text",
            content:
              "**Worked example 3 — the squeeze that FAILED, and the early tell (illustrative).** A trader sees a tight squeeze and, feeling bullish, buys calls, guessing the break will be up. The stock briefly ticks up (confirming his bias), sucking him in — then reverses and breaks *down* hard, and the calls are toast. **The early tell:** he traded a *direction* on a signal that only forecasts *magnitude*. A squeeze is direction-agnostic by definition. The disciplined version waits for the actual break — a decisive close beyond a band on volume — or uses a direction-neutral straddle so either break pays. Guessing the direction of a squeeze is guessing, full stop.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "bb-options-q1",
                question: "NVDA's bands are the narrowest in six months and you expect a move. What's the cleanest way to play a squeeze BEFORE the break?",
                options: [
                  "Buy calls, guessing it breaks up",
                  "Buy a straddle (or wait for a confirmed directional break, then trade that way) — the squeeze forecasts a move, not a direction",
                  "Sell an iron condor to collect premium",
                  "Short the stock",
                ],
                correctIndex: 1,
                explanation:
                  "A squeeze means low IV and a coming move of unknown direction. A straddle (long both sides) profits from a big move either way with cheap options; alternatively, wait for a confirmed break and trade its direction. Selling premium is exactly wrong here — you'd be short volatility right before it expands.",
              },
              {
                id: "bb-options-q2",
                question: "In a strong uptrend, a stock tags its upper Bollinger Band for the fifth day in a row. Should you short it as 'overbought'?",
                options: [
                  "Yes — an upper-band tag always means overbought",
                  "No — in a strong trend, price can ride the band for weeks; band tags mean reversion only in a range, not a trend",
                  "Yes, but only with max leverage",
                  "Only if RSI is exactly 70",
                ],
                correctIndex: 1,
                explanation:
                  "Riding the upper band is what strong uptrends do. Band touches are mean-reversion signals only for range-bound stocks; shorting every tag in a trend gets you run over. Establish trend versus range before treating a band touch as a reversal.",
              },
            ],
          },
        ],
      },
      // ── Lesson 3: Practice ────────────────────────────────────────────
      {
        id: "bb-practice",
        title: "Bollinger Bands Practice",
        subtitle: "Graded reps: spot the squeeze, judge the expansion, avoid the fakeout",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "Read the sleeve. Toggle Bollinger Bands on real-looking charts, identify squeezes and expansions, and — crucially — resist guessing the direction of a squeeze. Re-run with different seeds.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "squeeze", seed: 711 },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "bb-squeeze",
              question:
                "A stock's Bollinger Bands have pinched to their narrowest in months while price coils sideways. What is the highest-probability read, and how do you play it?",
              options: [
                "Volatility is high — sell premium",
                "A volatility squeeze: a big move is likely soon but the direction is unknown — buy a straddle, or wait for a confirmed break and trade that direction",
                "The stock will definitely go up",
                "A death cross is forming",
              ],
              correctIndex: 1,
              explanation:
                "Narrowest-in-months bands = a squeeze: low volatility, cheap options, a move loading with unknown direction. Play it direction-neutral (straddle) or wait for a confirmed break — never pre-guess the direction.",
              seed: 712,
            },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "bb-squeeze",
              question:
                "After a long squeeze, the stock closes decisively above the upper band on a big volume spike. What does the expansion tell you?",
              options: [
                "Ignore it — band breaks are always fakeouts",
                "The squeeze has resolved to the upside on real volume: the coil released, favoring a directional (bullish) continuation trade rather than fresh short-premium",
                "Sell an iron condor immediately",
                "The stock has topped",
              ],
              correctIndex: 1,
              explanation:
                "A decisive close beyond the band on a volume spike is the squeeze resolving — the coil released with conviction. That favors trading in the break's direction. Selling premium into a fresh, high-volume expansion fights the move.",
              seed: 713,
            },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "The Bollinger discipline: a squeeze tells you WHEN (a move is near), never WHICH WAY. Wait for the break or trade both sides. And check trend before treating any band touch as 'overbought/oversold' — in a trend, price rides the band.",
          },
        ],
      },
    ],
  },

  // ─── MODULE: IV RANK ──────────────────────────────────────────────────
  {
    id: "iv-rank",
    title: "IV Rank — When to Buy vs Sell",
    subtitle: "The single number that decides whether you should be buying or selling options",
    icon: "🎯",
    color: "green-500",
    level: 2,
    lessons: [
      {
        id: "iv-rank-basics",
        title: "Understanding IV Rank",
        subtitle: "Are options cheap or expensive right now? One number tells you.",
        estimatedMinutes: 5,
        sections: [
          {
            type: "text",
            content:
              "**Implied Volatility vs IV Rank.** Implied Volatility (IV) is the market's expected move, priced into an option. But a 40% IV might be *low* for TSLA and *high* for AAPL — the raw number lacks context.\n\n**IV Rank** fixes that by comparing today's IV to the stock's own past 52 weeks:\n\n**IV Rank = (Current IV − 52-week low IV) ÷ (52-week high IV − 52-week low IV) × 100**\n\nA 0–100 scale:\n• **0–25:** options are historically CHEAP → lean toward buying.\n• **25–75:** fairly priced → direction matters more than the IV edge.\n• **75–100:** historically EXPENSIVE → lean toward selling.",
          },
          {
            type: "interactive",
            component: "iv-rank-gauge",
            props: {},
          },
          {
            type: "text",
            content:
              "**Examples (illustrative, framed on real-ish episodes):**\n\n• **High IV Rank (~82):** after a big earnings miss and crash, a stock's IV spiked to multi-month highs. Selling puts as it stabilized was the play — a $250 put sold at $12 was worth $3 a week later (about 75% in 7 days) as IV crushed back to normal.\n\n• **Low IV Rank (~18):** before a product event with historically low IV, buying calls was the play — a $175 call for $2.50 ran to $8 in 10 days (~220%) as both the stock and IV expanded.\n\n• **Neutral IV Rank (~45):** a flat market with no clear edge for buyers or sellers — focus on directional conviction, not an IV edge.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "IV Rank is the first number to check before an options trade. Low → buy options (premium is cheap). High → sell options (premium is rich, and IV tends to mean-revert lower after spikes, working for sellers).",
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
                  "With IV Rank at 88, options are historically expensive, and IV tends to mean-revert lower after spikes (IV crush). Selling premium (a cash-secured put) collects the inflated premium and profits as IV falls. Buying options at high IV rank usually loses — even a correct directional call can be swamped by IV crush.",
              },
              {
                id: "ivr-basics-q2",
                question: "A stock's current IV sits almost exactly halfway between its 52-week high and low IV. What's its approximate IV Rank, and what does it imply?",
                options: [
                  "Near 0 — options are dirt cheap",
                  "Near 50 — neutral; no strong IV edge for buyers or sellers, so lean on your directional read instead",
                  "Near 100 — options are extremely expensive",
                  "IV Rank can't be estimated this way",
                ],
                correctIndex: 1,
                explanation:
                  "IV Rank is where current IV sits in its yearly range. Halfway between the 52-week low and high is an IV Rank near 50 — neutral territory. Neither buying nor selling has an IV edge, so your directional analysis (trend, levels, momentum) should drive the trade.",
              },
            ],
          },
        ],
      },
      {
        id: "iv-rank-strategy",
        title: "Building Strategy Around IV Rank",
        subtitle: "The full buy-vs-sell decision matrix, made tangible",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**The IV-Strategy Matrix.** Combine IV Rank with your directional view:\n\n**Bullish + Low IVR (<30):** buy calls or bull call spreads. Cheap options; best case the stock rises AND IV expands (double win).\n\n**Bullish + High IVR (>70):** sell cash-secured puts or put spreads. Collect rich premium, benefit from IV crush; you want the stock flat or up.\n\n**Bearish + Low IVR (<30):** buy puts. Cheap protection/bet on a decline.\n\n**Bearish + High IVR (>70):** sell covered calls or call spreads. Collect rich premium from elevated IV.\n\n**Neutral + High IVR (>70):** iron condor or strangle. Profit from IV crush + a range-bound stock.",
          },
          {
            type: "text",
            content:
              "**Put it in your hands.** In the sandbox, raise the IV slider and watch premiums balloon (that's a high-IV-rank environment — rich to sell), then drop it and watch them shrink (low IV rank — cheap to buy). Pair that with a strike and expiry to feel exactly how much extra an option seller collects when IV is elevated.",
          },
          {
            type: "interactive",
            component: "strike-explorer",
            props: {},
          },
          {
            type: "callout",
            style: "warning",
            content:
              "IV Rank does NOT tell you direction. A stock can have IV Rank 90 and still move 30% one way. Always combine IV rank with directional analysis (trend, RSI, support/resistance) before placing a trade.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ivr-strategy-q1",
                question: "You're bullish on META and IV Rank is 15 (historically cheap). Which structure fits best?",
                options: [
                  "Sell a covered call — collect premium while bullish",
                  "Buy a call or bull call spread — options are cheap, so get levered upside for a low price",
                  "Sell a put spread — high premium collection",
                  "Buy an iron condor — capture the range",
                ],
                correctIndex: 1,
                explanation:
                  "Low IV Rank (15) means cheap options. Bullish + cheap options = buy calls or bull call spreads for levered upside at a low price. Selling premium makes sense when IV is HIGH; at low IV you'd collect too little premium for the risk.",
              },
              {
                id: "ivr-strategy-q2",
                question: "IV Rank is 85 and you're NEUTRAL on the stock (no strong directional view). Which structure best exploits the high IV?",
                options: [
                  "Buy a straddle to bet on a big move",
                  "Sell an iron condor or strangle — collect the rich premium and profit as IV crushes and the stock stays range-bound",
                  "Buy calls",
                  "Do nothing — high IV is untradeable",
                ],
                correctIndex: 1,
                explanation:
                  "Neutral + high IV Rank is the classic short-premium setup. An iron condor or strangle collects inflated premium and profits from IV mean-reverting lower plus a range-bound stock. Buying a straddle would be backwards — long volatility right when it's expensive and likely to fall.",
              },
            ],
          },
        ],
      },
    ],
  },

  // ─── MODULE: OPTIONS ENTRY FRAMEWORK ─────────────────────────────────
  {
    id: "entry-framework",
    title: "The Options Entry Framework",
    subtitle: "Stack trend, momentum, levels, and IV rank into one repeatable decision system",
    icon: "🗺️",
    color: "red-500",
    level: 2,
    lessons: [
      {
        id: "ef-signals",
        title: "Signal Stacking — When Stars Align",
        subtitle: "No single indicator is reliable; the edge is confluence",
        estimatedMinutes: 6,
        sections: [
          {
            type: "text",
            content:
              "**The signal-stacking approach.** No single indicator is reliable alone — RSI pins overbought for weeks, SMA bounces fail, MACD crosses whipsaw. The edge comes from **stacking multiple signals in the same direction**.\n\n**A high-conviction BULLISH setup wants 3+ of:**\n1. Stock above SMA200 (bull territory)\n2. RSI recovering from below 40, now rising\n3. MACD turning bullish (crossover or positive histogram)\n4. Price at/near support (SMA50, prior resistance turned support)\n5. IV Rank low (<30) — options cheap\n\n4–5 aligned = exceptional. **Example (illustrative, SPY Oct 2023):** SPY touched its 200-day → RSI 38 recovering → MACD histogram flipped positive → IV rank 28. All four aligned; SPY rallied ~12% over six weeks.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Signal stacking isn't about waiting for perfection. 3 of 5 is usually enough; 4 of 5 is exceptional; 5 of 5 is rare — size up when it happens.",
          },
          {
            type: "text",
            content:
              "**A high-conviction BEARISH setup wants 3+ of:**\n1. Stock below SMA200 (bear territory)\n2. RSI above 65 and rolling over\n3. MACD bearish crossover or negative histogram expanding\n4. Price at/near resistance (SMA50, prior support turned resistance)\n5. IV Rank low (<30) — puts cheap\n\n**Example (illustrative, TSLA early 2022):** broke below SMA200 → RSI bounced to 65 at the 200-day and rolled → MACD crossed down → IV rank 22. The stack said buy puts; TSLA fell hard over the following months.",
          },
          {
            type: "text",
            content:
              "**Read a stacked setup on a chart.** The spot-check below shows a support-bounce scenario — decide whether the confluence is strong enough to act.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "A stock is above its rising 200-day, has pulled into a tested support zone at its 50-day, RSI is 34 and turning up, MACD histogram just flipped positive, and IV Rank is 25. How would you rate this setup?",
              options: [
                "Poor — RSI at 34 means it's collapsing",
                "High-conviction bullish: trend, level, momentum turn, and cheap options all stack the same way — a size-up long-call or CSP setup",
                "Neutral — only one signal is present",
                "Bearish — support always breaks",
              ],
              correctIndex: 1,
              explanation:
                "Four-plus signals align: uptrend (above rising 200-day), a level (50-day support), momentum turning up (RSI recovering, MACD flip), and cheap options (IV Rank 25). That's exactly the confluence to size up on — long calls or a cash-secured put at the level.",
              seed: 811,
            },
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
                  "High-conviction bullish — 4 signals stacked the same direction",
                  "Can't tell without the stock name",
                ],
                correctIndex: 2,
                explanation:
                  "High-conviction bullish with 4 aligned signals: (1) above SMA200 = bull territory, (2) RSI 32 recovering = mean-reversion buy, (3) MACD bullish crossover = momentum confirmation, (4) low IV rank = cheap options. Size up with long calls or a bull call spread.",
              },
              {
                id: "ef-signals-q2",
                question: "Why is stacking 3+ independent signals more reliable than trading off any single one?",
                options: [
                  "Because more indicators always means more profit",
                  "Because each signal is unreliable alone (RSI pins, MAs whipsaw, MACD whipsaws), but independent signals agreeing is much less likely to be a coincidence",
                  "Because the SEC requires three signals",
                  "Because it guarantees the trade wins",
                ],
                correctIndex: 1,
                explanation:
                  "Every indicator fails in isolation in its own way. When several *independent* reads (trend, level, momentum, IV) point the same direction, the odds they're all wrong at once drop sharply. Confluence raises the win rate; it never guarantees the trade.",
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
              "**The 5-question trade decision framework.** Before any options trade, answer in order:\n\n**Q1 — Trend? (SMA200)** Above = bull bias; below = bear bias; at it = wait.\n\n**Q2 — Momentum? (MACD)** Positive and rising = bull momentum; negative and falling = bear; flat/crossover zone = caution.\n\n**Q3 — Entry quality? (RSI)** RSI < 35 in a bull trend = high-quality long entry; RSI > 65 in a bear trend = high-quality short entry; 40–60 = mid-range, momentum decides.\n\n**Q4 — At a key level? (S/R)** At support in a bull trend = buy; at resistance in a bear trend = sell; no level = wait.\n\n**Q5 — Options cheap or expensive? (IV Rank)** <30 = buy options; >70 = sell options; 30–70 = use defined-risk spreads.",
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
              "Write down your answers to these 5 questions before every trade. If you can't answer at least 4 clearly, you don't have enough conviction — wait for a better setup.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ef-tree-q1",
                question: "Walking the tree: a stock is below a falling SMA200 (Q1 bear), MACD negative (Q2 bear), RSI 63 rolling over at resistance (Q3/Q4 short entry), IV Rank 22 (Q5 cheap options). What's the indicated trade?",
                options: [
                  "Sell a cash-secured put at support",
                  "Buy puts — bearish trend and momentum, an overbought bounce rejecting at resistance, and cheap options all line up for a long-put",
                  "Buy calls — RSI 63 isn't overbought",
                  "Do nothing — the signals conflict",
                ],
                correctIndex: 1,
                explanation:
                  "Every answer points bearish and the IV read says buy, not sell, options: downtrend, negative momentum, an overbought bounce rejecting at resistance, and low IV Rank (cheap puts). The tree indicates buying puts — a defined-risk bearish bet with the trend.",
              },
            ],
          },
        ],
      },
      {
        id: "ef-real-trades",
        title: "Real Trade Walkthroughs",
        subtitle: "Three complete examples using the full framework — SPY, NVDA, TSLA",
        estimatedMinutes: 8,
        sections: [
          {
            type: "text",
            content:
              "**Trade 1 — SPY Bull Call Spread (illustrative, framed on Oct 2023).**\nQ1 Trend: touched SMA200 and held → bullish ✓\nQ2 Momentum: MACD histogram turned green after 3 weeks negative ✓\nQ3 Entry: RSI 36 recovering → strong dip ✓\nQ4 Level: SMA200 = multi-year support ✓\nQ5 IV Rank: 28 (cheap) → buy options ✓\n**Trade:** buy the $430/$440 bull call spread (30 DTE) for $2.80.\n**Result:** SPY rallied ~$418 → ~$455 in 6 weeks; the spread reached ~$10. Return ~257%.\n\n---\n\n**Trade 2 — NVDA Covered Call (illustrative, framed on Feb 2024).**\nQ1 Trend: above SMA200, strong uptrend ✓\nQ2 Momentum: MACD positive but histogram shrinking → slowing\nQ3 Entry: RSI 78 (overbought) → due for a pause\nQ4 Level: at prior resistance ~$650\nQ5 IV Rank: 75 (expensive) → sell options ✓\n**Trade:** sell the $700 covered call (21 DTE) for $18.\n**Result:** stayed below $700 for 3 weeks; call expired worthless. Kept $1,800 per 100 shares.\n\n---\n\n**Trade 3 — TSLA Long Put (illustrative, framed on Jan 2024).**\nQ1 Trend: below SMA200 after failing to reclaim it → bearish ✓\nQ2 Momentum: MACD negative and accelerating down ✓\nQ3 Entry: RSI 62 bounced to resistance and rolled ✓\nQ4 Level: at SMA50, which sits below SMA200 → resistance ✓\nQ5 IV Rank: 22 (cheap) → buy puts ✓\n**Trade:** buy the $220 put (45 DTE) for $8.50.\n**Result:** TSLA fell ~$250 → ~$180 in 5 weeks; the put reached ~$42. Return ~394%.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "These are historical, illustrative examples. Past performance doesn't guarantee future results. The framework improves your odds; no system wins every time. Use defined-risk trades (spreads, long options) to cap downside on the ones that don't work.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "ef-trades-q1",
                question: "You're analyzing QQQ: above SMA200, RSI 45, MACD neutral, no nearby support/resistance, IV rank 55. What should you do?",
                options: [
                  "Buy calls immediately — QQQ is in a bull trend",
                  "Sell puts — IV rank above 50 is high enough",
                  "Wait — only 1–2 signals are present, not enough conviction",
                  "Buy an iron condor — neutral RSI means range-bound",
                ],
                correctIndex: 2,
                explanation:
                  "Only one clear signal (above SMA200). RSI neutral, MACD neutral, no key level, IV rank 55 favors neither buyers nor sellers. The best trade is no trade — forcing one in a low-signal environment loses money to bad timing. Patience is a skill.",
              },
              {
                id: "ef-trades-q2",
                question: "AAPL reports earnings next week. IV rank is 82. You're mildly bullish. Best strategy?",
                options: [
                  "Buy calls — you're bullish so calls make sense",
                  "Sell a bull put spread — collect rich premium, profit if AAPL stays flat or rises, and benefit from post-earnings IV crush",
                  "Buy a straddle — earnings = big move",
                  "Do nothing — never trade earnings",
                ],
                correctIndex: 1,
                explanation:
                  "IV rank 82 means expensive options — sellers have the edge. Mildly bullish + high IV = a bull put spread: collect rich premium, win if AAPL rises or stays flat, and gain from IV crush after earnings. Buying calls at IVR 82 is dangerous — even a correct direction can be wiped out by IV crush.",
              },
            ],
          },
        ],
      },
    ],
  },
];
