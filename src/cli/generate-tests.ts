import { defineCommand } from "citty";
import { readFileSync, writeFileSync } from "node:fs";
import { complete } from "../core/llm.js";
import type { ModelConfig } from "../core/types.js";

const SYSTEM_PROMPT =
  'You generate test cases for prompt optimization. Return ONLY a JSON array, no markdown fences, no explanation. Each object must have "id" (short kebab-case label) and "input" (the user message to test with).';

export const generateTestsCommand = defineCommand({
  meta: {
    name: "generate-tests",
    description: "Generate test cases from a prompt file using AI",
  },
  args: {
    prompt: {
      type: "string",
      alias: "p",
      description: "Path to prompt file",
      default: "prompt.md",
    },
    output: {
      type: "string",
      alias: "o",
      description: "Output file path",
      default: "test-cases.json",
    },
    count: {
      type: "string",
      description: "Number of test cases to generate",
      default: "5",
    },
  },
  async run({ args }) {
    const promptText = readFileSync(args.prompt, "utf-8");
    const count = parseInt(args.count, 10) || 5;

    const model: ModelConfig = {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
    };

    console.log(`Generating ${count} test cases from ${args.prompt}...`);

    const response = await complete(
      model,
      SYSTEM_PROMPT,
      `Generate ${count} diverse test case inputs that would thoroughly evaluate this system prompt across different scenarios, edge cases, and difficulty levels.\n\n<prompt>\n${promptText}\n</prompt>`,
    );

    const cleaned = response.content
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const cases = JSON.parse(cleaned);
    if (!Array.isArray(cases)) {
      throw new Error("Expected JSON array of test cases");
    }

    writeFileSync(args.output, JSON.stringify(cases, null, 2));
    console.log(`Wrote ${cases.length} test cases to ${args.output}`);
  },
});
