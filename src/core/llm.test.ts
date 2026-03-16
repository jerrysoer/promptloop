import { describe, it, expect } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import {
  buildToolSchema,
  parseCompleteResponse,
  parseToolResponse,
  type CLIResponse,
  type CLIStructuredResponse,
} from "./llm.js";

// ── Factory helpers ────────────────────────────────────────

function makeTool(
  name: string,
  overrides: Partial<{
    description: string;
    properties: Record<string, unknown>;
    required: string[];
  }> = {},
): Anthropic.Tool {
  return {
    name,
    description: overrides.description ?? `${name} mutation`,
    input_schema: {
      type: "object" as const,
      properties: overrides.properties ?? {
        description: { type: "string", description: "What changed" },
        new_prompt: { type: "string", description: "Full prompt" },
      },
      required: overrides.required ?? ["description", "new_prompt"],
    },
  };
}

function makeCLIResponse(
  overrides: Partial<CLIResponse> = {},
): CLIResponse {
  return {
    result: "Hello world",
    usage: { input_tokens: 100, output_tokens: 50 },
    total_cost_usd: 0.0025,
    ...overrides,
  };
}

function makeStructuredResponse(
  overrides: Partial<CLIStructuredResponse> = {},
): CLIStructuredResponse {
  return {
    result: "",
    usage: { input_tokens: 200, output_tokens: 100 },
    total_cost_usd: 0.005,
    structured_output: {
      strategy: "sharpen",
      description: "Tightened the intro",
      new_prompt: "You are a precise assistant...",
    },
    ...overrides,
  };
}

// ── buildToolSchema ────────────────────────────────────────

describe("buildToolSchema", () => {
  it("maps tool names to strategy enum values", () => {
    const tools = [makeTool("sharpen"), makeTool("add_example"), makeTool("remove")];
    const schema = buildToolSchema(tools);

    expect(schema.properties.strategy).toEqual({
      type: "string",
      enum: ["sharpen", "add_example", "remove"],
    });
  });

  it("merges input_schema properties from first tool", () => {
    const tools = [makeTool("sharpen"), makeTool("expand")];
    const schema = buildToolSchema(tools);

    expect(schema.properties).toHaveProperty("description");
    expect(schema.properties).toHaveProperty("new_prompt");
    expect(schema.properties.description).toEqual({
      type: "string",
      description: "What changed",
    });
  });

  it("includes strategy and input_schema fields in required", () => {
    const tools = [makeTool("sharpen")];
    const schema = buildToolSchema(tools);

    expect(schema.required).toContain("strategy");
    expect(schema.required).toContain("description");
    expect(schema.required).toContain("new_prompt");
  });

  it("handles all six mutation strategies", () => {
    const names = ["sharpen", "add_example", "remove", "restructure", "constrain", "expand"];
    const tools = names.map((n) => makeTool(n));
    const schema = buildToolSchema(tools);

    const strategyProp = schema.properties.strategy as { enum: string[] };
    expect(strategyProp.enum).toEqual(names);
  });

  it("handles tools with no input_schema properties", () => {
    const tool = makeTool("minimal", { properties: undefined, required: undefined });
    // Override to simulate a tool with bare input_schema
    (tool.input_schema as Record<string, unknown>).properties = undefined;
    (tool.input_schema as Record<string, unknown>).required = undefined;

    const schema = buildToolSchema([tool]);

    // Should still have strategy
    expect(schema.properties.strategy).toBeDefined();
    // No extra properties merged
    expect(Object.keys(schema.properties)).toEqual(["strategy"]);
    expect(schema.required).toEqual(["strategy"]);
  });

  it("produces a valid JSON-serializable schema", () => {
    const tools = [makeTool("sharpen"), makeTool("expand")];
    const schema = buildToolSchema(tools);

    // Should round-trip through JSON without loss
    const serialized = JSON.parse(JSON.stringify(schema));
    expect(serialized).toEqual(schema);
    expect(serialized.type).toBe("object");
  });
});

// ── parseCompleteResponse ──────────────────────────────────

describe("parseCompleteResponse", () => {
  it("maps CLI fields to LLMResponse shape", () => {
    const response = parseCompleteResponse(makeCLIResponse({
      result: "The answer is 42",
      usage: { input_tokens: 150, output_tokens: 75 },
      total_cost_usd: 0.003,
    }));

    expect(response.content).toBe("The answer is 42");
    expect(response.inputTokens).toBe(150);
    expect(response.outputTokens).toBe(75);
    expect(response.costUsd).toBe(0.003);
  });

  it("preserves zero-cost responses", () => {
    const response = parseCompleteResponse(makeCLIResponse({
      total_cost_usd: 0,
    }));

    expect(response.costUsd).toBe(0);
  });

  it("handles empty result string", () => {
    const response = parseCompleteResponse(makeCLIResponse({ result: "" }));

    expect(response.content).toBe("");
  });
});

// ── parseToolResponse ──────────────────────────────────────

describe("parseToolResponse", () => {
  it("maps structured_output to LLMToolCall", () => {
    const response = parseToolResponse(makeStructuredResponse());

    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].name).toBe("sharpen");
    expect(response.toolCalls[0].input).toEqual({
      description: "Tightened the intro",
      new_prompt: "You are a precise assistant...",
    });
  });

  it("maps usage and cost from response", () => {
    const response = parseToolResponse(makeStructuredResponse({
      usage: { input_tokens: 500, output_tokens: 200 },
      total_cost_usd: 0.012,
    }));

    expect(response.inputTokens).toBe(500);
    expect(response.outputTokens).toBe(200);
    expect(response.costUsd).toBe(0.012);
  });

  it("throws when structured_output is missing", () => {
    const json = makeStructuredResponse({ structured_output: undefined });

    expect(() => parseToolResponse(json)).toThrow(
      /did not return structured_output/,
    );
  });

  it("includes raw result in error when structured_output is missing", () => {
    const json = makeStructuredResponse({
      structured_output: undefined,
      result: "I could not parse that",
    });

    expect(() => parseToolResponse(json)).toThrow(
      "I could not parse that",
    );
  });

  it("separates strategy from input fields", () => {
    const response = parseToolResponse(makeStructuredResponse({
      structured_output: {
        strategy: "add_example",
        description: "Added a greeting example",
        new_prompt: "Be friendly. Example: Hello!",
      },
    }));

    // strategy becomes the tool call name, not part of input
    expect(response.toolCalls[0].name).toBe("add_example");
    expect(response.toolCalls[0].input).not.toHaveProperty("strategy");
    expect(response.toolCalls[0].input).toHaveProperty("description");
    expect(response.toolCalls[0].input).toHaveProperty("new_prompt");
  });
});
