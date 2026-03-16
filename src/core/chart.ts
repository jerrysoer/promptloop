import type { IterationResult } from "./types.js";

// ── SVG Chart Generation ────────────────────────────────────

interface ChartOptions {
  width?: number;
  height?: number;
  title?: string;
}

export function generateSVG(
  history: IterationResult[],
  options: ChartOptions = {},
): string {
  const { width = 800, height = 400, title = "PromptLoop Optimization" } = options;
  const padding = { top: 50, right: 60, bottom: 50, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Data points
  const scores = history.map((h) => h.scores.average);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const scoreRange = maxScore - minScore || 1;

  const bestIdx = scores.indexOf(Math.max(...scores));
  const bestScore = scores[bestIdx];
  const baselineScore = scores[0] ?? 0;

  // Map data to coordinates
  const points = scores.map((score, i) => {
    const x = padding.left + (i / Math.max(scores.length - 1, 1)) * chartW;
    const y =
      padding.top + chartH - ((score - minScore) / scoreRange) * chartH;
    return { x, y, score, iteration: i };
  });

  // Build path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Gradient fill area
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padding.top + chartH} L ${points[0].x.toFixed(1)} ${padding.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from(
    { length: yTicks + 1 },
    (_, i) => minScore + (scoreRange * i) / yTicks,
  );

  // Kept/reverted markers
  const keptPoints = points.filter((_, i) => i > 0 && history[i]?.kept);
  const revertedPoints = points.filter((_, i) => i > 0 && !history[i]?.kept);

  // Cumulative cost line
  const cumulativeCosts: number[] = [];
  let runningCost = 0;
  for (const h of history) {
    runningCost += h.costUsd;
    cumulativeCosts.push(runningCost);
  }
  const maxCost = runningCost || 1;
  const costPoints = cumulativeCosts.map((cost, i) => {
    const x = padding.left + (i / Math.max(cumulativeCosts.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (cost / maxCost) * chartH;
    return { x, y, cost };
  });
  const costLinePath = costPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Right-side cost Y-axis ticks
  const costTicks = 4;
  const costTickValues = Array.from(
    { length: costTicks + 1 },
    (_, i) => (maxCost * i) / costTicks,
  );

  // Mutation strategy labels for kept iterations
  const annotations = keptPoints
    .filter((_, i) => i < 5) // limit annotations to avoid clutter
    .map((p) => {
      const strategy = history[p.iteration]?.mutation?.strategy ?? "";
      return `<text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#8b949e" font-size="9" font-family="monospace">${strategy}</text>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#58a6ff" stop-opacity="0.02"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" rx="8" fill="#0d1117"/>

  <!-- Title -->
  <text x="${width / 2}" y="28" text-anchor="middle" fill="#e6edf3" font-size="16" font-weight="600" font-family="system-ui, sans-serif">${title}</text>

  <!-- Grid lines -->
  ${yTickValues
    .map((val) => {
      const y = padding.top + chartH - ((val - minScore) / scoreRange) * chartH;
      return `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${padding.left + chartW}" y2="${y.toFixed(1)}" stroke="#21262d" stroke-width="1"/>
  <text x="${padding.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#8b949e" font-size="11" font-family="monospace">${Math.round(val)}</text>`;
    })
    .join("\n  ")}

  <!-- X-axis labels -->
  ${points
    .filter(
      (_, i) =>
        i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 8) === 0,
    )
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${padding.top + chartH + 20}" text-anchor="middle" fill="#8b949e" font-size="11" font-family="monospace">${p.iteration}</text>`,
    )
    .join("\n  ")}

  <!-- Axis labels -->
  <text x="${padding.left - 40}" y="${padding.top + chartH / 2}" text-anchor="middle" fill="#8b949e" font-size="12" font-family="system-ui" transform="rotate(-90 ${padding.left - 40} ${padding.top + chartH / 2})">Score</text>
  <text x="${padding.left + chartW / 2}" y="${height - 8}" text-anchor="middle" fill="#8b949e" font-size="12" font-family="system-ui">Iteration</text>

  <!-- Area fill -->
  <path d="${areaPath}" fill="url(#areaGradient)"/>

  <!-- Score line -->
  <path d="${linePath}" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Reverted iterations (dim dots) -->
  ${revertedPoints.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#f85149" opacity="0.5"/>`).join("\n  ")}

  <!-- Kept iterations (bright dots) -->
  ${keptPoints.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#3fb950" stroke="#0d1117" stroke-width="1.5"/>`).join("\n  ")}

  <!-- Baseline dot -->
  ${points[0] ? `<circle cx="${points[0].x.toFixed(1)}" cy="${points[0].y.toFixed(1)}" r="5" fill="#f0883e" stroke="#0d1117" stroke-width="2"/>` : ""}

  <!-- Best score marker -->
  ${points[bestIdx] ? `<circle cx="${points[bestIdx].x.toFixed(1)}" cy="${points[bestIdx].y.toFixed(1)}" r="6" fill="#58a6ff" stroke="#e6edf3" stroke-width="2"/>` : ""}

  <!-- Cumulative cost line (dashed, right Y-axis) -->
  <path d="${costLinePath}" fill="none" stroke="#8b949e" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.6"/>
  ${costTickValues
    .map((val) => {
      const y = padding.top + chartH - (val / maxCost) * chartH;
      return `<text x="${padding.left + chartW + 8}" y="${(y + 4).toFixed(1)}" text-anchor="start" fill="#8b949e" font-size="10" font-family="monospace" opacity="0.6">$${val.toFixed(2)}</text>`;
    })
    .join("\n  ")}
  <text x="${padding.left + chartW + 40}" y="${padding.top + chartH / 2}" text-anchor="middle" fill="#8b949e" font-size="11" font-family="system-ui" opacity="0.6" transform="rotate(90 ${padding.left + chartW + 40} ${padding.top + chartH / 2})">Cost</text>

  <!-- Annotations -->
  ${annotations}

  <!-- Legend -->
  <g transform="translate(${padding.left + 10}, ${padding.top + 10})">
    <rect width="180" height="72" rx="4" fill="#161b22" stroke="#30363d" stroke-width="1"/>
    <circle cx="14" cy="16" r="4" fill="#f0883e"/>
    <text x="24" y="20" fill="#e6edf3" font-size="11" font-family="system-ui">Baseline: ${baselineScore}</text>
    <circle cx="14" cy="36" r="4" fill="#58a6ff"/>
    <text x="24" y="40" fill="#e6edf3" font-size="11" font-family="system-ui">Best: ${bestScore} (iter ${bestIdx})</text>
    <circle cx="14" cy="56" r="3" fill="#3fb950"/>
    <text x="24" y="60" fill="#e6edf3" font-size="11" font-family="system-ui">Kept  </text>
    <circle cx="90" cy="56" r="3" fill="#f85149" opacity="0.5"/>
    <text x="100" y="60" fill="#e6edf3" font-size="11" font-family="system-ui">Reverted</text>
  </g>
</svg>`;
}

// ── SVG → PNG via sharp ─────────────────────────────────────

export async function generatePNG(
  history: IterationResult[],
  outputPath: string,
  options: ChartOptions = {},
): Promise<void> {
  const svg = generateSVG(history, options);
  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}
