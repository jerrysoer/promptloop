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

const RUNS_DIR = join(process.cwd(), "..", "runs");

// ── Public API ──────────────────────────────────────────────

export function startRun(params: StartRunParams): string {
  const id = randomUUID().slice(0, 8);
  const outputDir = join(RUNS_DIR, id);
  mkdirSync(outputDir, { recursive: true });

  const promptPath = join(outputDir, "prompt.txt");
  const testCasesPath = join(outputDir, "test-cases.json");
  writeFileSync(promptPath, params.prompt);
  writeFileSync(testCasesPath, JSON.stringify(params.testCases, null, 2));

  const modelConfig = resolveModel(params.modelId);

  const config: PromptLoopConfig = {
    targetModel: modelConfig,
    optimizerModel: modelConfig,
    judgeModel: modelConfig,
    maxIterations: params.maxIterations,
    maxCostUsd: params.maxCostUsd,
    parallelTestCases: 5,
    scoring: {
      mode: "llm-judge",
      criteria: params.scoringCriteria,
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
    listeners: new Set(),
    outputDir,
    abortController,
  };

  getActiveRuns().set(id, activeRun);

  run({
    promptPath,
    testCasesPath,
    config,
    outputDir,
    signal: abortController.signal,
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
      activeRun.error = String(err);

      const event =
        `event: run_error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`;
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
