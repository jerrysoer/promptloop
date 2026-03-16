import { NextRequest, NextResponse } from "next/server";
import { startRun, type StartRunParams } from "@/lib/run-manager";
import { MODELS } from "@/lib/models";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as StartRunParams;

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (!body.testCases?.length) {
    return NextResponse.json(
      { error: "At least one test case is required" },
      { status: 400 },
    );
  }

  // Validate API key requirement for non-Max models
  const model = MODELS.find((m) => m.id === body.modelId);
  const needsApiKey = model && model.provider !== "claude-cli";
  if (needsApiKey && !body.apiKey && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "API key required. Provide one in Settings or set ANTHROPIC_API_KEY env var." },
      { status: 400 },
    );
  }

  const runId = startRun(body);
  return NextResponse.json({ runId });
}
