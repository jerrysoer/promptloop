import { NextRequest } from "next/server";
import { getRunSVG } from "@/lib/run-manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const svg = getRunSVG(id);

  if (!svg) {
    return new Response("Run not found or no data", { status: 404 });
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-cache",
    },
  });
}
