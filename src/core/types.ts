// ── Test Cases ──────────────────────────────────────────────

export interface TestCase {
  id: string;
  input: string;
  /** Optional expected output for programmatic comparison */
  expected?: string;
  /** Optional metadata passed through to the scorer */
  metadata?: Record<string, unknown>;
  /** Optional image URLs or base64 strings for vision test cases */
  images?: string[];
}

// ── Scoring Dimensions ──────────────────────────────────────

export interface ScoringDimension {
  /** Dimension name, e.g. "accuracy", "tone", "format" */
  name: string;
  /** Weight for composite score (0-1) — all weights should sum to 1 */
  weight: number;
  /** Per-dimension judge criteria */
  criteria: string;
}

// ── Scoring ─────────────────────────────────────────────────

export interface Score {
  value: number; // 0-100
  reasoning: string;
  testCaseId: string;
  /** Per-dimension scores when rubric mode is active */
  dimensions?: Record<string, number>;
  /** URL of generated image (for image-gen test cases) */
  imageUrl?: string;
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
  /** Multi-dimensional rubric — if set, enables rubric scoring mode */
  dimensions?: ScoringDimension[];
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
  originalPrompt?: string;
  /** Why the run stopped */
  stopReason?: StopReason;
  /** Budget ceiling for cost projection in UI */
  maxCostUsd?: number;
  /** Per-strategy success rates from this run */
  strategyStats?: Record<string, { attempts: number; kept: number }>;
}

// ── Config ──────────────────────────────────────────────────

export type ModelProvider = "anthropic" | "openai" | "claude-cli" | "image-gen";

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
  /** Optimization mode — auto-detected from model config if not set */
  mode?: "text" | "vision" | "image-gen";
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
  /** URL of generated image (for image-gen providers) */
  imageUrl?: string;
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
