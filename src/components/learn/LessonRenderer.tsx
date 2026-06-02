"use client";

import { Suspense, lazy } from "react";
import QuizCard from "./QuizCard";
import type { QuizQuestion } from "./QuizCard";

export type LessonSection =
  | { type: "text"; content: string }
  | { type: "callout"; style: "tip" | "warning" | "key-concept"; content: string }
  | { type: "visual"; component: string; props?: Record<string, unknown> }
  | { type: "interactive"; component: string; props?: Record<string, unknown> }
  | { type: "quiz"; questions: QuizQuestion[] };

interface LessonRendererProps {
  sections: LessonSection[];
  onQuizComplete?: (score: number, answers: Record<string, number>) => void;
}

// Lazy-load visualization components
const DeltaCurve = lazy(() => import("./DeltaCurve"));
const GammaCurve = lazy(() => import("./GammaCurve"));
const ThetaDecay = lazy(() => import("./ThetaDecay"));
const VegaImpact = lazy(() => import("./VegaImpact"));
const PnLDiagram = lazy(() => import("./PnLDiagram"));
const GreekTable = lazy(() => import("./GreekTable"));
const SupportResistanceChart = lazy(() => import("./SupportResistanceChart"));
const RSIChart = lazy(() => import("./RSIChart"));
const CandlestickChart = lazy(() => import("./CandlestickChart"));
const TAGreeksChart = lazy(() => import("./TAGreeksChart"));
const LongShortDiagram = lazy(() => import("./LongShortDiagram"));
const SMAChart = lazy(() => import("./SMAChart"));
const MACDChart = lazy(() => import("./MACDChart"));
const BollingerBandsChart = lazy(() => import("./BollingerBandsChart"));
const IVRankGauge = lazy(() => import("./IVRankGauge"));
const DecisionTreeWidget = lazy(() => import("./DecisionTreeWidget"));

type LazyComp = React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;

const componentMap: Record<string, LazyComp> = {
  // kebab-case keys matching curriculum component names
  "delta-curve": DeltaCurve as LazyComp,
  "gamma-curve": GammaCurve as LazyComp,
  "theta-decay": ThetaDecay as LazyComp,
  "vega-impact": VegaImpact as LazyComp,
  "pnl-diagram": PnLDiagram as LazyComp,
  "greek-table": GreekTable as LazyComp,
  "option-chain-sim": GreekTable as LazyComp, // reuse greek table for option chain sim
  "support-resistance-chart": SupportResistanceChart as LazyComp,
  "rsi-chart": RSIChart as LazyComp,
  "candlestick-chart": CandlestickChart as LazyComp,
  "ta-greeks-chart": TAGreeksChart as LazyComp,
  "long-short-diagram": LongShortDiagram as LazyComp,
  "sma-chart": SMAChart as LazyComp,
  "macd-chart": MACDChart as LazyComp,
  "bollinger-bands-chart": BollingerBandsChart as LazyComp,
  "iv-rank-gauge": IVRankGauge as LazyComp,
  "decision-tree-widget": DecisionTreeWidget as LazyComp,
  // interactive components — map to existing widgets
  "strike-slider": DeltaCurve as LazyComp,
  "dte-slider": GammaCurve as LazyComp,
  "vol-slider": VegaImpact as LazyComp,
  "position-builder": PnLDiagram as LazyComp,
  "greek-calculator": GreekTable as LazyComp,
};

function renderInline(text: string): React.ReactNode {
  // Process bold markers **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, partIdx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={partIdx} className="font-semibold text-gray-900 dark:text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderTextContent(content: string): React.ReactNode {
  // Split by line breaks first
  const lines = content.split("\n");

  // Group consecutive bullet lines together
  const elements: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = () => {
    if (bulletGroup.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 pl-1 my-1">
          {bulletGroup.map((b, bi) => (
            <li key={bi} className="text-sm text-gray-700 dark:text-text-muted leading-relaxed">
              {renderInline(b)}
            </li>
          ))}
        </ul>
      );
      bulletGroup = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trimStart();
    const isBullet = /^[•\-\*]\s/.test(trimmed);
    const isNumbered = /^\d+\.\s/.test(trimmed);

    if (isBullet) {
      bulletGroup.push(trimmed.replace(/^[•\-\*]\s/, ""));
    } else if (isNumbered) {
      flushBullets();
      // Numbered items rendered as a list item
      bulletGroup.push(trimmed);
      flushBullets();
    } else {
      flushBullets();
      elements.push(
        <span key={lineIdx}>
          {renderInline(line)}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    }
  });
  flushBullets();

  return <>{elements}</>;
}

const calloutStyles = {
  tip: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "\u{1F4A1}",
    label: "Tip",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "\u26A0\uFE0F",
    label: "Warning",
  },
  "key-concept": {
    bg: "bg-emerald-50 dark:bg-gain-bg",
    border: "border-emerald-200 dark:border-gain-border",
    text: "text-emerald-800 dark:text-gain-strong",
    icon: "\u{1F511}",
    label: "Key Concept",
  },
};

function LoadingPlaceholder() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 dark:border-border-subtle p-8 flex items-center justify-center">
      <div className="text-sm text-gray-400 dark:text-text-faint">Loading visualization...</div>
    </div>
  );
}

export default function LessonRenderer({ sections, onQuizComplete }: LessonRendererProps) {
  return (
    <div className="space-y-5 px-4 py-5">
      {sections.map((section, idx) => {
        switch (section.type) {
          case "text":
            return (
              <div key={idx} className="text-sm text-gray-700 dark:text-text-muted leading-relaxed">
                {renderTextContent(section.content)}
              </div>
            );

          case "callout": {
            const style = calloutStyles[section.style];
            return (
              <div
                key={idx}
                className={`${style.bg} ${style.border} border rounded-lg px-4 py-3 text-sm ${style.text}`}
              >
                <div className="font-semibold mb-1">
                  {style.icon} {style.label}
                </div>
                <div>{renderTextContent(section.content)}</div>
              </div>
            );
          }

          case "visual":
          case "interactive": {
            const Component = componentMap[section.component];
            if (!Component) {
              return (
                <div key={idx} className="bg-red-50 dark:bg-loss-bg border border-red-200 dark:border-loss-border rounded-lg p-3 text-sm text-red-700 dark:text-loss-strong">
                  Unknown component: {section.component}
                </div>
              );
            }
            return (
              <Suspense key={idx} fallback={<LoadingPlaceholder />}>
                <Component {...(section.props || {})} />
              </Suspense>
            );
          }

          case "quiz":
            return (
              <QuizCard
                key={idx}
                questions={section.questions}
                onComplete={(score, answers) => {
                  if (onQuizComplete) onQuizComplete(score, answers);
                }}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
