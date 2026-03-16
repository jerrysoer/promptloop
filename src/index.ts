// PromptLoop — Public API for programmatic use

export type {
  TestCase,
  Score,
  ScoreResult,
  ScoringMode,
  ScoringConfig,
  MutationStrategy,
  Mutation,
  IterationResult,
  RunReport,
  StopReason,
  ModelProvider,
  ModelConfig,
  PromptLoopConfig,
  LLMResponse,
  LLMToolCall,
  LLMToolResponse,
} from "./core/types.js";

export { scorePrompt, type EvalFunction, type ScorerOptions } from "./core/scorer.js";
export { generateMutation, type MutatorOptions } from "./core/mutator.js";
export { run, type RunOptions, type StrategyStats } from "./core/runner.js";
export { appendIteration, readHistory, hashPrompt } from "./core/history.js";
export { generateSVG, generatePNG } from "./core/chart.js";
export { complete, toolUse } from "./core/llm.js";
