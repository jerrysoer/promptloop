import { defineCommand } from "citty";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import consola from "consola";
import { run } from "../core/runner.js";
import type { PromptLoopConfig } from "../core/types.js";
import type { EvalFunction } from "../core/scorer.js";

export const runCommand = defineCommand({
  meta: {
    name: "run",
    description: "Run the prompt optimization loop",
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
    output: {
      type: "string",
      description: "Output directory for results",
      alias: "o",
      default: ".promptloop",
    },
    iterations: {
      type: "string",
      description: "Override max iterations",
      alias: "n",
    },
    budget: {
      type: "string",
      description: "Override max cost (USD)",
    },
  },
  async run({ args }) {
    const cwd = process.cwd();

    // Resolve paths
    const promptPath = resolve(cwd, args.prompt);
    const testCasesPath = resolve(cwd, args.tests);
    const configPath = resolve(cwd, args.config);
    const outputDir = resolve(cwd, args.output);

    // Validate files exist
    if (!existsSync(promptPath)) {
      consola.error(`Prompt file not found: ${promptPath}`);
      consola.info('Run "promptloop init" to create a new project');
      process.exit(1);
    }
    if (!existsSync(testCasesPath)) {
      consola.error(`Test cases file not found: ${testCasesPath}`);
      process.exit(1);
    }

    // Load config
    let config: PromptLoopConfig;
    if (existsSync(configPath)) {
      const configModule = (await import(
        pathToFileURL(configPath).href
      )) as { default: PromptLoopConfig };
      config = configModule.default;
    } else {
      consola.warn("No config file found, using defaults");
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
        maxIterations: 25,
        maxCostUsd: 5.0,
        parallelTestCases: 5,
        scoring: {
          mode: "llm-judge",
          criteria:
            "Score the output 0-100 on relevance, quality, and completeness.",
        },
        failureReportSize: 3,
      };
    }

    // Apply CLI overrides
    if (args.iterations) {
      config.maxIterations = parseInt(args.iterations, 10);
    }
    if (args.budget) {
      config.maxCostUsd = parseFloat(args.budget);
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
      } else {
        consola.error(`Eval function not found: ${evalPath}`);
        process.exit(1);
      }
    }

    // Check API key
    if (
      config.targetModel.provider === "anthropic" &&
      !config.targetModel.apiKey &&
      !process.env.ANTHROPIC_API_KEY
    ) {
      consola.error(
        "ANTHROPIC_API_KEY not set. Export it or add apiKey to your config.",
      );
      process.exit(1);
    }

    consola.box("PromptLoop — Autonomous Prompt Optimizer");

    await run({
      promptPath,
      testCasesPath,
      config,
      outputDir,
      evalFn,
    });
  },
});
