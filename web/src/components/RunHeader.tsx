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
    // Freeze elapsed on completion/error
    update();
    return undefined;
  }, [status, startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const statusColor =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "error"
        ? "bg-red-100 text-red-700"
        : "bg-blue-100 text-blue-700";

  const statusLabel =
    status === "connecting"
      ? "Starting..."
      : status === "running"
        ? "Running"
        : status === "completed"
          ? "Completed"
          : "Error";

  return (
    <div className="flex items-center gap-6 rounded-lg bg-card p-4">
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColor}`}
      >
        {statusLabel}
      </span>
      <div className="text-sm text-muted">
        <span className="font-mono">{timeStr}</span> elapsed
      </div>
      <div className="text-sm text-muted">
        Iteration{" "}
        <span className="font-mono font-semibold text-gray-900">
          {currentIteration}
        </span>
        {" / "}
        <span className="font-mono">{maxIterations}</span>
      </div>
      <div className="text-sm text-muted">
        Cost{" "}
        <span className="font-mono font-semibold text-gray-900">
          ${totalCost.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
