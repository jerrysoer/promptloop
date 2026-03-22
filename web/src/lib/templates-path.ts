import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolve the templates directory from either:
 * 1. Local monorepo: ../templates/ (development)
 * 2. npm package: node_modules/honeprompt/templates/ (Vercel/production)
 */
export function getTemplatesDir(): string {
  const candidates = [
    join(process.cwd(), "..", "templates"),
    join(process.cwd(), "node_modules", "honeprompt", "templates"),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, "registry.json"))) {
      return dir;
    }
  }

  return candidates[0];
}
