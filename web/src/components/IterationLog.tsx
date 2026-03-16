"use client";

import type { IterationResult } from "promptloop";
import { IterationRow } from "./IterationRow";

export function IterationLog({
  iterations,
}: {
  iterations: IterationResult[];
}) {
  if (iterations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-8 text-center text-sm text-muted">
        Waiting for baseline evaluation...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-card">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Strategy
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Description
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Score
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Status
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
              Cost
            </th>
            <th className="w-8 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {iterations.map((iteration) => (
            <IterationRow key={iteration.iteration} iteration={iteration} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
