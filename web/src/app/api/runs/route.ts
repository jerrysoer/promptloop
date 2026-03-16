import { listRuns } from "@/lib/run-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  const runs = listRuns();
  return Response.json(runs);
}
