import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { TemplateTracker } from "@/components/TemplateTracker";
import { getTemplatesDir } from "@/lib/templates-path";

const TEMPLATES_DIR = getTemplatesDir();
const SAFE_ID = /^[a-z0-9-]+$/;
const BLOCKED = new Set(["_template", "blank"]);

interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  testCaseCount: number;
  tags: string[];
  estimatedCost: string;
  sampleResults: {
    baseline: string;
    final: string;
    improvement: string;
    iterations: string;
  };
}

function loadRegistryEntry(id: string): RegistryEntry | null {
  const registryPath = join(TEMPLATES_DIR, "registry.json");
  if (!existsSync(registryPath)) return null;
  try {
    const entries: RegistryEntry[] = JSON.parse(readFileSync(registryPath, "utf-8"));
    return entries.find((e) => e.id === id) ?? null;
  } catch {
    return null;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  creators: "bg-purple-100 text-purple-700",
  developers: "bg-blue-100 text-blue-700",
  marketers: "bg-amber-100 text-amber-700",
  saas: "bg-emerald-100 text-emerald-700",
  general: "bg-gray-100 text-gray-600",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = loadRegistryEntry(id);
  if (!entry) return { title: "Template Not Found — HonePrompt" };

  return {
    title: `${entry.name} — HonePrompt Templates`,
    description: entry.description,
    openGraph: {
      title: `${entry.name} — HonePrompt Template`,
      description: entry.description,
    },
  };
}

export async function generateStaticParams() {
  if (!existsSync(TEMPLATES_DIR)) return [];
  return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !BLOCKED.has(d.name) && d.name !== "_template")
    .map((d) => ({ id: d.name }));
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!SAFE_ID.test(id) || BLOCKED.has(id)) notFound();

  const dir = join(TEMPLATES_DIR, id);
  if (!existsSync(dir)) notFound();

  const read = (file: string) => {
    const path = join(dir, file);
    return existsSync(path) ? readFileSync(path, "utf-8") : null;
  };

  const prompt = read("prompt.md");
  const testCasesRaw = read("test-cases.json");
  const strategyDoc = read("program.md");
  const entry = loadRegistryEntry(id);

  if (!prompt) notFound();

  const testCases = testCasesRaw ? JSON.parse(testCasesRaw) : [];
  const pill = CATEGORY_COLORS[entry?.category ?? "general"] ?? CATEGORY_COLORS.general;

  return (
    <div className="space-y-8">
      <TemplateTracker templateId={id} />
      {/* Header */}
      <div>
        <Link
          href="/templates"
          className="text-sm text-text-muted hover:text-text transition-colors mb-4 inline-block"
        >
          &larr; All Templates
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-heading text-3xl sm:text-4xl">
            {entry?.name ?? id}
          </h1>
          {entry && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill}`}>
              {entry.category}
            </span>
          )}
        </div>
        {entry && (
          <p className="text-text-muted">{entry.description}</p>
        )}
        {entry?.tags && entry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Preview */}
      <div>
        <h2 className="font-heading text-xl mb-3">Prompt</h2>
        <pre className="rounded-xl border border-border bg-surface p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
          {prompt}
        </pre>
      </div>

      {/* Test Cases */}
      <div>
        <h2 className="font-heading text-xl mb-3">
          Test Cases
          <span className="ml-2 text-sm text-text-muted font-normal">
            ({testCases.length})
          </span>
        </h2>
        <div className="space-y-2">
          {testCases.map(
            (tc: { id: string; input: string; expected?: string }, i: number) => (
              <details
                key={tc.id}
                open={i < 3}
                className="rounded-xl border border-border bg-surface overflow-hidden"
              >
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium hover:bg-surface-alt transition-colors">
                  <span className="font-mono text-text-muted mr-2">{tc.id}</span>
                  <span className="text-text">{tc.input.slice(0, 80)}{tc.input.length > 80 ? "..." : ""}</span>
                </summary>
                <div className="px-4 py-3 border-t border-border text-sm space-y-2">
                  <div>
                    <span className="text-text-muted text-xs">Input:</span>
                    <p className="font-mono text-sm">{tc.input}</p>
                  </div>
                  {tc.expected && (
                    <div>
                      <span className="text-text-muted text-xs">Expected:</span>
                      <p className="text-sm">{tc.expected}</p>
                    </div>
                  )}
                </div>
              </details>
            ),
          )}
        </div>
      </div>

      {/* Strategy */}
      {strategyDoc && (
        <div>
          <h2 className="font-heading text-xl mb-3">Strategy Document</h2>
          <pre className="rounded-xl border border-border bg-surface p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
            {strategyDoc}
          </pre>
        </div>
      )}

      {/* Sample Results */}
      {entry?.sampleResults && entry.sampleResults.baseline !== "TBD" && (
        <div>
          <h2 className="font-heading text-xl mb-3">Sample Run Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-xs text-text-muted mb-1">Baseline</div>
              <div className="text-lg font-semibold">{entry.sampleResults.baseline}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-xs text-text-muted mb-1">Final</div>
              <div className="text-lg font-semibold text-kept">{entry.sampleResults.final}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-xs text-text-muted mb-1">Improvement</div>
              <div className="text-lg font-semibold text-kept">{entry.sampleResults.improvement}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <div className="text-xs text-text-muted mb-1">Iterations</div>
              <div className="text-lg font-semibold">{entry.sampleResults.iterations}</div>
            </div>
          </div>
        </div>
      )}

      {/* Meta */}
      {entry && (
        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
          <span>By {entry.author}</span>
          <span>{entry.estimatedCost}</span>
          <span>{entry.testCaseCount} test cases</span>
        </div>
      )}

      {/* CTA */}
      <div className="border-t border-border pt-6">
        <Link
          href={`/?template=${id}`}
          className="inline-block rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Start with this template &rarr;
        </Link>
      </div>
    </div>
  );
}
