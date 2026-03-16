import type Anthropic from "@anthropic-ai/sdk";
import { toolUse } from "./llm.js";
import type {
  IterationResult,
  ModelConfig,
  Mutation,
  MutationStrategy,
  ScoreResult,
} from "./types.js";

// ── Mutation tools (Claude tool use) ────────────────────────

const MUTATION_TOOLS: Anthropic.Tool[] = [
  {
    name: "sharpen",
    description:
      "Make instructions more specific and precise. Tighten language, remove ambiguity, add explicit constraints.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "What specifically you are sharpening and why",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
  {
    name: "add_example",
    description:
      "Add a concrete example to the prompt that demonstrates the desired behavior. Use when the model is misunderstanding the task.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description:
            "What example you are adding and what failure it addresses",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
  {
    name: "remove",
    description:
      "Remove confusing, contradictory, or redundant instructions that may be hurting performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "What you are removing and why it was causing issues",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
  {
    name: "restructure",
    description:
      "Reorganize the prompt structure: reorder sections, add headers, change hierarchy. Use when information is poorly organized.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "How you are restructuring and why",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
  {
    name: "constrain",
    description:
      "Add constraints, guardrails, or negative examples. Use when the model is producing outputs that go off-track.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description:
            "What constraints you are adding and what failure mode they address",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
  {
    name: "expand",
    description:
      "Expand on under-specified instructions. Add detail, context, or sub-steps. Use when the model needs more guidance.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "What you are expanding and why more detail is needed",
        },
        new_prompt: {
          type: "string",
          description: "The complete updated prompt text",
        },
      },
      required: ["description", "new_prompt"],
    },
  },
];

// ── Optimizer system prompt ─────────────────────────────────

const OPTIMIZER_SYSTEM = `You are an expert prompt engineer optimizing a prompt for better performance.

Your task: analyze the current prompt, its failure cases, and score history, then choose ONE mutation to improve performance.

Rules:
1. Make exactly ONE mutation per turn — call exactly one tool
2. The mutation should target the weakest test cases
3. Be surgical: small, targeted changes beat large rewrites
4. Preserve what is working — do not rewrite sections that score well
5. Learn from history: if a strategy was reverted, try a different approach
6. The new_prompt field must contain the COMPLETE updated prompt text

Think step by step:
1. What patterns do you see in the failing test cases?
2. What part of the current prompt is responsible for those failures?
3. Which mutation strategy would best address this?
4. Apply the minimum change needed`;

// ── Build the optimizer message ─────────────────────────────

function buildOptimizerMessage(
  currentPrompt: string,
  failureReport: ScoreResult,
  history: IterationResult[],
): string {
  let msg = `## Current Prompt\n\`\`\`\n${currentPrompt}\n\`\`\`\n\n`;

  // Failure report
  msg += `## Failure Report (lowest-scoring test cases)\n`;
  for (const score of failureReport.lowest) {
    msg += `- **${score.testCaseId}** (score: ${score.value}): ${score.reasoning}\n`;
  }
  msg += `\nCurrent average score: ${failureReport.average}/100\n\n`;

  // History summary
  if (history.length > 0) {
    msg += `## Optimization History\n`;
    for (const iter of history.slice(-10)) {
      const status = iter.kept ? "KEPT" : "REVERTED";
      const strategy = iter.mutation?.strategy ?? "baseline";
      msg += `- Iteration ${iter.iteration}: ${strategy} → score ${iter.scores.average} [${status}]\n`;
      if (iter.mutation) {
        msg += `  ${iter.mutation.description}\n`;
      }
    }
  }

  return msg;
}

// ── Public API ──────────────────────────────────────────────

export interface MutatorOptions {
  optimizerModel: ModelConfig;
}

export async function generateMutation(
  currentPrompt: string,
  failureReport: ScoreResult,
  history: IterationResult[],
  options: MutatorOptions,
): Promise<{ mutation: Mutation; cost: number }> {
  const message = buildOptimizerMessage(currentPrompt, failureReport, history);

  const response = await toolUse(
    options.optimizerModel,
    OPTIMIZER_SYSTEM,
    message,
    MUTATION_TOOLS,
  );

  if (response.toolCalls.length === 0) {
    throw new Error("Optimizer did not produce a mutation (no tool call)");
  }

  const call = response.toolCalls[0];
  const input = call.input as { description: string; new_prompt: string };

  return {
    mutation: {
      strategy: call.name as MutationStrategy,
      description: input.description,
      newPrompt: input.new_prompt,
    },
    cost: response.costUsd,
  };
}
