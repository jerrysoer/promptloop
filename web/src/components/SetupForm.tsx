"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ModelPicker } from "./ModelPicker";

const STEPS = ["Prompt", "Test Cases", "Strategy", "Settings"] as const;

const DEFAULT_CRITERIA =
  "Score the output 0-100 on relevance, accuracy, clarity, and completeness.";

const DEFAULT_STRATEGY_DOC = `# Optimization Strategy

Write your high-level strategy here to guide the optimizer.

## Goals
- What does a perfect output look like?

## Constraints
- What should the optimizer NEVER do?

## Hints
- What domain knowledge might help?`;

export function SetupForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [testCases, setTestCases] = useState("");
  const [strategyDoc, setStrategyDoc] = useState("");
  const [strategyExpanded, setStrategyExpanded] = useState(false);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [modelId, setModelId] = useState("claude-sonnet-4-5");
  const [maxIterations, setMaxIterations] = useState(25);
  const [maxCostUsd, setMaxCostUsd] = useState(5);
  const [dimensions, setDimensions] = useState<Array<{ name: string; weight: number; criteria: string }>>([]);
  const [isImageGen, setIsImageGen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaxModel = modelId.startsWith("max-");

  const canAdvance =
    step === 0
      ? prompt.trim().length > 0
      : step === 1
        ? testCases.trim().length > 0 && !suggesting
        : step === 3
          ? isMaxModel || apiKey.trim().length > 0
          : true; // Strategy (step 2) is always advanceable

  const handleSuggestCases = async () => {
    if (!prompt.trim()) return;
    setSuggesting(true);
    setError("");

    try {
      const res = await fetch("/api/suggest-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKey: apiKey.trim() || undefined }),
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setStrategyDoc(text);
      setStrategyExpanded(true);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = "";
  };

  // Weight validation
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const weightWarning =
    dimensions.length > 0 && Math.abs(totalWeight - 1) > 0.01;

  // Adaptive test case placeholder
  const testCasePlaceholder = isImageGen
    ? '[\n  { "id": "sunset", "input": "A photorealistic sunset over the ocean with dramatic clouds" }\n]'
    : '[\n  { "id": "example", "input": "..." }\n]';

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const parsed = JSON.parse(testCases);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Test cases must be a non-empty array");
      }

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
          strategyDoc: strategyDoc.trim() || undefined,
          dimensions: dimensions.length > 0 ? dimensions : undefined,
          apiKey: apiKey.trim() || undefined,
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
              placeholder={testCasePlaceholder}
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
          <p className="mt-2 text-xs text-text-muted">
            {isImageGen
              ? "Each test case describes the image to generate. The input is the image prompt."
              : 'For vision test cases, add an "images" array: { "id": "...", "input": "...", "images": ["https://..."] }'}
          </p>
        </div>
      )}

      {/* Step 3: Strategy (optional) */}
      {step === 2 && (
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl mb-2">
            Strategy Document
          </h2>
          <p className="text-text-muted text-sm mb-4">
            Optional. Guide the optimizer with high-level goals, constraints,
            and domain hints. This shapes how mutations are generated.
          </p>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStrategyExpanded(!strategyExpanded);
                if (!strategyExpanded && !strategyDoc.trim()) {
                  setStrategyDoc(DEFAULT_STRATEGY_DOC);
                }
              }}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-alt"
            >
              {strategyExpanded ? "Collapse" : "Add Strategy Document"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-alt"
            >
              Upload .md / .txt
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          {strategyExpanded && (
            <>
              <textarea
                value={strategyDoc}
                onChange={(e) => setStrategyDoc(e.target.value)}
                rows={10}
                placeholder="# Optimization Strategy..."
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm leading-relaxed focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none resize-y"
              />
              <div className="mt-3 border-l-2 border-accent/30 bg-surface-alt rounded-lg px-3 py-2.5 text-xs text-text-muted">
                <p className="font-medium text-text mb-1.5">Recommended approach</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Goals</strong>: Describe what a high-scoring output looks like in concrete terms — &quot;responds in under 50 words&quot; beats &quot;be concise&quot;</li>
                  <li><strong>Constraints</strong>: List hard rules the optimizer must never break (e.g. &quot;never use first person&quot;, &quot;always include a citation&quot;)</li>
                  <li><strong>Hints</strong>: Add domain knowledge the model might not have — acronyms, audience context, tone references</li>
                </ul>
                <p className="mt-2">Strategy docs improve results most when your prompt has domain-specific requirements. For generic prompts, skipping is fine.</p>
              </div>
            </>
          )}
          {!strategyExpanded && (
            <p className="text-xs text-text-muted italic">
              Skip this step to let the optimizer work without constraints.
            </p>
          )}
        </div>
      )}

      {/* Step 4: Settings */}
      {step === 3 && (
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl mb-6">
            Settings
          </h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Model
              </label>
              <ModelPicker value={modelId} onChange={setModelId} onModeChange={setIsImageGen} />
            </div>

            {!isMaxModel && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={modelId.startsWith("gpt-") || modelId.startsWith("dall-e") ? "sk-..." : "sk-ant-..."}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 pr-16 text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  Your key is sent per-request and never stored on disk or logged.
                </p>
              </div>
            )}

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
            <p className="text-xs text-text-muted mt-1.5">
              15-25 iterations is usually enough for convergence. Complex or long prompts may benefit from 40+. Most Sonnet runs cost $1-3; Opus runs ~3x more.
            </p>

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
              <p className="text-xs text-text-muted mt-1.5">
                Be specific. &quot;Score 0-100 on factual accuracy, citing sources&quot; outperforms &quot;score on quality&quot;. The judge model uses this text verbatim.
              </p>
            </div>

            {/* Scoring Dimensions (rubric mode) */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Scoring Dimensions
                  <span className="ml-1 text-xs text-text-muted font-normal">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setDimensions([...dimensions, { name: "", weight: 0.33, criteria: "" }])
                  }
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-alt"
                >
                  + Add Dimension
                </button>
              </div>
              {dimensions.length === 0 && (
                <p className="text-xs text-text-muted">
                  Add dimensions for multi-criteria scoring (e.g. accuracy 0.5, tone 0.3, format 0.2). Helps the optimizer target weak areas. Without dimensions, scoring uses a single 0-100 score.
                </p>
              )}
              {dimensions.map((dim, idx) => (
                <div key={idx} className="mt-2 flex gap-2 items-start">
                  <input
                    type="text"
                    value={dim.name}
                    onChange={(e) => {
                      const next = [...dimensions];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setDimensions(next);
                    }}
                    placeholder="Name"
                    className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <input
                    type="number"
                    value={dim.weight}
                    onChange={(e) => {
                      const next = [...dimensions];
                      next[idx] = { ...next[idx], weight: Number(e.target.value) };
                      setDimensions(next);
                    }}
                    step={0.05}
                    min={0}
                    max={1}
                    placeholder="Weight"
                    className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={dim.criteria}
                    onChange={(e) => {
                      const next = [...dimensions];
                      next[idx] = { ...next[idx], criteria: e.target.value };
                      setDimensions(next);
                    }}
                    placeholder="Criteria for this dimension"
                    className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDimensions(dimensions.filter((_, i) => i !== idx))}
                    className="rounded-lg px-1.5 py-1.5 text-xs text-text-muted hover:text-reverted"
                  >
                    ×
                  </button>
                </div>
              ))}
              {weightWarning && (
                <p className="mt-2 text-xs text-amber-600">
                  Weights sum to {totalWeight.toFixed(2)} — should sum to 1.0
                </p>
              )}
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
