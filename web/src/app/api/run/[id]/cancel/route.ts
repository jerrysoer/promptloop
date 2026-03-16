import { cancelRun } from "@/lib/run-manager";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cancelled = cancelRun(id);

  if (!cancelled) {
    return Response.json(
      { error: "Run not found or not running" },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
