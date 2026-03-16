"use client";

import { useState, useEffect } from "react";
import type { IterationResult, RunReport } from "promptloop";

export interface RunStreamState {
  iterations: IterationResult[];
  status: "connecting" | "running" | "completed" | "error";
  maxIterations: number;
  startedAt: number;
  report?: RunReport;
  originalPrompt: string;
  optimizedPrompt?: string;
  error?: string;
}

export function useRunStream(runId: string): RunStreamState {
  const [state, setState] = useState<RunStreamState>({
    iterations: [],
    status: "connecting",
    maxIterations: 0,
    startedAt: 0,
    originalPrompt: "",
  });

  useEffect(() => {
    const es = new EventSource(`/api/run/${runId}`);

    es.addEventListener("init", (event) => {
      const data = JSON.parse(event.data) as {
        status: string;
        maxIterations: number;
        startedAt: number;
        originalPrompt: string;
      };
      setState((prev) => ({
        ...prev,
        status: data.status === "running" ? "running" : prev.status,
        maxIterations: data.maxIterations,
        startedAt: data.startedAt,
        originalPrompt: data.originalPrompt,
      }));
    });

    // Default message event = iteration data
    es.onmessage = (event) => {
      const iteration = JSON.parse(event.data) as IterationResult;
      setState((prev) => {
        // Deduplicate (in case of replay overlap)
        if (prev.iterations.some((i) => i.iteration === iteration.iteration)) {
          return prev;
        }
        return {
          ...prev,
          status: "running",
          iterations: [...prev.iterations, iteration],
        };
      });
    };

    es.addEventListener("complete", (event) => {
      const data = JSON.parse(event.data) as {
        report: RunReport;
        optimizedPrompt: string;
      };
      setState((prev) => ({
        ...prev,
        status: "completed",
        report: data.report,
        optimizedPrompt: data.optimizedPrompt,
      }));
      es.close();
    });

    es.addEventListener("run_error", (event) => {
      const data = JSON.parse(event.data) as { error: string };
      setState((prev) => ({
        ...prev,
        status: "error",
        error: data.error,
      }));
      es.close();
    });

    es.onerror = () => {
      // Only treat as error if we haven't already completed
      setState((prev) => {
        if (prev.status === "completed") return prev;
        return { ...prev, status: "error", error: "Connection lost" };
      });
      es.close();
    };

    return () => {
      es.close();
    };
  }, [runId]);

  return state;
}
