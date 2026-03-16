"use client";

import { useState, useMemo } from "react";
import { MODELS } from "@/lib/models";

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
}

type ProviderMode = "max" | "api";

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const currentModel = MODELS.find((m) => m.id === value);
  const [mode, setMode] = useState<ProviderMode>(
    currentModel?.provider === "claude-cli" ? "max" : "api",
  );

  const filteredModels = useMemo(
    () =>
      MODELS.filter((m) =>
        mode === "max"
          ? m.provider === "claude-cli"
          : m.provider !== "claude-cli",
      ),
    [mode],
  );

  const handleModeSwitch = (newMode: ProviderMode) => {
    setMode(newMode);
    // Select first model in the new group
    const first = MODELS.find((m) =>
      newMode === "max"
        ? m.provider === "claude-cli"
        : m.provider !== "claude-cli",
    );
    if (first) onChange(first.id);
  };

  return (
    <div className="space-y-3">
      {/* Provider toggle */}
      <div className="flex rounded-xl border border-border bg-surface-alt p-1">
        <button
          type="button"
          onClick={() => handleModeSwitch("max")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            mode === "max"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Claude Max
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("api")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            mode === "api"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          API Key
        </button>
      </div>

      {/* Subtitle hint */}
      <p className="text-xs text-text-muted">
        {mode === "max"
          ? "Uses your Claude Max subscription \u2014 no API key needed"
          : "Requires ANTHROPIC_API_KEY or OPENAI_API_KEY"}
      </p>

      {/* Model select */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      >
        {filteredModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
