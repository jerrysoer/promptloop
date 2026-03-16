"use client";

import { use } from "react";
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
    startedAt,
    report,
    originalPrompt,
    optimizedPrompt,
  } = useRunStream(id);

  const currentIteration =
    iterations.length > 0 ? iterations[iterations.length - 1].iteration : 0;
  const totalCost = iterations.reduce((sum, i) => sum + i.costUsd, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl">
            Run {id}
          </h1>
          {status === "completed" && report && (
            <p className="mt-2 text-sm text-text-muted">
              {report.baselineScore} &rarr; {report.finalScore}
              {" "}
              <span className="text-kept font-medium">
                (+{report.improvement})
              </span>
              {" "}in {report.iterations} iterations
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
        startedAt={startedAt}
      />

      {/* Chart — hero element */}
      <ChartPanel runId={id} iterationCount={iterations.length} />

      {/* Summary stats (on completion) */}
      {status === "completed" && report && (
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

      {/* Prompt diff (on completion) */}
      {status === "completed" && optimizedPrompt && (
        <PromptDiff original={originalPrompt} optimized={optimizedPrompt} />
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-2xl bg-reverted-light px-5 py-4 text-sm text-reverted">
          Run failed. Check the server logs for details.
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
