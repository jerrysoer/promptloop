import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  LLMResponse,
  LLMToolCall,
  LLMToolResponse,
  ModelConfig,
} from "./types.js";

// ── Cost tables (per 1M tokens) ─────────────────────────────

const ANTHROPIC_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};

const OPENAI_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};

function estimateCost(
  model: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const table = provider === "anthropic" ? ANTHROPIC_COSTS : OPENAI_COSTS;
  const costs = table[model] ?? { input: 3, output: 15 }; // fallback to Sonnet pricing
  return (
    (inputTokens * costs.input) / 1_000_000 +
    (outputTokens * costs.output) / 1_000_000
  );
}

// ── Anthropic client ────────────────────────────────────────

function getAnthropicClient(config: ModelConfig): Anthropic {
  return new Anthropic({
    apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
}

async function anthropicComplete(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const client = getAnthropicClient(config);
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    content,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(config.model, "anthropic", inputTokens, outputTokens),
  };
}

async function anthropicToolUse(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
): Promise<LLMToolResponse> {
  const client = getAnthropicClient(config);
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools,
  });

  const toolCalls: LLMToolCall[] = response.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ name: b.name, input: b.input as Record<string, unknown> }));

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    toolCalls,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(config.model, "anthropic", inputTokens, outputTokens),
  };
}

// ── OpenAI-compatible client ────────────────────────────────

function getOpenAIClient(config: ModelConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });
}

async function openaiComplete(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const client = getOpenAIClient(config);
  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  return {
    content,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(config.model, "openai", inputTokens, outputTokens),
  };
}

async function openaiToolUse(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
): Promise<LLMToolResponse> {
  const client = getOpenAIClient(config);

  // Convert Anthropic tool format to OpenAI function format
  const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    tools: openaiTools,
  });

  const toolCalls: LLMToolCall[] = (
    response.choices[0]?.message?.tool_calls ?? []
  ).map((tc) => ({
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
  }));

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  return {
    toolCalls,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(config.model, "openai", inputTokens, outputTokens),
  };
}

// ── Public API ──────────────────────────────────────────────

export async function complete(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  if (config.provider === "anthropic") {
    return anthropicComplete(config, systemPrompt, userMessage);
  }
  return openaiComplete(config, systemPrompt, userMessage);
}

export async function toolUse(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
): Promise<LLMToolResponse> {
  if (config.provider === "anthropic") {
    return anthropicToolUse(config, systemPrompt, userMessage, tools);
  }
  return openaiToolUse(config, systemPrompt, userMessage, tools);
}
