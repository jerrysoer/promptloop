import type { Metadata } from "next";
import { getRun } from "@/lib/run-manager";
import RunClient from "./RunClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const run = getRun(id);

  if (!run?.report) {
    return { title: `Run ${id} — PromptLoop` };
  }

  const { baselineScore, finalScore, improvement, iterations, totalCostUsd } =
    run.report;

  return {
    title: `${baselineScore} → ${finalScore} (+${improvement}) — PromptLoop`,
    description: `Optimized in ${iterations} iterations for $${totalCostUsd.toFixed(2)}`,
    openGraph: {
      title: `${baselineScore} → ${finalScore} (+${improvement}) — PromptLoop`,
      description: `Optimized in ${iterations} iterations for $${totalCostUsd.toFixed(2)}`,
      images: [{ url: `/api/run/${id}/og`, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${baselineScore} → ${finalScore} (+${improvement}) — PromptLoop`,
      description: `Optimized in ${iterations} iterations for $${totalCostUsd.toFixed(2)}`,
      images: [`/api/run/${id}/og`],
    },
  };
}

export default function RunPage({ params }: Props) {
  return <RunClient params={params} />;
}
