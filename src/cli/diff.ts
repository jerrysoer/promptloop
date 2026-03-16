import { defineCommand } from "citty";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { RunReport } from "../core/types.js";

export const diffCommand = defineCommand({
  meta: {
    name: "diff",
    description: "Show diff between original and optimized prompt",
  },
  args: {
    output: {
      type: "string",
      alias: "o",
      description: "Output directory to read from",
      default: ".promptloop",
    },
  },
  async run({ args }) {
    const reportPath = join(args.output, "report.json");
    if (!existsSync(reportPath)) {
      console.error(`No report found at ${reportPath}. Run 'promptloop run' first.`);
      process.exit(1);
    }

    const report = JSON.parse(readFileSync(reportPath, "utf-8")) as RunReport;

    // Read the current (optimized) prompt
    const promptPath = join(args.output, "..", "prompt.md");
    const optimizedPrompt = existsSync(promptPath)
      ? readFileSync(promptPath, "utf-8")
      : null;

    const original = report.originalPrompt;
    const optimized = optimizedPrompt;

    if (!original) {
      console.error("Original prompt not found in report. Run was created before diff support was added.");
      process.exit(1);
    }

    if (!optimized) {
      console.error("Optimized prompt file not found.");
      process.exit(1);
    }

    const oldLines = original.split("\n");
    const newLines = optimized.split("\n");

    // LCS-based diff
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lines: { type: "same" | "add" | "remove"; text: string }[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        lines.push({ type: "same", text: oldLines[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        lines.push({ type: "add", text: newLines[j - 1] });
        j--;
      } else {
        lines.push({ type: "remove", text: oldLines[i - 1] });
        i--;
      }
    }
    lines.reverse();

    // Output with ANSI colors
    const RED = "\x1b[31m";
    const GREEN = "\x1b[32m";
    const GRAY = "\x1b[90m";
    const RESET = "\x1b[0m";

    console.log(`\n${GRAY}--- Original prompt${RESET}`);
    console.log(`${GRAY}+++ Optimized prompt${RESET}\n`);

    for (const line of lines) {
      if (line.type === "add") {
        console.log(`${GREEN}+ ${line.text}${RESET}`);
      } else if (line.type === "remove") {
        console.log(`${RED}- ${line.text}${RESET}`);
      } else {
        console.log(`${GRAY}  ${line.text}${RESET}`);
      }
    }

    console.log(`\n${GRAY}Score: ${report.baselineScore} → ${report.finalScore} (+${report.improvement})${RESET}`);
  },
});
