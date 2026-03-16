"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRunStream } from "@/hooks/useRunStream";
import { RunHeader } from "@/components/RunHeader";
import { ChartPanel } from "@/components/ChartPanel";
import { IterationLog } from "@/components/IterationLog";
import { PromptDiff } from "@/components/PromptDiff";

export default function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    iterations,
    status,
    maxIterations,
    maxCostUsd,
    startedAt,
    report,
    originalPrompt,
    optimizedPrompt,
    error,
  } = useRunStream(id);

  const [showOriginalPrompt, setShowOriginalPrompt] = useState(false);

  const currentIteration =
    iterations.length > 0 ? iterations[iterations.length - 1].iteration : 0;
  const totalCost = iterations.reduce((sum, i) => sum + i.costUsd, 0);

  // Compute consecutive reverts from iterations
  let consecutiveReverts = 0;
  for (let i = iterations.length - 1; i > 0; i--) {
    if (!iterations[i].kept) {
      consecutiveReverts++;
    } else {
      break;
    }
  }

  const handleCancel = useCallback(async () => {
    try {
      await fetch(`/api/run/${id}/cancel`, { method: "POST" });
    } catch {
      // Cancel request failed, ignore
    }
  }, [id]);

  const isDone = status === "completed" || status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">
            Run {id}
          </h1>
          {isDone && report && (
            <p className="mt-2 text-sm text-text-muted">
              {report.baselineScore} &rarr; {report.finalScore}
              {" "}
              <span className="text-kept font-medium">
                (+{report.improvement})
              </span>
              {" "}in {report.iterations} iterations
              {report.stopReason && report.stopReason !== "completed" && (
                <span className="ml-2 text-amber-600">
                  (stopped: {report.stopReason})
                </span>
              )}
            </p>
          )}
        </div>
        <Link
          href="/"
          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt"
        >
          New Run
        </Link>
      </div>

      {/* Status bar */}
      <RunHeader
        status={status}
        currentIteration={currentIteration}
        maxIterations={maxIterations}
        totalCost={totalCost}
        maxCostUsd={maxCostUsd}
        startedAt={startedAt}
        consecutiveReverts={consecutiveReverts}
        onCancel={handleCancel}
      />

      {/* Original prompt toggle */}
      {originalPrompt && (
        <div>
          <button
            onClick={() => setShowOriginalPrompt(!showOriginalPrompt)}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            {showOriginalPrompt ? "Hide" : "Show"} original prompt
          </button>
          {showOriginalPrompt && (
            <pre className="mt-2 rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {originalPrompt}
            </pre>
          )}
        </div>
      )}

      {/* Chart — hero element */}
      <ChartPanel runId={id} iterationCount={iterations.length} />

      {/* Summary stats (on completion or cancel) */}
      {isDone && report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Baseline" value={`${report.baselineScore}`} />
          <StatCard label="Best Score" value={`${report.finalScore}`} />
          <StatCard
            label="Improvement"
            value={`+${report.improvement}`}
            highlight
          />
          <StatCard
            label="Total Cost"
            value={`$${report.totalCostUsd.toFixed(2)}`}
          />
        </div>
      )}

      {/* Iteration log */}
      <div>
        <h2 className="font-heading text-xl sm:text-2xl mb-4">
          Iteration Log
        </h2>
        <IterationLog iterations={iterations} />
      </div>

      {/* Prompt diff (on completion or cancel) */}
      {isDone && optimizedPrompt && (
        <PromptDiff original={originalPrompt} optimized={optimizedPrompt} />
      )}

      {/* Error state */}
      {status === "error" && error && (
        <div className="rounded-2xl bg-reverted-light px-5 py-4 text-sm text-reverted">
          <p className="font-medium mb-1">Run failed</p>
          <p className="text-xs opacity-80 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-heading text-2xl ${highlight ? "text-kept" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
