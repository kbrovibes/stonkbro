import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { provider, model } = await req.json();

    if (!provider || !model) {
      return NextResponse.json({ ok: false, error: "Missing provider or model" }, { status: 400 });
    }

    if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "ANTHROPIC_API_KEY not configured" });

      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 8,
        messages: [{ role: "user", content: "Hi" }],
      });
      const ok = response.content?.[0]?.type === "text";
      return NextResponse.json({ ok });
    }

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not configured" });

      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });
      const result = await genModel.generateContent("Hi");
      const text = result.response.text();
      return NextResponse.json({ ok: !!text });
    }

    return NextResponse.json({ ok: false, error: `Unknown provider: ${provider}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg });
  }
}
