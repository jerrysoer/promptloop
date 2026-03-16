import { NextRequest, NextResponse } from "next/server";
import { getRun, getRunSVG } from "@/lib/run-manager";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const run = getRun(id);

  if (!run?.report) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const { report, originalPrompt, optimizedPrompt } = run;
  const chartSVG = getRunSVG(id) ?? "";

  // Build diff HTML
  const diffHTML = buildDiffHTML(originalPrompt, optimizedPrompt ?? "");

  // Build iteration table rows
  const iterationRows = report.history
    .map((iter) => {
      const strategy = iter.mutation?.strategy ?? "baseline";
      const status = iter.iteration === 0 ? "baseline" : iter.kept ? "KEPT" : "REVERTED";
      const statusColor = iter.iteration === 0 ? "#8b949e" : iter.kept ? "#15803d" : "#b91c1c";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${iter.iteration}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${strategy}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${iter.scores.average.toFixed(1)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:${statusColor}">${status}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#6b7280">$${iter.costUsd.toFixed(4)}</td>
      </tr>`;
    })
    .join("\n");

  // Build strategy stats rows
  const strategyRows = report.strategyStats
    ? Object.entries(report.strategyStats)
        .filter(([, s]) => s.attempts > 0)
        .sort(([, a], [, b]) => {
          const rateA = a.attempts > 0 ? a.kept / a.attempts : 0;
          const rateB = b.attempts > 0 ? b.kept / b.attempts : 0;
          return rateB - rateA;
        })
        .map(
          ([strategy, stats]) =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${strategy}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${stats.attempts}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${stats.kept}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${stats.attempts > 0 ? ((stats.kept / stats.attempts) * 100).toFixed(0) : 0}%</td>
            </tr>`,
        )
        .join("\n")
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PromptLoop Report — Run ${id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #FEFBF6; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-family: 'Lora', serif; font-size: 28px; margin-bottom: 8px; }
    h2 { font-family: 'Lora', serif; font-size: 22px; margin: 32px 0 16px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .stat { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .stat-value { font-family: 'Lora', serif; font-size: 24px; margin-top: 4px; }
    .stat-value.green { color: #15803d; }
    .chart { margin: 24px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .chart svg { width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    th { padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .diff-add { background: #dcfce7; color: #15803d; }
    .diff-remove { background: #fef2f2; color: #b91c1c; text-decoration: line-through; }
    .diff pre { font-size: 13px; line-height: 1.8; padding: 16px; overflow-x: auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; text-align: center; }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>PromptLoop Optimization Report</h1>
    <p style="color:#6b7280">Run ${id} &middot; ${new Date(report.startedAt).toLocaleDateString()}</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Baseline</div>
        <div class="stat-value">${report.baselineScore}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Final Score</div>
        <div class="stat-value">${report.finalScore}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Improvement</div>
        <div class="stat-value green">+${report.improvement}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Cost</div>
        <div class="stat-value">$${report.totalCostUsd.toFixed(2)}</div>
      </div>
    </div>

    <h2>Progress Chart</h2>
    <div class="chart">${chartSVG}</div>

    <h2>Prompt Diff</h2>
    <div class="diff">${diffHTML}</div>

    <h2>Iteration Log</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Strategy</th>
          <th>Score</th>
          <th>Result</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>${iterationRows}</tbody>
    </table>

    ${strategyRows ? `<h2>Strategy Performance</h2>
    <table>
      <thead>
        <tr><th>Strategy</th><th style="text-align:right">Attempts</th><th style="text-align:right">Kept</th><th style="text-align:right">Success Rate</th></tr>
      </thead>
      <tbody>${strategyRows}</tbody>
    </table>` : ""}

    <div class="footer">
      Optimized with <strong>PromptLoop</strong> &mdash; github.com/jerrysoer/promptloop
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="promptloop-report-${id}.html"`,
    },
  });
}

// LCS-based diff → HTML (mirrors PromptDiff.tsx logic)
function buildDiffHTML(original: string, optimized: string): string {
  if (!original || !optimized) {
    return `<pre>${escapeHTML(optimized || original || "(empty)")}</pre>`;
  }

  const oldLines = original.split("\n");
  const newLines = optimized.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

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

  const lines: { type: "same" | "add" | "remove"; text: string }[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      lines.push({ type: "same", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.push({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      lines.push({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }
  lines.reverse();

  const htmlLines = lines.map((line) => {
    const cls =
      line.type === "add"
        ? ' class="diff-add"'
        : line.type === "remove"
          ? ' class="diff-remove"'
          : "";
    const prefix =
      line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  ";
    return `<div${cls}><span style="color:#9ca3af;user-select:none">${prefix}</span>${escapeHTML(line.text) || "&nbsp;"}</div>`;
  });

  return `<pre>${htmlLines.join("\n")}</pre>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
