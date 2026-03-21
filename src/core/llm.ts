import { spawn } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  LLMResponse,
  LLMToolCall,
  LLMToolResponse,
  ModelConfig,
} from "./types.js";

// ── Cost tables (per 1M tokens) ─────────────────────────────

export const ANTHROPIC_COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};

export const OPENAI_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};

export function estimateCost(
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
  images?: string[],
): Promise<LLMResponse> {
  const client = getAnthropicClient(config);

  // Build content blocks — text + optional images
  const contentBlocks: Anthropic.ContentBlockParam[] = [];
  if (images?.length) {
    for (const img of images) {
      if (img.startsWith("data:") || img.startsWith("/9j/") || img.startsWith("iVBOR")) {
        // Base64 image
        const base64 = img.startsWith("data:") ? img.split(",")[1] : img;
        const mediaType = img.startsWith("data:")
          ? (img.split(";")[0].split(":")[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
          : "image/jpeg";
        contentBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        });
      } else {
        // URL image
        contentBlocks.push({
          type: "image",
          source: { type: "url", url: img },
        });
      }
    }
  }
  contentBlocks.push({ type: "text", text: userMessage });

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: contentBlocks }],
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
  images?: string[],
): Promise<LLMResponse> {
  const client = getOpenAIClient(config);

  // Build messages — with or without images
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (images?.length) {
    const parts: OpenAI.ChatCompletionContentPart[] = [];
    for (const img of images) {
      const url = img.startsWith("data:") || img.startsWith("http")
        ? img
        : `data:image/jpeg;base64,${img}`;
      parts.push({ type: "image_url", image_url: { url } });
    }
    parts.push({ type: "text", text: userMessage });
    messages.push({ role: "user", content: parts });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
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

// ── Claude CLI provider ─────────────────────────────────────

function runCLI(args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new Error(
            "Claude CLI not found. Install Claude Code or use an API provider.",
          ),
        );
      } else {
        reject(err);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        const detail = stderr || stdout || "(no output)";
        reject(new Error(`Claude CLI exited with code ${code}: ${detail}`));
      } else {
        resolve(stdout);
      }
    });

    proc.stdin.write(stdin);
    proc.stdin.end();
  });
}

export interface CLIResponse {
  result: string;
  usage: { input_tokens: number; output_tokens: number };
  total_cost_usd: number;
}

export interface CLIStructuredResponse extends CLIResponse {
  structured_output?: Record<string, unknown>;
}

async function cliComplete(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const args = [
    "--print",
    "--system-prompt",
    systemPrompt,
    "--output-format",
    "json",
    "--tools",
    "",
    "--model",
    config.model,
  ];

  const raw = await runCLI(args, userMessage);
  const json = JSON.parse(raw) as CLIResponse;
  return parseCompleteResponse(json);
}

/** Converts Anthropic Tool[] into a single JSON schema for --json-schema. Exported for testing. */
export function buildToolSchema(tools: Anthropic.Tool[]): {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
} {
  const strategyEnum = tools.map((t) => t.name);
  const properties: Record<string, unknown> = {
    strategy: { type: "string", enum: strategyEnum },
  };
  const required = ["strategy"];

  const firstSchema = tools[0]?.input_schema as
    | { properties?: Record<string, unknown>; required?: string[] }
    | undefined;
  if (firstSchema?.properties) {
    for (const [key, val] of Object.entries(firstSchema.properties)) {
      properties[key] = val;
    }
  }
  if (firstSchema?.required) {
    required.push(...firstSchema.required);
  }

  return { type: "object", properties, required };
}

/** Parses CLI structured_output into LLMToolResponse shape. Exported for testing. */
export function parseToolResponse(json: CLIStructuredResponse): LLMToolResponse {
  if (!json.structured_output) {
    throw new Error(
      `Claude CLI did not return structured_output. Raw result: ${json.result}`,
    );
  }

  const { strategy, ...inputFields } = json.structured_output as {
    strategy: string;
    [key: string]: unknown;
  };

  return {
    toolCalls: [{ name: strategy, input: inputFields as Record<string, unknown> }],
    inputTokens: json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
    costUsd: json.total_cost_usd,
  };
}

/** Parses CLI JSON response into LLMResponse shape. Exported for testing. */
export function parseCompleteResponse(json: CLIResponse): LLMResponse {
  return {
    content: json.result,
    inputTokens: json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
    costUsd: json.total_cost_usd,
  };
}

async function cliToolUse(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
): Promise<LLMToolResponse> {
  const schema = buildToolSchema(tools);
  const jsonSchema = JSON.stringify(schema);

  const args = [
    "--print",
    "--system-prompt",
    systemPrompt,
    "--output-format",
    "json",
    "--tools",
    "",
    "--json-schema",
    jsonSchema,
    "--model",
    config.model,
  ];

  const raw = await runCLI(args, userMessage);
  const json = JSON.parse(raw) as CLIStructuredResponse;
  return parseToolResponse(json);
}

// ── Image Generation Provider ───────────────────────────────

const IMAGE_GEN_COSTS: Record<string, number> = {
  "dall-e-3": 0.04, // per image (1024x1024)
  "dall-e-2": 0.02,
};

async function imageGenComplete(
  config: ModelConfig,
  _systemPrompt: string,
  userMessage: string,
): Promise<LLMResponse> {
  const client = getOpenAIClient(config);
  const model = config.model || "dall-e-3";

  const response = await client.images.generate({
    model,
    prompt: userMessage,
    n: 1,
    size: "1024x1024",
    response_format: "url",
  });

  const imageUrl = response.data?.[0]?.url ?? "";
  const costPerImage = IMAGE_GEN_COSTS[model] ?? 0.04;

  return {
    content: "",
    imageUrl,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: costPerImage,
  };
}

// ── Public API ──────────────────────────────────────────────

export async function complete(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  images?: string[],
): Promise<LLMResponse> {
  if (config.provider === "image-gen") {
    return imageGenComplete(config, systemPrompt, userMessage);
  }
  if (config.provider === "claude-cli") {
    return cliComplete(config, systemPrompt, userMessage);
  }
  if (config.provider === "anthropic") {
    return anthropicComplete(config, systemPrompt, userMessage, images);
  }
  return openaiComplete(config, systemPrompt, userMessage, images);
}

export async function toolUse(
  config: ModelConfig,
  systemPrompt: string,
  userMessage: string,
  tools: Anthropic.Tool[],
): Promise<LLMToolResponse> {
  if (config.provider === "claude-cli") {
    return cliToolUse(config, systemPrompt, userMessage, tools);
  }
  if (config.provider === "anthropic") {
    return anthropicToolUse(config, systemPrompt, userMessage, tools);
  }
  return openaiToolUse(config, systemPrompt, userMessage, tools);
}
