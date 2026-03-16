"use client";

import { useState } from "react";
import type { RunReport } from "promptloop";

interface ShareButtonProps {
  runId: string;
  report: RunReport;
}

export function ShareButton({ runId, report }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareText = [
    `Optimized a prompt from ${report.baselineScore} to ${report.finalScore} (+${report.improvement}) in ${report.iterations} iterations for $${report.totalCostUsd.toFixed(2)}`,
    "",
    `${typeof window !== "undefined" ? window.location.origin : ""}/run/${runId}`,
  ].join("\n");

  const handleShare = async () => {
    // Try native share on mobile
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `PromptLoop: ${report.baselineScore} → ${report.finalScore}`,
          text: shareText,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  };

  return (
    <button
      onClick={handleShare}
      className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
