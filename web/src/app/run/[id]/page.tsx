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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run {id}</h1>
          {status === "completed" && report && (
            <p className="mt-1 text-sm text-muted">
              {report.baselineScore} &rarr; {report.finalScore} (+
              {report.improvement} points) in {report.iterations} iterations
            </p>
          )}
        </div>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-muted hover:bg-gray-50"
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

      {/* Chart */}
      <ChartPanel runId={id} iterationCount={iterations.length} />

      {/* Iteration log */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Iteration Log</h2>
        <IterationLog iterations={iterations} />
      </div>

      {/* Summary stats (on completion) */}
      {status === "completed" && report && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Baseline" value={`${report.baselineScore}`} />
          <StatCard label="Best Score" value={`${report.finalScore}`} />
          <StatCard label="Improvement" value={`+${report.improvement}`} />
          <StatCard
            label="Total Cost"
            value={`$${report.totalCostUsd.toFixed(2)}`}
          />
        </div>
      )}

      {/* Prompt diff (on completion) */}
      {status === "completed" && optimizedPrompt && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Optimized Prompt</h2>
          <PromptDiff
            original={originalPrompt}
            optimized={optimizedPrompt}
          />
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Run failed. Check the server logs for details.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-card px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold font-mono">{value}</div>
    </div>
  );
}
