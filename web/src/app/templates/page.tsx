import { Suspense } from "react";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { TemplateCard } from "@/components/TemplateCard";
import { TemplateFilter } from "@/components/TemplateFilter";
import { getTemplatesDir } from "@/lib/templates-path";

interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  testCaseCount: number;
  estimatedCost: string;
}

function loadRegistry(): RegistryEntry[] {
  const registryPath = join(getTemplatesDir(), "registry.json");
  if (!existsSync(registryPath)) return [];
  try {
    return JSON.parse(readFileSync(registryPath, "utf-8"));
  } catch {
    return [];
  }
}

export const metadata = {
  title: "Templates — HonePrompt",
  description:
    "Browse ready-to-use prompt optimization templates for creators, developers, marketers, and SaaS teams.",
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const registry = loadRegistry();

  const filtered = category
    ? registry.filter((t) => t.category === category)
    : registry;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl mb-2">Templates</h1>
        <p className="text-text-muted">
          Ready-to-use prompt optimization projects. Pick one and start optimizing.
        </p>
      </div>

      <Suspense>
        <TemplateFilter />
      </Suspense>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No templates found{category ? ` for "${category}"` : ""}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              id={t.id}
              name={t.name}
              description={t.description}
              category={t.category}
              testCaseCount={t.testCaseCount}
              estimatedCost={t.estimatedCost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
