import { NextRequest } from "next/server";
import { getRun } from "@/lib/run-manager";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const activeRun = getRun(id);

  if (!activeRun) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  // SSE mode (EventSource sends Accept: text/event-stream)
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/event-stream")) {
    return createSSEResponse(request, activeRun);
  }

  // JSON mode (regular fetch)
  return Response.json({
    status: activeRun.status,
    history: activeRun.history,
    maxIterations: activeRun.maxIterations,
    maxCostUsd: activeRun.maxCostUsd,
    startedAt: activeRun.startedAt,
    report: activeRun.report,
    originalPrompt: activeRun.originalPrompt,
    optimizedPrompt: activeRun.optimizedPrompt,
    error: activeRun.error,
  });
}

function createSSEResponse(
  request: NextRequest,
  activeRun: ReturnType<typeof getRun> & object,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send init event
      controller.enqueue(
        encoder.encode(
          `event: init\ndata: ${JSON.stringify({
            status: activeRun.status,
            maxIterations: activeRun.maxIterations,
            maxCostUsd: activeRun.maxCostUsd,
            startedAt: activeRun.startedAt,
            originalPrompt: activeRun.originalPrompt,
          })}\n\n`,
        ),
      );

      // Replay existing history
      for (const iteration of activeRun.history) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(iteration)}\n\n`),
        );
      }

      // If already completed, send final event and close
      if (activeRun.status === "completed") {
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({
              report: activeRun.report,
              optimizedPrompt: activeRun.optimizedPrompt,
            })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      if (activeRun.status === "error") {
        controller.enqueue(
          encoder.encode(
            `event: run_error\ndata: ${JSON.stringify({
              error: activeRun.error,
            })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      if (activeRun.status === "cancelled") {
        controller.enqueue(
          encoder.encode(
            `event: cancelled\ndata: ${JSON.stringify({
              report: activeRun.report,
              optimizedPrompt: activeRun.optimizedPrompt,
            })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      // Register listener for live updates
      const listener = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
          // Close stream on terminal events
          if (
            data.startsWith("event: complete") ||
            data.startsWith("event: run_error") ||
            data.startsWith("event: cancelled")
          ) {
            controller.close();
            activeRun.listeners.delete(listener);
          }
        } catch {
          activeRun.listeners.delete(listener);
        }
      };

      activeRun.listeners.add(listener);

      request.signal.addEventListener("abort", () => {
        activeRun.listeners.delete(listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
