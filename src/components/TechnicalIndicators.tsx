import { StockScore } from "@/lib/mock/stocks";

function Indicator({ label, value, status }: { label: string; value: string; status: "green" | "red" | "neutral" }) {
  const colors = {
    green: "text-emerald-700 dark:text-gain-strong bg-emerald-50 dark:bg-gain-bg",
    red: "text-red-600 dark:text-loss bg-red-50 dark:bg-loss-bg",
    neutral: "text-stone-600 dark:text-text-muted bg-stone-100 dark:bg-surface-muted",
  };

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-stone-100 dark:border-border-subtle last:border-0">
      <span className="text-xs text-stone-500 dark:text-text-subtle">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status]}`}>
        {value}
      </span>
    </div>
  );
}

function VolumeBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio / 4, 1) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-stone-100 dark:bg-surface-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${ratio >= 2 ? "bg-amber-500" : "bg-stone-300 dark:bg-border-strong"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${ratio >= 2 ? "text-amber-600 dark:text-amber-300" : "text-stone-500 dark:text-text-subtle"}`}>
        {ratio.toFixed(1)}x
      </span>
    </div>
  );
}

export default function TechnicalIndicators({ stock }: { stock: StockScore }) {
  const macdLabel = stock.macdSignal.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const macdStatus = stock.macdSignal.includes("bullish") ? "green" : stock.macdSignal.includes("bearish") ? "red" : "neutral";

  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
      <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-2">Technical Indicators</h3>

      <Indicator
        label="RSI (14)"
        value={stock.rsi.toString()}
        status={stock.rsi > 70 ? "red" : stock.rsi > 50 ? "green" : stock.rsi < 30 ? "red" : "neutral"}
      />
      <Indicator label="MACD Signal" value={macdLabel} status={macdStatus} />
      <Indicator
        label="Bollinger Squeeze"
        value={stock.bbSqueeze ? "Active" : "No"}
        status={stock.bbSqueeze ? "green" : "neutral"}
      />
      <Indicator
        label="Above 50 SMA"
        value={stock.above50sma ? "Yes" : "No"}
        status={stock.above50sma ? "green" : "red"}
      />
      <Indicator
        label="Above 200 SMA"
        value={stock.above200sma ? "Yes" : "No"}
        status={stock.above200sma ? "green" : "red"}
      />

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-stone-500 dark:text-text-subtle">Volume vs Avg</span>
        </div>
        <VolumeBar ratio={stock.volumeRatio} />
      </div>
    </div>
  );
}
