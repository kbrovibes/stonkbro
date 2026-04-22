import Link from "next/link";
import { mockStocks, mockPMCC } from "@/lib/mock/stocks";

type Params = Promise<{ symbol: string }>;

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  const color = highlight === "green" ? "text-emerald-700" : highlight === "red" ? "text-red-600" : "text-stone-900";
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <span className="text-xs text-stone-500">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function OptionLegCard({ label, leg, side }: { label: string; leg: typeof mockPMCC.NVDA.leaps; side: "long" | "short" }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-stone-900">{label}</h4>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          side === "long" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
        }`}>
          {side === "long" ? "BUY" : "SELL"}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className="text-lg font-bold text-stone-900">${leg.strike}</p>
          <p className="text-[10px] text-stone-400">Strike</p>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-900">{leg.expiry}</p>
          <p className="text-[10px] text-stone-400">{leg.dte} DTE</p>
        </div>
        <div>
          <p className="text-lg font-bold text-stone-900">${leg.mid.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400">Mid Price</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 rounded-lg bg-stone-50">
          <p className="text-xs font-semibold text-stone-700">{leg.delta.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400">Delta</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50">
          <p className="text-xs font-semibold text-stone-700">{leg.theta.toFixed(2)}</p>
          <p className="text-[10px] text-stone-400">Theta</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50">
          <p className="text-xs font-semibold text-stone-700">{(leg.iv * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-stone-400">IV</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-stone-50">
          <p className="text-xs font-semibold text-stone-700">{leg.openInterest.toLocaleString()}</p>
          <p className="text-[10px] text-stone-400">OI</p>
        </div>
      </div>
    </div>
  );
}

export default async function PMCCPage({ params }: { params: Params }) {
  const { symbol } = await params;
  const stock = mockStocks.find((s) => s.symbol === symbol);
  const pmcc = mockPMCC[symbol];

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6">
        <p className="text-stone-500">Ticker not found</p>
      </div>
    );
  }

  if (!pmcc) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-5">
        <Link href={`/ticker/${symbol}`} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {symbol}
        </Link>
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-stone-900">No PMCC data available</h2>
          <p className="text-sm text-stone-500 mt-1">Options chain analysis not yet available for {symbol}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-4">
      {/* Back */}
      <Link href={`/ticker/${symbol}`} className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        {symbol}
      </Link>

      {/* Title */}
      <div>
        <h2 className="text-lg font-extrabold text-stone-900">PMCC Setup · {symbol}</h2>
        <p className="text-xs text-stone-500 mt-0.5">Poor Man&apos;s Covered Call — leveraged income strategy</p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Trade Summary</h3>
        <StatRow label="Net Debit (cost)" value={formatCurrency(pmcc.netDebit * 100)} />
        <StatRow label="Monthly Income (est.)" value={formatCurrency(pmcc.monthlyIncome * 100)} highlight="green" />
        <StatRow label="Return on Risk / cycle" value={`${pmcc.returnOnRisk.toFixed(1)}%`} highlight="green" />
        <StatRow label="Breakeven" value={`$${pmcc.breakeven.toFixed(2)}`} />
        <StatRow label="Max Loss" value={formatCurrency(pmcc.maxLoss * 100)} highlight="red" />
      </div>

      {/* LEAPS leg */}
      <OptionLegCard label="LEAPS (Long Call)" leg={pmcc.leaps} side="long" />

      {/* Short call leg */}
      <OptionLegCard label="Short Call" leg={pmcc.shortCall} side="short" />

      {/* Risk visual */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-bold text-stone-900 mb-3">Risk / Reward</h3>
        <div className="flex items-end gap-1 h-20">
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-red-100 rounded-t" style={{ height: `${Math.min((pmcc.maxLoss / pmcc.maxLoss) * 60, 60)}px` }} />
            <span className="text-[10px] text-red-600 font-semibold">Max Loss</span>
            <span className="text-[10px] text-stone-500">{formatCurrency(pmcc.maxLoss * 100)}</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-emerald-100 rounded-t" style={{ height: `${Math.min((pmcc.monthlyIncome / pmcc.maxLoss) * 400, 60)}px` }} />
            <span className="text-[10px] text-emerald-600 font-semibold">Monthly</span>
            <span className="text-[10px] text-stone-500">{formatCurrency(pmcc.monthlyIncome * 100)}</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-emerald-200 rounded-t" style={{ height: `${Math.min((pmcc.monthlyIncome * 12 / pmcc.maxLoss) * 60, 60)}px` }} />
            <span className="text-[10px] text-emerald-700 font-semibold">Annual</span>
            <span className="text-[10px] text-stone-500">{formatCurrency(pmcc.monthlyIncome * 100 * 12)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
