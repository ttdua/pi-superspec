# superspec-schema-v5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the bundled `superspec` schema v5 in `schema/superspec/`, forked from upstream Superspec v4, with tests proving it validates, matches the documented DAG, and returns the apply block.

**Architecture:** Copy v4 `schema.yaml`, `templates/` and `LICENSE` from `openspec/schemas/superspec/` (read-only) into `schema/superspec/`, then edit text in place, one documented change per task. Tests copy the schema into a temp OpenSpec project and drive the `openspec` CLI.

**Tech Stack:** YAML, Markdown, TypeScript, vitest, `openspec` CLI ≥ 1.4 (no YAML parser added; use string checks and `openspec ... --json` output).

**Spec:** `openspec/changes/superspec-schema-v5/specs/` (capabilities `bundled-schema`, `package-manifest`) and `openspec/changes/superspec-schema-v5/design.md`. Source docs: `docs/workflow.md`, `docs/domain-model.md`, `docs/architecture.md`.

## Global Constraints

- Never edit anything under `openspec/schemas/superspec/` (upstream v4); confirm with `git diff --stat -- openspec/schemas` at the end.
- Schema: `name: superspec`, `version: 5` (positive integer), top-level `x-pi-superspec: { version: 5 }`.
- No pi or Claude-only tool names in schema text; commands spelled `/opsx-<name>`.
- No new `dependencies` or `devDependencies`.
- All repository content in English. Tests use tabs, like the existing tests.
- Upstream credit: Superspec v4, commit `e1c8f417ee3601208416d988ba3b37d83ddb63f2`, Daniel Hanold (MIT).

## Review Focus

- `openspec` missing or < 1.4 on PATH: tests skip with a visible reason, not fail obscurely.
- Temp projects must not leak: always remove the temp dir in `afterAll`.
- `x-pi-superspec` stripped by OpenSpec: validate test must pass with the key present.
- Doc table parser: a missing or renamed header fails with a clear message instead of comparing empty sets.
- Wording sweeps must not break YAML (block scalars keep indentation): validate runs after every edit task.

## Scenario → test map

All tests live in `tests/schema.test.ts` unless noted.

| Scenario (capability) | Test name |
|---|---|
| Identity fields | `identity: name, version and marker` |
| Validates in a temp project | `openspec schema validate superspec passes` |
| Upstream credit | `credits upstream and ships LICENSE` |
| DAG matches docs | `artifact DAG matches docs/domain-model.md` |
| Templates present | `every artifact template exists` |
| Stub instruction | `design instruction has the No design needed stub` |
| No tool names | `schema text has no harness-specific tool names` |
| Apply block returned | `openspec instructions apply returns the apply block` |
| Apply stops before finishing | `apply stops after final review without finishing-a-development-branch` |
| Worktree branch and authority | `apply names worktree branch and worktree authority` |
| Template fields (apply.md) | `apply.md template records branch facts` |
| Six checks | `verify has the six checks and no sync check` |
| Sync deferred | `sync check is deferred to archive` |
| Branch facts source | `finalize reads apply.md, not git log` |
| AGENTS.md override | `finalize honours AGENTS.md` |
| Files allow-list (package-manifest) | `tests/manifest.test.ts` existing test, extended |

---

### Task 1: Scaffold, identity and validation (implements 1.1, 1.2)

**Files:**
- Create: `schema/superspec/schema.yaml`, `schema/superspec/templates/*.md` (9 files), `schema/superspec/LICENSE` (copied)
- Create: `tests/helpers/project.ts`, `tests/schema.test.ts`

**Interfaces:**
- Produces (`tests/helpers/project.ts`):
  - `hasOpenspec(): boolean` — true when `openspec --version` reports ≥ 1.4.
  - `makeProject(): TempProject` where `TempProject = { dir: string; openspec(args: string[]): { status: number; stdout: string; stderr: string }; cleanup(): void }`. It creates an OS temp dir, copies `schema/superspec` to `<dir>/openspec/schemas/superspec`, writes `<dir>/openspec/config.yaml` containing `schema: superspec`, and runs `openspec` with `cwd: dir` via `spawnSync`.
  - `SCHEMA_DIR: string` — absolute path of `schema/superspec`.

- [ ] **Step 1: Write the failing tests** in `tests/schema.test.ts`: a top-level `const run = hasOpenspec() ? describe : describe.skip` (log the skip reason once with `console.warn`); `beforeAll` makes one project, `afterAll` calls `cleanup`. Tests `identity: name, version and marker` (read `schema/superspec/schema.yaml` as text; assert `/^name: superspec$/m`, `/^version: 5$/m`, `/^x-pi-superspec:\n\s+version: 5$/m`), `openspec schema validate superspec passes` (`status` 0), `credits upstream and ships LICENSE` (`LICENSE` exists; schema header contains `Superspec` and `e1c8f417`).
- [ ] **Step 2: Run** `npx vitest run tests/schema.test.ts` — Expected: FAIL (schema files missing).
- [ ] **Step 3: Copy** `openspec/schemas/superspec/{schema.yaml,templates,LICENSE}` into `schema/superspec/` with `cp -R`. Do not copy `README.md`/`INTEGRATION.md`. Implement `tests/helpers/project.ts`.
- [ ] **Step 4: Edit `schema/superspec/schema.yaml` header**: `name: superspec`, `version: 5`, add `x-pi-superspec:\n  version: 5` after `version`, put a leading comment block crediting Superspec v4 (Daniel Hanold, commit above, MIT, see `LICENSE`) and rewrite `description` to describe v5 (same pipeline, harness-neutral, apply stops after final review, finalize reads `apply.md`). Drop the v3/v4 history paragraph.
- [ ] **Step 5: Run** `npx vitest run tests/schema.test.ts` — Expected: PASS. If validate rejects the marker, stop and report (design risk 1).
- [ ] **Step 6: Commit** `git add schema tests && git commit -m "feat: add superspec schema v5 scaffold forked from v4"`; tick 1.1, 1.2 in `tasks.md`.

### Task 2: Harness-neutral wording and design stub (implements 2.1, 2.2)

**Files:**
- Modify: `schema/superspec/schema.yaml`, `schema/superspec/templates/*.md`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: `makeProject`, `SCHEMA_DIR`.
- Produces: a helper in the test file `schemaText(): string` returning `schema.yaml` plus all templates concatenated.

- [ ] **Step 1: Write failing tests** `schema text has no harness-specific tool names` (for each of `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool`, `/opsx:`: `expect(schemaText()).not.toContain(term)`) and `design instruction has the No design needed stub` (`openspec instructions design --change x --json` in a project after `openspec new change x`; assert instruction contains `No design needed:`). Add a `beforeAll` step creating change `x` via `openspec(["new","change","x"])`; check actual JSON key names with a manual run first.
- [ ] **Step 2: Run** the file — Expected: FAIL on both.
- [ ] **Step 3: Sweep wording** in schema and templates: "Use the Skill tool to invoke **X**" → "Load the **X** skill"; `/opsx:name` → `/opsx-name`; remove "on Claude Code, Cursor, or OpenCode" phrasing in favour of "when subagents are available"; "Task-tool" → "subagent". Do not rename artifact IDs.
- [ ] **Step 4: Edit the `design` instruction**: keep v4 content, add a first paragraph: when brainstorm records no non-trivial technical decision, write exactly two lines: `No design needed: <reason>` and a blank-free second line pointing to brainstorm.md; otherwise use the sections below.
- [ ] **Step 5: Run** the file — Expected: PASS (validate test still green).
- [ ] **Step 6: Commit** `feat(schema): harness-neutral wording and design stub`; tick 2.1, 2.2.

### Task 3: Apply block and apply receipt (implements 2.3)

**Files:**
- Modify: `schema/superspec/schema.yaml` (`apply:` block and `apply` artifact), `schema/superspec/templates/apply.md`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: `makeProject`, change `x`.
- Produces: none.

- [ ] **Step 1: Write failing tests**: `openspec instructions apply returns the apply block` (`openspec(["instructions","apply","--change","x","--json"])` status 0, parsed JSON text contains `worktree`); `apply stops after final review without finishing-a-development-branch` (instruction contains `stops after the final` and a sentence with `does NOT invoke` + `finishing-a-development-branch`, and no instruction line starting with an imperative invoke of that skill); `apply names worktree branch and worktree authority` (contains `branch named <change-name>` — use exact phrase you write — and `authoritative`); `apply.md template records branch facts` (template contains `Worktree path`, `Worktree branch`, `Feature branch`, `Base branch`, `Range`, `Iteration`, `Executor`, `Completed`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Edit the `apply:` instruction**: step 0 commits the change dir on the feature branch, then creates the worktree with branch `<change-name>`; add a "Change directory authority" paragraph (from then until finalize the worktree copy is authoritative: `tasks.md` ticks, `apply.md`, `verify.md` are written and committed there; `/opsx-verify` runs with the worktree as working directory); executor 2a/2b kept, 2b must request a whole-branch review before step 3; step 3 writes `apply.md` and then **stops** (state it does NOT invoke `finishing-a-development-branch`); delete the old step 4 verification loop (move the convergence loop text to the `verify` instruction in Task 4); record in step 3 the branch facts (feature branch = branch checked out before step 0, base branch = integration branch).
- [ ] **Step 4: Edit `templates/apply.md`** to add `Worktree path`, `Worktree branch`, `Feature branch`, `Base branch` fields (replace the old Workspace section) keeping the other fields; tasks done/total stays.
- [ ] **Step 5: Run** — Expected: PASS.
- [ ] **Step 6: Commit** `feat(schema): apply stops after final review and records branch facts`; tick 2.3.

### Task 4: Single verify list (implements 2.4)

**Files:**
- Modify: `schema/superspec/schema.yaml` (`verify` artifact), `schema/superspec/templates/verify.md`, `schema/superspec/templates/finalize.md` (next-step line)
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: change `x`.
- Produces: none.

- [ ] **Step 1: Write failing tests**: `verify has the six checks and no sync check` (instruction and template both contain `openspec validate <change>`; neither contains `Delta Spec Sync` or `Delta spec sync state` case-insensitively; instruction contains `PASS_WITH_WARNINGS` and `5 iterations`); `sync check is deferred to archive` (verify instruction contains `/opsx-archive` followed in the same sentence by `sync`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Rewrite the `verify` instruction** to the six workflow.md checks (validate `<change>` not `--all`; tasks; requirement evidence file/line; scenario→test mapping plus a fresh project test run recorded; design coherence warning only; clean tree + commit range), run with the worktree as working directory, copy `Iteration` from `apply.md`, outcome and convergence loop (code-fixable FAIL → load `systematic-debugging`, re-apply iteration N+1; stop after 5 iterations), PASS → `/opsx-continue` to finalize, and a sentence: "`/opsx-archive` syncs delta specs if needed." Rewrite `templates/verify.md` to the same six numbered sections plus Overall Decision; update `/opsx:` leftovers.
- [ ] **Step 4: Edit `templates/finalize.md`** next-step wording to say `/opsx-archive` syncs delta specs when needed.
- [ ] **Step 5: Run** — Expected: PASS.
- [ ] **Step 6: Commit** `feat(schema): single verify check list, sync check moved to archive`; tick 2.4.

### Task 5: Finalize reads the apply receipt (implements 2.5)

**Files:**
- Modify: `schema/superspec/schema.yaml` (`finalize` artifact)
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write failing tests**: `finalize reads apply.md, not git log` (instruction contains `git worktree list --porcelain`, `apply.md` and `refs/heads/<change-name>`; does not contain `git -C "$WORKTREE" log` nor `rev-list --count`); `finalize honours AGENTS.md` (contains `AGENTS.md` and `overrides`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Edit finalize step 1**: keep the worktree lookup; read `WORKTREE_BRANCH`, `FEATURE_BRANCH`, `BASE_BRANCH` from `$WORKTREE/openspec/changes/<change-name>/apply.md` (ask the user when a field is missing); remove the `git log` pipeline. Add a paragraph near the top: a policy in the project's `AGENTS.md` overrides any step below. Keep the rest of v4 (tests, ff-merge, cleanup guard, receipt, push, PR offer, comment subroutine, escape hatch). Update prerequisites to drop "main checkout is feature branch" assumptions only where they contradict `apply.md` facts.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(schema): finalize reads apply receipt and honours AGENTS.md`; tick 2.5.

### Task 6: DAG test and templates present (implements 3.1, 3.2)

**Files:**
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces (in test file): `parseArtifactTable(markdown: string): Map<string, string[]>` — finds the section `## Artifact` in `docs/domain-model.md`, reads the table with header `| ID | File | Requires | Notes |`, returns id (backticks stripped) → requires list (`—` → `[]`, comma separated). Throws `Error("Artifact table not found in docs/domain-model.md")` when absent.

- [ ] **Step 1: Write tests** `artifact DAG matches docs/domain-model.md` (compare `openspec status --change x --json` `artifacts[].id` / `requires`-equivalents with the parsed map; if status JSON lacks `requires`, use `missingDeps` on a fresh change as the fallback check that blocked artifacts list their documented dependency, plus compare the id set) and `every artifact template exists` (each template referenced by `schema.yaml` `template:` lines exists in `schema/superspec/templates/`).
- [ ] **Step 2: Run** — Expected: PASS if Tasks 1–5 are right; if the status JSON shape differs, adjust the comparison only, not the schema.
- [ ] **Step 3: Add a parser unit test** `parseArtifactTable throws without a table` using inline markdown.
- [ ] **Step 4: Commit** `test(schema): DAG matches docs and templates exist`; tick 3.1, 3.2 (the apply-block test already landed in Task 3).

### Task 7: Manifest and final verification (implements 4.1, 4.2)

**Files:**
- Modify: `package.json` (`files`), `tests/manifest.test.ts`

- [ ] **Step 1: Update the manifest test** `publishes extensions, skills and prompts but not tests` to also expect `schema`; run `npx vitest run tests/manifest.test.ts` — Expected: FAIL.
- [ ] **Step 2: Add `"schema"` to `files`** in `package.json`; re-run — Expected: PASS.
- [ ] **Step 3: Run** `npm test && npm run typecheck` — Expected: all pass.
- [ ] **Step 4: Run** `git diff --stat main -- openspec/schemas` — Expected: no output.
- [ ] **Step 5: Commit** `feat: publish schema directory with the package`; tick 4.1, 4.2.
