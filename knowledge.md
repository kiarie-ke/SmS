# Project knowledge

High-signal context for this repo: what it is, how it is laid out, and the
conventions an agent should follow when working in it.

## What this project is

This is a **Freebuff / Codebuff custom agent workspace** — the scaffold in which
custom agents are authored, not an application. As of this writing the repo has
no runtime code: only `AGENTS.md` (the project knowledge file) and the vendored
Codebuff agent type definitions. There is no `package.json`, no lockfile, no
build tool, and no git repository initialized.

If application code is added later, record the install/dev/test commands and
update the sections below.

## Layout

- `AGENTS.md` — project knowledge consumed by Freebuff at session start. Keep
  the same `Quickstart` / `Architecture` / `Conventions` structure if editing.
- `.agents/` — the Codebuff agent directory.
  - `.agents/types/agent-definition.ts` — the `AgentDefinition` interface, the
    `ModelName` union of recommended OpenRouter models, and `handleSteps` /
    `AgentState` / `AgentStepContext` types.
  - `.agents/types/tools.ts` — `ToolName` union, `ToolParamsMap`, and one
    `*Params` interface per tool.
  - `.agents/types/util-types.ts` — message parts, `MCPConfig`, `JsonSchema`,
    and the `Logger` interface.
- Agent definitions themselves go at `.agents/<agent-id>.ts` and export the
  `AgentDefinition` object as `default`.

## Commands

None are defined in this repo — there is no package manifest or task runner. Do
not invent `npm test` / `npm run build` style commands. Run `ls` and look for a
manifest before assuming tooling exists.

## Conventions

- Write agent files in TypeScript and import types from the relative path:
  `import { AgentDefinition, ToolName, ModelName } from './types/agent-definition'`.
- `id` must be lowercase letters, numbers, and hyphens only (e.g. `code-reviewer`).
- Choose `model` from the `ModelName` union (`agent-definition.ts`); the union
  ends in `(string & {})`, so any OpenRouter model id type-checks, but validate
  the id against https://openrouter.ai/models rather than guessing.
- Shape behavior primarily through `instructionsPrompt` (re-inserted after each
  user input). `systemPrompt` is background context and `stepPrompt` runs every
  step — reach for them only when the semantics actually require it.
- If an agent sets `reasoningOptions`, include exactly one of `max_tokens` or
  `effort`; `exclude: true` strips reasoning tokens from the response.
- `spawnableAgents` entries must be fully qualified store ids
  (`publisher/agent@version`) for published agents, or a bare local agent id for
  files in `.agents/`.
- When writing a `handleSteps` generator, remember it is serialized with
  `toString()`: it cannot close over outer variables. Read request-time values
  (`model`, `contextPruning`, `params`) from the `AgentStepContext` argument, and
  treat them as optional so direct invocation degrades instead of throwing.
- Use the `$VAR_NAME` form in an MCP server's `env` to pull secrets from the
  environment; never hardcode tokens in an agent definition.
- Prefer `outputMode: 'structured_output'` with an `outputSchema` when a parent
  agent consumes the result programmatically.

### Things to avoid

- Do not commit real credentials or `.env.local` contents; only `$VAR` references
  belong in agent files.
- Do not use `inheritParentSystemPrompt` together with `systemPrompt` — the two
  are mutually exclusive.
- Do not treat `.agents/types/` as application source or hand-edit the vendored
  type definitions to fit an agent; conform the agent to them.
- Do not assume git history, CI, or tests exist here unless you have verified it.
