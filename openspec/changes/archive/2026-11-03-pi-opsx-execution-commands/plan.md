# pi-opsx-execution-commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the pi skill and prompt pairs `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive`, with no Claude tool names.

**Architecture:** Each command is a thin prompt (`prompts/opsx-<x>.md`) that reads `skills/opsx-<x>/SKILL.md`. Apply and verify wrap the schema's `openspec instructions apply|verify` text and add only the pi layer (subagent detection, tool mapping, Superpowers rule). Sync and archive are self-contained because OpenSpec has no sync command. Layout, prompt shape and credit lines copy the planning commands.

**Tech Stack:** Markdown skills and prompts, vitest (`npm test`), TypeScript (`npm run typecheck`).

**Spec:** this change's `specs/` (`execution-commands`, `package-activation` delta) and `design.md`.

## Global Constraints

- Skill frontmatter `name` equals its directory name; every skill and prompt has a non-empty `description`.
- Prompt body: names its skill, mentions `SKILL.md`, contains `$@`, at most 15 lines, no command logic. Copy the shape of `prompts/opsx-ff.md`.
- Forbidden strings anywhere in `skills/` and `prompts/`: `AskUserQuestion`, `TodoWrite`, `Task tool`.
- Ask wording: "Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait." Todo wording: "`todo` tool if available; otherwise state the checklist in your reply."
- Superpowers rule (apply, verify): drop the `superpowers:` prefix, read skill `<x>`'s `SKILL.md`, follow it, ignore its closing handoff, and "STOP and tell the user to install Superpowers" if absent.
- Each SKILL.md carries `<!-- Adapted from OpenSpec 1.4.1 <source-skill> (MIT) for pi. -->` under the frontmatter.
- Do not edit `schema/`, `openspec/schemas/`, `package.json` or `extensions/`.
- All repository content is English.

## Review Focus

- `/opsx-apply` on a `blocked` or `all_done` change must not write code (Task 2 test).
- Apply with no `subagent` tool must not mention fabricated `Task` calls and must request a whole-branch review (Task 2 test).
- Verify must not contain the delta-sync check; archive must (Tasks 3 and 5 tests).
- Archive with incomplete tasks warns and asks, never blocks silently (Task 5 test).
- Sync must not archive (Task 4 test).

---

## Scenario → test map

| Scenario | Test (`tests/execution-commands.test.ts`) |
|---|---|
| Pairs exist | `ships all four skill and prompt pairs` |
| Prompt delegates to skill | `prompts delegate to their skill and pass $@` |
| Excluded commands absent | `does not ship opsx-propose or opsx-bulk-archive` |
| Forbidden names absent | `contains no Claude tool names` |
| Ask fallback | `skills that ask the user state a plain-text fallback` |
| Blocked change | `apply handles blocked and all_done states` |
| Stops after the receipt | `apply stops after the receipt without finishing the branch` |
| With pi-subagents | `apply selects subagent-driven-development when the subagent tool exists` |
| Without pi-subagents | `apply falls back to executing-plans with a whole-branch review` |
| Feedback after a PR is open | `apply documents the post-PR iteration` |
| Missing apply receipt / Verify in the worktree / Failing verify | `verify runs in the worktree and requires apply.md` |
| Sync only | `sync merges deltas and does not archive` |
| Unsynced deltas / Already synced / Incomplete artifacts | `archive performs the delta-sync check` |
| Skill missing | `apply and verify carry the Superpowers rule` |
| Visible when marked / Hidden when unmarked / No placeholder resources | `tests/extension.test.ts` (updated) plus existing `ships no placeholder resources` |

---

### Task 1: Content test and extension assertions — implements 1.1, 1.2, 1.3, 1.4

**Files:**
- Create: `tests/execution-commands.test.ts`
- Modify: `tests/extension.test.ts` (the marked / unmarked activation assertions near line 46)

**Interfaces:**
- Produces: test names from the map above. They stay red until Tasks 2–5 land; each later task turns its own tests green.

- [ ] **Step 1:** Create `tests/execution-commands.test.ts` modelled on `tests/planning-commands.test.ts` (same `read`, `exists`, `walk`, `frontmatter` helpers, `COMMANDS = ["apply", "verify", "sync", "archive"] as const`). Write every test named in the map. Content assertions, all on `skills/opsx-<c>/SKILL.md` text:
  - apply: contains `openspec instructions apply`, `blocked`, `all_done`, `subagent`, `subagent-driven-development`, `executing-plans`, `whole-branch review`, `finishing-a-development-branch` (stated as forbidden: assert the text also contains `Do NOT invoke`), `post-PR`, `receiving-code-review`, `iteration`, and the Superpowers rule string `STOP and tell the user to install Superpowers`.
  - verify: contains `openspec instructions verify`, `worktree`, `apply.md`, `systematic-debugging`, `5 iterations`, the Superpowers rule string, and does not contain `delta-sync`.
  - sync: contains `RENAMED`, `REMOVED`, `MODIFIED`, `ADDED`, `openspec validate`, and `Do NOT archive`.
  - archive: contains `delta-sync`, `openspec archive`, `sync`, and `confirm`.
  - all four ask-capable skills (apply, verify, sync, archive): contain `ask_user_question` and `numbered options`.
- [ ] **Step 2:** In `tests/extension.test.ts`, extend the marked-project assertion to also expect `opsx-apply/SKILL.md` and `opsx-apply.md`; keep the unmarked assertion.
- [ ] **Step 3:** Run `npx vitest run tests/execution-commands.test.ts`. Expected: FAIL (files missing).
- [ ] **Step 4:** Commit.

```bash
git add tests/execution-commands.test.ts tests/extension.test.ts
git commit -m "test: add execution-commands content tests"
```

### Task 2: opsx-apply skill and prompt — implements 2.1, 3.1 (apply)

**Files:**
- Create: `skills/opsx-apply/SKILL.md`, `prompts/opsx-apply.md`
- Source to adapt: `.claude/skills/openspec-apply-change/SKILL.md`

**Interfaces:**
- Consumes: Task 1 tests.
- Produces: the skill text other tasks do not depend on.

- [ ] **Step 1:** Write `prompts/opsx-apply.md` with description "Implement a change: worktree, executor, tasks, then apply.md" and the body shape of `prompts/opsx-ff.md` (skill `opsx-apply`).
- [ ] **Step 2:** Write `skills/opsx-apply/SKILL.md` with these steps, in the style of `skills/opsx-continue/SKILL.md`:
  1. Select the change (ask when several exist; announce `Using change: <name>`).
  2. `openspec status --change "<name>" --json` and `openspec instructions apply --change "<name>" --json`. If state is `blocked`: show the message, suggest `/opsx-continue`, STOP without code changes. If `all_done`: suggest `/opsx-verify` then `/opsx-archive`, STOP.
  3. Post-PR check: if `apply.md` and `finalize.md` exist and the user is addressing PR review feedback, go to **Post-PR mode** (below); otherwise continue.
  4. Read every `contextFiles` path, then follow the returned apply instruction (step 0 commit, worktree on branch `<change-name>`, executor, receipt).
  5. Executor: "If the `subagent` tool from `pi-subagents` exists in this session, follow 2a: read `subagent-driven-development` and execute `plan.md` through it. If it does not exist, follow 2b: read `executing-plans`, state that TDD and review are not enforced for you, follow TDD manually, and request a whole-branch review (`requesting-code-review`) over the full commit range before writing `apply.md`. Never invent subagent calls." Record the executor actually used in `apply.md`.
  6. Write `apply.md` per the schema receipt, commit it in the worktree, then STOP. "Do NOT invoke `finishing-a-development-branch`." Point to `/opsx-verify`.
  7. **Post-PR mode:** read `receiving-code-review`; fix on the feature branch in the main checkout, TDD per fix; append a `post-PR iteration N+1` entry with the new commit range to `apply.md`; tell the user to run `/opsx-verify`, then update `finalize.md`; push and reviewer-comment follow finalize's policy and a project `AGENTS.md` policy overrides.
  8. Include the Superpowers rule and the ask / todo wordings from Global Constraints.
- [ ] **Step 3:** Run `npx vitest run tests/execution-commands.test.ts -t "apply"`. Expected: apply tests and the shared pair/forbidden-name tests for apply PASS.
- [ ] **Step 4:** Commit.

```bash
git add skills/opsx-apply prompts/opsx-apply.md
git commit -m "feat: add opsx-apply skill and prompt"
```

### Task 3: opsx-verify skill and prompt — implements 2.2, 3.1 (verify)

**Files:**
- Create: `skills/opsx-verify/SKILL.md`, `prompts/opsx-verify.md`
- Source to adapt: `.claude/skills/openspec-verify-change/SKILL.md`

- [ ] **Step 1:** Write `prompts/opsx-verify.md` (description "Verify an applied change and write verify.md").
- [ ] **Step 2:** Write `skills/opsx-verify/SKILL.md`: select change; locate the worktree with `git worktree list --porcelain` filtered on `branch refs/heads/<change-name>` (ask if not found) and run every `openspec` call and check with it as working directory; require `apply.md` there, else STOP and point to `/opsx-apply`; run `openspec instructions verify --change "<name>" --json` and follow it (six checks, fresh project test command with the result recorded, `verification-before-completion` evidence); write `verify.md` copying `Iteration:` from `apply.md`; outcome `PASS` / `PASS_WITH_WARNINGS` / `FAIL`; on code-fixable FAIL read `systematic-debugging`, re-apply (iteration N+1), stop after 5 iterations and report; state that the delta-spec sync check belongs to `/opsx-archive` (do not use the literal hyphenated term `delta-sync` in this file). Include the Superpowers rule and ask wording.
- [ ] **Step 3:** Run `npx vitest run tests/execution-commands.test.ts -t "verify"`. Expected: PASS.
- [ ] **Step 4:** Commit.

```bash
git add skills/opsx-verify prompts/opsx-verify.md
git commit -m "feat: add opsx-verify skill and prompt"
```

### Task 4: opsx-sync skill and prompt — implements 2.3, 3.1 (sync)

**Files:**
- Create: `skills/opsx-sync/SKILL.md`, `prompts/opsx-sync.md`
- Source to adapt: `.claude/skills/openspec-sync-specs/SKILL.md`

- [ ] **Step 1:** Write `prompts/opsx-sync.md` (description "Sync delta specs into living specs without archiving").
- [ ] **Step 2:** Write `skills/opsx-sync/SKILL.md`: select change (ask when several); for each `specs/<capability>/spec.md` in the change merge into `openspec/specs/<capability>/spec.md` in the order RENAMED, REMOVED, MODIFIED, ADDED (a new capability copies the delta as the main spec with a `## Requirements` header); report a per-capability summary; run `openspec validate --specs` (or `openspec validate <capability> --type spec`) and report; "Do NOT archive the change". Ask wording per Global Constraints.
- [ ] **Step 3:** Run `npx vitest run tests/execution-commands.test.ts -t "sync"`. Expected: PASS.
- [ ] **Step 4:** Commit.

```bash
git add skills/opsx-sync prompts/opsx-sync.md
git commit -m "feat: add opsx-sync skill and prompt"
```

### Task 5: opsx-archive skill and prompt — implements 2.4, 3.1 (archive)

**Files:**
- Create: `skills/opsx-archive/SKILL.md`, `prompts/opsx-archive.md`
- Source to adapt: `.claude/skills/openspec-archive-change/SKILL.md`

- [ ] **Step 1:** Write `prompts/opsx-archive.md` (description "Sync if needed, then archive a completed change").
- [ ] **Step 2:** Write `skills/opsx-archive/SKILL.md`: select change (ask when several, never guess); `openspec status --change "<name>" --json`; warn (do not block) on incomplete artifacts and open task boxes and ask the user to confirm before continuing; the **delta-sync check**: compare each delta spec with its main spec, and if they differ report the differences and offer the sync (use the `opsx-sync` skill logic, ask with `ask_user_question` or numbered options, recommended "Sync now"); archive with `openspec archive "<name>"`; summarise (change, schema, archive location, specs synced); runs in the main checkout after finalize. Ask wording per Global Constraints.
- [ ] **Step 3:** Run `npx vitest run tests/execution-commands.test.ts`. Expected: all PASS.
- [ ] **Step 4:** Commit.

```bash
git add skills/opsx-archive prompts/opsx-archive.md
git commit -m "feat: add opsx-archive skill and prompt"
```

### Task 6: Full verification and manual runs — implements 4.1, 4.2, 4.3

**Files:**
- Modify: `openspec/changes/pi-opsx-execution-commands/tasks.md` (ticks only)

- [ ] **Step 1:** Run `npm test && npm run typecheck`. Expected: all PASS, no errors.
- [ ] **Step 2:** Run `grep -rnE "AskUserQuestion|TodoWrite|Task tool" skills prompts`. Expected: no output.
- [ ] **Step 3:** Leave 4.2 and 4.3 unticked: they are manual, non-blocking runs in pi (with and without `pi-subagents`). Record in the final report that they were not executed.
- [ ] **Step 4:** Commit any tick changes.

```bash
git add openspec/changes/pi-opsx-execution-commands/tasks.md
git commit -m "docs(openspec): tick execution-commands tasks"
```
