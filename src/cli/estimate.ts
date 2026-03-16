import { defineCommand } from "citty";
import { readFileSync, existsSync } from "node:fs";
import { ANTHROPIC_COSTS, OPENAI_COSTS } from "../core/llm.js";

export const estimateCommand = defineCommand({
  meta: {
    name: "estimate",
    description: "Estimate cost for an optimization run",
  },
  args: {
    prompt: {
      type: "string",
      alias: "p",
      description: "Path to prompt file",
      default: "prompt.md",
    },
    tests: {
      type: "string",
      alias: "t",
      description: "Path to test cases file",
      default: "test-cases.json",
    },
    iterations: {
      type: "string",
      alias: "n",
      description: "Number of iterations",
      default: "25",
    },
    model: {
      type: "string",
      alias: "m",
      description: "Model ID (e.g. claude-sonnet-4-5-20250929)",
      default: "claude-sonnet-4-5-20250929",
    },
  },
  async run({ args }) {
    const iterations = parseInt(args.iterations, 10) || 25;
    const modelId = args.model;

    // Read prompt to estimate token count
    if (!existsSync(args.prompt)) {
      console.error(`Prompt file not found: ${args.prompt}`);
      process.exit(1);
    }
    const promptText = readFileSync(args.prompt, "utf-8");
    const promptTokens = Math.ceil(promptText.length / 4); // rough estimate

    // Read test cases
    if (!existsSync(args.tests)) {
      console.error(`Test cases file not found: ${args.tests}`);
      process.exit(1);
    }
    const testCases = JSON.parse(readFileSync(args.tests, "utf-8"));
    const numTests = Array.isArray(testCases) ? testCases.length : 0;

    // Look up cost per million tokens
    const costs = ANTHROPIC_COSTS[modelId] ?? OPENAI_COSTS[modelId] ?? { input: 3, output: 15 };

    // Per-iteration estimates:
    // - Target: prompt + input -> output (per test case)
    // - Judge: prompt + output + criteria -> score (per test case)
    // - Optimizer: history + prompt -> mutation (once per iteration)
    const avgInputPerTest = promptTokens + 200; // prompt + test case input
    const avgOutputPerTest = 500; // average response length
    const avgJudgeInput = avgOutputPerTest + 300; // output + criteria
    const avgJudgeOutput = 150; // score + reasoning
    const avgOptimizerInput = promptTokens + 2000; // prompt + history context
    const avgOptimizerOutput = promptTokens + 500; // mutated prompt + description

    // Cost per iteration
    const targetCostPerIter = numTests * (
      (avgInputPerTest * costs.input) / 1_000_000 +
      (avgOutputPerTest * costs.output) / 1_000_000
    );
    const judgeCostPerIter = numTests * (
      (avgJudgeInput * costs.input) / 1_000_000 +
      (avgJudgeOutput * costs.output) / 1_000_000
    );
    const optimizerCostPerIter = (
      (avgOptimizerInput * costs.input) / 1_000_000 +
      (avgOptimizerOutput * costs.output) / 1_000_000
    );

    const costPerIter = targetCostPerIter + judgeCostPerIter + optimizerCostPerIter;
    const baselineCost = targetCostPerIter + judgeCostPerIter; // no optimizer for baseline

    const totalMin = baselineCost + costPerIter * iterations * 0.8; // optimistic
    const totalMax = baselineCost + costPerIter * iterations * 1.2; // pessimistic

    console.log("\nPromptLoop Cost Estimate");
    console.log("========================\n");
    console.log(`Model:       ${modelId}`);
    console.log(`Prompt:      ~${promptTokens} tokens`);
    console.log(`Test cases:  ${numTests}`);
    console.log(`Iterations:  ${iterations}\n`);
    console.log("Per-iteration breakdown:");
    console.log(`  Target calls:    $${targetCostPerIter.toFixed(4)}`);
    console.log(`  Judge calls:     $${judgeCostPerIter.toFixed(4)}`);
    console.log(`  Optimizer call:  $${optimizerCostPerIter.toFixed(4)}`);
    console.log(`  Total/iter:      $${costPerIter.toFixed(4)}\n`);
    console.log(`Estimated total: $${totalMin.toFixed(2)} – $${totalMax.toFixed(2)}`);
    console.log(`\n(Baseline eval adds ~$${baselineCost.toFixed(4)})`);
  },
});
