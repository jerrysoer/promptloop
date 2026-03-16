# PromptLoop

**Autonomous prompt optimizer.** Give it a prompt and test cases — it will iteratively mutate, score, and improve your prompt using the Karpathy autoresearch pattern.

[![npm version](https://img.shields.io/npm/v/promptloop)](https://www.npmjs.com/package/promptloop)
[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> **Try the live demo** at [promptloop.vercel.app](https://promptloop.vercel.app)

### Before / After

| | Score |
|---|---|
| **Original prompt** (hand-written) | 55 / 100 |
| **Optimized prompt** (15 iterations, $1.40) | 82 / 100 |

### PromptLoop vs. Alternatives

| Feature | PromptLoop | DSPy | PromptFoo | OpenAI Optimizer |
|---|---|---|---|---|
| Optimizes individual prompts | Yes | No (LLM programs) | No (testing only) | Yes |
| TypeScript-native | Yes | No (Python) | Yes | No (Python) |
| Works with any model | Yes | Yes | Yes | OpenAI only |
| CLI + Web UI | Yes | CLI only | CLI + UI | API only |
| Mutation strategies | 6 strategies | Bootstrapping | N/A | Gradient-free |
| Real-time progress | SSE streaming | No | No | No |
| Self-hostable | Yes | Yes | Yes | No |

```
promptloop init linkedin-hooks
promptloop run
```

## How It Works

```
Load prompt.md + test-cases.json
         │
    ┌────▼────┐
    │ Baseline │  Execute prompt against all test cases, score with LLM judge
    └────┬────┘
         │
    ┌────▼──────────────────────┐
    │ Loop (N iterations)       │
    │                           │
    │  1. Failure report        │  Identify lowest-scoring test cases
    │  2. Mutate                │  Optimizer agent picks a strategy
    │  3. Re-score              │  Execute mutated prompt, judge outputs
    │  4. Keep or revert        │  Score improved? Keep. Otherwise revert.
    │  5. Log to history.jsonl  │
    │                           │
    └────┬──────────────────────┘
         │
    ┌────▼────┐
    │ Output  │  Optimized prompt.md + progress.png + report.json
    └─────────┘
```

## Quick Start

### Install

```bash
npm install -g promptloop
```

### Create a project

```bash
promptloop init linkedin-hooks
cd linkedin-hooks
```

This creates:
- `prompt.md` — the prompt to optimize
- `test-cases.json` — test cases with inputs and expected outputs
- `promptloop.config.ts` — model selection, budget, scoring criteria

### Run optimization

```bash
export ANTHROPIC_API_KEY=sk-ant-...
promptloop run
```

### Score without optimizing

```bash
promptloop eval
```

## Configuration

```typescript
// promptloop.config.ts
import type { PromptLoopConfig } from "promptloop";

const config: PromptLoopConfig = {
  // Model that executes your prompt
  targetModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  // Model that generates mutations
  optimizerModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  // Model that judges output quality
  judgeModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  maxIterations: 25,
  maxCostUsd: 5.0,
  parallelTestCases: 5,
  scoring: {
    mode: "llm-judge",
    criteria: "Score the output 0-100 on relevance, quality, and completeness.",
  },
  failureReportSize: 3,
  targetScore: 90,
};

export default config;
```

### Models

Works with any model via two providers:

| Provider | Models |
|---|---|
| `anthropic` | Claude Sonnet 4.5, Claude Opus 4.6, Claude Haiku 4.5 |
| `openai` | GPT-4o, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano |

Use different models for different roles — e.g., cheap model as target, expensive model as judge.

### Scoring Modes

- **`llm-judge`** — LLM scores each output against your criteria (default)
- **`programmatic`** — Your custom eval function scores outputs
- **`hybrid`** — Weighted combination of both

For programmatic scoring, export a function:

```typescript
// eval.ts
import type { TestCase } from "promptloop";

export default function score(output: string, testCase: TestCase): number {
  // Return 0-100
  if (output.length > 200) return 30; // too long
  if (!output.includes(testCase.input.split(" ")[0])) return 50; // missed topic
  return 85;
};
```

Then set `scoring.evalPath: "./eval.ts"` in your config.

## Mutation Strategies

The optimizer uses Claude tool use to apply structured mutations:

| Strategy | When Used |
|---|---|
| `sharpen` | Tighten vague instructions |
| `add_example` | Model misunderstands format/tone |
| `remove` | Contradictory or redundant rules |
| `restructure` | Information is buried or poorly ordered |
| `constrain` | Output goes off-track |
| `expand` | Instructions are under-specified |

One mutation per iteration. The optimizer learns from history — if a strategy was reverted, it tries a different approach.

## CLI Reference

```bash
promptloop init [template]       # Scaffold a project (templates: linkedin-hooks, blank)
promptloop run [options]         # Run optimization loop
promptloop eval [options]        # Score current prompt (no optimization)
promptloop generate-tests [opt]  # Generate test cases from a prompt using AI
promptloop diff [options]        # Show diff between original and optimized prompt
promptloop estimate [options]    # Estimate cost for an optimization run

# Run options
  -p, --prompt <path>      # Prompt file (default: prompt.md)
  -t, --tests <path>       # Test cases file (default: test-cases.json)
  -c, --config <path>      # Config file (default: promptloop.config.ts)
  -o, --output <path>      # Output directory (default: .promptloop)
  -n, --iterations <n>     # Override max iterations
  --budget <usd>           # Override max cost
```

## Programmatic API

```typescript
import { run, scorePrompt, generateMutation } from "promptloop";

// Run the full optimization loop
const report = await run({
  promptPath: "./prompt.md",
  testCasesPath: "./test-cases.json",
  config: { /* ... */ },
  outputDir: "./.promptloop",
});

console.log(`Improved ${report.baselineScore} → ${report.finalScore}`);
```

## Output Files

After a run, `.promptloop/` contains:

- `history.jsonl` — every iteration as a JSON line (append-only, crash-safe)
- `progress.png` — score chart with baseline, improvements, and reverts
- `report.json` — full run summary

## Cost

Typical costs for a 25-iteration run with 10 test cases:

| Configuration | Estimated Cost |
|---|---|
| Sonnet for all three roles | $1–3 |
| Haiku target, Sonnet optimizer/judge | $0.50–1.50 |
| Sonnet target, Opus optimizer, Sonnet judge | $3–8 |

Set `maxCostUsd` in config to cap spending. The loop stops when the budget is reached.

## FAQ

**How is this different from DSPy?**
DSPy optimizes LLM programs (chains of calls). PromptLoop optimizes individual prompts — simpler scope, TypeScript-native, works with any model.

**How is this different from PromptFoo?**
PromptFoo tests prompts. PromptLoop optimizes them. They are complementary — use PromptFoo to evaluate, PromptLoop to improve.

**Does it work with local models?**
Yes — set `baseUrl` in your model config to point to any OpenAI-compatible API (Ollama, vLLM, etc.).

**Can I resume a failed run?**
Yes — use the "Continue Run" button in the web UI. The CLI supports resume via the JSONL history file that survives crashes.

## License

MIT
