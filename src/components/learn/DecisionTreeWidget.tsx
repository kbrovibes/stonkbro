"use client";

import { useState } from "react";

type Outlook = "bullish" | "bearish" | "neutral";
type RSIZone = "oversold" | "neutral" | "overbought";
type IVZone = "low" | "mid" | "high";

interface Answers {
  outlook?: Outlook;
  rsi?: RSIZone;
  iv?: IVZone;
}

interface Recommendation {
  trade: string;
  rationale: string;
  example: string;
  color: string;
}

function getRecommendation(answers: Answers): Recommendation | null {
  const { outlook, rsi, iv } = answers;
  if (outlook === "bullish" && rsi === "oversold" && iv === "low")
    return { trade: "Buy a Call Option", rationale: "RSI oversold signals a likely reversal. Low IV means options are cheap.", example: "Buy AAPL $180 call 45 DTE when RSI=28 and IV Rank=20.", color: "bg-green-50 border-green-300" };
  if (outlook === "bullish" && rsi === "neutral" && iv === "low")
    return { trade: "Buy a Bull Call Spread", rationale: "Defined risk, benefits from an upward move. Low IV makes buying spreads attractive.", example: "Buy SPY $480/$490 call spread — pay less premium, cap the upside.", color: "bg-green-50 border-green-300" };
  if (outlook === "bullish" && rsi === "overbought" && iv === "high")
    return { trade: "Sell a Cash-Secured Put", rationale: "Collect rich premium from high IV. Bullish bias means you are comfortable owning the stock at the strike.", example: "Sell NVDA $420 put with IV Rank=82 — premium is thick, bullish long-term.", color: "bg-blue-50 border-blue-300" };
  if (outlook === "bearish" && rsi === "overbought" && iv === "low")
    return { trade: "Buy a Put Option", rationale: "Overbought RSI signals a peak. Low IV means puts are cheap to buy.", example: "Buy TSLA $200 put 30 DTE when RSI=75 and IV Rank=15.", color: "bg-green-50 border-green-300" };
  if (outlook === "bearish" && rsi === "neutral" && iv === "high")
    return { trade: "Sell a Bear Call Spread", rationale: "Collect premium in a high-IV environment. Bearish bias gives the short call side the statistical edge.", example: "Sell SPY $505/$515 call spread — defined risk, high premium collected.", color: "bg-blue-50 border-blue-300" };
  if (outlook === "neutral" && iv === "high")
    return { trade: "Sell an Iron Condor", rationale: "High IV inflates option prices. A neutral stock + expensive premium is the ideal iron condor setup.", example: "AAPL iron condor with IV Rank=78 — sell the $170/$175 put spread and $190/$195 call spread.", color: "bg-blue-50 border-blue-300" };
  if (outlook === "neutral" && iv === "low")
    return { trade: "Buy a Straddle — or wait", rationale: "Low IV + no directional conviction = few great setups. A straddle works if you expect a big move but do not know which way.", example: "Consider waiting for a catalyst (earnings, FDA event) to push IV higher before entering.", color: "bg-yellow-50 border-yellow-300" };
  if (outlook === "bullish")
    return { trade: "Bull Call Spread or Long Call", rationale: "Mid IV: a spread reduces premium risk. A long call works if you expect a strong move.", example: "Buy SPY $480/$490 call spread with IV Rank=50 — balanced risk/reward.", color: "bg-green-50 border-green-300" };
  if (outlook === "bearish")
    return { trade: "Bear Put Spread or Long Put", rationale: "Mid IV: a spread keeps cost reasonable. A long put works if you expect a sharp decline.", example: "Buy QQQ $400/$390 put spread with IV Rank=45.", color: "bg-green-50 border-green-300" };
  return null;
}

// Step flow helpers
type StepId = "outlook" | "rsi" | "iv_neutral" | "iv_direction" | "result";

function getStep(a: Answers): StepId {
  if (!a.outlook) return "outlook";
  if (a.outlook === "neutral") return a.iv ? "result" : "iv_neutral";
  if (!a.rsi) return "rsi";
  return a.iv ? "result" : "iv_direction";
}

function totalStepsFor(a: Answers): number {
  return a.outlook === "neutral" ? 2 : 3;
}

const STEP_INDEX: Record<StepId, number> = {
  outlook: 0, rsi: 1, iv_neutral: 1, iv_direction: 2, result: 99,
};

// Shared button
function Choice({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-2 py-3 rounded-xl border border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all text-center w-full"
    >
      <span className="text-base leading-none">{label}</span>
      {sub && <span className="text-xs text-gray-500 mt-0.5 leading-tight">{sub}</span>}
    </button>
  );
}

// Progress dots
function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < current ? "bg-blue-500 w-6" : i === current ? "bg-blue-300 w-6" : "bg-gray-200 w-4"}`} />
      ))}
    </div>
  );
}

// Breadcrumb pill row
function Breadcrumb({ answers }: { answers: Answers }) {
  const pills: { label: string; value: string }[] = [];
  if (answers.outlook) pills.push({ label: "Outlook", value: answers.outlook });
  if (answers.rsi) pills.push({ label: "RSI", value: answers.rsi });
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {pills.map((p) => (
        <span key={p.label} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">
          {p.value}
        </span>
      ))}
    </div>
  );
}

export default function DecisionTreeWidget(_props: Record<string, unknown>) {
  const [answers, setAnswers] = useState<Answers>({});
  const step = getStep(answers);
  const totalSteps = totalStepsFor(answers);
  const stepIndex = STEP_INDEX[step];
  const isResult = step === "result";
  const rec = isResult ? getRecommendation(answers) : null;

  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const reset = () => setAnswers({});
  const back = () => {
    if (answers.iv !== undefined) { set({ iv: undefined }); return; }
    if (answers.rsi !== undefined) { set({ rsi: undefined }); return; }
    setAnswers({});
  };

  const rsiChoices = (
    <>
      <Choice label="🟢 < 30" sub="Oversold"   onClick={() => set({ rsi: "oversold" })} />
      <Choice label="🟡 30–70" sub="Neutral"    onClick={() => set({ rsi: "neutral" })} />
      <Choice label="🔴 > 70" sub="Overbought"  onClick={() => set({ rsi: "overbought" })} />
    </>
  );
  const ivChoices = (
    <>
      <Choice label="🟢 < 25%" sub="Low IV"  onClick={() => set({ iv: "low" })} />
      <Choice label="🟡 25–75%" sub="Mid IV" onClick={() => set({ iv: "mid" })} />
      <Choice label="🔴 > 75%" sub="High IV" onClick={() => set({ iv: "high" })} />
    </>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Trade Decision Framework</h3>
        {isResult
          ? <button onClick={reset} className="text-xs text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Start over</button>
          : Object.keys(answers).length > 0 && (
            <button onClick={back} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">← Back</button>
          )
        }
      </div>

      {/* Progress */}
      {!isResult && (
        <div className="flex items-center justify-between mb-4">
          <Progress current={stepIndex} total={totalSteps} />
          <span className="text-xs text-gray-400 ml-2">Step {stepIndex + 1} of {totalSteps}</span>
        </div>
      )}

      {/* Step: Outlook */}
      {step === "outlook" && (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-3">What is your market outlook on this stock?</p>
          <div className="grid grid-cols-3 gap-2">
            <Choice label="📈 Bullish" sub="Expecting up"    onClick={() => set({ outlook: "bullish" })} />
            <Choice label="📉 Bearish" sub="Expecting down"  onClick={() => set({ outlook: "bearish" })} />
            <Choice label="↔️ Neutral" sub="Range-bound"     onClick={() => set({ outlook: "neutral" })} />
          </div>
        </>
      )}

      {/* Step: RSI */}
      {step === "rsi" && (
        <>
          <Breadcrumb answers={answers} />
          <p className="text-sm font-semibold text-gray-800 mb-3">Where is RSI right now?</p>
          <div className="grid grid-cols-3 gap-2">{rsiChoices}</div>
        </>
      )}

      {/* Step: IV (directional) */}
      {step === "iv_direction" && (
        <>
          <Breadcrumb answers={answers} />
          <p className="text-sm font-semibold text-gray-800 mb-3">What is the IV Rank?</p>
          <div className="grid grid-cols-3 gap-2">{ivChoices}</div>
        </>
      )}

      {/* Step: IV (neutral) */}
      {step === "iv_neutral" && (
        <>
          <Breadcrumb answers={answers} />
          <p className="text-sm font-semibold text-gray-800 mb-3">What is the IV Rank?</p>
          <div className="grid grid-cols-3 gap-2">{ivChoices}</div>
        </>
      )}

      {/* Result */}
      {isResult && rec && (
        <>
          {/* Path summary pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {answers.outlook && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">{answers.outlook}</span>}
            {answers.rsi     && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">RSI {answers.rsi}</span>}
            {answers.iv      && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">IV {answers.iv}</span>}
          </div>

          <div className={`rounded-xl border p-4 ${rec.color}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Strategy</p>
            <p className="text-base font-bold text-gray-900 mb-2">{rec.trade}</p>
            <p className="text-xs text-gray-700 leading-relaxed mb-3">{rec.rationale}</p>
            <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 mb-0.5">Example trade:</p>
              <p className="text-xs text-gray-700 leading-relaxed">{rec.example}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            Educational only — always paper trade new strategies first.
          </p>
        </>
      )}

      {isResult && !rec && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No recommendation found for this combination.</p>
          <button onClick={reset} className="mt-2 text-xs text-blue-600 underline">Start over</button>
        </div>
      )}
    </div>
  );
}
