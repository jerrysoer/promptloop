import { NextRequest, NextResponse } from "next/server";
import { startRun, type StartRunParams } from "@/lib/run-manager";

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

  const runId = startRun(body);
  return NextResponse.json({ runId });
}
