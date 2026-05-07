/**
 * Unified AI provider abstraction.
 * Routes to Claude or Gemini based on config, with auto-fallback on rate limits.
 * Tracks token usage per call.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDefaultAIProvider, getPreferredAIModel, trackTokenUsage } from "@/lib/db/admin";
import { sendPushToAll } from "@/lib/notifications/push";
import { CLAUDE_MODELS, GEMINI_MODELS } from "./constants";

export type AIProvider = "claude" | "gemini";

export type GenerateOptions = {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  provider?: AIProvider;
  model?: string;
  feature?: string;
  userId?: string;
};

export type GenerateResult = {
  text: string;
  provider: AIProvider;
  model: string;
  fallback: boolean;
  inputTokens: number;
  outputTokens: number;
};

type RawResult = { text: string; inputTokens: number; outputTokens: number; model: string };

async function callClaude(prompt: string, modelId: string, systemPrompt?: string, maxTokens = 4000): Promise<RawResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return {
    text: response.content[0].type === "text" ? response.content[0].text : "",
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    model: modelId,
  };
}

async function callGemini(prompt: string, modelId: string, systemPrompt?: string, maxTokens = 4000): Promise<RawResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await model.generateContent(prompt);
  const meta = result.response.usageMetadata;
  return {
    text: result.response.text(),
    inputTokens: meta?.promptTokenCount ?? 0,
    outputTokens: meta?.candidatesTokenCount ?? 0,
    model: modelId,
  };
}

function isRateLimitError(e: unknown): boolean {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    return msg.includes("rate limit") ||
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("overloaded") ||
      msg.includes("capacity");
  }
  return false;
}

/**
 * Generate text using the configured AI provider with auto-fallback.
 */
export async function generateText(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, systemPrompt, maxTokens, feature, userId } = options;

  // Resolve provider: explicit override > DB config > env var > gemini
  let preferred: AIProvider;
  if (options.provider) {
    preferred = options.provider;
  } else {
    try {
      preferred = await getDefaultAIProvider(userId);
    } catch {
      preferred = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || "gemini";
    }
  }

  // Resolve model: explicit override > DB config > default for provider
  let preferredModel: string;
  if (options.model) {
    preferredModel = options.model;
  } else {
    try {
      preferredModel = await getPreferredAIModel(userId);
      // Ensure the model matches the provider
      const isClaudeModel = CLAUDE_MODELS.some(m => m.id === preferredModel);
      const isGeminiModel = GEMINI_MODELS.some(m => m.id === preferredModel);
      
      if (preferred === "claude" && !isClaudeModel) preferredModel = CLAUDE_MODELS[0].id;
      if (preferred === "gemini" && !isGeminiModel) preferredModel = GEMINI_MODELS[0].id;
    } catch {
      preferredModel = preferred === "claude" ? CLAUDE_MODELS[0].id : GEMINI_MODELS[0].id;
    }
  }

  const fallbackProvider: AIProvider = preferred === "claude" ? "gemini" : "claude";
  const fallbackModel = fallbackProvider === "claude" ? CLAUDE_MODELS[0].id : GEMINI_MODELS[0].id;

  // Try preferred provider
  try {
    const raw = preferred === "claude"
      ? await callClaude(prompt, preferredModel, systemPrompt, maxTokens)
      : await callGemini(prompt, preferredModel, systemPrompt, maxTokens);

    // Fire-and-forget token tracking
    if (feature) {
      trackTokenUsage({
        userId,
        provider: preferred,
        feature,
        inputTokens: raw.inputTokens,
        outputTokens: raw.outputTokens,
        model: raw.model,
        fallback: false,
      });
    }

    return { text: raw.text, provider: preferred, model: raw.model, fallback: false, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
  } catch (e) {
    console.error(`${preferred} error:`, e);

    if (isRateLimitError(e)) {
      console.log(`${preferred} rate limited, falling back to ${fallbackProvider}`);
      
      // Notify user of failover via push
      sendPushToAll({
        title: "AI Failover Warning",
        body: `${preferred} rate limit reached. Automatically switching to ${fallbackProvider} to maintain service.`,
        tag: "ai-failover",
      }).catch(err => console.error("Failover notification failed:", err));

      try {
        const raw = fallbackProvider === "claude"
          ? await callClaude(prompt, fallbackModel, systemPrompt, maxTokens)
          : await callGemini(prompt, fallbackModel, systemPrompt, maxTokens);

        if (feature) {
          trackTokenUsage({
            userId,
            provider: fallbackProvider,
            feature,
            inputTokens: raw.inputTokens,
            outputTokens: raw.outputTokens,
            model: raw.model,
            fallback: true,
          });
        }

        return { text: raw.text, provider: fallbackProvider, model: raw.model, fallback: true, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
      } catch (fallbackError) {
        console.error(`${fallbackProvider} fallback also failed:`, fallbackError);
        throw e;
      }
    }

    throw e;
  }
}

/**
 * Check which providers are configured.
 */
export function getAvailableProviders(): { claude: boolean; gemini: boolean } {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  };
}
