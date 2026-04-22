export type StockScore = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  score: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  rsi: number;
  macdSignal: "bullish_cross" | "bearish_cross" | "bullish" | "bearish" | "neutral";
  bbSqueeze: boolean;
  above50sma: boolean;
  above200sma: boolean;
  sector: string;
  sparkline: number[];
  signals: string[];
};

export type NewsItem = {
  title: string;
  source: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
  summary: string;
};

export type OptionLeg = {
  strike: number;
  expiry: string;
  dte: number;
  type: "call" | "put";
  bid: number;
  ask: number;
  mid: number;
  delta: number;
  theta: number;
  iv: number;
  openInterest: number;
};

export type PMCCSetup = {
  leaps: OptionLeg;
  shortCall: OptionLeg;
  netDebit: number;
  maxProfit: number;
  maxLoss: number;
  breakeven: number;
  returnOnRisk: number;
  monthlyIncome: number;
};

export type Position = {
  symbol: string;
  strategy: "PMCC" | "Covered Call" | "Cash-Secured Put";
  status: "active" | "profit_target" | "needs_roll" | "warning";
  legs: {
    description: string;
    entry: number;
    current: number;
    pnl: number;
  }[];
  totalPnl: number;
  incomeCollected: number;
  openedAt: string;
  daysOpen: number;
};

export const mockStocks: StockScore[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 924.79,
    change: 38.21,
    changePct: 4.31,
    score: 92,
    volume: 58_400_000,
    avgVolume: 18_200_000,
    volumeRatio: 3.21,
    rsi: 68,
    macdSignal: "bullish_cross",
    bbSqueeze: false,
    above50sma: true,
    above200sma: true,
    sector: "Technology",
    sparkline: [780, 795, 810, 802, 830, 855, 840, 870, 885, 890, 880, 910, 925],
    signals: ["MACD bullish cross", "Volume 3.2x avg", "Above all MAs"],
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies",
    price: 78.43,
    change: 5.92,
    changePct: 8.16,
    score: 88,
    volume: 92_100_000,
    avgVolume: 34_500_000,
    volumeRatio: 2.67,
    rsi: 72,
    macdSignal: "bullish",
    bbSqueeze: false,
    above50sma: true,
    above200sma: true,
    sector: "Technology",
    sparkline: [52, 55, 58, 54, 60, 63, 61, 65, 68, 70, 72, 75, 78],
    signals: ["Breakout above resistance", "Volume surge", "RSI momentum"],
  },
  {
    symbol: "CELH",
    name: "Celsius Holdings",
    price: 54.18,
    change: 4.33,
    changePct: 8.69,
    score: 85,
    volume: 12_800_000,
    avgVolume: 4_100_000,
    volumeRatio: 3.12,
    rsi: 64,
    macdSignal: "bullish_cross",
    bbSqueeze: false,
    above50sma: true,
    above200sma: false,
    sector: "Consumer Staples",
    sparkline: [38, 40, 42, 39, 41, 44, 46, 45, 48, 50, 49, 52, 54],
    signals: ["MACD bullish cross", "Reclaiming 50 SMA", "Volume 3.1x"],
  },
  {
    symbol: "SMCI",
    name: "Super Micro Computer",
    price: 712.50,
    change: 28.90,
    changePct: 4.23,
    score: 81,
    volume: 8_900_000,
    avgVolume: 4_200_000,
    volumeRatio: 2.12,
    rsi: 61,
    macdSignal: "bullish",
    bbSqueeze: true,
    above50sma: true,
    above200sma: true,
    sector: "Technology",
    sparkline: [620, 640, 660, 650, 670, 680, 675, 690, 695, 700, 705, 708, 712],
    signals: ["BB squeeze breakout", "Above all MAs", "Steady accumulation"],
  },
  {
    symbol: "AFRM",
    name: "Affirm Holdings",
    price: 48.72,
    change: 2.15,
    changePct: 4.62,
    score: 76,
    volume: 14_200_000,
    avgVolume: 7_800_000,
    volumeRatio: 1.82,
    rsi: 58,
    macdSignal: "bullish_cross",
    bbSqueeze: false,
    above50sma: true,
    above200sma: false,
    sector: "Financials",
    sparkline: [32, 34, 36, 35, 38, 40, 39, 42, 44, 43, 46, 47, 49],
    signals: ["MACD cross", "Reclaiming 50 SMA", "Fintech momentum"],
  },
  {
    symbol: "RKLB",
    name: "Rocket Lab USA",
    price: 18.94,
    change: 1.47,
    changePct: 8.41,
    score: 73,
    volume: 42_000_000,
    avgVolume: 18_600_000,
    volumeRatio: 2.26,
    rsi: 66,
    macdSignal: "bullish",
    bbSqueeze: false,
    above50sma: true,
    above200sma: true,
    sector: "Industrials",
    sparkline: [12, 13, 14, 13.5, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 19],
    signals: ["Sustained uptrend", "Volume confirmation", "Space sector catalyst"],
  },
  {
    symbol: "MARA",
    name: "Marathon Digital",
    price: 24.38,
    change: -0.92,
    changePct: -3.64,
    score: 45,
    volume: 28_500_000,
    avgVolume: 22_000_000,
    volumeRatio: 1.30,
    rsi: 42,
    macdSignal: "bearish",
    bbSqueeze: false,
    above50sma: false,
    above200sma: false,
    sector: "Financials",
    sparkline: [32, 30, 28, 29, 27, 26, 28, 25, 24, 25, 24, 25, 24],
    signals: ["Below key MAs", "Weak RSI", "Sector headwinds"],
  },
  {
    symbol: "NIO",
    name: "NIO Inc",
    price: 5.82,
    change: -0.18,
    changePct: -3.00,
    score: 32,
    volume: 48_200_000,
    avgVolume: 38_000_000,
    volumeRatio: 1.27,
    rsi: 38,
    macdSignal: "bearish_cross",
    bbSqueeze: false,
    above50sma: false,
    above200sma: false,
    sector: "Consumer Discretionary",
    sparkline: [8.5, 8, 7.5, 7.8, 7.2, 6.8, 7, 6.5, 6.2, 6, 5.9, 5.8, 5.8],
    signals: ["Downtrend", "MACD bearish cross", "Below all MAs"],
  },
];

export const mockNews: Record<string, NewsItem[]> = {
  NVDA: [
    {
      title: "NVIDIA unveils next-gen Blackwell Ultra chips at GTC",
      source: "Reuters",
      time: "2h ago",
      sentiment: "bullish",
      summary: "New chips offer 4x inference performance. Major cloud providers already placing orders.",
    },
    {
      title: "Goldman raises NVDA price target to $1,100",
      source: "Bloomberg",
      time: "5h ago",
      sentiment: "bullish",
      summary: "Analyst cites accelerating data center demand and competitive moat in AI training.",
    },
    {
      title: "Antitrust concerns grow around AI chip dominance",
      source: "WSJ",
      time: "1d ago",
      sentiment: "bearish",
      summary: "EU regulators examining NVIDIA's market share in AI accelerators.",
    },
  ],
  PLTR: [
    {
      title: "Palantir wins $480M Army contract extension",
      source: "Defense One",
      time: "3h ago",
      sentiment: "bullish",
      summary: "Multi-year deal expands AI/ML capabilities for battlefield intelligence.",
    },
    {
      title: "PLTR commercial revenue grows 44% YoY",
      source: "Barron's",
      time: "1d ago",
      sentiment: "bullish",
      summary: "AIP platform driving enterprise adoption faster than expected.",
    },
  ],
  CELH: [
    {
      title: "Celsius expands international distribution to 12 new markets",
      source: "Business Wire",
      time: "4h ago",
      sentiment: "bullish",
      summary: "Partnership with PepsiCo accelerating global rollout ahead of schedule.",
    },
  ],
  SMCI: [
    {
      title: "Super Micro reports record server shipments",
      source: "MarketWatch",
      time: "6h ago",
      sentiment: "bullish",
      summary: "AI server demand driving backlog to all-time highs.",
    },
  ],
};

export const mockPMCC: Record<string, PMCCSetup> = {
  NVDA: {
    leaps: {
      strike: 800,
      expiry: "Jan 2027",
      dte: 280,
      type: "call",
      bid: 198.50,
      ask: 202.30,
      mid: 200.40,
      delta: 0.75,
      theta: -0.18,
      iv: 0.42,
      openInterest: 12_400,
    },
    shortCall: {
      strike: 1000,
      expiry: "May 2026",
      dte: 32,
      type: "call",
      bid: 8.20,
      ask: 8.80,
      mid: 8.50,
      delta: 0.22,
      theta: -0.85,
      iv: 0.48,
      openInterest: 28_900,
    },
    netDebit: 191.90,
    maxProfit: 8.10,
    maxLoss: 191.90,
    breakeven: 991.90,
    returnOnRisk: 4.2,
    monthlyIncome: 8.50,
  },
  PLTR: {
    leaps: {
      strike: 60,
      expiry: "Jan 2027",
      dte: 280,
      type: "call",
      bid: 26.80,
      ask: 27.60,
      mid: 27.20,
      delta: 0.78,
      theta: -0.03,
      iv: 0.55,
      openInterest: 8_200,
    },
    shortCall: {
      strike: 90,
      expiry: "May 2026",
      dte: 32,
      type: "call",
      bid: 2.10,
      ask: 2.40,
      mid: 2.25,
      delta: 0.25,
      theta: -0.12,
      iv: 0.62,
      openInterest: 15_600,
    },
    netDebit: 24.95,
    maxProfit: 5.05,
    maxLoss: 24.95,
    breakeven: 84.95,
    returnOnRisk: 20.2,
    monthlyIncome: 2.25,
  },
};

export const mockPositions: Position[] = [
  {
    symbol: "NVDA",
    strategy: "PMCC",
    status: "profit_target",
    legs: [
      {
        description: "Jan 2027 $800 Call (LEAPS)",
        entry: 185.00,
        current: 200.40,
        pnl: 1540,
      },
      {
        description: "May 2026 $1000 Call (Short)",
        entry: -9.20,
        current: -8.50,
        pnl: 70,
      },
    ],
    totalPnl: 1610,
    incomeCollected: 2840,
    openedAt: "2026-01-15",
    daysOpen: 97,
  },
  {
    symbol: "PLTR",
    strategy: "PMCC",
    status: "active",
    legs: [
      {
        description: "Jan 2027 $55 Call (LEAPS)",
        entry: 22.50,
        current: 29.80,
        pnl: 730,
      },
      {
        description: "May 2026 $85 Call (Short)",
        entry: -2.80,
        current: -3.10,
        pnl: -30,
      },
    ],
    totalPnl: 700,
    incomeCollected: 1420,
    openedAt: "2026-02-03",
    daysOpen: 78,
  },
  {
    symbol: "AAPL",
    strategy: "Covered Call",
    status: "needs_roll",
    legs: [
      {
        description: "100 shares",
        entry: 178.00,
        current: 192.50,
        pnl: 1450,
      },
      {
        description: "May 2026 $195 Call (Short)",
        entry: -3.40,
        current: -2.80,
        pnl: 60,
      },
    ],
    totalPnl: 1510,
    incomeCollected: 680,
    openedAt: "2026-03-10",
    daysOpen: 43,
  },
  {
    symbol: "AMD",
    strategy: "Cash-Secured Put",
    status: "active",
    legs: [
      {
        description: "May 2026 $145 Put (Short)",
        entry: -4.20,
        current: -1.80,
        pnl: 240,
      },
    ],
    totalPnl: 240,
    incomeCollected: 420,
    openedAt: "2026-04-01",
    daysOpen: 21,
  },
];
