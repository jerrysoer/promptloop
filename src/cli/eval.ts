import { defineCommand } from "citty";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import consola from "consola";
import { scorePrompt, type EvalFunction } from "../core/scorer.js";
import type { PromptLoopConfig, TestCase } from "../core/types.js";

export const evalCommand = defineCommand({
  meta: {
    name: "eval",
    description: "Score the current prompt without optimization",
  },
  args: {
    prompt: {
      type: "string",
      description: "Path to prompt.md",
      alias: "p",
      default: "prompt.md",
    },
    tests: {
      type: "string",
      description: "Path to test-cases.json",
      alias: "t",
      default: "test-cases.json",
    },
    config: {
      type: "string",
      description: "Path to config file",
      alias: "c",
      default: "promptloop.config.ts",
    },
  },
  async run({ args }) {
    const cwd = process.cwd();

    const promptPath = resolve(cwd, args.prompt);
    const testCasesPath = resolve(cwd, args.tests);
    const configPath = resolve(cwd, args.config);

    if (!existsSync(promptPath)) {
      consola.error(`Prompt file not found: ${promptPath}`);
      process.exit(1);
    }
    if (!existsSync(testCasesPath)) {
      consola.error(`Test cases file not found: ${testCasesPath}`);
      process.exit(1);
    }

    // Load inputs
    const prompt = readFileSync(promptPath, "utf-8");
    const testCases: TestCase[] = JSON.parse(
      readFileSync(testCasesPath, "utf-8"),
    );

    // Load config
    let config: PromptLoopConfig;
    if (existsSync(configPath)) {
      const configModule = (await import(
        pathToFileURL(configPath).href
      )) as { default: PromptLoopConfig };
      config = configModule.default;
    } else {
      config = {
        targetModel: {
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250929",
        },
        optimizerModel: {
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250929",
        },
        judgeModel: {
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250929",
        },
        maxIterations: 0,
        maxCostUsd: 1.0,
        parallelTestCases: 5,
        scoring: {
          mode: "llm-judge",
          criteria:
            "Score the output 0-100 on relevance, quality, and completeness.",
        },
        failureReportSize: 3,
      };
    }

    // Load eval function if specified
    let evalFn: EvalFunction | undefined;
    if (config.scoring.evalPath) {
      const evalPath = resolve(cwd, config.scoring.evalPath);
      if (existsSync(evalPath)) {
        const evalModule = (await import(
          pathToFileURL(evalPath).href
        )) as { default: EvalFunction };
        evalFn = evalModule.default;
      }
    }

    // Check API key
    if (
      config.targetModel.provider === "anthropic" &&
      !config.targetModel.apiKey &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      consola.error("ANTHROPIC_API_KEY not set.");
      process.exit(1);
    }

    consola.start(
      `Evaluating prompt against ${testCases.length} test cases...`,
    );

    const { result, totalCost } = await scorePrompt(prompt, testCases, {
      targetModel: config.targetModel,
      judgeModel: config.judgeModel,
      scoringConfig: config.scoring,
      parallelTestCases: config.parallelTestCases,
      evalFn,
    });

    consola.success(`Average score: ${result.average}/100`);
    consola.info(`Cost: $${totalCost.toFixed(4)}`);

    consola.info("\nPer-test-case scores:");
    for (const score of result.scores) {
      const bar = "█".repeat(Math.round(score.value / 5));
      const pad = " ".repeat(20 - Math.round(score.value / 5));
      consola.info(
        `  ${score.testCaseId.padEnd(20)} ${score.value.toString().padStart(3)}/100  ${bar}${pad}  ${score.reasoning}`,
      );
    }

    if (result.lowest.length > 0) {
      consola.info("\nLowest scoring:");
      for (const score of result.lowest) {
        consola.warn(
          `  ${score.testCaseId}: ${score.value}/100 — ${score.reasoning}`,
        );
      }
    }
  },
});
