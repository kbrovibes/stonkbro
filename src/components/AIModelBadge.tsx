"use client";

import { useEffect, useState } from "react";
import { AIProvider } from "@/lib/ai/provider";

interface AIModelBadgeProps {
  feature?: string;
}

export function AIModelBadge({ feature }: AIModelBadgeProps) {
  const [settings, setSettings] = useState<{
    provider: AIProvider;
    model: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings({
            provider: d.settings.preferred_ai_provider || "gemini",
            model: d.settings.preferred_ai_model || "gemini-2.0-flash",
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!settings) return null;

  const isGemini = settings.provider === "gemini";
  const modelShortName = settings.model.includes("flash") ? "Flash" 
    : settings.model.includes("sonnet") ? "Sonnet" 
    : settings.model.includes("pro") ? "Pro" 
    : settings.model.includes("haiku") ? "Haiku" 
    : "Opus";

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-stone-100 bg-stone-50/50 backdrop-blur-sm transition-all hover:bg-white">
      <div className={`w-1.5 h-1.5 rounded-full ${isGemini ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"}`} />
      <span className="text-[10px] font-medium text-stone-500">
        <span className="opacity-60 font-normal mr-1">AI</span>
        <span className={isGemini ? "text-sky-700" : "text-purple-700"}>
          {settings.provider === "gemini" ? "Gemini" : "Claude"}
        </span>
        <span className="mx-1 opacity-30">|</span>
        <span className="text-stone-400 font-normal">{modelShortName}</span>
      </span>
    </div>
  );
}
