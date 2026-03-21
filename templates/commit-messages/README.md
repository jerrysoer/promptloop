# Commit Messages

Generate clean conventional commit messages from diffs and change descriptions.

**Category:** developers
**Author:** HonePrompt Team
**Estimated Cost:** $1-3 (25 iterations)
**Tags:** git, commits, conventional-commits, development, workflow

## What This Template Does

Optimizes a commit message-writing prompt. The prompt takes a description of changes or a diff summary as input and generates a well-formatted conventional commit message. Enforces type(scope): format, imperative mood, 72-character subject lines, and meaningful body paragraphs for complex changes.

## Scoring Criteria

- **Format compliance (30%)** — Does it follow conventional commit format with correct type?
- **Conciseness (25%)** — Is the subject under 72 characters with no wasted words?
- **Imperative mood (20%)** — Does it use "add" not "added", avoiding "This commit..." openers?
- **Explanatory value (25%)** — Does the body explain WHY, not repeat WHAT?

## Sample Run Results

| Metric | Value |
|--------|-------|
| Baseline Score | 86 / 100 |
| Final Score | 95 / 100 |
| Improvement | +9 points (86 → 95) |
| Iterations | 1 |
