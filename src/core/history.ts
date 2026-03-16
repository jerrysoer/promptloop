import { appendFileSync, existsSync, readFileSync } from "node:fs";
import type { IterationResult } from "./types.js";

// ── JSONL History (append-only) ─────────────────────────────

export function appendIteration(
  filePath: string,
  result: IterationResult,
): void {
  const line = JSON.stringify(result) + "\n";
  appendFileSync(filePath, line, "utf-8");
}

export function readHistory(filePath: string): IterationResult[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return [];

  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as IterationResult);
}

// ── Prompt hashing (simple, deterministic) ──────────────────

export function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(7, "0");
}
