# init-generate-spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/opsx-init --generate` (a hint) and a new `/opsx-generate-specs` skill and prompt that map a codebase, confirm capabilities with the user, and scout draft delta specs into the change `bootstrap-specs`.

**Architecture:** `parseInitArgs` learns a standalone `--generate` token and `runInit` adds one report line on activation. All scouting logic is plain skill text in `skills/opsx-generate-specs/SKILL.md`, delegated to by a thin prompt, covered by content tests like the other command skills. No schema change.

**Tech Stack:** TypeScript (ESM, tabs), vitest, Markdown skills and prompts, OpenSpec CLI.

**Spec:** `openspec/changes/init-generate-spec/` (`proposal.md`, `design.md`, `specs/generate-specs-command`, `specs/init-command`, `specs/usage-guide`, `specs/project-readme`).

## Global Constraints

- All repository content (code, comments, docs, commits) is in English.
- Skills and prompts MUST NOT contain `AskUserQuestion`, `TodoWrite` or `Task tool`; use the `ask_user_question` tool, the `subagent` tool from `pi-subagents`, with plain fallbacks.
- Bundled schema stays version 5; `openspec/schemas/superspec/` is never edited.
- Do not add a dependency; the `package.json` `files` list stays `extensions`, `skills`, `prompts`, `schema`.
- Existing tests use `toEqual({ lang })`, so `parseInitArgs` returns `generate: true` only when the flag is present.
- Next-step line printed on activation with the flag: `For an existing codebase, run /opsx-generate-specs to draft specs from the code.`
- Change name `bootstrap-specs`; at most 12 capabilities; ignored directories `node_modules`, `dist`, `build`, `vendor`, `.git`.

## Review Focus

- `--generate` given twice or as `--generate=x`: error, no file written (Task 1).
- `--lang Tiếng Việt --generate` and `--generate --lang vi`: language value unaffected by token position (Task 1).
- A blocked, preflight-failed or validation-failed run with the flag: no generate hint (Task 2).
- Second `/opsx-init --generate` run: every file byte-identical (Task 2).
- Prompt carries no command logic; skill has no forbidden tool names (Task 3).

---

## Task 1: Parse `--generate`

**Files:**
- Modify: `extensions/init/args.ts`
- Test: `tests/init/args.test.ts`

**Interfaces:**
- Consumes: `validateLanguage` from `extensions/init/config.ts`.
- Produces: `type InitArgs = { lang?: string; generate?: true } | { error: string }`; `parseInitArgs(args: string): InitArgs` (key `generate` present only when set).

- [ ] **Step 1: Add failing tests** to `describe("parseInitArgs")`:
  - `parseInitArgs("--generate")` equals `{ generate: true }`.
  - `"--lang vi --generate"`, `"--generate --lang vi"` equal `{ lang: "vi", generate: true }`; `"--lang Tiếng Việt --generate"` equals `{ lang: "Tiếng Việt", generate: true }`.
  - `"--generate --generate"`, `"--generate=yes"`, `"--generate x"` each return an `error` containing `Unknown argument` (or the repeated-flag text).
  - `"--force --generate"` returns an `error` containing `Unknown argument`.
  - Existing expectations stay unchanged.
- [ ] **Step 2: Run** `npx vitest run tests/init/args.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** in `parseInitArgs`: split the trimmed string on whitespace, count tokens exactly equal to `--generate`; more than one returns `{ error: "Repeated argument: --generate. Usage: /opsx-init [--lang <language>] [--generate]" }`; remove the token (join the rest with single spaces) and parse the remainder with the existing `--lang` logic; an empty remainder is valid. Reword the unknown-argument usage text to `/opsx-init [--lang <language>] [--generate]`. Collapsing whitespace is safe for the language value because `validateLanguage` input already comes trimmed; keep the quote stripping on the remainder.
- [ ] **Step 4: Run** the same command. Expected: PASS, and `npx vitest run tests/init` still passes.
- [ ] **Step 5: Commit** `git add extensions/init/args.ts tests/init/args.test.ts && git commit -m "feat(init): parse the --generate flag"`

## Task 2: Report the next step on activation

**Files:**
- Modify: `extensions/init/init.ts` (lines around the final `io.report`)
- Test: `tests/init/init.test.ts`, `tests/init/integration.test.ts`

**Interfaces:**
- Consumes: `parseInitArgs` result from Task 1 (`parsed.generate`).
- Produces: unchanged `runInit(io, packageRoot, args = ""): Promise<InitOutcome>`; the activation report gains the Global Constraints line after `Superspec is set up. Next: /opsx-new <name>` only when the flag is set.

- [ ] **Step 1: Add failing tests** in `tests/init/init.test.ts` using `recording(root)`:
  - `runInit(io, packageRoot, "--generate")` returns `"activated"` and `io.reports[0]` contains `/opsx-generate-specs` and `Next: /opsx-new <name>`.
  - without the flag `io.reports[0]` does not contain `/opsx-generate-specs`.
  - with `--generate`: a foreign existing schema (reuse the setup of the existing blocked-schema test) returns `"blocked"`, `io.reports` is `[]` and no note contains `/opsx-generate-specs`; a failing `schema validate` returns `"validation-failed"` with no generate hint; a missing `openspec` returns `"preflight-failed"`.
  - `"--generate=x"` returns `"invalid-arguments"` and `readdirSync(root)` is `[]`.
  - `"--lang vi --generate"` leaves `language: vi` in `openspec/config.yaml` after the run.
- [ ] **Step 2: Run** `npx vitest run tests/init/init.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** in `runInit`: build the report lines array as today and push the hint line when `parsed.generate` is true, after the `Next:` line. Nothing else in `runInit` reads the flag.
- [ ] **Step 4: Add an integration test** in `tests/init/integration.test.ts`, following that file's existing real-`openspec` pattern: `runInit(io, packageRoot, "--generate")` on an empty temp git repo activates and `isActivated` is true; snapshot all file contents (path to bytes), run `runInit(io, packageRoot, "--generate")` again, and expect an identical snapshot.
- [ ] **Step 5: Run** `npx vitest run tests/init`. Expected: PASS.
- [ ] **Step 6: Commit** `git add extensions/init/init.ts tests/init && git commit -m "feat(init): print /opsx-generate-specs next step with --generate"`

## Task 3: `opsx-generate-specs` skill and prompt

**Files:**
- Create: `skills/opsx-generate-specs/SKILL.md`, `prompts/opsx-generate-specs.md`
- Create: `tests/generate-specs-command.test.ts`

**Interfaces:**
- Consumes: conventions of `skills/opsx-ff/SKILL.md` (frontmatter `name`/`description`, ask-tool and `subagent` fallback wording, `openspec` calls) and of `prompts/opsx-explore.md` (two-line delegating prompt ending with `User input: $@`).
- Produces: skill name `opsx-generate-specs`; prompt file `prompts/opsx-generate-specs.md`.

- [ ] **Step 1: Write the failing test file** `tests/generate-specs-command.test.ts` (same `read`/`exists`/`frontmatter` helpers as `tests/planning-commands.test.ts`) with these tests:
  - pair exists; frontmatter has `^name: opsx-generate-specs\s*$`; prompt contains `opsx-generate-specs` and `$@`; prompt has fewer than 12 lines.
  - skill and prompt contain none of `AskUserQuestion`, `TodoWrite`, `Task tool`.
  - skill contains each of: `bootstrap-specs`, `/opsx-ff bootstrap-specs`, `Evidence:`, `Confidence: inferred`, `No design needed:`, `pi-subagents`, `ask_user_question`, `openspec/specs/`, `node_modules`, `openspec validate bootstrap-specs --strict`, `language`, and the number `12`.
  - skill states it never writes `tasks.md` (assert the sentence `Do not write tasks.md`).
- [ ] **Step 2: Run** `npx vitest run tests/generate-specs-command.test.ts`. Expected: FAIL (files missing).
- [ ] **Step 3: Write `SKILL.md`** with frontmatter `name: opsx-generate-specs` and a one-sentence `description`, an attribution-free body with these numbered stages, each stating the rule from `specs/generate-specs-command/spec.md`: (1) precondition (activated project, code exists, else stop); (2) MAP with one fast-model agent if the `subagent` tool lets a model be chosen, else default, output at most 12 candidates (kebab-case, two or more words, purpose, directories), skipping ignored directories; (3) drop candidates whose name exists under `openspec/specs/`; (4) CONFIRM once through `ask_user_question` (plain numbered fallback) with keep/drop/rename and a work estimate; cancel creates nothing; (5) `openspec new change "bootstrap-specs"`, ask before continuing an existing one, never overwrite `done` artifacts; (6) SCOUT: subagents when the `subagent` tool exists, else sequential in-session writing each file before the next, never invent subagent calls; (7) scout contract: only `## ADDED Requirements`, `SHALL`/`MUST`, `#### Scenario:` with WHEN/THEN, `Evidence:` line, `Confidence: inferred` rule, behaviour not structure, read tests and docs; (8) prose in the `language:` from `openspec/config.yaml`, keywords in English; (9) write `brainstorm.md`, `proposal.md`, two-line `design.md` stub beginning `No design needed:`; (10) run `openspec validate bootstrap-specs --strict` and fix until it passes; (11) stop with `Do not write tasks.md`, `plan.md` or later artifacts, and tell the user to run `/opsx-ff bootstrap-specs`.
- [ ] **Step 4: Write `prompts/opsx-generate-specs.md`** in the shape of `prompts/opsx-explore.md`: frontmatter `description: Draft OpenSpec specs for an existing codebase with scout agents`, one line telling the agent to read the `SKILL.md` listed for skill `opsx-generate-specs` and follow it exactly, then `User input: $@`.
- [ ] **Step 5: Run** `npx vitest run tests/generate-specs-command.test.ts tests/planning-commands.test.ts tests/execution-commands.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `git add skills/opsx-generate-specs prompts/opsx-generate-specs.md tests/generate-specs-command.test.ts && git commit -m "feat: add the opsx-generate-specs skill and prompt"`

## Task 4: Docs

**Files:**
- Modify: `README.md`, `README.vi.md`, `docs/usage-guide.md`, `docs/architecture.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the skill and prompt names from Task 3.
- Produces: docs matching `specs/usage-guide` and `specs/project-readme` deltas.

- [ ] **Step 0: Add a failing test** to `tests/generate-specs-command.test.ts`: every `prompts/opsx-*.md` name appears as `/opsx-<name>` in a table row (a line starting with `|`) of both `README.md` and `README.vi.md`, and the `/opsx-init` row in both contains `--generate`. Run `npx vitest run tests/generate-specs-command.test.ts`; expected: FAIL.
- [ ] **Step 1: README tables.** Add a `/opsx-generate-specs` row (English in `README.md`, Vietnamese in `README.vi.md`, same position and section order) and extend the `/opsx-init` row to mention `--generate` in both files.
- [ ] **Step 2: Usage guide.** Add a section `## Existing codebase: bootstrap specs` before `## Executors` in `docs/usage-guide.md`: commands in order (`/opsx-init --generate`, `/opsx-generate-specs`, `/opsx-ff bootstrap-specs`, then `/opsx-apply` to `/opsx-archive`), the confirmation question, `pi-subagents` versus sequential, where drafts live (`openspec/changes/bootstrap-specs/`), the meaning of `Confidence: inferred` and that the review gate is where to confirm or remove it, and that existing specs are never overwritten.
- [ ] **Step 3: Architecture.** In `docs/architecture.md` add `--generate` to the `/opsx-init` section (hint only, no agent work, reason: init is TypeScript and cannot dispatch subagents), add the skill and prompt to the Components tree and table, and note in the runtime flow that the new prompt is discovered only after activation.
- [ ] **Step 4: Changelog.** Under `### Added` in `CHANGELOG.md` add one bullet for `/opsx-init --generate` and `/opsx-generate-specs`.
- [ ] **Step 5: Run** `npm run typecheck && npm test`. Expected: all PASS, including the README assertions from Task 3.
- [ ] **Step 6: Commit** `git add README.md README.vi.md docs CHANGELOG.md && git commit -m "docs: document --generate and /opsx-generate-specs"`

## Task 5: Final verification

**Files:** none

- [ ] **Step 1: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 2: Run** `openspec validate init-generate-spec --strict`. Expected: `Change 'init-generate-spec' is valid`.
- [ ] **Step 3: Manual check** from `docs/e2e-checklist.md` style: in a scratch repository with a small codebase run `/opsx-init --generate`, then `/opsx-generate-specs`; confirm `openspec/changes/bootstrap-specs/` holds `brainstorm.md`, `proposal.md`, `design.md` and specs with `Evidence:` lines, and no `tasks.md`.
