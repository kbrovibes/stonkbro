"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  color?: string;
  label?: string;
}

export default function ProgressRing({
  percentage,
  size = 80,
  color = "#3b82f6",
  label,
}: ProgressRingProps) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedPct(Math.min(100, Math.max(0, percentage)));
    }, 50);
    return () => clearTimeout(timeout);
  }, [percentage]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div
        className="absolute flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-900 font-bold" style={{ fontSize: size * 0.22 }}>
          {Math.round(percentage)}%
        </span>
      </div>
      {label && (
        <span className="text-xs text-gray-500 font-medium mt-1">{label}</span>
      )}
    </div>
  );
}
