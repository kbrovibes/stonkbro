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

const componentMap: Record<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>> = {
  DeltaCurve: DeltaCurve as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
  GammaCurve: GammaCurve as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
  ThetaDecay: ThetaDecay as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
  VegaImpact: VegaImpact as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
  PnLDiagram: PnLDiagram as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
  GreekTable: GreekTable as React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>,
};

function renderTextContent(content: string): React.ReactNode {
  // Split by line breaks first
  const lines = content.split("\n");
  return lines.map((line, lineIdx) => {
    // Process bold markers **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={partIdx} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
    return (
      <span key={lineIdx}>
        {rendered}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
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
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    icon: "\u{1F511}",
    label: "Key Concept",
  },
};

function LoadingPlaceholder() {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 p-8 flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading visualization...</div>
    </div>
  );
}

export default function LessonRenderer({ sections, onQuizComplete }: LessonRendererProps) {
  return (
    <div className="space-y-5">
      {sections.map((section, idx) => {
        switch (section.type) {
          case "text":
            return (
              <div key={idx} className="text-sm text-gray-700 leading-relaxed">
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
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
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
