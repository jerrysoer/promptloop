// ── Test Cases ──────────────────────────────────────────────

export interface TestCase {
  id: string;
  input: string;
  /** Optional expected output for programmatic comparison */
  expected?: string;
  /** Optional metadata passed through to the scorer */
  metadata?: Record<string, unknown>;
}

// ── Scoring ─────────────────────────────────────────────────

export interface Score {
  value: number; // 0-100
  reasoning: string;
  testCaseId: string;
}

export interface ScoreResult {
  scores: Score[];
  average: number;
  lowest: Score[];
}

export type ScoringMode = "llm-judge" | "programmatic" | "hybrid";

export interface ScoringConfig {
  mode: ScoringMode;
  /** Criteria for LLM judge (used in llm-judge and hybrid modes) */
  criteria?: string;
  /** Path to eval function module (used in programmatic and hybrid modes) */
  evalPath?: string;
  /** Weight for LLM judge score in hybrid mode (0-1, default 0.5) */
  judgeWeight?: number;
}

// ── Mutations ───────────────────────────────────────────────

export type MutationStrategy =
  | "sharpen"
  | "add_example"
  | "remove"
  | "restructure"
  | "constrain"
  | "expand";

export interface Mutation {
  strategy: MutationStrategy;
  description: string;
  /** The full new prompt text after mutation */
  newPrompt: string;
}

// ── Iteration History ───────────────────────────────────────

export interface IterationResult {
  iteration: number;
  timestamp: string;
  mutation: Mutation | null; // null for baseline
  scores: ScoreResult;
  kept: boolean;
  promptHash: string;
  costUsd: number;
  /** Number of consecutive reverted iterations (resets on kept) */
  consecutiveReverts?: number;
}

// ── Run Report ──────────────────────────────────────────────

export type StopReason = "completed" | "budget" | "target" | "plateau" | "cancelled";

export interface RunReport {
  startedAt: string;
  completedAt: string;
  iterations: number;
  baselineScore: number;
  finalScore: number;
  improvement: number;
  totalCostUsd: number;
  bestIteration: number;
  history: IterationResult[];
  /** Why the run stopped */
  stopReason?: StopReason;
  /** Budget ceiling for cost projection in UI */
  maxCostUsd?: number;
}

// ── Config ──────────────────────────────────────────────────

export type ModelProvider = "anthropic" | "openai" | "claude-cli";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface PromptLoopConfig {
  /** Model that executes the prompt being optimized */
  targetModel: ModelConfig;
  /** Model that generates mutations */
  optimizerModel: ModelConfig;
  /** Model that judges output quality */
  judgeModel: ModelConfig;
  /** Maximum optimization iterations */
  maxIterations: number;
  /** Stop if total cost exceeds this (USD) */
  maxCostUsd: number;
  /** Number of test cases to run in parallel */
  parallelTestCases: number;
  /** Scoring configuration */
  scoring: ScoringConfig;
  /** Number of lowest-scoring cases to include in failure report */
  failureReportSize: number;
  /** Stop early if score reaches this threshold */
  targetScore?: number;
  /** Stop if this many consecutive iterations are reverted (default 5) */
  plateauThreshold?: number;
}

// ── LLM Abstraction ─────────────────────────────────────────

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LLMToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResponse {
  toolCalls: LLMToolCall[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
