"use client";

import { useState } from "react";

interface DiffLine {
  type: "same" | "add" | "remove";
  text: string;
}

function computeDiff(original: string, optimized: string): DiffLine[] {
  const oldLines = original.split("\n");
  const newLines = optimized.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // LCS dynamic programming
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const stack: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: "same", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }

  return stack.reverse();
}

interface PromptDiffProps {
  original: string;
  optimized: string;
}

export function PromptDiff({ original, optimized }: PromptDiffProps) {
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  const diff = computeDiff(original, optimized);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex items-center justify-between border-b border-gray-200 bg-card px-4 py-2">
        <h3 className="text-sm font-semibold">Optimized Prompt</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="rounded px-2.5 py-1 text-xs font-medium text-muted hover:bg-gray-200"
          >
            {showDiff ? "Hide diff" : "Show diff"}
          </button>
          <button
            onClick={handleCopy}
            className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        {showDiff ? (
          <pre className="text-sm leading-relaxed font-mono">
            {diff.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "add"
                    ? "bg-green-50 text-green-800"
                    : line.type === "remove"
                      ? "bg-red-50 text-red-800 line-through"
                      : ""
                }
              >
                <span className="mr-2 inline-block w-4 select-none text-right text-gray-300">
                  {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                </span>
                {line.text || "\u00A0"}
              </div>
            ))}
          </pre>
        ) : (
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {optimized}
          </pre>
        )}
      </div>
    </div>
  );
}
