import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appendIteration, readHistory, hashPrompt } from "./history.js";
import type { IterationResult } from "./types.js";

const TMP_DIR = tmpdir();

function makeTmpPath(): string {
  return join(TMP_DIR, `promptloop-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
}

function makeIteration(overrides: Partial<IterationResult> = {}): IterationResult {
  return {
    iteration: 0,
    timestamp: "2026-03-15T00:00:00.000Z",
    mutation: null,
    scores: {
      scores: [{ value: 75, reasoning: "Good", testCaseId: "test-1" }],
      average: 75,
      lowest: [{ value: 75, reasoning: "Good", testCaseId: "test-1" }],
    },
    kept: true,
    promptHash: "abc1234",
    costUsd: 0.01,
    ...overrides,
  };
}

describe("history", () => {
  let tmpPath: string;

  beforeEach(() => {
    tmpPath = makeTmpPath();
  });

  afterEach(() => {
    if (existsSync(tmpPath)) {
      unlinkSync(tmpPath);
    }
  });

  describe("readHistory", () => {
    it("returns empty array for non-existent file", () => {
      expect(readHistory("/tmp/does-not-exist.jsonl")).toEqual([]);
    });

    it("returns empty array for empty file", () => {
      writeFileSync(tmpPath, "", "utf-8");
      expect(readHistory(tmpPath)).toEqual([]);
    });

    it("parses JSONL lines", () => {
      const iter1 = makeIteration({ iteration: 0 });
      const iter2 = makeIteration({ iteration: 1, kept: false });
      writeFileSync(
        tmpPath,
        JSON.stringify(iter1) + "\n" + JSON.stringify(iter2) + "\n",
        "utf-8",
      );

      const result = readHistory(tmpPath);
      expect(result).toHaveLength(2);
      expect(result[0].iteration).toBe(0);
      expect(result[1].iteration).toBe(1);
      expect(result[1].kept).toBe(false);
    });
  });

  describe("appendIteration", () => {
    it("creates file and appends line", () => {
      const iter = makeIteration();
      appendIteration(tmpPath, iter);

      const history = readHistory(tmpPath);
      expect(history).toHaveLength(1);
      expect(history[0].iteration).toBe(0);
    });

    it("appends multiple iterations", () => {
      appendIteration(tmpPath, makeIteration({ iteration: 0 }));
      appendIteration(tmpPath, makeIteration({ iteration: 1 }));
      appendIteration(tmpPath, makeIteration({ iteration: 2 }));

      const history = readHistory(tmpPath);
      expect(history).toHaveLength(3);
    });
  });

  describe("hashPrompt", () => {
    it("produces consistent hashes", () => {
      const hash1 = hashPrompt("test prompt");
      const hash2 = hashPrompt("test prompt");
      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different prompts", () => {
      const hash1 = hashPrompt("prompt A");
      const hash2 = hashPrompt("prompt B");
      expect(hash1).not.toBe(hash2);
    });

    it("returns a 7+ character string", () => {
      const hash = hashPrompt("some prompt");
      expect(hash.length).toBeGreaterThanOrEqual(7);
    });
  });
});
