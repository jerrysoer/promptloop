"use client";

/* eslint-disable @next/next/no-img-element */

interface ChartPanelProps {
  runId: string;
  iterationCount: number;
}

export function ChartPanel({ runId, iterationCount }: ChartPanelProps) {
  if (iterationCount === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-card text-sm text-muted">
        Chart will appear after baseline...
      </div>
    );
  }

  // Use <img> to render SVG safely (no script execution possible)
  // Cache-bust with iterationCount so it re-fetches after each iteration
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <img
        src={`/api/run/${runId}/svg?v=${iterationCount}`}
        alt="Optimization progress chart"
        className="w-full"
      />
    </div>
  );
}
