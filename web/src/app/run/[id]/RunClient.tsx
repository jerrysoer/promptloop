"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRunStream } from "@/hooks/useRunStream";
import { RunHeader } from "@/components/RunHeader";
import { ChartPanel } from "@/components/ChartPanel";
import { IterationLog } from "@/components/IterationLog";
import { PromptDiff } from "@/components/PromptDiff";
import { ShareButton } from "@/components/ShareButton";

export default function RunClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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
    hasStrategy,
  } = useRunStream(id);

  const [showOriginalPrompt, setShowOriginalPrompt] = useState(false);
  const [continuing, setContinuing] = useState(false);

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
  const canContinue = isDone || (report?.stopReason === "plateau");

  const handleContinue = useCallback(async () => {
    setContinuing(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: optimizedPrompt || originalPrompt,
          testCases: [], // Will be loaded from the previous run
          scoringCriteria: "",
          modelId: "",
          maxIterations: maxIterations,
          maxCostUsd: maxCostUsd,
          resumeFromRunId: id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/run/${data.runId}`);
      }
    } catch {
      setContinuing(false);
    }
  }, [id, optimizedPrompt, originalPrompt, maxIterations, maxCostUsd, router]);

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
        <div className="flex gap-2">
          {isDone && report && (
            <>
              <ShareButton runId={id} report={report} />
              <button
                onClick={() => window.open(`/api/run/${id}/export`)}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt"
              >
                Export
              </button>
            </>
          )}
          {canContinue && (
            <button
              onClick={handleContinue}
              disabled={continuing}
              className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              {continuing ? "Starting..." : "Continue Run"}
            </button>
          )}
          <Link
            href="/"
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-alt"
          >
            New Run
          </Link>
        </div>
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

      {/* Strategy badge */}
      {hasStrategy && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Strategy doc active
          </span>
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

      {/* Strategy stats (on completion) */}
      {isDone && report?.strategyStats && Object.keys(report.strategyStats).length > 0 && (
        <div>
          <h2 className="font-heading text-xl sm:text-2xl mb-4">
            Mutation Strategy Performance
          </h2>
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5">Strategy</th>
                  <th className="px-4 py-2.5 text-right">Attempts</th>
                  <th className="px-4 py-2.5 text-right">Kept</th>
                  <th className="px-4 py-2.5 text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.strategyStats)
                  .sort(([, a], [, b]) => {
                    const rateA = a.attempts > 0 ? a.kept / a.attempts : 0;
                    const rateB = b.attempts > 0 ? b.kept / b.attempts : 0;
                    return rateB - rateA;
                  })
                  .map(([strategy, stats], idx) => {
                    const rate = stats.attempts > 0 ? (stats.kept / stats.attempts) * 100 : 0;
                    const isTop = idx === 0 && stats.kept > 0;
                    return (
                      <tr key={strategy} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-mono">
                          {strategy}
                          {isTop && (
                            <span className="ml-2 text-xs text-kept font-medium">best</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-text-muted">{stats.attempts}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-text-muted">{stats.kept}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-mono font-medium ${rate >= 50 ? "text-kept" : rate >= 25 ? "text-amber-600" : "text-text-muted"}`}>
                            {rate.toFixed(0)}%
                          </span>
                          <div className="mt-1 h-1 w-full rounded-full bg-surface-alt">
                            <div
                              className={`h-1 rounded-full ${rate >= 50 ? "bg-kept" : rate >= 25 ? "bg-amber-400" : "bg-text-muted/30"}`}
                              style={{ width: `${Math.max(rate, 2)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
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
