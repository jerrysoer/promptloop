"use client";

import { useState } from "react";
import type { IterationResult } from "promptloop";
import { StrategyBadge } from "./StrategyBadge";
import { StatusBadge } from "./StatusBadge";
import { ScoreBar } from "./ScoreBar";

export function IterationRow({ iteration }: { iteration: IterationResult }) {
  const [expanded, setExpanded] = useState(false);
  const isBaseline = iteration.iteration === 0;

  return (
    <>
      <tr
        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2.5 text-sm font-mono text-muted">
          {iteration.iteration}
        </td>
        <td className="px-3 py-2.5">
          {isBaseline ? (
            <span className="text-sm text-muted italic">baseline</span>
          ) : (
            <StrategyBadge strategy={iteration.mutation!.strategy} />
          )}
        </td>
        <td className="max-w-xs truncate px-3 py-2.5 text-sm text-gray-600">
          {isBaseline ? "\u2014" : iteration.mutation!.description}
        </td>
        <td className="px-3 py-2.5">
          <ScoreBar value={Math.round(iteration.scores.average)} />
        </td>
        <td className="px-3 py-2.5">
          {isBaseline ? (
            <span className="text-sm text-muted">\u2014</span>
          ) : (
            <StatusBadge kept={iteration.kept} />
          )}
        </td>
        <td className="px-3 py-2.5 text-right text-sm font-mono text-muted">
          ${iteration.costUsd.toFixed(3)}
        </td>
        <td className="px-2 py-2.5 text-sm text-muted">
          {expanded ? "\u25B2" : "\u25BC"}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={7} className="bg-gray-50 px-4 py-3">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Per-test-case scores
              </h4>
              <div className="grid gap-2">
                {iteration.scores.scores.map((score) => (
                  <div
                    key={score.testCaseId}
                    className="rounded border border-gray-200 bg-white p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-mono font-medium">
                        {score.testCaseId}
                      </span>
                      <ScoreBar value={score.value} />
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500">
                      {score.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
