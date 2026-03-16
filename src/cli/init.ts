import { defineCommand } from "citty";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import consola from "consola";

const TEMPLATES: Record<
  string,
  { prompt: string; testCases: string; config: string }
> = {
  "linkedin-hooks": {
    prompt: `You are an expert LinkedIn copywriter. Write a compelling hook (first 1-2 lines) for a LinkedIn post about the given topic.

Rules:
- Start with a bold, attention-grabbing statement
- Create curiosity or tension that makes people click "see more"
- Keep it under 20 words
- No hashtags, no emojis
- Be specific, not generic
- Avoid clickbait — the hook should be honest about the content`,
    testCases: JSON.stringify(
      [
        {
          id: "career-change",
          input: "I quit my $300k FAANG job to build a startup",
          expected:
            "A specific, tension-building hook about leaving a high-paying job",
        },
        {
          id: "hiring-mistake",
          input: "The most expensive hiring mistake I ever made",
          expected:
            "A hook that creates curiosity about a specific costly error",
        },
        {
          id: "ai-tools",
          input: "How I use AI tools to 10x my productivity",
          expected: "A specific, credible hook about AI productivity gains",
        },
        {
          id: "management-lesson",
          input:
            "The leadership lesson I learned from my worst manager",
          expected: "A hook that creates tension about a bad management experience",
        },
        {
          id: "remote-work",
          input: "Why I moved my entire team back to the office",
          expected:
            "A contrarian hook about returning to office work",
        },
        {
          id: "fundraising",
          input: "We raised $5M in 2 weeks — here is exactly how",
          expected: "A specific, credible hook about fundraising speed",
        },
        {
          id: "burnout",
          input:
            "I burned out so badly I could not open my laptop for 3 months",
          expected: "A vulnerable, specific hook about burnout",
        },
        {
          id: "cold-email",
          input: "The cold email template that gets 40% reply rates",
          expected: "A specific, results-oriented hook about outreach",
        },
        {
          id: "product-launch",
          input: "Our product launch flopped. Then we did this.",
          expected:
            "A hook with narrative tension about recovery from failure",
        },
        {
          id: "salary-negotiation",
          input: "How I negotiated a 60% raise without threatening to quit",
          expected:
            "A specific, actionable hook about salary negotiation",
        },
      ],
      null,
      2,
    ),
    config: `import type { PromptLoopConfig } from "promptloop";

const config: PromptLoopConfig = {
  targetModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  optimizerModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  judgeModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  maxIterations: 25,
  maxCostUsd: 3.0,
  parallelTestCases: 5,
  scoring: {
    mode: "llm-judge",
    criteria: \`Score the LinkedIn hook 0-100 on:
- Hook strength (40%): Does it stop the scroll? Create genuine curiosity?
- Specificity (25%): Does it use concrete details, not vague claims?
- Brevity (20%): Is it under 20 words? Every word essential?
- Authenticity (15%): Does it feel real, not clickbait?\`,
  },
  failureReportSize: 3,
  targetScore: 90,
};

export default config;`,
  },
  blank: {
    prompt: `You are a helpful assistant. Complete the given task.

Instructions:
- Be clear and concise
- Follow the specific requirements in each input
- Provide actionable output`,
    testCases: JSON.stringify(
      [
        {
          id: "test-1",
          input: "Your first test input here",
          expected: "What you expect the output to look like",
        },
        {
          id: "test-2",
          input: "Your second test input here",
          expected: "What you expect the output to look like",
        },
        {
          id: "test-3",
          input: "Your third test input here",
        },
      ],
      null,
      2,
    ),
    config: `import type { PromptLoopConfig } from "promptloop";

const config: PromptLoopConfig = {
  targetModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  optimizerModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  judgeModel: {
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
  },
  maxIterations: 25,
  maxCostUsd: 5.0,
  parallelTestCases: 5,
  scoring: {
    mode: "llm-judge",
    criteria: "Score the output 0-100 on relevance, quality, completeness, and clarity.",
  },
  failureReportSize: 3,
};

export default config;`,
  },
};

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Scaffold a new prompt optimization project",
  },
  args: {
    template: {
      type: "positional",
      description: "Template to use (linkedin-hooks, blank)",
      default: "blank",
    },
    dir: {
      type: "string",
      description: "Output directory",
      alias: "d",
    },
  },
  run({ args }) {
    const templateName = args.template || "blank";
    const template = TEMPLATES[templateName];

    if (!template) {
      consola.error(
        `Unknown template: ${templateName}. Available: ${Object.keys(TEMPLATES).join(", ")}`,
      );
      process.exit(1);
    }

    const dir = args.dir || templateName;
    const fullPath = join(process.cwd(), dir);

    if (existsSync(fullPath)) {
      consola.error(`Directory already exists: ${dir}`);
      process.exit(1);
    }

    mkdirSync(fullPath, { recursive: true });
    mkdirSync(join(fullPath, ".promptloop"), { recursive: true });

    writeFileSync(join(fullPath, "prompt.md"), template.prompt, "utf-8");
    writeFileSync(
      join(fullPath, "test-cases.json"),
      template.testCases,
      "utf-8",
    );
    writeFileSync(
      join(fullPath, "promptloop.config.ts"),
      template.config,
      "utf-8",
    );
    writeFileSync(
      join(fullPath, ".gitignore"),
      ".promptloop/\nnode_modules/\n",
      "utf-8",
    );

    consola.success(`Created prompt project: ${dir}/`);
    consola.info("Files created:");
    consola.info("  prompt.md          — Your prompt to optimize");
    consola.info("  test-cases.json    — Test cases for evaluation");
    consola.info("  promptloop.config.ts — Configuration");
    consola.info("");
    consola.info("Next steps:");
    consola.info(`  cd ${dir}`);
    consola.info("  # Edit prompt.md and test-cases.json");
    consola.info("  promptloop run");
  },
});
