"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelPicker } from "./ModelPicker";

const STEPS = ["Prompt", "Test Cases", "Settings"] as const;

const DEFAULT_CRITERIA =
  "Score the output 0-100 on relevance, accuracy, clarity, and completeness.";

export function SetupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [testCases, setTestCases] = useState("");
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [modelId, setModelId] = useState("claude-sonnet-4-5");
  const [maxIterations, setMaxIterations] = useState(25);
  const [maxCostUsd, setMaxCostUsd] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  const canAdvance =
    step === 0
      ? prompt.trim().length > 0
      : step === 1
        ? testCases.trim().length > 0 && !suggesting
        : true;

  const handleSuggestCases = async () => {
    if (!prompt.trim()) return;
    setSuggesting(true);
    setError("");

    try {
      const res = await fetch("/api/suggest-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      setTestCases(JSON.stringify(data.cases, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const parsed = JSON.parse(testCases);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Test cases must be a non-empty array");
      }

      const isMaxModel = modelId.startsWith("max-");
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          testCases: parsed,
          scoringCriteria: criteria,
          modelId,
          maxIterations,
          maxCostUsd: isMaxModel ? 999 : maxCostUsd,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start run");
      }

      router.push(`/run/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === STEPS.length - 1) {
      handleSubmit();
      return;
    }

    const nextStep = step + 1;
    setStep(nextStep);

    // Auto-generate test cases when entering step 2 with empty cases
    if (nextStep === 1 && !testCases.trim() && prompt.trim()) {
      handleSuggestCases();
    }
  };

  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="mx-auto max-w-xl">
      {/* Step indicators */}
      <div className="mb-10 flex items-center justify-center gap-2 sm:gap-3">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => (i < step ? setStep(i) : undefined)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-accent text-white"
                  : i < step
                    ? "bg-accent-light text-accent cursor-pointer"
                    : "bg-surface-alt text-text-muted"
              }`}
            >
              {i + 1}
            </button>
            <span
              className={`hidden text-sm sm:block ${
                i === step
                  ? "font-semibold text-text"
                  : "text-text-muted"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 ${
                  i < step ? "bg-accent" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Prompt */}
      {step === 0 && (
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl mb-2">
            What prompt do you want to optimize?
          </h2>
          <p className="text-text-muted text-sm mb-6">
            Paste your system prompt below. PromptLoop will iteratively
            mutate it to maximize scores on your test cases.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="You are a helpful assistant that..."
            rows={10}
            autoFocus
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none resize-y"
          />
        </div>
      )}

      {/* Step 2: Test Cases */}
      {step === 1 && (
        <div>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl mb-2">
                Test cases
              </h2>
              <p className="text-text-muted text-sm">
                Sample inputs to evaluate your prompt against. Edit these
                to match your real use cases.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSuggestCases}
              disabled={suggesting || !prompt.trim()}
              className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {suggesting ? "Generating..." : "Regenerate"}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={testCases}
              onChange={(e) => setTestCases(e.target.value)}
              rows={12}
              disabled={suggesting}
              placeholder={'[\n  { "id": "example", "input": "..." }\n]'}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none resize-y disabled:opacity-50"
            />
            {suggesting && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-sm text-text-muted">
                    Generating test cases from your prompt...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 2 && (
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl mb-6">
            Settings
          </h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Model
              </label>
              <ModelPicker value={modelId} onChange={setModelId} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Iterations
                </label>
                <input
                  type="number"
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Max Cost (USD)
                </label>
                {modelId.startsWith("max-") ? (
                  <div className="flex h-[42px] items-center rounded-xl border border-border bg-surface-alt px-4 text-sm text-text-muted">
                    Covered by Claude Max plan
                  </div>
                ) : (
                  <input
                    type="number"
                    value={maxCostUsd}
                    onChange={(e) => setMaxCostUsd(Number(e.target.value))}
                    min={0.1}
                    max={100}
                    step={0.01}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Scoring Criteria
              </label>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none resize-y"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl bg-reverted-light px-4 py-3 text-sm text-reverted">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-medium text-text-muted hover:bg-surface-alt"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance || submitting}
          className="flex-1 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step === STEPS.length - 1
            ? submitting
              ? "Starting..."
              : "Start Optimization"
            : "Continue"}
        </button>
      </div>
    </div>
  );
}
