import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { run, generateSVG } from "promptloop";
import type {
  IterationResult,
  RunReport,
  PromptLoopConfig,
  ModelConfig,
} from "promptloop";
import { MODELS } from "./models";
import { sanitizeError } from "./sanitize";

// ── Types ───────────────────────────────────────────────────

export interface ActiveRun {
  id: string;
  status: "running" | "completed" | "error" | "cancelled";
  history: IterationResult[];
  maxIterations: number;
  maxCostUsd: number;
  startedAt: number;
  report?: RunReport;
  originalPrompt: string;
  optimizedPrompt?: string;
  error?: string;
  hasStrategy: boolean;
  listeners: Set<(data: string) => void>;
  outputDir: string;
  abortController?: AbortController;
}

export interface RunState {
  status: "running" | "completed" | "error" | "cancelled";
  history: IterationResult[];
  maxIterations: number;
  maxCostUsd: number;
  startedAt: number;
  report?: RunReport;
  originalPrompt: string;
  optimizedPrompt?: string;
  error?: string;
  hasStrategy: boolean;
}

export interface RunSummary {
  id: string;
  startedAt: number;
  status: "running" | "completed" | "error" | "cancelled";
  baselineScore?: number;
  finalScore?: number;
  totalCostUsd?: number;
  iterations?: number;
}

export interface StartRunParams {
  prompt: string;
  testCases: Array<{ id: string; input: string; expected?: string }>;
  scoringCriteria: string;
  modelId: string;
  maxIterations: number;
  maxCostUsd: number;
  strategyDoc?: string;
  /** Resume from a previous run by ID */
  resumeFromRunId?: string;
  /** Scoring dimensions for rubric mode */
  dimensions?: Array<{ name: string; weight: number; criteria: string }>;
  /** User-provided API key — never persisted to disk */
  apiKey?: string;
}

// ── State (persisted on globalThis to survive HMR in dev) ───

const globalKey = "__promptloop_active_runs__" as const;

function getActiveRuns(): Map<string, ActiveRun> {
  const g = globalThis as Record<string, unknown>;
  if (!g[globalKey]) {
    g[globalKey] = new Map<string, ActiveRun>();
  }
  return g[globalKey] as Map<string, ActiveRun>;
}

const RUNS_DIR = process.env.VERCEL
  ? "/tmp/promptloop-runs"
  : join(process.cwd(), "..", "runs");

// ── Public API ──────────────────────────────────────────────

export function startRun(params: StartRunParams): string {
  const id = randomUUID().slice(0, 8);
  const outputDir = join(RUNS_DIR, id);
  mkdirSync(outputDir, { recursive: true });

  const promptPath = join(outputDir, "prompt.txt");
  const testCasesPath = join(outputDir, "test-cases.json");

  // If resuming, inherit test cases and config from previous run
  let effectiveTestCases = params.testCases;
  let effectiveModelId = params.modelId;
  let effectiveCriteria = params.scoringCriteria;
  let effectivePrompt = params.prompt;

  if (params.resumeFromRunId) {
    const prevRun = getRun(params.resumeFromRunId);
    if (prevRun) {
      // Load test cases from previous run directory
      const prevTestCasesPath = join(prevRun.outputDir, "test-cases.json");
      if (existsSync(prevTestCasesPath)) {
        effectiveTestCases = JSON.parse(readFileSync(prevTestCasesPath, "utf-8"));
      }
      // Use optimized prompt from previous run
      effectivePrompt = prevRun.optimizedPrompt ?? prevRun.originalPrompt;
    }
  }

  // Load saved config from previous run if resuming
  if (params.resumeFromRunId) {
    const prevRun = getRun(params.resumeFromRunId);
    if (prevRun) {
      const prevConfigPath = join(prevRun.outputDir, "run-config.json");
      if (existsSync(prevConfigPath)) {
        const prevConfig = JSON.parse(readFileSync(prevConfigPath, "utf-8"));
        effectiveModelId = prevConfig.modelId || effectiveModelId;
        effectiveCriteria = prevConfig.scoringCriteria || effectiveCriteria;
      }
    }
  }

  writeFileSync(promptPath, effectivePrompt);
  writeFileSync(testCasesPath, JSON.stringify(effectiveTestCases, null, 2));
  // Persist strategy doc so it can be detected after restart
  if (params.strategyDoc?.trim()) {
    writeFileSync(join(outputDir, "strategy.md"), params.strategyDoc);
  }
  // Persist run config for future resume
  writeFileSync(join(outputDir, "run-config.json"), JSON.stringify({
    modelId: effectiveModelId,
    scoringCriteria: effectiveCriteria,
    maxIterations: params.maxIterations,
    maxCostUsd: params.maxCostUsd,
  }, null, 2));

  const baseModelConfig = resolveModel(effectiveModelId);
  // Inject user-provided API key into model configs (never written to disk)
  const modelConfig = params.apiKey
    ? { ...baseModelConfig, apiKey: params.apiKey }
    : baseModelConfig;

  const config: PromptLoopConfig = {
    targetModel: modelConfig,
    optimizerModel: modelConfig,
    judgeModel: modelConfig,
    maxIterations: params.maxIterations,
    maxCostUsd: params.maxCostUsd,
    parallelTestCases: 5,
    scoring: {
      mode: "llm-judge",
      criteria: effectiveCriteria || params.scoringCriteria,
      dimensions: params.dimensions,
    },
    failureReportSize: 3,
  };

  const abortController = new AbortController();

  const activeRun: ActiveRun = {
    id,
    status: "running",
    history: [],
    maxIterations: params.maxIterations,
    maxCostUsd: params.maxCostUsd,
    startedAt: Date.now(),
    originalPrompt: params.prompt,
    hasStrategy: !!params.strategyDoc?.trim(),
    listeners: new Set(),
    outputDir,
    abortController,
  };

  getActiveRuns().set(id, activeRun);

  // Build resume state if continuing from a previous run
  let resumeFrom: { history: IterationResult[]; prompt: string } | undefined;
  if (params.resumeFromRunId) {
    const prevRun = getRun(params.resumeFromRunId);
    if (prevRun && prevRun.history.length > 0) {
      const prevPrompt = prevRun.optimizedPrompt ?? prevRun.originalPrompt;
      resumeFrom = { history: prevRun.history, prompt: prevPrompt };
      // Also use the previous optimized prompt as the starting prompt
      writeFileSync(promptPath, prevPrompt);
    }
  }

  run({
    promptPath,
    testCasesPath,
    config,
    outputDir,
    signal: abortController.signal,
    strategyDoc: params.strategyDoc,
    resumeFrom,
    onIteration: (result) => {
      activeRun.history.push(result);
      const event = `data: ${JSON.stringify(result)}\n\n`;
      for (const listener of activeRun.listeners) {
        listener(event);
      }
    },
  })
    .then((report) => {
      const isCancelled = report.stopReason === "cancelled";
      activeRun.status = isCancelled ? "cancelled" : "completed";
      activeRun.report = report;
      activeRun.optimizedPrompt = readFileSync(promptPath, "utf-8");

      if (isCancelled) {
        const event =
          `event: cancelled\ndata: ${JSON.stringify({
            report,
            optimizedPrompt: activeRun.optimizedPrompt,
          })}\n\n`;
        for (const listener of activeRun.listeners) {
          listener(event);
        }
      } else {
        const event =
          `event: complete\ndata: ${JSON.stringify({
            report,
            optimizedPrompt: activeRun.optimizedPrompt,
          })}\n\n`;
        for (const listener of activeRun.listeners) {
          listener(event);
        }
      }
    })
    .catch((err) => {
      activeRun.status = "error";
      activeRun.error = sanitizeError(String(err));

      const event =
        `event: run_error\ndata: ${JSON.stringify({ error: sanitizeError(String(err)) })}\n\n`;
      for (const listener of activeRun.listeners) {
        listener(event);
      }
    });

  return id;
}

export function getRun(id: string): ActiveRun | null {
  // Check in-memory first
  const active = getActiveRuns().get(id);
  if (active) return active;

  // Check filesystem for completed runs (survives server restart)
  const reportPath = join(RUNS_DIR, id, "report.json");
  const promptPath = join(RUNS_DIR, id, "prompt.txt");

  if (existsSync(reportPath)) {
    const report = JSON.parse(
      readFileSync(reportPath, "utf-8"),
    ) as RunReport;
    const optimizedPrompt = existsSync(promptPath)
      ? readFileSync(promptPath, "utf-8")
      : undefined;

    // Reconstruct as a completed ActiveRun
    const status = report.stopReason === "cancelled" ? "cancelled" as const : "completed" as const;
    // Check if a strategy doc was saved for this run
    const strategyDocPath = join(RUNS_DIR, id, "strategy.md");
    const hadStrategy = existsSync(strategyDocPath);

    const reconstructed: ActiveRun = {
      id,
      status,
      history: report.history,
      maxIterations: report.iterations,
      maxCostUsd: report.maxCostUsd ?? 0,
      startedAt: new Date(report.startedAt).getTime(),
      report,
      originalPrompt: "", // lost after restart
      optimizedPrompt,
      hasStrategy: hadStrategy,
      listeners: new Set(),
      outputDir: join(RUNS_DIR, id),
    };

    getActiveRuns().set(id, reconstructed);
    return reconstructed;
  }

  return null;
}

export function getRunSVG(id: string): string | null {
  const activeRun = getRun(id);
  if (!activeRun || activeRun.history.length === 0) return null;
  return generateSVG(activeRun.history);
}

export function cancelRun(id: string): boolean {
  const activeRun = getActiveRuns().get(id);
  if (!activeRun || activeRun.status !== "running") return false;
  activeRun.abortController?.abort();
  return true;
}

export function listRuns(): RunSummary[] {
  const summaries: RunSummary[] = [];

  // In-memory runs
  for (const [, activeRun] of getActiveRuns()) {
    const baseline = activeRun.history[0]?.scores.average;
    const best = activeRun.report?.finalScore ??
      (activeRun.history.length > 0
        ? Math.max(...activeRun.history.map((h) => h.scores.average))
        : undefined);
    const cost = activeRun.report?.totalCostUsd ??
      activeRun.history.reduce((s, h) => s + h.costUsd, 0);

    summaries.push({
      id: activeRun.id,
      startedAt: activeRun.startedAt,
      status: activeRun.status,
      baselineScore: baseline,
      finalScore: best,
      totalCostUsd: cost,
      iterations: activeRun.report?.iterations ?? Math.max(0, activeRun.history.length - 1),
    });
  }

  // Filesystem runs not yet in memory
  if (existsSync(RUNS_DIR)) {
    const dirs = readdirSync(RUNS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const dir of dirs) {
      if (getActiveRuns().has(dir)) continue;

      const reportPath = join(RUNS_DIR, dir, "report.json");
      if (!existsSync(reportPath)) continue;

      try {
        const report = JSON.parse(readFileSync(reportPath, "utf-8")) as RunReport;
        summaries.push({
          id: dir,
          startedAt: new Date(report.startedAt).getTime(),
          status: report.stopReason === "cancelled" ? "cancelled" : "completed",
          baselineScore: report.baselineScore,
          finalScore: report.finalScore,
          totalCostUsd: report.totalCostUsd,
          iterations: report.iterations,
        });
      } catch {
        // Corrupted report, skip
      }
    }
  }

  // Sort by date descending
  summaries.sort((a, b) => b.startedAt - a.startedAt);
  return summaries;
}

// ── Helpers ─────────────────────────────────────────────────

function resolveModel(modelId: string): ModelConfig {
  const found = MODELS.find((m) => m.id === modelId);
  if (found) {
    return { provider: found.provider, model: found.model };
  }
  return { provider: "anthropic", model: "claude-sonnet-4-5-20250929" };
}
