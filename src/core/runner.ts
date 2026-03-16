import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import consola from "consola";
import { scorePrompt, type EvalFunction } from "./scorer.js";
import { generateMutation } from "./mutator.js";
import { appendIteration, hashPrompt, readHistory } from "./history.js";
import { generatePNG } from "./chart.js";
import type {
  IterationResult,
  PromptLoopConfig,
  RunReport,
  TestCase,
} from "./types.js";

// ── Run Options ─────────────────────────────────────────────

export interface RunOptions {
  promptPath: string;
  testCasesPath: string;
  config: PromptLoopConfig;
  outputDir: string;
  evalFn?: EvalFunction;
  /** Called after each iteration (baseline + loop). Enables real-time streaming. */
  onIteration?: (result: IterationResult) => void;
}

// ── Main Optimization Loop ──────────────────────────────────

export async function run(options: RunOptions): Promise<RunReport> {
  const { promptPath, testCasesPath, config, outputDir, evalFn, onIteration } = options;
  const startedAt = new Date().toISOString();

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const historyPath = join(outputDir, "history.jsonl");
  const chartPath = join(outputDir, "progress.png");
  const reportPath = join(outputDir, "report.json");

  // Load inputs
  let currentPrompt = readFileSync(promptPath, "utf-8");
  const testCases: TestCase[] = JSON.parse(
    readFileSync(testCasesPath, "utf-8"),
  );

  consola.info(`Loaded ${testCases.length} test cases`);
  consola.info(`Max iterations: ${config.maxIterations}`);
  consola.info(`Max cost: $${config.maxCostUsd}`);

  const scorerOptions = {
    targetModel: config.targetModel,
    judgeModel: config.judgeModel,
    scoringConfig: config.scoring,
    parallelTestCases: config.parallelTestCases,
    evalFn,
  };

  let totalCost = 0;
  let bestScore = 0;
  let bestPrompt = currentPrompt;
  let bestIteration = 0;
  const history: IterationResult[] = [];

  // ── Baseline ────────────────────────────────────────────

  consola.start("Running baseline evaluation...");
  const { result: baselineResult, totalCost: baselineCost } =
    await scorePrompt(currentPrompt, testCases, scorerOptions);
  totalCost += baselineCost;
  bestScore = baselineResult.average;
  bestPrompt = currentPrompt;

  const baselineIteration: IterationResult = {
    iteration: 0,
    timestamp: new Date().toISOString(),
    mutation: null,
    scores: baselineResult,
    kept: true,
    promptHash: hashPrompt(currentPrompt),
    costUsd: baselineCost,
  };

  appendIteration(historyPath, baselineIteration);
  history.push(baselineIteration);
  onIteration?.(baselineIteration);

  consola.success(`Baseline score: ${baselineResult.average}/100`);
  consola.info(`Baseline cost: $${baselineCost.toFixed(4)}`);

  // ── Optimization Loop ───────────────────────────────────

  for (let i = 1; i <= config.maxIterations; i++) {
    // Check cost budget
    if (totalCost >= config.maxCostUsd) {
      consola.warn(
        `Cost budget exceeded ($${totalCost.toFixed(2)} / $${config.maxCostUsd}). Stopping.`,
      );
      break;
    }

    // Check target score
    if (config.targetScore && bestScore >= config.targetScore) {
      consola.success(
        `Target score ${config.targetScore} reached at iteration ${i - 1}. Stopping.`,
      );
      break;
    }

    consola.start(`Iteration ${i}/${config.maxIterations}`);

    // Get the latest scores for failure report
    const latestScores = history[history.length - 1].scores;

    // Generate mutation
    let mutation;
    let mutationCost;
    try {
      const mutResult = await generateMutation(
        currentPrompt,
        latestScores,
        history,
        { optimizerModel: config.optimizerModel },
      );
      mutation = mutResult.mutation;
      mutationCost = mutResult.cost;
      totalCost += mutationCost;
    } catch (err) {
      consola.error(`Mutation failed: ${err}`);
      continue;
    }

    consola.info(`  Strategy: ${mutation.strategy}`);
    consola.info(`  ${mutation.description}`);

    // Score the mutated prompt
    const { result: mutatedResult, totalCost: scoreCost } = await scorePrompt(
      mutation.newPrompt,
      testCases,
      scorerOptions,
    );
    totalCost += scoreCost;

    const iterationCost = mutationCost + scoreCost;
    const kept = mutatedResult.average > bestScore;

    const iterationResult: IterationResult = {
      iteration: i,
      timestamp: new Date().toISOString(),
      mutation,
      scores: mutatedResult,
      kept,
      promptHash: hashPrompt(mutation.newPrompt),
      costUsd: iterationCost,
    };

    appendIteration(historyPath, iterationResult);
    history.push(iterationResult);
    onIteration?.(iterationResult);

    if (kept) {
      currentPrompt = mutation.newPrompt;
      bestScore = mutatedResult.average;
      bestPrompt = mutation.newPrompt;
      bestIteration = i;
      consola.success(
        `  Score: ${mutatedResult.average}/100 (+${mutatedResult.average - (history[history.length - 2]?.scores.average ?? 0)}) KEPT`,
      );
    } else {
      consola.warn(
        `  Score: ${mutatedResult.average}/100 (best: ${bestScore}) REVERTED`,
      );
    }

    consola.info(
      `  Cost this iteration: $${iterationCost.toFixed(4)} | Total: $${totalCost.toFixed(4)}`,
    );
  }

  // ── Finalize ────────────────────────────────────────────

  // Save optimized prompt
  writeFileSync(promptPath, bestPrompt, "utf-8");
  consola.success(`Optimized prompt saved to ${promptPath}`);

  // Generate chart
  try {
    await generatePNG(history, chartPath);
    consola.success(`Progress chart saved to ${chartPath}`);
  } catch (err) {
    consola.warn(`Chart generation failed: ${err}`);
  }

  // Build report
  const report: RunReport = {
    startedAt,
    completedAt: new Date().toISOString(),
    iterations: history.length - 1, // excluding baseline
    baselineScore: history[0].scores.average,
    finalScore: bestScore,
    improvement: bestScore - history[0].scores.average,
    totalCostUsd: totalCost,
    bestIteration,
    history,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  consola.success(`Run report saved to ${reportPath}`);

  // Summary
  consola.box(
    `PromptLoop Complete\n\n` +
      `Baseline: ${report.baselineScore}/100\n` +
      `Final:    ${report.finalScore}/100\n` +
      `Improvement: +${report.improvement} points\n` +
      `Iterations: ${report.iterations}\n` +
      `Total cost: $${report.totalCostUsd.toFixed(4)}\n` +
      `Best at iteration: ${report.bestIteration}`,
  );

  return report;
}
