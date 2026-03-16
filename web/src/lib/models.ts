export interface ModelOption {
  id: string;
  label: string;
  provider: "anthropic" | "openai";
  model: string;
}

export const MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    provider: "anthropic",
    model: "claude-opus-4-6",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    model: "gpt-4o",
  },
];
