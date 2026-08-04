import type { Module } from "@/lib/learn/curriculum";

// Trader-fluency track: teaches a non-trader how to decode the phrases friends
// throw around ("do a squeeze?", "META finds support at 520") and, crucially,
// how to verify each claim yourself before nodding along.

export const FLUENCY_MODULES: Module[] = [
  // ─── MODULE 1: TRADER TALK, DECODED ────────────────────────────────
  {
    id: "trader-talk",
    title: "Trader Talk, Decoded",
    subtitle:
      "The phrases your friends say at dinner — what they mean, and how to check them yourself",
    icon: "🗣️",
    color: "emerald-500",
    level: 1,
    lessons: [
      // ── Lesson 1: Squeeze ──────────────────────────────────────────
      {
        id: "tt-squeeze",
        title: "\"Maybe do a squeeze?\"",
        subtitle: "Two totally different meanings hide behind one word",
        estimatedMinutes: 10,
        sections: [
          {
            type: "callout",
            style: "warning",
            content:
              "\"Squeeze\" is the single most confusing word in casual trading talk, because it means two unrelated things. Before you react, figure out which one your friend means — the trade you'd put on is completely different.",
          },
          {
            type: "text",
            content:
              "The two meanings:\n\n1. **Bollinger squeeze** (a *volatility* squeeze) — the stock has gone quiet and is coiling up. Traders expect a big move soon but don't know the direction yet.\n2. **Short squeeze** — a stock that lots of people bet *against* suddenly rockets up, forcing those bettors to buy back in a panic, which pushes it even higher. This is the GameStop story.\n\nSame word, opposite vibes. One is about calm-before-the-storm; the other is about a violent up-move already underway.",
          },
          {
            type: "text",
            content:
              "**Meaning #1 — the Bollinger squeeze (volatility coiling up).**\n\nBollinger Bands are two lines drawn above and below the price. They sit 2 standard deviations away from the 20-day average price. In plain English: they wrap around the price like an elastic sleeve. When the stock swings around a lot, the sleeve is wide. When the stock goes quiet, the sleeve pinches in tight.\n\nA **squeeze** is when that sleeve gets unusually narrow — narrower than it's been in months. Quiet periods don't last forever, so a tight pinch often comes right before a large move. The catch: the pinch tells you a move is *coming*, not *which way* it goes.",
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
              "Narrow Bollinger Bands = low recent volatility = a coiled spring. Wide bands = the move already happened. The squeeze is the coil, not the release.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to check a Bollinger squeeze yourself (60 seconds):\n\n1. Open the ticker's page in stonkbro, or pull up TradingView's free chart.\n2. Add the indicator called \"Bollinger Bands\" and leave the defaults (length 20, deviation 2).\n3. Set the timeframe to Daily.\n4. Eyeball the last 6 months. Is the gap between the upper and lower band the tightest it's been in that window? If yes — that's a squeeze.\n5. Bonus: some charts show \"Bollinger BandWidth\" as a separate line. A multi-month low on that line confirms it numerically.",
          },
          {
            type: "text",
            content:
              "**Worked example — a Bollinger squeeze resolving.** Say a stock trades between $48 and $52 for three weeks. The bands pinch to just $1.50 apart — the tightest since spring. Then earnings hit and it gaps to $58 in a day. The bands blow wide open as the spring releases. A trader who saw the pinch might have bought a *straddle* (a bet that pays off on a big move in either direction) precisely because the squeeze said \"big move coming, direction unknown.\"",
          },
          {
            type: "text",
            content:
              "**Now spot one yourself.** The chart below is generated fresh each time. Look at the Bollinger Bands and decide what the stock is telling you before you answer.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "bb-squeeze",
              question:
                "The Bollinger Bands on this chart have pinched to their narrowest in months. What does that tell you?",
              options: [
                "A short squeeze is underway — buy calls, the shorts are trapped",
                "Volatility has collapsed and the stock is coiling — a big move is likely soon, direction unknown",
                "The stock is guaranteed to break out upward",
                "Volatility is high right now, so options are expensive",
              ],
              correctIndex: 1,
              explanation:
                "Narrow bands = low recent volatility = a coiled spring. That's a Bollinger (volatility) squeeze: it says a large move is building, but not which way. It has nothing to do with short interest, and it doesn't promise direction.",
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you read that as a volatility squeeze (not a short squeeze) with unknown direction, you've internalized meaning #1 — the coil, not the release, and not the short-interest story. That's the exact distinction that trips people up at dinner.",
          },
          {
            type: "text",
            content:
              "**Meaning #2 — the short squeeze (forced buying).**\n\nSome traders bet a stock will *fall*. They \"short\" it: borrow shares, sell them now, and plan to buy them back cheaper later. Their nightmare is the stock going *up* — because they're on the hook to buy those shares back at any price. If enough of them panic and buy at once, their buying itself drives the price higher, which triggers even more panic buying. That feedback loop is a **short squeeze**.\n\nYou check the fuel for a squeeze with two numbers:\n\n• **Short interest %** — what fraction of the tradable shares are currently sold short. Above ~20% is high; above 50% is extreme.\n• **Days to cover** — how many normal trading days it would take all the short sellers to buy back their shares. A high number (say 5+) means they can't all exit quickly, which makes a squeeze more violent.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to check short-squeeze fuel yourself:\n\n1. Search \"[ticker] short interest\" — free sources include the stock's Nasdaq or Yahoo Finance \"Statistics\" page.\n2. Look for **Short % of Float** (the short interest %) and **Short Ratio** (the days-to-cover).\n3. Rough read: Short % under 5% = no squeeze fuel. 20%+ with days-to-cover above 3 = real fuel if a catalyst shows up.\n4. Remember: high short interest is only *fuel*. You still need a *spark* (good news, a viral moment) to light it.",
          },
          {
            type: "text",
            content:
              "**Worked examples — real short squeezes (approximate figures):**\n\n• **GameStop (GME), January 2021.** Short interest was extraordinarily high — reported above 100% of the float (more shares were shorted than actually existed to trade freely). A wave of retail buyers sparked it, and the stock ran from roughly $20 at the start of January to about $483 intraday at the peak — a stunning move driven largely by shorts scrambling to cover.\n\n• **Volkswagen, October 2008.** Porsche quietly cornered most of VW's tradable shares. When shorts realized there were almost no shares left to buy back, the price spiked so hard that VW briefly became, on paper, the most valuable company in the world. This is the textbook \"there's nowhere to run\" squeeze.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "So when a friend says \"maybe do a squeeze?\" — ask yourself which fuel they're pointing at. Tight Bollinger Bands (a coiled, quiet stock) is a *volatility* bet with unknown direction. High short interest plus a catalyst is an *upside* bet that shorts get run over. Different setups, different trades.",
          },
        ],
      },
      // ── Lesson 2: Support / Resistance ─────────────────────────────
      {
        id: "tt-support-resistance",
        title: "\"META will find support at 520\"",
        subtitle: "What a support level really is, and how the line gets drawn",
        estimatedMinutes: 10,
        sections: [
          {
            type: "text",
            content:
              "When someone says a stock will \"find support at 520,\" they mean: as the price falls toward $520, they expect buyers to step in and stop the decline — like a floor. **Resistance** is the mirror image: a price ceiling where sellers tend to show up and stall a rally.\n\nThe deeper idea is **memory**. A support level is a price where lots of buying happened before. People remember it. Buyers who missed it last time set orders there; sellers who got trapped above it wait to break even there. All that behavior clusters around the same number, so the price tends to react when it returns.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Support and resistance are not laws of physics — they're crowd memory. A level \"works\" because enough people are watching the same number and acting on it. That also means once everyone stops caring, it stops mattering.",
          },
          {
            type: "visual",
            component: "support-resistance-chart",
            props: { mode: "basics", showBounces: true },
          },
          {
            type: "text",
            content:
              "**How the line actually gets drawn.** There's no official source — traders draw it themselves. The common ingredients:\n\n1. **Swing lows / swing highs** — obvious dips the price bounced off before (support) or peaks it got rejected from (resistance). Connect them.\n2. **Touch count** — the more times price has bounced off a level, the more traders respect it. Two touches is a maybe; four is a level people watch.\n3. **Round numbers** — humans cluster orders at round figures. $500, $520, $50, $100 act as magnets purely because they're psychologically tidy.\n4. **Volume shelves** — prices where a *huge* amount of shares changed hands. Lots of owners at that price means lots of memory. Charts show this as a \"volume profile\" — a fat bar marks a shelf.\n5. **Moving averages as dynamic support** — the 50-day and 200-day average lines slope with the trend and often act as a *moving* floor. \"It bounced off its 200-day\" is a support claim about a sloped line, not a flat one.",
          },
          {
            type: "text",
            content:
              "**Try it — draw the level yourself.** Reading a support claim and *placing* one are different skills. On the chart below, drag the line to where you think support sits — the price the stock keeps bouncing off — and get scored on how close you are to the level the crowd is actually watching.",
          },
          {
            type: "interactive",
            component: "level-finder",
            props: { mode: "support", difficulty: "easy" },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "If you anchored your line on the swing lows the stock bounced from — not on the latest candle or a random round number — you've got the core instinct. A good level connects multiple touches; that's what makes it 'crowd memory' rather than a guess.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to verify a claimed level in 60 seconds:\n\n1. Pull up the ticker (stonkbro's ticker page or TradingView) on a Daily chart, zoomed to about 6–12 months.\n2. Draw a horizontal line at the claimed price (in TradingView, press the horizontal-line tool, click at 520).\n3. Count how many times price has touched or bounced near that line in the past year. Zero touches? The number is basically made up. Three-plus clean bounces? It's a real, watched level.\n4. Check if it lines up with a round number or a moving average — that adds weight.",
          },
          {
            type: "text",
            content:
              "**Why levels fail.** Support holds until it doesn't. When a stock slices *through* $520 instead of bouncing, that's a **breakdown**, and often the old floor flips into a new ceiling (\"support becomes resistance\"). The trapped buyers from $520 now just want out at break-even, so they sell into any bounce back up. Levels also decay with time — a floor from two years ago has little memory left because most of those traders have moved on.",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — a level that holds.** Suppose META dipped to about $518–$522 three separate times over four months, bouncing each time. A friend saying \"support at 520\" is describing a real, triple-tested shelf. If it dips there a fourth time, buyers who watched the first three bounces are primed to step in — the claim is grounded.\n\n**Worked example 2 — a level that breaks.** Now suppose bad guidance sends META straight through $520 on heavy volume to $505. The floor failed. Watch what happens on the next rally: it often stalls right back at ~$520, because the people who bought at $520 and rode it down just want their money back. The old support is now resistance.",
          },
          {
            type: "text",
            content:
              "**Now read a live example.** The chart below shows a stock approaching a level. Decide what's happening before you answer.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "support-bounce",
              question:
                "Price has fallen to a level it has bounced off several times before, and buyers are stepping in again. What is this, and what does it imply?",
              options: [
                "A breakdown — the floor has failed and will become resistance",
                "A support bounce — a repeatedly-tested level where buyers show up, so a reaction here is likely (though never guaranteed)",
                "A short squeeze forcing the price up",
                "A golden cross",
              ],
              correctIndex: 1,
              explanation:
                "Multiple prior touches plus buyers re-appearing is a support bounce: the crowd remembers this price and acts on it. It's a grounded, watched level — not a guarantee, since support does eventually break, but a real reaction zone.",
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you called it a bounce because the level had been tested before, you're reading support the way pros do — as crowd memory measured in touch count, not as a magic number.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "A single touch is not a level. If someone quotes a support price and you draw the line and see the stock has never actually traded around there, treat the claim as a hunch, not a fact. Ask: \"how many times has it bounced there?\"",
          },
        ],
      },
      // ── Lesson 3: IV crush / theta gang ────────────────────────────
      {
        id: "tt-iv-crush",
        title: "\"IV crush,\" \"theta gang,\" \"selling premium\"",
        subtitle: "The vocabulary of people who sell options instead of buying them",
        estimatedMinutes: 11,
        sections: [
          {
            type: "text",
            content:
              "There's a whole dialect around *selling* options rather than buying them, and it revolves around two ideas: **implied volatility (IV)** and **theta**. Get these two and the slang falls into place.\n\n**Implied volatility (IV)** is the market's guess about how much a stock will move, baked into the option's price. High IV means the market expects big swings, so options are *expensive*. Low IV means calm is expected, so options are *cheap*. IV doesn't say which direction — just *how much* motion is priced in.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Think of IV as the weather forecast priced into an option. \"Storm expected\" (high IV) makes umbrellas (options) pricey. If the storm fizzles, umbrella prices collapse — even if you were right that it might rain.",
          },
          {
            type: "text",
            content:
              "We measure whether IV is high or low with **IV Rank**: where today's IV sits versus the stock's own past year, from 0 to 100. IV Rank of 80 means IV is near the top of its yearly range — options are richly priced. IV Rank of 15 means options are historically cheap. This matters because sellers want to sell when things are *expensive* (high IV Rank) and buyers want to buy when they're *cheap* (low IV Rank).",
          },
          {
            type: "visual",
            component: "iv-rank-gauge",
            props: {},
          },
          {
            type: "text",
            content:
              "**IV crush** is the sudden collapse of implied volatility after a known event passes — most famously **earnings**. Before earnings, nobody knows the result, so IV balloons and options get expensive. The *moment* earnings come out, the uncertainty is gone, IV deflates, and every option loses a chunk of value instantly — regardless of which way the stock moved.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "IV crush is why beginners lose money \"even when they were right.\" You can correctly bet a stock goes up into earnings, the stock *does* go up a little, and your call option still loses money — because the volatility premium you overpaid for evaporated the instant results dropped.",
          },
          {
            type: "text",
            content:
              "**Worked example — IV crush in numbers.** A stock trades at $100 the day before earnings. IV is jacked up, so the $100 call expiring that week costs $6.00. Earnings come out fine and the stock ticks up to $101 — you were directionally right. But IV crushes from, say, 90% down to 45%. The call is now barely in the money with almost no time value left, and it's worth about $2.40. You were right on direction and still lost roughly **60%**. The move ($1) didn't cover the collapsed premium ($6 → $2.40).",
          },
          {
            type: "visual",
            component: "theta-decay",
            props: { dte: 30, strike: 100, premium: 6 },
          },
          {
            type: "text",
            content:
              "**Theta** is time decay — how much value an option loses each day just from the clock ticking, all else equal. Options are wasting assets: every day that passes, a little of that extrinsic (time) value drains away, and the drain speeds up as expiration nears.\n\n**\"Theta gang\"** is the nickname for traders who *sell* options to collect that decay. Instead of buying a lottery ticket that bleeds value, they sell the ticket to someone else and pocket the premium as time and IV work in their favor. \"Selling premium\" is the same idea: you collect the option's price upfront and hope it expires worthless (or cheaper) so you keep the difference.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Buyers of options fight two headwinds: theta (time bleeding away) and IV crush (volatility deflating). Sellers — \"theta gang\" — put those same two forces on their side. That's the whole appeal of selling premium.",
          },
          {
            type: "text",
            content:
              "**When selling beats buying.** Selling premium tends to shine when IV Rank is *high* (you're selling something overpriced) and you don't need a big directional move to win — you just need time to pass and the stock to not blow through your strike. Buying tends to be better when IV is *low* (options are cheap) and you expect a large, fast move. The strategies stonkbro focuses on — covered calls, cash-secured puts, PMCCs — are all forms of collecting premium, which is why IV Rank and theta show up all over the app.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to check IV yourself before an earnings trade:\n\n1. On the ticker's page, look for the IV Rank gauge (stonkbro shows this) or check an options platform's \"IV\" and \"IV Rank/Percentile\" fields.\n2. If IV Rank is high (say 70+) and earnings are tomorrow, understand you're *buying* into an IV crush — the deck is stacked against a long option.\n3. Check when the next earnings date is (Yahoo Finance \"Earnings\" tab). Buying options through an earnings date is the classic IV-crush trap.",
          },
        ],
      },
      // ── Lesson 4: Golden cross / 50-day ────────────────────────────
      {
        id: "tt-golden-cross",
        title: "\"Golden cross,\" \"death cross,\" \"holding the 50-day\"",
        subtitle: "The moving-average trend vocabulary, with the honest caveats",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "A **moving average** smooths out the daily noise by averaging the closing price over the last N days. The **50-day** average is the average close over the past 50 trading days; the **200-day** is over 200 days. As the stock moves, these lines glide along underneath (in an uptrend) or above (in a downtrend) the price, giving you a clean read on the overall direction.\n\nTraders treat them as dynamic support and resistance and as trend signals. \"Holding the 50-day\" means the price keeps bouncing up off its 50-day line — a sign the uptrend is intact.",
          },
          {
            type: "visual",
            component: "sma-chart",
            props: {},
          },
          {
            type: "text",
            content:
              "**Golden cross** = the 50-day average crosses *above* the 200-day average. It signals that recent momentum has turned up relative to the long-term trend — traders read it as bullish.\n\n**Death cross** = the 50-day crosses *below* the 200-day. Read as bearish: the short-term trend has rolled over beneath the long-term one.\n\nThe ominous names oversell them. These are *lagging* signals — by the time the slow 200-day line gets crossed, a big part of the move has usually already happened.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "Honest stats: golden and death crosses lag. In choppy, sideways markets they produce **whipsaws** — a death cross right before the stock rips higher, or a golden cross right before it rolls over. They describe momentum that already turned; they don't predict the future. Treat them as context, not triggers.",
          },
          {
            type: "text",
            content:
              "**Worked example 1 — a clean golden cross.** A stock bottoms at $80, grinds back to $110 over a few months, and around $105 its 50-day finally crosses above its 200-day. The cross confirmed a trend that was already well underway — useful as confirmation, useless as an entry, since you'd have bought $25 higher than the bottom.\n\n**Worked example 2 — a whipsaw death cross.** A stock chops between $40 and $46 for months. The averages tangle together and print a death cross at $41 — then it rallies to $47 two weeks later, triggering a golden cross. Anyone who shorted the death cross got whipsawed. In sideways markets, crossovers are noise.",
          },
          {
            type: "text",
            content:
              "**Spot the cross.** Two fresh charts. Name each crossover and, just as importantly, judge how much it's really telling you.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "golden-cross",
              question:
                "On this chart the 50-day moving average has just crossed above the 200-day. What is it, and what's the honest caveat?",
              options: [
                "A death cross — bearish, sell immediately",
                "A golden cross — read as bullish momentum, but it lags, so much of the move has usually already happened",
                "A short squeeze",
                "A Bollinger squeeze signalling low volatility",
              ],
              correctIndex: 1,
              explanation:
                "50-day crossing above the 200-day is a golden cross, read as bullish. The caveat: it's a lagging signal confirming a trend already underway, and it whipsaws in choppy markets. Use it as context, not a trigger.",
            },
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "death-cross",
              question:
                "Here the 50-day has crossed below the 200-day while price has been chopping sideways in a tight range. What's the best read?",
              options: [
                "A death cross — but in a sideways market crossovers whipsaw, so treat it as weak context, not a short signal",
                "A guaranteed crash is coming",
                "A golden cross forming",
                "An IV crush",
              ],
              correctIndex: 0,
              explanation:
                "The 50-day below the 200-day is a death cross, nominally bearish — but in a flat, choppy market the averages tangle and produce whipsaws. Without a real trend behind it, it's noise, not a trigger.",
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you named both crosses AND flagged the death cross as a likely whipsaw because price was ranging, you're already ahead of most: the signal only means something when there's a genuine trend for it to confirm.",
          },
          {
            type: "text",
            content:
              "**\"Riding the 21 EMA.\"** The EMA (exponential moving average) is a moving average that weights recent days more heavily, so it hugs the price more tightly than a plain average. In a strong trend, a stock will often pull back just to its 21-day EMA and bounce, over and over. Momentum traders \"ride the 21 EMA\" — staying in as long as the stock keeps holding that fast line, and getting out when it decisively breaks below it.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to add these to any chart:\n\n1. Open the ticker on a Daily chart (stonkbro or TradingView).\n2. Add indicator \"Moving Average\" (SMA) with length 50. Add another with length 200. Add an \"EMA\" with length 21 if you want the fast line.\n3. Above both lines and rising = healthy uptrend. Price below a falling 200-day = downtrend. Lines tangled and flat = no trend, ignore the crosses.\n4. To verify a \"holding the 50-day\" claim: look for repeated bounces up off the 50-day line over recent months.",
          },
        ],
      },
      // ── Lesson 5: Overbought / oversold / divergence ───────────────
      {
        id: "tt-overbought-oversold",
        title: "\"Overbought,\" \"oversold,\" \"divergence\"",
        subtitle: "RSI and MACD talk — and the myth that overbought means \"sell now\"",
        estimatedMinutes: 11,
        sections: [
          {
            type: "text",
            content:
              "**RSI (Relative Strength Index)** is a 0–100 meter of how hard a stock has been pushed recently. Above 70 is conventionally called **overbought**; below 30, **oversold**. It's built from the ratio of up-moves to down-moves over (usually) the last 14 days.\n\nThe single biggest misconception: **overbought does not mean \"must fall,\" and oversold does not mean \"must rise.\"** In a powerful uptrend, RSI can pin above 70 for weeks while the stock keeps climbing. Overbought means \"strong,\" not \"doomed.\"",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "\"Overbought\" = the stock has risen fast lately. That's it. Strong stocks stay overbought for a long time. Selling just because RSI hit 70 is how people bail on winners early. RSI is a description of momentum, not a countdown timer.",
          },
          {
            type: "visual",
            component: "rsi-chart",
            props: { showZones: true, period: 14 },
          },
          {
            type: "text",
            content:
              "**Worked example — oversold that stayed oversold.** During a hard sell-off, a stock's RSI drops to 25 (oversold) at $60. A trader buys expecting a bounce. Instead the stock grinds to $52 over two more weeks with RSI hovering near 22 the whole time. \"Oversold\" told you it fell fast — it did not promise a bottom. Oversold in a strong *downtrend* can persist.",
          },
          {
            type: "text",
            content:
              "**Divergence** is where RSI gets genuinely useful. It's when price and the momentum meter disagree:\n\n• **Bearish divergence** — price makes a *higher* high, but RSI makes a *lower* high. The new price peak came with less momentum behind it — the rally is running out of gas.\n• **Bullish divergence** — price makes a *lower* low, but RSI makes a *higher* low. The new low had less selling force — the decline may be exhausting.",
          },
          {
            type: "text",
            content:
              "**Worked-out divergence example.** A stock rallies to $100, pulls back, then pushes to a new high of $104. Price clearly made a higher high ($104 > $100). But RSI printed 78 at the $100 peak and only 68 at the $104 peak — a *lower* high on the meter. That gap is bearish divergence: the second push to a new price high had noticeably weaker momentum. It's a caution flag, not a sell button — it says \"this rally is tiring,\" and you'd want price confirmation (like a break below a support level) before acting.",
          },
          {
            type: "text",
            content:
              "**Now read one off a chart.** The panel below plots price against its RSI. Compare the two most recent peaks before you answer.",
          },
          {
            type: "interactive",
            component: "chart-quiz",
            props: {
              scenario: "rsi-divergence",
              question:
                "Price on this chart makes a higher high, but RSI makes a lower high at the same moment. What is this, and what should you do with it?",
              options: [
                "Bullish divergence — back up the truck and buy",
                "Bearish divergence — the new price high came with weaker momentum, a caution flag that wants price confirmation before you act",
                "It means the stock is oversold",
                "It's a golden cross",
              ],
              correctIndex: 1,
              explanation:
                "Higher high in price + lower high in RSI is bearish divergence: the rally reached a new peak on less momentum. It flags a tiring move, but it's not a sell button on its own — wait for price confirmation like a break of support.",
            },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you read the price/RSI disagreement as a warning that wants confirmation — rather than an instant sell — you're using divergence the way it's meant to be used: to add or subtract conviction, never as the whole trade.",
          },
          {
            type: "text",
            content:
              "**MACD** (Moving Average Convergence Divergence) is a momentum tool built from two moving averages. It boils down to a **MACD line** and a **signal line**. The phrases you'll hear:\n\n• **\"MACD crossed up / bullish cross\"** — the MACD line crossed above the signal line: momentum is turning up.\n• **\"MACD crossed down / bearish cross\"** — MACD line crossed below the signal line: momentum turning down.\n• **\"MACD above/below zero\"** — above zero leans bullish, below zero leans bearish.\n\nLike the crosses in the last lesson, MACD lags and whipsaws in choppy markets. It's best read alongside price and support levels, not alone.",
          },
          {
            type: "visual",
            component: "macd-chart",
            props: {},
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to check an \"overbought\" or \"divergence\" claim yourself:\n\n1. Open the ticker on a Daily chart. Add indicator \"RSI\" (default length 14) and \"MACD\" (defaults).\n2. For an overbought/oversold claim: is RSI actually above 70 or below 30 right now? And is the stock trending or ranging? In a strong trend, don't over-weight the reading.\n3. For a divergence claim: line up the two most recent price peaks (or troughs) and check whether RSI made the opposite kind of high/low. If price and RSI genuinely disagree, the divergence is real.\n4. For MACD talk: check whether the MACD line is above or below its signal line, and whether it's above or below zero.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "None of these are standalone buy/sell buttons. RSI, MACD, and divergence describe *momentum*. The pros use them to add or subtract conviction from a thesis that already has a reason (a level, a catalyst, a trend) — never as the whole trade.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "tt-quiz-1",
                question:
                  "Your friend says \"this stock is setting up for a squeeze\" and points at Bollinger Bands that have pinched to their narrowest in six months. Which kind of squeeze is that, and what does it imply?",
                options: [
                  "A short squeeze — buy calls, shorts are about to get run over",
                  "A Bollinger (volatility) squeeze — a big move is likely soon, but the direction is unknown",
                  "It means the stock will definitely go up",
                  "It means volatility is high and options are expensive",
                ],
                correctIndex: 1,
                explanation:
                  "Narrow Bollinger Bands signal a volatility squeeze: the stock has gone quiet and is coiling. It predicts a large move is coming but not which way — which is why traders often use direction-neutral bets like straddles here.",
              },
              {
                id: "tt-quiz-2",
                question:
                  "A friend claims \"META finds support at 520.\" You draw the line and see the stock has touched near $520 and bounced three separate times over the past year. What's the best read?",
                options: [
                  "Ignore it — support levels are meaningless",
                  "It's a well-tested level worth watching, because repeated bounces mean many traders remember and act on that price",
                  "The stock can never go below $520",
                  "Support only matters if it's a moving average",
                ],
                correctIndex: 1,
                explanation:
                  "Three clean bounces make it a real, watched level — support is crowd memory, and multiple touches mean many participants respect that price. It's not a guarantee (levels do break), but it's a grounded claim, not a hunch.",
              },
              {
                id: "tt-quiz-3",
                question:
                  "You buy a call before earnings. The stock rises slightly after the report, but your call loses 60% of its value. What most likely happened?",
                options: [
                  "You were wrong about the direction",
                  "IV crush — implied volatility collapsed after earnings, deflating the premium you overpaid for",
                  "The stock paid a dividend",
                  "A death cross formed",
                ],
                correctIndex: 1,
                explanation:
                  "This is the classic IV-crush trap. Before earnings, IV is inflated and options are expensive. Once results drop, uncertainty vanishes, IV collapses, and the option loses value even if you were right on direction — the small move didn't cover the deflated premium.",
              },
              {
                id: "tt-quiz-4",
                question:
                  "What does a \"golden cross\" describe, and what's the honest caveat?",
                options: [
                  "The 50-day average crossing above the 200-day — a bullish signal, but it lags and can whipsaw",
                  "A guaranteed buy signal that always works",
                  "The stock hitting an all-time high",
                  "Implied volatility crossing above 50%",
                ],
                correctIndex: 0,
                explanation:
                  "A golden cross is the 50-day moving average crossing above the 200-day, read as bullish momentum. But it's a lagging signal — much of the move has usually already happened — and in choppy markets it whipsaws. Use it as context, not a trigger.",
              },
              {
                id: "tt-quiz-5",
                question:
                  "A stock's RSI has been above 70 for two weeks while the price keeps climbing. Your friend says \"it's overbought, it has to drop.\" What's the accurate response?",
                options: [
                  "Agree — overbought always means an imminent drop",
                  "Overbought just means it has risen fast; strong stocks can stay overbought for weeks. It's momentum, not a countdown to a sell-off",
                  "RSI is broken above 70",
                  "It means IV is about to crush",
                ],
                correctIndex: 1,
                explanation:
                  "Overbought (RSI > 70) means the stock has been pushed up hard recently — that's a sign of strength, not doom. In strong uptrends RSI can pin above 70 for a long time. Selling purely because RSI hit 70 is how people abandon winners early.",
              },
            ],
          },
        ],
      },
    ],
  },
  // ─── MODULE 2: YOUR TOOLKIT ────────────────────────────────────────
  {
    id: "trader-toolkit",
    title: "Your Toolkit: Where to Check Everything",
    subtitle:
      "Turn any claim a friend makes into a 60-second check — using stonkbro and free tools",
    icon: "🧰",
    color: "cyan-500",
    level: 1,
    lessons: [
      // ── Lesson 1: 60-second verification workflow ──────────────────
      {
        id: "tk-verify-workflow",
        title: "The 60-second verification workflow",
        subtitle: "Claim in → click-path out. Never nod along blindly again.",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "Every trading claim your friends make is checkable. The skill isn't memorizing markets — it's knowing the *click-path* from a claim to the chart that confirms or kills it. This lesson gives you the recipes. The pattern is always: **claim → open a specific view → plot a specific thing → read a yes/no answer.**",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "You don't need to predict anything. You just need to check whether the claim is even *true right now*. \"Is NVDA actually oversold?\" is a factual question with a 30-second answer, not a debate.",
          },
          {
            type: "text",
            content:
              "**Where to check inside stonkbro:**\n\n• **Ticker page** — the one-stop view for a single stock. Its signals/technicals section shows the trend, momentum readings, and key levels the app has computed. Start here for any single-stock claim.\n• **/signals page** — the app's scan of what's flashing across the watchlist right now: momentum, breakouts, and setups. Use it for \"what's moving?\" claims.\n• **/bloodbath page** — the drawdown view: what's selling off hard, how far off its highs, falling-knife warnings. Use it for \"everything's crashing\" or \"is this a dip to buy?\" claims.",
          },
          {
            type: "text",
            content:
              "**Where to check outside stonkbro (TradingView free tier):**\n\n1. Go to the chart and type the ticker.\n2. Click the **Indicators** button (top toolbar), search the indicator by name (e.g. \"RSI\", \"Bollinger Bands\", \"Moving Average\"), and click it to add.\n3. Change the **timeframe** with the buttons near the top: \"D\" = daily (each candle is one day), \"W\" = weekly, \"1h\" = hourly.\n4. **Why timeframe matters:** a claim is only true on a specific timeframe. \"Oversold\" on the *hourly* chart can be totally different from the *daily*. Most casual claims mean the **daily** chart unless someone says otherwise. If a friend is vague, assume daily.",
          },
          {
            type: "text",
            content:
              "**Try it — add and adjust indicators without leaving the page.** The playground below is a stand-in for that Indicators button. Toggle the **RSI**, **Bollinger Bands**, and a **moving average** on and off, and drag the period sliders. Get a feel for what each overlay adds before you go do it on a live TradingView chart.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "rsi" },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "That toggle-and-read loop is the entire verification skill: plot the specific thing a claim depends on, then read a yes/no answer off it. If you could turn RSI on and immediately see whether it was below 30, you can check any \"oversold\" claim in seconds.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Recipe — \"NVDA is oversold\":\n\n1. Open NVDA (stonkbro ticker page, or TradingView).\n2. Plot **RSI(14)** on the **Daily** chart.\n3. Read it: is RSI actually below 30? Below 30 = the claim is true (it is oversold). Sitting at 45 = the claim is false.\n4. Sanity check: is the stock trending down hard? If so, remember oversold can persist — true but not a green light.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Recipe — \"TSLA is about to break out / do a squeeze\":\n\n1. Open TSLA on a Daily chart.\n2. Add **Bollinger Bands** (20, 2).\n3. Read it: are the bands pinched to a multi-month narrow? Yes = a volatility squeeze is real, a move is coming (direction unknown). No = the claim doesn't hold.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Recipe — \"AAPL is holding its 50-day\":\n\n1. Open AAPL on a Daily chart.\n2. Add a **Moving Average** with length 50.\n3. Read it: is the price sitting on or just above the 50-day line, and has it bounced off it recently? Yes = the claim is true, the uptrend structure is intact. Price well below a falling 50-day = the claim is false.",
          },
          {
            type: "text",
            content:
              "**Worked walk-through.** A friend texts: \"AMD looks oversold, I'm buying the dip.\" You open AMD's ticker page in stonkbro, glance at the momentum reading (RSI 34 — not quite oversold, close), then flip to /bloodbath to see AMD is down 18% off its high with a falling-knife flag. Now you can reply with something real: \"RSI's at 34, not technically oversold yet, and bloodbath still flags it as a falling knife — I'd wait for it to stop dropping.\" That's an intelligent seat at the table, built from two 15-second checks.",
          },
        ],
      },
      // ── Lesson 2: Which metric answers which question ──────────────
      {
        id: "tk-metric-map",
        title: "Which metric answers which question",
        subtitle: "A lookup table from the question in your head to the number that answers it",
        estimatedMinutes: 9,
        sections: [
          {
            type: "text",
            content:
              "Traders throw around a dozen indicators, but each one answers a specific question. If you know the mapping — question to metric — you always know what to plot. This lesson is that map.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "Don't ask \"what does MACD do?\" Ask \"what do I want to know?\" — then reach for the metric that answers it. The question comes first; the indicator is just the tool that answers it.",
          },
          {
            type: "text",
            content:
              "**Is the trend up or down?** → **Price vs the 50-day and 200-day moving averages.**\nAbove both, and both rising = uptrend. Below both, and falling = downtrend. Tangled and flat = no trend. This is the first thing to establish, because every other reading means something different in an uptrend versus a downtrend.",
          },
          {
            type: "text",
            content:
              "**Is a big move brewing?** → **Bollinger Band width** and **IV Rank.**\nPinched Bollinger Bands say the price has gone quiet and is coiling (a move is building). High IV Rank says the *options market* is pricing in a big move. When the chart is quiet but IV Rank is climbing, something's expected. These two together are your \"storm coming\" gauge.",
          },
          {
            type: "text",
            content:
              "**Is it overextended (ran too far, too fast)?** → **RSI** and **distance from the moving average.**\nRSI above 70 (or below 30) flags a fast move. \"Distance from the 50-day\" — how far price has stretched above its average — flags a rubber-band that may snap back. A stock 25% above its 50-day is stretched; hugging it is normal. Remember overextended ≠ guaranteed reversal.",
          },
          {
            type: "text",
            content:
              "**Where will it bounce or stall?** → **Support/resistance levels** and **volume shelves.**\nDraw horizontal lines at prior swing lows/highs and round numbers; check volume profile for price shelves where lots of shares changed hands. Those are the prices where the stock is most likely to react. \"Where's the floor?\" is answered by support, not by RSI.",
          },
          {
            type: "text",
            content:
              "**Are the options cheap or expensive?** → **IV Rank versus realized volatility.**\nIV Rank tells you where *implied* volatility (the market's forecast, priced into options) sits in its yearly range. Compare that to *realized* volatility (how much the stock has *actually* been moving). If implied is high but the stock's real movement is tame, options are expensive relative to reality — good for *selling* premium. If implied is low but the stock is actually thrashing around, options are cheap — better for *buying*.",
          },
          {
            type: "visual",
            component: "ta-greeks-chart",
            props: { mode: "csp-entry", showSupport: true },
          },
          {
            type: "callout",
            style: "tip",
            content:
              "Keep this cheat-sheet in your head:\n\n• Trend? → price vs 50/200-day SMA\n• Move brewing? → Bollinger width + IV Rank\n• Overextended? → RSI + distance from SMA\n• Where's the floor? → support levels + volume shelves\n• Options cheap or dear? → IV Rank vs realized volatility\n\nWhen a friend makes a claim, first figure out which question it is — then you know exactly what to pull up.",
          },
          {
            type: "text",
            content:
              "**Try it — match the question to the overlay.** Use the playground below. For the trend question, turn on the **50 and 200-day moving averages** and see whether price sits above or below them. For the overextended question, turn on **RSI** and read whether it's near 70 or 30. Practice pulling up the *right* tool for the question in your head, not every tool at once.",
          },
          {
            type: "interactive",
            component: "indicator-playground",
            props: { preset: "sma" },
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "If you reached for the moving averages when the question was \"what's the trend?\" and RSI when it was \"is it overextended?\", you've got the map working the right direction: question first, indicator second. That's what keeps a chart from turning into a wall of noise.",
          },
          {
            type: "text",
            content:
              "**Worked example — mapping a real conversation.** Friend: \"NVDA's ripping, but it feels stretched, and options are pricey into earnings.\" Break it into questions: (1) \"ripping\" → trend check: price above rising 50/200-day, yes, uptrend confirmed. (2) \"stretched\" → overextension check: RSI 76 and price 22% above the 50-day, yes, genuinely extended. (3) \"options pricey\" → IV Rank check: 85, yes, richly priced into earnings. Now every piece of their claim is verified or corrected with a specific number — and you know that buying calls here means fighting both overextension and an IV crush.",
          },
        ],
      },
      // ── Lesson 3: Reading an options chain ─────────────────────────
      {
        id: "tk-options-chain",
        title: "Reading an options chain without sweating",
        subtitle: "Every column decoded — plus what stonkbro's AROC, juiciness, and conviction mean",
        estimatedMinutes: 10,
        sections: [
          {
            type: "text",
            content:
              "An options chain is just a table of every available contract for a stock: rows for each **strike price**, split into calls and puts, with columns of numbers. It looks intimidating; it's really just a menu. Let's decode every column so it reads like plain text.",
          },
          {
            type: "visual",
            component: "option-chain-sim",
            props: { showFactors: true },
          },
          {
            type: "text",
            content:
              "**The columns, decoded:**\n\n• **Strike** — the price the contract lets you buy (call) or sell (put) at.\n• **Bid** — the highest price a buyer is currently willing to pay for the contract. This is what you'd get if you *sold* right now.\n• **Ask** — the lowest price a seller will accept. This is what you'd pay if you *bought* right now.\n• **Bid/Ask spread** — the gap between them. A tight spread (a few cents) means a liquid, easy-to-trade contract. A wide spread (e.g. bid $1.00 / ask $1.60) means you lose a lot just entering and exiting — a red flag.\n• **Volume** — how many contracts traded *today*. High = active interest today.\n• **OI (Open Interest)** — how many contracts are *currently outstanding* (open positions). High OI = a liquid, popular strike.\n• **IV (Implied Volatility)** — the market's expected movement priced into *this specific* contract.\n• **Delta** — roughly how much the option moves per $1 move in the stock, and loosely, the market's odds the option finishes in the money. Delta 0.30 ≈ moves $0.30 per $1, ≈ 30% chance of finishing in the money.",
          },
          {
            type: "callout",
            style: "key-concept",
            content:
              "The two columns that keep you out of trouble are **Open Interest** and the **bid/ask spread**. High OI + tight spread = a liquid strike you can get in and out of fairly. Low OI + wide spread = a roach motel: easy to enter, painful to exit.",
          },
          {
            type: "callout",
            style: "tip",
            content:
              "How to spot the liquid strikes at a glance:\n\n1. Scan the **OI** column — the strikes with the biggest open interest are the ones everyone trades. Near-the-money strikes usually have the most.\n2. Check the **bid/ask spread** on those strikes — you want it tight (pennies, not dollars).\n3. Prefer round-number and near-the-money strikes; they're almost always the most liquid.\n4. Avoid far-out, thinly-traded strikes with single-digit OI — you'll get a bad fill.",
          },
          {
            type: "text",
            content:
              "**What stonkbro's own numbers mean.** On top of the raw chain, the app computes a few metrics to rank which premium-selling trades are worth it:\n\n• **AROC (Annualized Return On Collateral)** — if you sell a put (or a covered call), you tie up collateral and collect premium over some number of days. AROC scales that return up to a yearly rate so you can compare a 7-day trade against a 45-day one on equal footing. A cash-secured put earning $150 on $5,000 of collateral in 30 days is a 3% return that month — roughly 36% *annualized*. AROC is that annualized figure.\n\n• **Juiciness** — a quick score for how rich the premium is relative to the risk you're taking. Higher juiciness = you're being paid more for the collateral and risk. It's a fast \"is this worth my capital?\" read.\n\n• **Conviction** — stonkbro's composite score of how good the *overall* setup is, bucketed into tiers: **STRONG**, **MODERATE**, and **SPECULATIVE**. STRONG means the underlying signals, level, and premium all line up. SPECULATIVE means the premium might be juicy but the setup is shakier — size accordingly.",
          },
          {
            type: "callout",
            style: "warning",
            content:
              "A high AROC or juiciness on its own is a trap — the market usually pays fat premium precisely *because* the trade is risky (e.g. right before earnings, or on a falling knife). Always read AROC and juiciness *together* with conviction. A juicy SPECULATIVE trade is the market paying you to catch a knife.",
          },
          {
            type: "text",
            content:
              "**Worked example — reading a cash-secured put row.** Stock at $52. You're looking at the $50 put, 30 days out. The chain shows: bid $1.45 / ask $1.55 (tight — good), OI 4,200 (liquid — good), delta -0.28 (roughly a 28% chance it finishes in the money, i.e. that you get assigned). Selling it for ~$1.50 collects $150 against $5,000 of collateral — about 3% in 30 days, which stonkbro would annualize to an AROC near 36%. If conviction reads STRONG (the $50 area is tested support and the trend is healthy), that's a clean setup. If it reads SPECULATIVE because earnings land in two weeks, the juicy premium is compensation for IV-crush and gap risk — a very different trade.",
          },
          {
            type: "quiz",
            questions: [
              {
                id: "tk-quiz-1",
                question:
                  "You're comparing two option strikes. Strike A has Open Interest of 6,000 and a bid/ask of $2.00/$2.05. Strike B has OI of 12 and a bid/ask of $1.10/$1.80. Which is the more tradable (liquid) strike, and why?",
                options: [
                  "Strike B, because it's cheaper",
                  "Strike A, because high OI and a tight bid/ask spread mean you can get in and out without losing much to the spread",
                  "They're equally tradable",
                  "Strike B, because a wide spread means more profit",
                ],
                correctIndex: 1,
                explanation:
                  "Strike A wins on both liquidity signals: 6,000 open interest (lots of active positions) and a 5-cent spread. Strike B's tiny OI and 70-cent spread mean you'd lose a chunk just entering and exiting — a roach motel.",
              },
              {
                id: "tk-quiz-2",
                question:
                  "An option has a delta of 0.30. What does that tell you?",
                options: [
                  "The option costs $0.30",
                  "It moves roughly $0.30 for each $1 move in the stock, and has loosely a ~30% chance of finishing in the money",
                  "The stock will rise 30%",
                  "Implied volatility is 30%",
                ],
                correctIndex: 1,
                explanation:
                  "Delta ≈ 0.30 means the option gains about $0.30 per $1 move in the underlying, and it's a rough proxy for a ~30% probability of finishing in the money. It is not the price or the IV.",
              },
              {
                id: "tk-quiz-3",
                question:
                  "What does stonkbro's AROC (Annualized Return On Collateral) let you do?",
                options: [
                  "Predict which direction the stock will move",
                  "Compare premium-selling trades of different durations on an equal, annualized basis",
                  "Measure implied volatility",
                  "Count open interest",
                ],
                correctIndex: 1,
                explanation:
                  "AROC scales a trade's return-on-collateral up to a yearly rate, so a 7-day trade and a 45-day trade can be compared fairly. A $150 return on $5,000 collateral in 30 days (~3%/month) annualizes to roughly 36% AROC.",
              },
              {
                id: "tk-quiz-4",
                question:
                  "A trade shows very high juiciness but a conviction tier of SPECULATIVE. What's the smart interpretation?",
                options: [
                  "It's the best trade available — juicy premium plus excitement",
                  "The market is paying rich premium precisely because the setup is risky; treat it cautiously and size small",
                  "Juiciness overrides conviction, so ignore the tier",
                  "SPECULATIVE means it's guaranteed to lose",
                ],
                correctIndex: 1,
                explanation:
                  "Fat premium usually exists because the trade is risky — earnings, a falling knife, a shaky level. A juicy SPECULATIVE trade is the market compensating you for that risk. Always read juiciness together with conviction and size accordingly.",
              },
            ],
          },
        ],
      },
    ],
  },
];
