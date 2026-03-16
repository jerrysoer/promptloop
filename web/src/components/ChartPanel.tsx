"use client";

/* eslint-disable @next/next/no-img-element */

interface ChartPanelProps {
  runId: string;
  iterationCount: number;
}

export function ChartPanel({ runId, iterationCount }: ChartPanelProps) {
  if (iterationCount === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-surface text-sm text-text-muted">
        Chart will appear after baseline...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0d1117]">
      <img
        src={`/api/run/${runId}/svg?v=${iterationCount}`}
        alt="Optimization progress chart"
        className="w-full"
      />
    </div>
  );
}
