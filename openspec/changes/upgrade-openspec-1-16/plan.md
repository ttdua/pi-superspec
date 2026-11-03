# Upgrade to OpenSpec 1.16 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** Require OpenSpec >= 1.16 and sync the pi skills, the bundled schema (v6) and the specs with the upstream fixes that matter to Superspec.

**Architecture:** The skills are markdown that agents follow; the tests read them as strings, so each skill change is a failing `toContain` test first, then the text. The schema change bumps `version` and `x-pi-superspec.version` to 6 and rewrites verify checks 3 and 4. The preflight change is TypeScript. Specs for this change are already written in `specs/`; they and `design.md` are the source of truth for wording.

**Tech Stack:** TypeScript, vitest (`npx vitest run <file>`), `npm run typecheck`, OpenSpec CLI 1.16 at `/opt/homebrew/bin/openspec` (the `openspec` on PATH may be 1.4.1; check `openspec --version` and put 1.16 first before running schema tests).

Spec references: `openspec/changes/upgrade-openspec-1-16/specs/<capability>/spec.md`. Design: `design.md`.

---

## Task 1: Preflight floor 1.16

**Files:** `extensions/init/preflight.ts`, `tests/init/preflight.test.ts`, `tests/init/init.test.ts`, `tests/init/integration.test.ts` (if it stubs a version)

- [ ] **Step 1:** In `tests/init/preflight.test.ts` change "accepts 1.4.1 and 2.0.0" to accept `1.16.0` and `2.0.0`, and change the rejection case to `1.15.9` and add `1.4.1`, both expecting `ok: false` with `INSTALL_LINE` in the message.
- [ ] **Step 2:** Run `npx vitest run tests/init/preflight.test.ts`; expect the new cases to fail.
- [ ] **Step 3:** In `extensions/init/preflight.ts` change the check to `v.major < 1 || (v.major === 1 && v.minor < 16)` and the message to `Install or upgrade OpenSpec (>= 1.16): ${INSTALL_LINE}`.
- [ ] **Step 4:** In `tests/init/init.test.ts` replace every stubbed `"1.4.1\n"` with `"1.16.0\n"` (lines 40, 96, 110, 166, 439); check `tests/init/integration.test.ts` for the same.
- [ ] **Step 5:** Run `npx vitest run tests/init`; expect pass.
- [ ] **Step 6:** Commit `feat(init): require OpenSpec 1.16`.

## Task 2: Version text in docs and test notices

**Files:** `README.md` (L15, L50), `docs/architecture.md` (L119, L204), `docs/e2e-checklist.md` (L9), `docs/usage-guide.md` (L9, L243-244), `tests/schema.test.ts` (L19), `tests/helpers/project.ts` (the `hasOpenspec` helper)

- [ ] **Step 1:** Replace "1.4 or newer"/"≥ 1.4"/"(>= 1.4)" with 1.16 in those lines; in `docs/usage-guide.md` troubleshooting say the message is `Install or upgrade OpenSpec (>= 1.16): brew install openspec` and mention that the npm package of 1.16 needs Node 22.12 or newer.
- [ ] **Step 2:** Make the skip notice in `tests/schema.test.ts` say `openspec >= 1.16`; read `hasOpenspec` in `tests/helpers/project.ts` and, if it checks a version, raise it to 1.16.
- [ ] **Step 3:** Run `grep -rn "1\.4" README.md docs extensions tests`; only unrelated matches (for example fixture content) may remain.
- [ ] **Step 4:** Run `npx vitest run`; expect pass. Commit `docs: OpenSpec 1.16 floor`.

## Task 3: Schema v6 identity

**Files:** `schema/superspec/schema.yaml`, `tests/schema.test.ts`, `tests/init/schema-install.test.ts`, `tests/fixtures/*`

- [ ] **Step 1:** In `tests/schema.test.ts` L47-51 change the expectations to `version: 6` and `x-pi-superspec:\n\s+version: 6`. Run it; expect failure.
- [ ] **Step 2:** In `schema.yaml` set `version: 6`, `x-pi-superspec.version: 6`, and update the first comment line to `# Superspec schema v6 for pi-superspec.`
- [ ] **Step 3:** In `tests/init/schema-install.test.ts` change the "newer" replacement from `$16` to `$17` (L140) and any `$16`-style or literal `5`/`6` assumptions at L112-118; read `tests/fixtures/*/schema.yaml` and update any fixture that is meant to equal the bundled version.
- [ ] **Step 4:** Run `npx vitest run tests/schema.test.ts tests/init/schema-install.test.ts`; expect pass.
- [ ] **Step 5:** Commit `feat(schema): bump to v6`.

## Task 4: Verify checks for REMOVED/RENAMED and skipped checks

**Files:** `schema/superspec/schema.yaml` (verify instruction, L207-258), `schema/superspec/templates/verify.md`, `tests/schema.test.ts` (verify tests near L164-215 and L481-495)

- [ ] **Step 1:** Add tests that the verify instruction (flattened whitespace, as the existing tests do) contains `REMOVED`, `RENAMED`, `baseline`, `git`, `not verified` and `PASS_WITH_WARNINGS`, and that the template contains `Not verified`. Run; expect failure.
- [ ] **Step 2:** Rewrite check 3 as: "**Requirement evidence**: every ADDED or MODIFIED requirement in the delta specs has implementation evidence (file and line); a REMOVED requirement has evidence that its baseline behavior is gone (read the baseline from the main spec, fall back to git history, otherwise record not verified); a RENAMED requirement keeps its behavior under the new name."
- [ ] **Step 3:** In check 4 add: "Scenarios under a REMOVED requirement are skipped."
- [ ] **Step 4:** After the outcome sentence add: "A check that could not run is recorded as not verified with its reason and never counts as passing; the outcome is then at most PASS_WITH_WARNINGS. A check that does not apply is recorded as not applicable." Keep the six-check count and the "no sync check" wording unchanged.
- [ ] **Step 5:** In `templates/verify.md` add a `Not verified` / `Not applicable` status option next to the existing pass/fail wording, matching its table style.
- [ ] **Step 6:** Run `npx vitest run tests/schema.test.ts`; expect pass. Run `openspec schema validate superspec` against the bundled copy through the existing temp-project test. Commit `feat(schema): verify handles removed and renamed requirements`.

## Task 5: opsx-apply

**Files:** `skills/opsx-apply/SKILL.md` (steps 3-4 at L30-50, guardrails L100), `tests/execution-commands.test.ts`

- [ ] **Step 1:** Add a test `apply uses task locations and scope pauses` asserting `skill("apply")` contains `sourcePath`, `line`, `fully implemented`, `adds scope`, `tracking file` and `tracked tasks are complete`. Run; expect failure.
- [ ] **Step 2:** In step 4 (follow the instruction) add: "Tick each task at the `sourcePath` and `line` the apply instruction returns, after checking that the checkbox there still matches the task; if it does not, re-read the tracking file and do not tick a different task. Mark a task `[x]` only when its behavior is fully implemented."
- [ ] **Step 3:** In step 3 where `blocked` is handled add: "If the state is blocked because artifacts are missing, point to `/opsx-continue`. If the tracking file is missing, report it, offer to repair it, and start no implementation. Do not assume another artifact is ready."
- [ ] **Step 4:** Add to the guardrails: "Pause and ask before adding scope the change does not specify, or narrowing or deferring behavior it does."
- [ ] **Step 5:** In the `all_done` wording say "the tracked tasks are complete" and keep pointing to `/opsx-verify` before `/opsx-archive`; keep the post-PR and fix-iteration triggers as they are.
- [ ] **Step 6:** Run `npx vitest run tests/execution-commands.test.ts`; expect pass. Commit `feat(apply): task locations, blocked causes and scope pauses`.

## Task 6: opsx-verify

**Files:** `skills/opsx-verify/SKILL.md` (steps 5-6 at L45-72, guardrails L94), `tests/execution-commands.test.ts`

- [ ] **Step 1:** Add a test asserting the verify skill contains `Do NOT implement`, `not verified`, `progress` and `PASS_WITH_WARNINGS`. Run; expect failure.
- [ ] **Step 2:** In step 5 add: "Read task progress from the apply instruction (`progress`); if a tracking file is unavailable, record the tasks check as not verified."
- [ ] **Step 3:** In step 6 add: "A check you could not run is recorded as not verified with its reason and is never scored as passing; the outcome is then at most `PASS_WITH_WARNINGS`. Keep the outcome names `PASS`, `PASS_WITH_WARNINGS` and `FAIL`."
- [ ] **Step 4:** Add to guardrails: "Do NOT implement or archive anything during verify; the apply state is context only."
- [ ] **Step 5:** Run the file's tests; expect pass. Commit `feat(verify): read-only rule and not-verified checks`.

## Task 7: opsx-sync

**Files:** `skills/opsx-sync/SKILL.md` (steps 2-6), `tests/execution-commands.test.ts`

- [ ] **Step 1:** Add tests asserting the sync skill contains `openspec instructions specs`, `rules`, `## Purpose`, `retire_capabilities`, `# <capability> Specification`, `delta section headers` and `empty`. Run; expect failure.
- [ ] **Step 2:** In step 3 drop the "or list `specs/<capability>/spec.md`" fallback so only `artifactPaths.specs.existingOutputPaths` is the source.
- [ ] **Step 3:** Add a step after step 3: "Read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints on the text you write; do not copy them into any spec. If it fails, stop and report the error."
- [ ] **Step 4:** In step 4 add the new-capability rules: create a main spec only from ADDED requirements; refuse when the delta has MODIFIED or RENAMED, or only REMOVED, and the main spec is missing; copy the delta's `## Purpose` verbatim, using `TBD` only if the delta has none and flagging it in the report; never overwrite an existing Purpose; title it `# <capability> Specification`; never write delta section headers into a main spec.
- [ ] **Step 5:** In step 4 add the empty-section guard: if applying REMOVED would leave no requirements, stop without writing an empty `## Requirements`; delete the spec only when the change's `.openspec.yaml` sets `retire_capabilities: true`, then report its Purpose and say it can be restored with git. Keep the worktree lookup and the "already applied" skips.
- [ ] **Step 6:** Run the file's tests; expect pass. Commit `feat(sync): purpose, blocked cases and rules`.

## Task 8: opsx-archive

**Files:** `skills/opsx-archive/SKILL.md` (steps 2-5), `tests/execution-commands.test.ts`

- [ ] **Step 1:** Add tests asserting the archive skill contains `openspec list --json`, `totalTasks`, `skipped`, `compare every delta again`, `archive without syncing` and `ask again`. Run; expect failure.
- [ ] **Step 2:** In step 2 say a `skipped` artifact counts as complete. In step 3 take counts from `openspec list --json` (`completedTasks`, `totalTasks`) and stop with an error if that output is invalid.
- [ ] **Step 3:** In step 4: a missing main spec is not unsynced by itself; decide by the delta operations as `opsx-sync` defines. When sync is blocked, offer only "Archive without syncing" or "Cancel". Any other answer: ask again.
- [ ] **Step 4:** After the sync step in step 4 add: "Compare every delta again with its main spec. Report 'Synced' only if all match; if any differs, stop and do not archive."
- [ ] **Step 5:** Keep step 5 using `openspec archive "<name>" --skip-specs -y`. Run the file's tests; expect pass. Commit `feat(archive): verify sync and read counts from the CLI`.

## Task 9: opsx-continue and opsx-ff

**Files:** `skills/opsx-continue/SKILL.md` (steps 2-3, guardrails), `skills/opsx-ff/SKILL.md` (steps 3-4, guardrails), `tests/planning-commands.test.ts`

- [ ] **Step 1:** Add tests: continue contains `isPlanningComplete`, `isComplete`, `existingOutputPaths`, `skipped` and `from disk`; ff contains `Inspect the relevant`, `skipped` and `design` mandatory wording (`always create \`design\``). Run; expect failure.
- [ ] **Step 2:** In continue step 2 read `isPlanningComplete` and fall back to `isComplete` when absent; treat `skipped` as satisfied. In step 3 add the partial-artifact check: for a glob artifact such as `specs`, compare the files the proposal calls for with `existingOutputPaths` and write only the missing ones as the call's one artifact, then run the gate. Say dependencies are always read from disk.
- [ ] **Step 3:** In ff step 4 add "Inspect the relevant repository code, tests and docs before drafting; ground tasks in what you find, never a generic 'explore the codebase' task", and "Always create `design`; skip no other artifact unless status says `skipped`, and list each skipped artifact with its reason in the final summary".
- [ ] **Step 4:** Leave the fixed final-gate packet and the brainstorm gate unchanged. Run `npx vitest run tests/planning-commands.test.ts`; expect pass. Commit `feat(planning): partial artifacts and skipped reporting`.

## Task 10: opsx-explore

**Files:** `skills/opsx-explore/SKILL.md` (stance, diagrams L49-64 and L150-240, capture table L110-126, guardrails L274), `tests/planning-commands.test.ts`

- [ ] **Step 1:** Add tests: explore contains `names the scope`, `openspec new change`, `/opsx-continue`, `config.yaml`, `openspec list --specs` and contains no box-drawing characters (`/[─-╿]/`). Run; expect failure.
- [ ] **Step 2:** Replace every box-drawing diagram character with ASCII (`+`, `-`, `|`, `>`, `v`) and add the line "Diagrams use ASCII characters only."
- [ ] **Step 3:** In the capture section add the consent rule (read-only is free; the first write names the file and scope and needs a yes, unless the user asked for the capture), and the scaffold rule: when an insight needs a new change, you may run `openspec new change <name>` (never create `openspec/changes/` by hand), then point to `/opsx-continue <name>`; do not write `brainstorm.md` or run a review gate in explore.
- [ ] **Step 4:** In guardrails add "Editing a schema, a template or `config.yaml` counts as implementing". In the context checks add `openspec list --specs` and `openspec show <id> --type spec`; make the capture table use the superspec artifact names (`brainstorm.md`, `proposal.md`, `specs/<capability>/spec.md`, `design.md`, `tasks.md`, `plan.md`).
- [ ] **Step 5:** Run the file's tests; expect pass. Commit `feat(explore): consent, scaffold hand-off and ASCII diagrams`.

## Task 11: Provenance headers

**Files:** the header comment of `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/SKILL.md`, `tests/planning-commands.test.ts`

- [ ] **Step 1:** Add a test that each of the eight adapted skills (including `opsx-new`, whose text is otherwise unchanged) contains `synced with 1.16.0`. Run; expect failure.
- [ ] **Step 2:** Change each header to `<!-- Adapted from OpenSpec 1.4.1, synced with 1.16.0 (MIT) for pi. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->` keeping the original upstream skill name in the text for traceability.
- [ ] **Step 3:** Run `npx vitest run`; expect pass. Commit `docs(skills): record the 1.16.0 sync`.

## Task 12: Strict validation cleanup and final checks

**Files:** `openspec/specs/execution-commands/spec.md`, `openspec/specs/planning-commands/spec.md`

- [ ] **Step 1:** Replace the placeholder Purpose in `execution-commands` with one sentence describing the apply, verify, sync and archive skills and their pairs, and in `planning-commands` with one sentence describing explore, new, continue and ff. Edit the main specs directly.
- [ ] **Step 2:** Run `openspec validate upgrade-openspec-1-16 --strict` and `openspec validate --all --strict` with 1.16; expect all passing. If a main-spec warning remains, fix it by splitting requirements in the matching delta.
- [ ] **Step 3:** Run `npm test` and `npm run typecheck`; expect pass.
- [ ] **Step 4:** Run `grep -rn "1\.4" README.md docs extensions skills schema` and confirm only deliberate mentions remain (provenance headers).
- [ ] **Step 5:** Commit `docs(specs): write Purposes for strict validation`.
