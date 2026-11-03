## Why

A project that already has a codebase starts Superspec with an empty `openspec/specs/`, so every later change is written without a description of current behaviour. Reading the whole codebase by hand to write those specs is slow, and an agent doing it in one context wastes tokens. Fast-model scouts can draft the specs in parallel, and the normal review gates can check them before they become the source of truth.

## What Changes

**`/opsx-init --generate`**
- From: `/opsx-init` accepts only `--lang`; its final report always ends with `Next: /opsx-new <name>`.
- To: `--generate` is also accepted (alone or with `--lang`). On a successful activation the report adds `Next: /opsx-generate-specs` for existing codebases. Init itself starts no agent work.
- Reason: init is deterministic TypeScript and cannot dispatch subagents; a hand-off keeps it idempotent.
- Impact: non-breaking; without the flag nothing changes.

**New command `/opsx-generate-specs`**
- A skill and prompt pair that maps the codebase, asks the user once to confirm the capability list, creates the change `bootstrap-specs`, runs one scout per capability (fast model through `pi-subagents`, sequential in-session without it), and writes `brainstorm`, `proposal`, a `design` stub and delta specs.
- Every requirement carries an `Evidence:` line; requirements inferred from code alone carry `Confidence: inferred`.
- It stops after `specs` and tells the user to run `/opsx-ff bootstrap-specs`, which gates `specs` and writes `tasks` and `plan`. The rest of the DAG runs unchanged.
- It never overwrites existing specs or an existing `bootstrap-specs` change without asking.

**Docs**
- `docs/architecture.md`, `docs/usage-guide.md`, `README.md` and `README.vi.md` describe the flag and the command.

## Capabilities

### New Capabilities
- `generate-specs-command`: the `/opsx-generate-specs` skill and prompt: stages, scout dispatch and fallback, spec output format, language, safety rules, hand-off.

### Modified Capabilities
- `init-command`: accepts `--generate` and prints the extra next step on activation.
- `usage-guide`: documents bootstrapping specs for an existing codebase.
- `project-readme`: the command table lists `/opsx-generate-specs`.

## Impact

- Code: `extensions/init/args.ts` (parse `--generate`), `extensions/init/init.ts` (report text).
- New files: `skills/opsx-generate-specs/SKILL.md`, `prompts/opsx-generate-specs.md`.
- Docs: `docs/architecture.md`, `docs/usage-guide.md`, `README.md`, `README.vi.md`.
- Tests: `tests/init/args.test.ts`, `tests/init/init.test.ts`, a new skill/prompt test, README command-table test.
- No new dependency, no schema change (bundled schema stays version 5), no change to the published `files` list.
