/**
 * Unified AI provider abstraction.
 * Routes to Claude or Gemini based on config, with auto-fallback on rate limits.
 * Tracks token usage per call.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDefaultAIProvider, trackTokenUsage } from "@/lib/db/admin";

export type AIProvider = "claude" | "gemini";

export type GenerateOptions = {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  provider?: AIProvider;
  feature?: string;
  userId?: string;
};

export type GenerateResult = {
  text: string;
  provider: AIProvider;
  fallback: boolean;
  inputTokens: number;
  outputTokens: number;
};

type RawResult = { text: string; inputTokens: number; outputTokens: number; model: string };

async function callClaude(prompt: string, systemPrompt?: string, maxTokens = 4000): Promise<RawResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return {
    text: response.content[0].type === "text" ? response.content[0].text : "",
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    model: "claude-sonnet-4-20250514",
  };
}

async function callGemini(prompt: string, systemPrompt?: string, maxTokens = 4000): Promise<RawResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await model.generateContent(prompt);
  const meta = result.response.usageMetadata;
  return {
    text: result.response.text(),
    inputTokens: meta?.promptTokenCount ?? 0,
    outputTokens: meta?.candidatesTokenCount ?? 0,
    model: "gemini-2.5-flash",
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

  // Resolve provider: explicit override > DB config > env var > claude
  let preferred: AIProvider;
  if (options.provider) {
    preferred = options.provider;
  } else {
    try {
      preferred = await getDefaultAIProvider();
    } catch {
      preferred = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || "claude";
    }
  }

  const fallbackProvider: AIProvider = preferred === "claude" ? "gemini" : "claude";

  // Try preferred provider
  try {
    const raw = preferred === "claude"
      ? await callClaude(prompt, systemPrompt, maxTokens)
      : await callGemini(prompt, systemPrompt, maxTokens);

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

    return { text: raw.text, provider: preferred, fallback: false, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
  } catch (e) {
    console.error(`${preferred} error:`, e);

    if (isRateLimitError(e)) {
      console.log(`${preferred} rate limited, falling back to ${fallbackProvider}`);
      try {
        const raw = fallbackProvider === "claude"
          ? await callClaude(prompt, systemPrompt, maxTokens)
          : await callGemini(prompt, systemPrompt, maxTokens);

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

        return { text: raw.text, provider: fallbackProvider, fallback: true, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens };
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
