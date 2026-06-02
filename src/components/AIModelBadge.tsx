"use client";

import { useEffect, useState } from "react";
import { AIProvider } from "@/lib/ai/provider";

interface AIModelBadgeProps {
  feature?: string;
  provider?: AIProvider;
  model?: string;
  timestamp?: string;
}

export function AIModelBadge({ feature, provider, model, timestamp }: AIModelBadgeProps) {
  const [settings, setSettings] = useState<{
    provider: AIProvider;
    model: string;
  } | null>(null);

  useEffect(() => {
    // If model is provided, infer provider from model name — no network fetch needed
    if (model) {
      const inferredProvider: AIProvider = model.includes("claude") ? "claude" : "gemini";
      setSettings({ provider: provider ?? inferredProvider, model });
      return;
    }

    // No model passed — load from user settings
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
  }, [provider, model]);

  if (!settings) return null;

  const isGemini = settings.provider === "gemini";
  const modelShortName = settings.model.includes("flash") ? "Flash" 
    : settings.model.includes("sonnet") ? "Sonnet" 
    : settings.model.includes("pro") ? "Pro" 
    : settings.model.includes("haiku") ? "Haiku" 
    : settings.model.includes("opus") ? "Opus"
    : settings.model;

  // Format timestamp (e.g., "2h ago")
  const getTimeAgo = (ts: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(ts).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-stone-100 dark:border-border-subtle bg-stone-50/50 dark:bg-surface-muted/50 backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-surface-elevated group">
      <div className={`w-1.5 h-1.5 rounded-full ${isGemini ? "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"}`} />
      <span className="text-[10px] font-medium text-stone-500 dark:text-text-subtle">
        <span className="opacity-60 font-normal mr-1">AI</span>
        <span className={isGemini ? "text-sky-700 dark:text-accent-hover" : "text-purple-700 dark:text-purple-300"}>
          {settings.provider === "gemini" ? "Gemini" : "Claude"}
        </span>
        <span className="mx-1 opacity-30">|</span>
        <span className="text-stone-400 dark:text-text-faint font-normal">{modelShortName}</span>
        {timestamp && (
          <>
            <span className="mx-1 opacity-30 group-hover:opacity-60 transition-opacity">·</span>
            <span className="text-stone-300 dark:text-text-faint font-normal italic group-hover:text-stone-500 transition-colors">
              {getTimeAgo(timestamp)}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
