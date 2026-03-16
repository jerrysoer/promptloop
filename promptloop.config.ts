import type { PromptLoopConfig } from "./src/core/types.js";

const config: PromptLoopConfig = {
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
    criteria: `Score the output 0-100 on:
- Relevance: Does it address the input directly?
- Quality: Is it well-written and clear?
- Completeness: Does it cover the key points?
- Creativity: Is it engaging and non-generic?`,
  },
  failureReportSize: 3,
  targetScore: 95,
};

export default config;
