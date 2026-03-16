"use client";

import { useEffect, useState } from "react";

interface RunHeaderProps {
  status: "connecting" | "running" | "completed" | "error";
  currentIteration: number;
  maxIterations: number;
  totalCost: number;
  startedAt: number;
}

export function RunHeader({
  status,
  currentIteration,
  maxIterations,
  totalCost,
  startedAt,
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
        : "bg-accent-light text-accent";

  const statusLabel =
    status === "connecting"
      ? "Starting..."
      : status === "running"
        ? "Running"
        : status === "completed"
          ? "Completed"
          : "Error";

  return (
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
      <div className="text-sm text-text-muted">
        <span className="font-mono font-semibold text-text">
          ${totalCost.toFixed(2)}
        </span>
        <span className="ml-1">cost</span>
      </div>
    </div>
  );
}
