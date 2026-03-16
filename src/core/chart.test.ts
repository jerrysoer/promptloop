import { describe, it, expect } from "vitest";
import { generateSVG } from "./chart.js";
import type { IterationResult } from "./types.js";

function makeHistory(scores: number[]): IterationResult[] {
  return scores.map((avg, i) => ({
    iteration: i,
    timestamp: new Date().toISOString(),
    mutation:
      i === 0
        ? null
        : {
            strategy: "sharpen" as const,
            description: `Mutation ${i}`,
            newPrompt: `prompt v${i}`,
          },
    scores: {
      scores: [{ value: avg, reasoning: "test", testCaseId: "t1" }],
      average: avg,
      lowest: [{ value: avg, reasoning: "test", testCaseId: "t1" }],
    },
    kept: i === 0 || avg > scores[i - 1],
    promptHash: `hash${i}`,
    costUsd: 0.01,
  }));
}

describe("chart", () => {
  describe("generateSVG", () => {
    it("produces valid SVG", () => {
      const history = makeHistory([50, 55, 60, 58, 65, 70]);
      const svg = generateSVG(history);

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("xmlns");
    });

    it("includes score data points", () => {
      const history = makeHistory([40, 60, 80]);
      const svg = generateSVG(history);

      // Should contain circle elements for data points
      expect(svg).toContain("<circle");
      // Should contain the score line
      expect(svg).toContain("<path");
    });

    it("shows baseline and best in legend", () => {
      const history = makeHistory([50, 70, 65, 80]);
      const svg = generateSVG(history);

      expect(svg).toContain("Baseline: 50");
      expect(svg).toContain("Best: 80");
    });

    it("handles single data point", () => {
      const history = makeHistory([75]);
      const svg = generateSVG(history);

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });

    it("respects custom dimensions", () => {
      const history = makeHistory([50, 60, 70]);
      const svg = generateSVG(history, { width: 1200, height: 600 });

      expect(svg).toContain('width="1200"');
      expect(svg).toContain('height="600"');
    });

    it("respects custom title", () => {
      const history = makeHistory([50, 60]);
      const svg = generateSVG(history, { title: "My Custom Chart" });

      expect(svg).toContain("My Custom Chart");
    });
  });
});
