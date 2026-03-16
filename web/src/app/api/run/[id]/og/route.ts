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

  const { baselineScore, finalScore, improvement, iterations, totalCostUsd } =
    run.report;

  // Generate the chart SVG for embedding
  const chartSVG = getRunSVG(id) ?? "";
  // Strip the outer <svg> wrapper to embed inside our OG card
  const chartInner = chartSVG
    .replace(/<svg[^>]*>/, "")
    .replace(/<\/svg>/, "");

  // Build OG card SVG: 1200x630, dark bg, chart left, stats right
  const ogSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d1117"/>

  <!-- Chart area (left 60%) -->
  <g transform="translate(20, 30) scale(0.85)">
    ${chartInner}
  </g>

  <!-- Stats panel (right 40%) -->
  <g transform="translate(750, 80)">
    <text x="0" y="0" fill="#e6edf3" font-size="32" font-weight="700" font-family="system-ui, sans-serif">PromptLoop</text>

    <text x="0" y="70" fill="#8b949e" font-size="16" font-family="system-ui">Baseline</text>
    <text x="0" y="100" fill="#e6edf3" font-size="48" font-weight="700" font-family="monospace">${baselineScore}</text>

    <text x="200" y="70" fill="#8b949e" font-size="16" font-family="system-ui">Final</text>
    <text x="200" y="100" fill="#e6edf3" font-size="48" font-weight="700" font-family="monospace">${finalScore}</text>

    <text x="0" y="170" fill="#3fb950" font-size="36" font-weight="700" font-family="monospace">+${improvement} points</text>

    <text x="0" y="230" fill="#8b949e" font-size="18" font-family="system-ui">${iterations} iterations</text>
    <text x="0" y="260" fill="#8b949e" font-size="18" font-family="system-ui">$${totalCostUsd.toFixed(2)} total cost</text>
  </g>

  <!-- Bottom strip -->
  <text x="1180" y="610" text-anchor="end" fill="#484f58" font-size="14" font-family="system-ui">promptloop.vercel.app</text>
</svg>`;

  // Convert SVG to PNG via sharp
  try {
    const sharp = (await import("sharp")).default;
    const pngBuffer = await sharp(Buffer.from(ogSVG))
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    // Fallback: return SVG if sharp fails
    return new NextResponse(ogSVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
