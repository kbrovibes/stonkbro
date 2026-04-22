export type CoveredCallOption = {
  strike: number;
  expiry: string;
  dte: number;
  premium: number;
  delta: number;
  probOTM: number;
  annualizedReturn: number;
  maxProfit: number;
  downProtection: number;
};

export type CoveredCallAnalysis = {
  symbol: string;
  currentPrice: number;
  sharesOwned: number;
  costBasis: number;
  options: CoveredCallOption[];
};

export const mockCoveredCalls: CoveredCallAnalysis[] = [
  {
    symbol: "AAPL",
    currentPrice: 192.50,
    sharesOwned: 100,
    costBasis: 178.00,
    options: [
      { strike: 195, expiry: "May 16", dte: 24, premium: 3.40, delta: 0.38, probOTM: 62, annualizedReturn: 26.2, maxProfit: 2040, downProtection: 1.8 },
      { strike: 200, expiry: "May 16", dte: 24, premium: 1.80, delta: 0.25, probOTM: 75, annualizedReturn: 13.8, maxProfit: 2580, downProtection: 0.9 },
      { strike: 205, expiry: "May 16", dte: 24, premium: 0.85, delta: 0.15, probOTM: 85, annualizedReturn: 6.5, maxProfit: 3085, downProtection: 0.4 },
      { strike: 195, expiry: "Jun 20", dte: 59, premium: 5.90, delta: 0.42, probOTM: 58, annualizedReturn: 18.9, maxProfit: 2340, downProtection: 3.1 },
      { strike: 200, expiry: "Jun 20", dte: 59, premium: 3.60, delta: 0.30, probOTM: 70, annualizedReturn: 11.5, maxProfit: 3110, downProtection: 1.9 },
      { strike: 205, expiry: "Jun 20", dte: 59, premium: 2.10, delta: 0.20, probOTM: 80, annualizedReturn: 6.7, maxProfit: 3460, downProtection: 1.1 },
    ],
  },
  {
    symbol: "MSFT",
    currentPrice: 415.80,
    sharesOwned: 100,
    costBasis: 390.00,
    options: [
      { strike: 420, expiry: "May 16", dte: 24, premium: 7.50, delta: 0.40, probOTM: 60, annualizedReturn: 27.4, maxProfit: 3750, downProtection: 1.8 },
      { strike: 430, expiry: "May 16", dte: 24, premium: 4.20, delta: 0.28, probOTM: 72, annualizedReturn: 15.3, maxProfit: 4420, downProtection: 1.0 },
      { strike: 440, expiry: "May 16", dte: 24, premium: 2.10, delta: 0.17, probOTM: 83, annualizedReturn: 7.7, maxProfit: 5210, downProtection: 0.5 },
    ],
  },
];

export type WheelCycle = {
  step: "sell_put" | "assigned" | "sell_call" | "called_away";
  date: string;
  description: string;
  premium: number;
  cumulativeIncome: number;
  shares: number;
  status: "completed" | "active";
};

export type WheelPosition = {
  symbol: string;
  startDate: string;
  startingCash: number;
  currentStep: string;
  cycles: WheelCycle[];
  totalIncome: number;
  totalCycles: number;
  avgCycleReturn: number;
  annualizedReturn: number;
};

export const mockWheel: WheelPosition[] = [
  {
    symbol: "AMD",
    startDate: "2026-01-06",
    startingCash: 20000,
    currentStep: "Selling Puts",
    cycles: [
      { step: "sell_put", date: "Jan 6", description: "Sold $145 Put · Feb expiry", premium: 420, cumulativeIncome: 420, shares: 0, status: "completed" },
      { step: "sell_put", date: "Feb 21", description: "Sold $140 Put · Mar expiry (expired OTM)", premium: 380, cumulativeIncome: 800, shares: 0, status: "completed" },
      { step: "sell_put", date: "Mar 21", description: "Sold $145 Put · Apr expiry (assigned)", premium: 350, cumulativeIncome: 1150, shares: 0, status: "completed" },
      { step: "assigned", date: "Apr 4", description: "Assigned 100 shares @ $145", premium: 0, cumulativeIncome: 1150, shares: 100, status: "completed" },
      { step: "sell_call", date: "Apr 7", description: "Sold $155 Call · May expiry", premium: 310, cumulativeIncome: 1460, shares: 100, status: "active" },
    ],
    totalIncome: 1460,
    totalCycles: 4,
    avgCycleReturn: 365,
    annualizedReturn: 24.8,
  },
  {
    symbol: "SOFI",
    startDate: "2026-02-03",
    startingCash: 20000,
    currentStep: "Selling Puts",
    cycles: [
      { step: "sell_put", date: "Feb 3", description: "Sold $10 Put · Mar expiry", premium: 85, cumulativeIncome: 85, shares: 0, status: "completed" },
      { step: "sell_put", date: "Mar 21", description: "Sold $10.50 Put · Apr expiry (assigned)", premium: 92, cumulativeIncome: 177, shares: 0, status: "completed" },
      { step: "assigned", date: "Apr 4", description: "Assigned 100 shares @ $10.50", premium: 0, cumulativeIncome: 177, shares: 100, status: "completed" },
      { step: "sell_call", date: "Apr 7", description: "Sold $12 Call · May expiry (called away)", premium: 45, cumulativeIncome: 222, shares: 100, status: "completed" },
      { step: "called_away", date: "Apr 18", description: "Shares called away @ $12 (+$150 gain)", premium: 150, cumulativeIncome: 372, shares: 0, status: "completed" },
      { step: "sell_put", date: "Apr 21", description: "Sold $11 Put · May expiry", premium: 65, cumulativeIncome: 437, shares: 0, status: "active" },
    ],
    totalIncome: 437,
    totalCycles: 5,
    avgCycleReturn: 87,
    annualizedReturn: 16.2,
  },
];

export type IncomeMonth = {
  month: string;
  premiumCollected: number;
  capitalGains: number;
  total: number;
};

export const mockIncome: IncomeMonth[] = [
  { month: "Jan", premiumCollected: 840, capitalGains: 0, total: 840 },
  { month: "Feb", premiumCollected: 1120, capitalGains: 0, total: 1120 },
  { month: "Mar", premiumCollected: 1380, capitalGains: 450, total: 1830 },
  { month: "Apr", premiumCollected: 960, capitalGains: 150, total: 1110 },
];

export const incomeStats = {
  startingCash: 20000,
  currentValue: 24900,
  totalReturn: 4900,
  totalReturnPct: 24.5,
  ytdIncome: 4900,
  monthlyAvg: 1225,
  annualizedYield: 29.4,
  activeTrades: 4,
  completedCycles: 12,
};
