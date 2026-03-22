import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getTemplatesDir } from "@/lib/templates-path";

const TEMPLATES_DIR = getTemplatesDir();

export async function GET() {
  const registryPath = join(TEMPLATES_DIR, "registry.json");

  if (!existsSync(registryPath)) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    return NextResponse.json(registry);
  } catch {
    return NextResponse.json(
      { error: "Failed to read template registry" },
      { status: 500 },
    );
  }
}
