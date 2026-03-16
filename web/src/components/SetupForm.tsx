"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModelPicker } from "./ModelPicker";

const EMPTY_TEST_CASES = "";

const DEFAULT_CRITERIA =
  "Score the output 0-100 on relevance, accuracy, clarity, and completeness.";

export function SetupForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [testCases, setTestCases] = useState(EMPTY_TEST_CASES);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [modelId, setModelId] = useState("claude-sonnet-4-5");
  const [maxIterations, setMaxIterations] = useState(25);
  const [maxCostUsd, setMaxCostUsd] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

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

      const { cases } = data;
      setTestCases(JSON.stringify(cases, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          maxCostUsd,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start run");
      }

      const { runId } = await res.json();
      router.push(`/run/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt */}
      <section>
        <label className="mb-1.5 block text-sm font-semibold">Prompt</label>
        <p className="mb-2 text-xs text-muted">
          The system prompt to optimize. PromptLoop will iteratively mutate
          this to improve scores on your test cases.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="You are a helpful assistant that..."
          rows={8}
          required
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </section>

      {/* Test Cases */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold">Test Cases</label>
            <p className="mt-0.5 text-xs text-muted">
              Inputs your prompt will be tested against. More diverse = better
              generalization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSuggestCases}
            disabled={suggesting || !prompt.trim()}
            className="shrink-0 rounded-lg border border-accent bg-white px-3 py-1.5 text-xs font-semibold text-accent hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {suggesting ? "Generating..." : "Generate from prompt"}
          </button>
        </div>
        <textarea
          value={testCases}
          onChange={(e) => setTestCases(e.target.value)}
          rows={8}
          required
          placeholder={'[\n  { "id": "example", "input": "A sample user message..." }\n]'}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </section>

      {/* Scoring Criteria */}
      <section>
        <label className="mb-1.5 block text-sm font-semibold">
          Scoring Criteria
        </label>
        <textarea
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </section>

      {/* Model + Budget row */}
      <div className="grid grid-cols-3 gap-4">
        <section>
          <label className="mb-1.5 block text-sm font-semibold">Model</label>
          <ModelPicker value={modelId} onChange={setModelId} />
        </section>

        <section>
          <label className="mb-1.5 block text-sm font-semibold">
            Iterations
          </label>
          <input
            type="number"
            value={maxIterations}
            onChange={(e) => setMaxIterations(Number(e.target.value))}
            min={1}
            max={100}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </section>

        <section>
          <label className="mb-1.5 block text-sm font-semibold">
            Max Cost (USD)
          </label>
          <input
            type="number"
            value={maxCostUsd}
            onChange={(e) => setMaxCostUsd(Number(e.target.value))}
            min={0.1}
            max={100}
            step={0.01}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </section>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !prompt.trim()}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Starting..." : "Start Optimization"}
      </button>
    </form>
  );
}
