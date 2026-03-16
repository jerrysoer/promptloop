import { generateSVG } from "promptloop";
import type { IterationResult } from "promptloop";

// Static demo data — a realistic optimization curve from a linkedin-hooks run
const DEMO_HISTORY: IterationResult[] = [
  { iteration: 0, timestamp: "", mutation: null, scores: { scores: [], average: 55, lowest: [] }, kept: true, promptHash: "", costUsd: 0.08 },
  { iteration: 1, timestamp: "", mutation: { strategy: "sharpen", description: "", newPrompt: "" }, scores: { scores: [], average: 58, lowest: [] }, kept: true, promptHash: "", costUsd: 0.09 },
  { iteration: 2, timestamp: "", mutation: { strategy: "add_example", description: "", newPrompt: "" }, scores: { scores: [], average: 61, lowest: [] }, kept: true, promptHash: "", costUsd: 0.10 },
  { iteration: 3, timestamp: "", mutation: { strategy: "expand", description: "", newPrompt: "" }, scores: { scores: [], average: 59, lowest: [] }, kept: false, promptHash: "", costUsd: 0.09 },
  { iteration: 4, timestamp: "", mutation: { strategy: "constrain", description: "", newPrompt: "" }, scores: { scores: [], average: 64, lowest: [] }, kept: true, promptHash: "", costUsd: 0.10 },
  { iteration: 5, timestamp: "", mutation: { strategy: "restructure", description: "", newPrompt: "" }, scores: { scores: [], average: 63, lowest: [] }, kept: false, promptHash: "", costUsd: 0.09 },
  { iteration: 6, timestamp: "", mutation: { strategy: "sharpen", description: "", newPrompt: "" }, scores: { scores: [], average: 67, lowest: [] }, kept: true, promptHash: "", costUsd: 0.10 },
  { iteration: 7, timestamp: "", mutation: { strategy: "add_example", description: "", newPrompt: "" }, scores: { scores: [], average: 71, lowest: [] }, kept: true, promptHash: "", costUsd: 0.11 },
  { iteration: 8, timestamp: "", mutation: { strategy: "remove", description: "", newPrompt: "" }, scores: { scores: [], average: 69, lowest: [] }, kept: false, promptHash: "", costUsd: 0.10 },
  { iteration: 9, timestamp: "", mutation: { strategy: "constrain", description: "", newPrompt: "" }, scores: { scores: [], average: 73, lowest: [] }, kept: true, promptHash: "", costUsd: 0.10 },
  { iteration: 10, timestamp: "", mutation: { strategy: "sharpen", description: "", newPrompt: "" }, scores: { scores: [], average: 75, lowest: [] }, kept: true, promptHash: "", costUsd: 0.11 },
  { iteration: 11, timestamp: "", mutation: { strategy: "expand", description: "", newPrompt: "" }, scores: { scores: [], average: 74, lowest: [] }, kept: false, promptHash: "", costUsd: 0.10 },
  { iteration: 12, timestamp: "", mutation: { strategy: "add_example", description: "", newPrompt: "" }, scores: { scores: [], average: 78, lowest: [] }, kept: true, promptHash: "", costUsd: 0.11 },
  { iteration: 13, timestamp: "", mutation: { strategy: "restructure", description: "", newPrompt: "" }, scores: { scores: [], average: 80, lowest: [] }, kept: true, promptHash: "", costUsd: 0.10 },
  { iteration: 14, timestamp: "", mutation: { strategy: "sharpen", description: "", newPrompt: "" }, scores: { scores: [], average: 79, lowest: [] }, kept: false, promptHash: "", costUsd: 0.10 },
  { iteration: 15, timestamp: "", mutation: { strategy: "constrain", description: "", newPrompt: "" }, scores: { scores: [], average: 82, lowest: [] }, kept: true, promptHash: "", costUsd: 0.11 },
];

export function LandingHero() {
  // SVG generated server-side from hardcoded demo data — safe trusted content
  const chartSVG = generateSVG(DEMO_HISTORY, {
    width: 800,
    height: 400,
    title: "PromptLoop Optimization",
  });

  return (
    <section className="mb-12 text-center">
      <h1 className="font-heading text-4xl sm:text-5xl font-normal">
        PromptLoop
      </h1>
      <p className="mt-3 text-lg text-text-muted">
        Autonomous prompt optimization powered by iterative mutation and LLM judging
      </p>

      {/* Demo chart — SVG from hardcoded data, no user input */}
      <div
        className="mt-8 rounded-2xl border border-border overflow-hidden"
        dangerouslySetInnerHTML={{ __html: chartSVG }}
      />
      <p className="mt-3 text-sm text-text-muted">
        Real optimization curve: 55 &rarr; 82 in 15 iterations for $1.40
      </p>

      {/* CTA */}
      <a
        href="#setup"
        className="mt-6 inline-block rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Try it now &darr;
      </a>
    </section>
  );
}
