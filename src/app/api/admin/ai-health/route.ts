import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateText, AIProvider } from "@/lib/ai/provider";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { provider, model } = body as { provider: AIProvider; model: string };

  if (!provider || !model) {
    return NextResponse.json({ error: "Provider and model are required" }, { status: 400 });
  }

  try {
    const result = await generateText({
      prompt: "Respond with the single word 'healthy'.",
      systemPrompt: "You are a health check service.",
      maxTokens: 10,
      provider,
      model,
      feature: "health-check",
      userId: user.id,
    });

    // If result.fallback is true, it means the specific requested model failed and it fell back.
    // That means the requested model is NOT healthy.
    if (result.fallback) {
      return NextResponse.json({ 
        ok: false, 
        error: `Model ${model} failed, fell back to ${result.provider}. This usually means the requested model is rate-limited or unavailable.`,
        details: result.text
      });
    }

    return NextResponse.json({ 
      ok: true, 
      model: result.model,
      provider: result.provider
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[AI Health Check] ${provider}/${model} failed:`, errorMsg);
    
    return NextResponse.json({ 
      ok: false, 
      error: errorMsg,
      details: "Check your API keys and project quotas."
    }, { status: 200 }); // Return 200 so the frontend can handle the error per-model
  }
}
