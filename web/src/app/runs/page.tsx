"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RunSummary {
  id: string;
  startedAt: number;
  status: "running" | "completed" | "error" | "cancelled";
  baselineScore?: number;
  finalScore?: number;
  totalCostUsd?: number;
  iterations?: number;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((data: RunSummary[]) => {
        setRuns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s: RunSummary["status"]) =>
    s === "completed"
      ? "text-kept"
      : s === "running"
        ? "text-accent"
        : s === "cancelled"
          ? "text-amber-600"
          : "text-reverted";

  const statusLabel = (s: RunSummary["status"]) =>
    s === "completed"
      ? "Completed"
      : s === "running"
        ? "Running"
        : s === "cancelled"
          ? "Cancelled"
          : "Error";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl sm:text-4xl">Runs</h1>
        <Link
          href="/"
          className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-alt transition-colors"
        >
          New Run
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-muted mb-4">No runs yet</p>
          <Link
            href="/"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Start your first run
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/run/${run.id}`}
              className="block rounded-2xl border border-border bg-surface p-4 hover:bg-surface-alt transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">
                      {run.id}
                    </span>
                    <span
                      className={`text-xs font-medium ${statusColor(run.status)}`}
                    >
                      {statusLabel(run.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {new Date(run.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {run.iterations != null && (
                      <span className="ml-3">
                        {run.iterations} iterations
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right shrink-0">
                  {run.baselineScore != null && run.finalScore != null && (
                    <div className="text-sm">
                      <span className="text-text-muted">
                        {run.baselineScore}
                      </span>
                      <span className="mx-1 text-text-muted">&rarr;</span>
                      <span className="font-semibold">{run.finalScore}</span>
                      {run.finalScore > run.baselineScore && (
                        <span className="ml-1 text-kept text-xs font-medium">
                          +{(run.finalScore - run.baselineScore).toFixed(0)}
                        </span>
                      )}
                    </div>
                  )}
                  {run.totalCostUsd != null && (
                    <div className="text-sm font-mono text-text-muted">
                      ${run.totalCostUsd.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
