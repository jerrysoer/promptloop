/**
 * Strip API key patterns from error messages to prevent leakage.
 * Matches Anthropic (sk-ant-*) and OpenAI (sk-*) key formats.
 */
export function sanitizeError(msg: string): string {
  return msg
    .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, "sk-ant-***")
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "sk-***");
}
