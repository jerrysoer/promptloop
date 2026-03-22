import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isValidTemplateId } from "honeprompt";
import { getTemplatesDir } from "@/lib/templates-path";

const TEMPLATES_DIR = getTemplatesDir();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidTemplateId(id)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const dir = join(TEMPLATES_DIR, id);
  if (!existsSync(dir)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const read = (file: string) => {
    const path = join(dir, file);
    return existsSync(path) ? readFileSync(path, "utf-8") : null;
  };

  const prompt = read("prompt.md");
  const testCases = read("test-cases.json");
  const config = read("honeprompt.config.ts");
  const strategyDoc = read("program.md");
  const readme = read("README.md");

  if (!prompt || !testCases) {
    return NextResponse.json(
      { error: "Template is missing required files" },
      { status: 404 },
    );
  }

  // Extract scoring criteria from config (find the criteria line)
  let scoringCriteria = "";
  if (config) {
    const criteriaMatch = config.match(/criteria:\s*[`"']([^`"']+)/);
    scoringCriteria = criteriaMatch?.[1] ?? "";
  }

  return NextResponse.json({
    id,
    prompt,
    testCases,
    config,
    strategyDoc,
    scoringCriteria,
    readme,
  });
}
