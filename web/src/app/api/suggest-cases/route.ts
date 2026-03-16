import { NextRequest, NextResponse } from "next/server";
import { complete } from "promptloop";

export async function POST(request: NextRequest) {
  const { prompt } = (await request.json()) as { prompt: string };

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set. Add it to web/.env.local" },
      { status: 500 },
    );
  }

  let response;
  try {
    response = await complete(
      { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
      "You generate test cases for prompt optimization. Return ONLY a JSON array, no markdown fences, no explanation. Each object must have \"id\" (short kebab-case label) and \"input\" (the user message to test with).",
      `Generate 5 diverse test case inputs that would thoroughly evaluate this system prompt across different scenarios, edge cases, and difficulty levels.\n\n<prompt>\n${prompt}\n</prompt>`,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  try {
    const cleaned = response.content
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    const cases = JSON.parse(cleaned);
    return NextResponse.json({ cases });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse suggested cases", raw: response.content },
      { status: 500 },
    );
  }
}
