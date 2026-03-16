"use client";

import { useEffect, useState } from "react";

interface RunHeaderProps {
  status: "connecting" | "running" | "completed" | "error" | "cancelled";
  currentIteration: number;
  maxIterations: number;
  totalCost: number;
  maxCostUsd: number;
  startedAt: number;
  consecutiveReverts: number;
  onCancel?: () => void;
}

export function RunHeader({
  status,
  currentIteration,
  maxIterations,
  totalCost,
  maxCostUsd,
  startedAt,
  consecutiveReverts,
  onCancel,
}: RunHeaderProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt === 0) return;

    const update = () =>
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));

    if (status === "running" || status === "connecting") {
      update();
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
    update();
    return undefined;
  }, [status, startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const statusStyles =
    status === "completed"
      ? "bg-kept-light text-kept"
      : status === "error"
        ? "bg-reverted-light text-reverted"
        : status === "cancelled"
          ? "bg-amber-100 text-amber-700"
          : "bg-accent-light text-accent";

  const statusLabel =
    status === "connecting"
      ? "Starting..."
      : status === "running"
        ? "Running"
        : status === "completed"
          ? "Completed"
          : status === "cancelled"
            ? "Cancelled"
            : "Error";

  // Cost projection
  const remainingIterations = maxIterations - currentIteration;
  const avgCostPerIteration =
    currentIteration > 0 ? totalCost / currentIteration : 0;
  const projectedRemaining = avgCostPerIteration * remainingIterations;
  const costPct = maxCostUsd > 0 ? (totalCost / maxCostUsd) * 100 : 0;
  const costWarning = costPct >= 80;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-6 rounded-2xl bg-surface border border-border p-4">
        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles}`}
        >
          {statusLabel}
        </span>
        <div className="text-sm text-text-muted">
          <span className="font-mono">{timeStr}</span>
        </div>
        <div className="text-sm text-text-muted">
          <span className="font-mono font-semibold text-text">
            {currentIteration}
          </span>
          <span className="mx-0.5">/</span>
          <span className="font-mono">{maxIterations}</span>
          <span className="ml-1">iters</span>
        </div>
        <div className={`text-sm ${costWarning ? "text-amber-600 font-semibold" : "text-text-muted"}`}>
          <span className={`font-mono ${costWarning ? "" : "font-semibold text-text"}`}>
            ${totalCost.toFixed(2)}
          </span>
          {maxCostUsd > 0 && (
            <span className="ml-0.5 font-mono">/ ${maxCostUsd.toFixed(2)}</span>
          )}
          <span className="ml-1">cost</span>
          {costWarning && <span className="ml-1 text-xs">(budget warning)</span>}
        </div>
        {status === "running" && onCancel && (
          <button
            onClick={onCancel}
            className="ml-auto rounded-xl border border-reverted/30 bg-reverted-light px-3 py-1.5 text-sm font-medium text-reverted hover:bg-reverted/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Secondary info row */}
      {(status === "running" && (consecutiveReverts >= 2 || projectedRemaining > 0)) && (
        <div className="flex items-center gap-4 px-4 text-xs text-text-muted">
          {consecutiveReverts >= 2 && (
            <span className="text-amber-600">
              {consecutiveReverts} consecutive reverts
            </span>
          )}
          {status === "running" && projectedRemaining > 0 && (
            <span>
              Est. remaining: ${projectedRemaining.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
