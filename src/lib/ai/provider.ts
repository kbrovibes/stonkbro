/**
 * Unified AI provider abstraction.
 * Routes to Claude or Gemini based on config, with auto-fallback on rate limits.
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "claude" | "gemini";

export type GenerateOptions = {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  provider?: AIProvider; // Override per-call
};

export type GenerateResult = {
  text: string;
  provider: AIProvider;
  fallback: boolean; // true if we fell back to the other provider
};

function getDefaultProvider(): AIProvider {
  // Can be overridden by env var for global default
  return (process.env.DEFAULT_AI_PROVIDER as AIProvider) || "claude";
}

async function callClaude(prompt: string, systemPrompt?: string, maxTokens = 4000): Promise<string> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function callGemini(prompt: string, systemPrompt?: string, maxTokens = 4000): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
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
 *
 * Flow:
 * 1. Try the preferred provider
 * 2. If rate limited, automatically try the other provider
 * 3. If both fail, throw the original error
 */
export async function generateText(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, systemPrompt, maxTokens } = options;
  const preferred = options.provider || getDefaultProvider();
  const fallbackProvider: AIProvider = preferred === "claude" ? "gemini" : "claude";

  // Try preferred provider
  try {
    const text = preferred === "claude"
      ? await callClaude(prompt, systemPrompt, maxTokens)
      : await callGemini(prompt, systemPrompt, maxTokens);
    return { text, provider: preferred, fallback: false };
  } catch (e) {
    console.error(`${preferred} error:`, e);

    // If rate limited, try fallback
    if (isRateLimitError(e)) {
      console.log(`${preferred} rate limited, falling back to ${fallbackProvider}`);
      try {
        const text = fallbackProvider === "claude"
          ? await callClaude(prompt, systemPrompt, maxTokens)
          : await callGemini(prompt, systemPrompt, maxTokens);
        return { text, provider: fallbackProvider, fallback: true };
      } catch (fallbackError) {
        console.error(`${fallbackProvider} fallback also failed:`, fallbackError);
        // Throw original error since both failed
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
