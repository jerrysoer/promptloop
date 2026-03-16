import { randomUUID } from "node:crypto";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
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
  status: "running" | "completed" | "error";
  history: IterationResult[];
  maxIterations: number;
  startedAt: number;
  report?: RunReport;
  originalPrompt: string;
  optimizedPrompt?: string;
  error?: string;
  listeners: Set<(data: string) => void>;
  outputDir: string;
}

export interface RunState {
  status: "running" | "completed" | "error";
  history: IterationResult[];
  maxIterations: number;
  startedAt: number;
  report?: RunReport;
  originalPrompt: string;
  optimizedPrompt?: string;
  error?: string;
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

  const activeRun: ActiveRun = {
    id,
    status: "running",
    history: [],
    maxIterations: params.maxIterations,
    startedAt: Date.now(),
    originalPrompt: params.prompt,
    listeners: new Set(),
    outputDir,
  };

  getActiveRuns().set(id, activeRun);

  run({
    promptPath,
    testCasesPath,
    config,
    outputDir,
    onIteration: (result) => {
      activeRun.history.push(result);
      const event = `data: ${JSON.stringify(result)}\n\n`;
      for (const listener of activeRun.listeners) {
        listener(event);
      }
    },
  })
    .then((report) => {
      activeRun.status = "completed";
      activeRun.report = report;
      activeRun.optimizedPrompt = readFileSync(promptPath, "utf-8");

      const event =
        `event: complete\ndata: ${JSON.stringify({
          report,
          optimizedPrompt: activeRun.optimizedPrompt,
        })}\n\n`;
      for (const listener of activeRun.listeners) {
        listener(event);
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
    const reconstructed: ActiveRun = {
      id,
      status: "completed",
      history: report.history,
      maxIterations: report.iterations,
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

// ── Helpers ─────────────────────────────────────────────────

function resolveModel(modelId: string): ModelConfig {
  const found = MODELS.find((m) => m.id === modelId);
  if (found) {
    return { provider: found.provider, model: found.model };
  }
  return { provider: "anthropic", model: "claude-sonnet-4-5-20250929" };
}
