#!/usr/bin/env tsx
/**
 * Run flagship templates and populate sample results in READMEs.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npx tsx scripts/capture-results.ts
 *
 * Or with Claude CLI (zero-cost on Max plan):
 *   npx tsx scripts/capture-results.ts --provider claude-cli
 *
 * Runs 3 templates with 5 iterations each (first 5 test cases),
 * then updates READMEs. Run `npm run build:registry` afterwards.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../src/core/runner.js";
import type { HonePromptConfig, ModelConfig, TestCase } from "../src/core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const TEMPLATES_DIR = join(ROOT, "templates");

const FLAGSHIP_TEMPLATES = ["linkedin-hooks", "claude-md-optimizer", "commit-messages"];
const MAX_ITERATIONS = 5;
const MAX_TEST_CASES = 5; // Use first N test cases for speed

// Parse --provider flag
const providerArg = process.argv.find((a) => a.startsWith("--provider="))?.split("=")[1]
  ?? (process.argv.includes("--provider") ? process.argv[process.argv.indexOf("--provider") + 1] : undefined);

const provider = (providerArg ?? "anthropic") as "anthropic" | "claude-cli";

if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY not set. Use --provider claude-cli for zero-cost runs.");
  process.exit(1);
}

function makeModel(): ModelConfig {
  return { provider, model: provider === "claude-cli" ? "sonnet" : "claude-sonnet-4-5-20250929" };
}

function updateReadme(templateDir: string, baseline: number, final: number, improvement: string, iterations: number): void {
  const readmePath = join(templateDir, "README.md");
  let content = readFileSync(readmePath, "utf-8");

  // Handle both TBD and previously-set values
  content = content
    .replace(/\| Baseline Score \| .+? \|/, `| Baseline Score | ${baseline} / 100 |`)
    .replace(/\| Final Score \| .+? \|/, `| Final Score | ${final} / 100 |`)
    .replace(/\| Improvement \| .+? \|/, `| Improvement | ${improvement} |`)
    .replace(/\| Iterations \| .+? \|/, `| Iterations | ${iterations} |`);

  writeFileSync(readmePath, content, "utf-8");
}

async function runTemplate(templateId: string): Promise<void> {
  const templateDir = join(TEMPLATES_DIR, templateId);
  const workDir = join(ROOT, ".capture-runs", templateId);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${templateId}`);
  console.log(`${"=".repeat(60)}`);

  // Create work directory
  if (existsSync(workDir)) rmSync(workDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  // Trim test cases to MAX_TEST_CASES for speed
  const fullTestCases: TestCase[] = JSON.parse(
    readFileSync(join(templateDir, "test-cases.json"), "utf-8"),
  );
  const trimmedTestCases = fullTestCases.slice(0, MAX_TEST_CASES);
  const trimmedPath = join(workDir, "test-cases.json");
  writeFileSync(trimmedPath, JSON.stringify(trimmedTestCases, null, 2), "utf-8");

  console.log(`  Using ${trimmedTestCases.length}/${fullTestCases.length} test cases, ${MAX_ITERATIONS} iterations`);

  // Load template config
  const configModule = await import(join(templateDir, "honeprompt.config.ts"));
  const templateConfig: HonePromptConfig = configModule.default;

  // Override with our settings — 2 parallel for claude-cli (1 is too slow, 5 crashes)
  const config: HonePromptConfig = {
    ...templateConfig,
    targetModel: makeModel(),
    optimizerModel: makeModel(),
    judgeModel: makeModel(),
    maxIterations: MAX_ITERATIONS,
    maxCostUsd: 5.0,
    parallelTestCases: provider === "claude-cli" ? 2 : templateConfig.parallelTestCases,
  };

  // Load strategy doc if present
  const strategyPath = join(templateDir, "program.md");
  const strategyDoc = existsSync(strategyPath) ? readFileSync(strategyPath, "utf-8") : undefined;

  const report = await run({
    promptPath: join(templateDir, "prompt.md"),
    testCasesPath: trimmedPath,
    config,
    outputDir: workDir,
    strategyDoc,
    onIteration: (result) => {
      const status = result.iteration === 0
        ? "BASELINE"
        : result.kept
          ? "KEPT"
          : "REVERTED";
      console.log(
        `  [${result.iteration}/${MAX_ITERATIONS}] ${status} — score: ${result.scores.average.toFixed(1)} — $${result.costUsd.toFixed(3)}`,
      );
    },
  });

  // Calculate improvement
  const improvement = report.finalScore - report.baselineScore;
  const improvementStr = improvement > 0
    ? `+${improvement.toFixed(0)} points (${report.baselineScore.toFixed(0)} → ${report.finalScore.toFixed(0)})`
    : `${improvement.toFixed(0)} points`;

  console.log(`\n  Result: ${report.baselineScore.toFixed(0)} → ${report.finalScore.toFixed(0)} (+${improvement.toFixed(0)}) in ${report.iterations} iterations, $${report.totalCostUsd.toFixed(2)}`);

  // Update template README
  updateReadme(templateDir, Math.round(report.baselineScore), Math.round(report.finalScore), improvementStr, report.iterations);
  console.log(`  Updated: ${templateId}/README.md`);
}

async function main(): Promise<void> {
  console.log(`Provider: ${provider}`);
  console.log(`Templates: ${FLAGSHIP_TEMPLATES.join(", ")}`);
  console.log(`Iterations: ${MAX_ITERATIONS}, Test cases: ${MAX_TEST_CASES}`);

  for (const templateId of FLAGSHIP_TEMPLATES) {
    await runTemplate(templateId);
  }

  // Cleanup work directory
  const captureDir = join(ROOT, ".capture-runs");
  if (existsSync(captureDir)) rmSync(captureDir, { recursive: true });

  console.log("\nAll done. Now run: npm run build:registry");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
