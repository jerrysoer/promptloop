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
      <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-text-muted">
        Waiting for baseline evaluation...
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-border bg-surface-alt/50">
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              #
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Strategy
            </th>
            <th className="hidden sm:table-cell px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Description
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Score
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
              Status
            </th>
            <th className="hidden sm:table-cell px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-text-muted">
              Cost
            </th>
            <th className="w-6 px-1 py-2.5" />
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
