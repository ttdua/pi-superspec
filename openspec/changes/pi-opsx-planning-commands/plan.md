# pi-opsx-planning-commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff` as pi-adapted skill + thin prompt pairs, replacing the package-skeleton placeholders.

**Architecture:** Each command is `skills/opsx-<x>/SKILL.md` (all logic, adapted from the OpenSpec 1.4.1 skills in `.claude/skills/openspec-*`) plus `prompts/opsx-<x>.md` (reads that SKILL.md, follows it, input is `$@`). Resources are already returned by the extension's `resources_discover` for activated projects, so no extension or `package.json` change is needed. `continue` and `ff` carry one shared rule for artifacts written by Superpowers skills.

**Tech Stack:** Markdown skills/prompts, TypeScript + vitest (`npm test`, `npm run typecheck`).

**Spec:** `openspec/changes/pi-opsx-planning-commands/specs/` (`planning-commands`, `package-activation` delta) and `design.md` in the same directory.

## Global Constraints

- All repository content is English; skill/prompt text is harness-aware for pi only.
- Forbidden anywhere under `skills/` and `prompts/`: `AskUserQuestion`, `TodoWrite`, `Task tool`.
- Skill directory name == frontmatter `name`: `opsx-explore`, `opsx-new`, `opsx-continue`, `opsx-ff` (never `openspec-*`).
- Skill `description` ≤ 1024 chars, `name` ≤ 64 chars, lowercase/digits/hyphens only.
- pi has no `Skill` tool: skills are loaded by reading `SKILL.md`; prompt args arrive as `$@`.
- Optional tools use "if available, otherwise plain fallback" wording: `ask_user_question`, `todo`.
- `opsx-new` must not pass `--schema` (project `config.yaml` selects `superspec`).
- Do not edit `openspec/schemas/superspec/`, `schema/superspec/`, `package.json`, or `extensions/`.
- Each SKILL.md carries a one-line credit to the OpenSpec 1.4.1 skill it adapts.

## Review Focus

- Prompt invoked with empty `$@` (`/opsx-new` alone): skill asks what to build instead of inventing a name.
- Change name given in non-kebab-case: skill derives/asks for a valid kebab-case name.
- Several changes exist and no name given to `/opsx-continue`: skill asks which, never guesses.
- `superpowers:<x>` skill not installed: skill stops with an install message instead of improvising the brainstorm.
- `/opsx-ff` finishing `plan.md`: must not begin apply or invoke any execution handoff.

Each line is pinned by a content assertion in Task 1's test (marker phrases checked per skill).

## Scenario → test map

| Scenario | Test (`tests/planning-commands.test.ts` unless noted) |
|---|---|
| package-activation: Visible when marked | `tests/extension.test.ts` "returns package skills and prompts paths in a marked project" |
| package-activation: Hidden when unmarked | `tests/extension.test.ts` "returns nothing in an unmarked project" (existing) |
| package-activation: No placeholder resources | "ships no placeholder resources" |
| Pairs exist | "ships all four skill and prompt pairs" |
| Prompt delegates to skill | "prompts delegate to their skill and pass $@" |
| Forbidden names absent | "contains no Claude tool names" |
| Ask fallback | "skills that ask the user state a plain-text fallback" |
| Brainstorm redirected, Skill missing | "continue and ff carry the Superpowers artifact rule" |
| Change created and stopped, Name exists | "new creates without --schema, stops, and suggests continue" |
| Brainstorm then proposal | "continue creates one artifact then stops" + manual Task 5 |
| Reaches plan and stops | "ff stops before apply and points to /opsx-apply" + manual Task 5 |
| No implementation (explore) | "explore forbids writing implementation code" |

---

### Task 1: Content test and extension test (red) — implements 1.1, 1.2, 1.3

**Files:**
- Create: `tests/planning-commands.test.ts`
- Modify: `tests/extension.test.ts:45-50`

**Interfaces:**
- Produces: the contract Tasks 2–4 satisfy. Helper `read(path: string): string` (repo-root-relative) and `const COMMANDS = ["explore", "new", "continue", "ff"] as const` inside the test file.

- [ ] **Step 1: Write `tests/planning-commands.test.ts`**

Use `readFileSync`/`readdirSync`/`existsSync` with root = `new URL("..", import.meta.url)`. Tests, with these exact assertions:
- "ships all four skill and prompt pairs": for each `c`, `skills/opsx-${c}/SKILL.md` and `prompts/opsx-${c}.md` exist; SKILL.md frontmatter `name: opsx-${c}`; frontmatter has a non-empty `description`.
- "prompts delegate to their skill and pass $@": each prompt contains `opsx-${c}`, `SKILL.md`, and `$@`; each prompt is ≤ 15 lines.
- "ships no placeholder resources": `skills/superspec-placeholder` and `prompts/opsx-placeholder.md` do not exist.
- "contains no Claude tool names": walk every file under `skills/` and `prompts/`; none matches `/AskUserQuestion|TodoWrite|Task tool/`.
- "skills that ask the user state a plain-text fallback": `new`, `continue`, `ff` each contain `ask_user_question` and `numbered options`.
- "continue and ff carry the Superpowers artifact rule": each contains `superpowers:`, `SKILL.md`, `install Superpowers`, and `docs/superpowers`.
- "new creates without --schema, stops, and suggests continue": `opsx-new` contains `openspec new change`, `Do NOT create any artifacts`, `/opsx-continue`, and its only `--schema` mentions are in a line containing `omit`/`Omit`/`never`.
- "continue creates one artifact then stops": contains `exactly one` and `STOP`.
- "ff stops before apply and points to /opsx-apply": contains `/opsx-apply`, `Do NOT start apply`, and `interactively`.
- "explore forbids writing implementation code": contains `Do NOT write code`.
- Review Focus pins: `new` contains `kebab-case` and `ask`; `continue` contains `several` ; `ff` and `continue` both contain `stop` next to `Superpowers` (covered above).

- [ ] **Step 2: Edit `tests/extension.test.ts`**

Replace the two placeholder `existsSync` assertions with: `skills/opsx-new/SKILL.md` exists under `result.skillPaths[0]` and `opsx-new.md` exists under `result.promptPaths[0]`.

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- tests/planning-commands.test.ts tests/extension.test.ts`
Expected: FAIL (missing skills/prompts; placeholder-removal test fails).

- [ ] **Step 4: Commit**

```bash
git add tests/planning-commands.test.ts tests/extension.test.ts
git commit -m "test: specify planning command skills and prompts"
```

### Task 2: explore and new — implements 2.1, 2.2, 2.5, 3.1 (explore, new)

**Files:**
- Create: `skills/opsx-explore/SKILL.md`, `skills/opsx-new/SKILL.md`, `prompts/opsx-explore.md`, `prompts/opsx-new.md`
- Reference (read-only): `.claude/skills/openspec-explore/SKILL.md`, `.claude/skills/openspec-new-change/SKILL.md`, `.claude/commands/opsx/{explore,new}.md`

**Interfaces:**
- Produces: tool wording reused verbatim by Tasks 3–4 — ask: "Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait." Todo: "Track progress with the `todo` tool if available; otherwise state the checklist in your reply."

- [ ] **Step 1: Confirm tool names.** Inspect the installed or published `rpiv-ask-user-question` and `rpiv-todo` packages (npm / repo README) for their registered tool names. If a name differs from the package name, use the real tool name in the wording above and in Task 1's `numbered options` neighbour assertion; record it in a code comment-free note in the commit message.
- [ ] **Step 2: Write `opsx-explore/SKILL.md`.** Frontmatter `name: opsx-explore`, a description adapted from the source; credit line; body adapted from `openspec-explore` with every Claude tool reference mapped per Interfaces; keep the "Do NOT write code" guardrail verbatim in meaning. Run `grep -n "AskUserQuestion\|TodoWrite\|Task tool" skills/opsx-explore/SKILL.md` → no output.
- [ ] **Step 3: Write `opsx-new/SKILL.md`.** Adapted from `openspec-new-change`: empty input → ask what to build; derive/validate kebab-case; run `openspec new change "<name>"` with no `--schema` (state "omit `--schema`; the project config selects `superspec`"); show `openspec status --change "<name>" --json` and `openspec instructions <first-ready-artifact> --change "<name>"`; existing name → suggest `/opsx-continue`; end with "Do NOT create any artifacts"; STOP.
- [ ] **Step 4: Write both prompts.** Frontmatter `description:`; body ≤ 10 lines: read the `SKILL.md` of skill `opsx-<x>` (available skills list or `/skill:opsx-<x>`), follow it exactly, user input: `$@`.
- [ ] **Step 5: Run** `npm test -- tests/planning-commands.test.ts` — expected: explore/new assertions PASS; continue/ff still FAIL.
- [ ] **Step 6: Commit**

```bash
git add skills/opsx-explore skills/opsx-new prompts/opsx-explore.md prompts/opsx-new.md
git commit -m "feat: add opsx-explore and opsx-new for pi"
```

### Task 3: continue — implements 2.3, 3.1 (continue)

**Files:**
- Create: `skills/opsx-continue/SKILL.md`, `prompts/opsx-continue.md`
- Reference: `.claude/skills/openspec-continue-change/SKILL.md`

**Interfaces:**
- Consumes: Task 2's ask/todo wording.
- Produces: the Superpowers artifact rule text, copied verbatim into Task 4. Rule: "If an artifact `instruction` says to use `superpowers:<x>`, drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill or an execution handoff). If skill `<x>` is not available, STOP and tell the user to install Superpowers."

- [ ] **Step 1: Write `opsx-continue/SKILL.md`.** Adapted from `openspec-continue-change`; no name given and several changes → run `openspec list --json` and ask which (never guess); create **exactly one** ready artifact (`openspec status --change "<name>" --json`, then `openspec instructions <id> --change "<name>" --json`); include the Superpowers artifact rule; after writing, show status and STOP for review.
- [ ] **Step 2: Write `prompts/opsx-continue.md`** (same thin shape as Task 2).
- [ ] **Step 3: Run** `npm test -- tests/planning-commands.test.ts` — continue assertions PASS.
- [ ] **Step 4: Commit**

```bash
git add skills/opsx-continue prompts/opsx-continue.md
git commit -m "feat: add opsx-continue for pi"
```

### Task 4: ff and placeholder removal — implements 2.4, 3.1 (ff), 3.2, 4.1

**Files:**
- Create: `skills/opsx-ff/SKILL.md`, `prompts/opsx-ff.md`
- Delete: `skills/superspec-placeholder/`, `prompts/opsx-placeholder.md`
- Reference: `.claude/skills/openspec-ff-change/SKILL.md`

**Interfaces:**
- Consumes: Task 3's Superpowers artifact rule (verbatim) and Task 2's tool wording.

- [ ] **Step 1: Write `opsx-ff/SKILL.md`.** Adapted from `openspec-ff-change`: create the change if absent (existing → continue it with the user's go-ahead); run the `brainstorm` artifact **interactively** (the user answers questions, approves the design); then create every remaining artifact in dependency order unattended until all `applyRequires` (`plan`) are done, asking only when required input is missing; track with the todo wording; include the Superpowers artifact rule (applies to `plan` too); "Do NOT start apply"; final message: change name, artifacts created, "Run `/opsx-apply` to start implementing."
- [ ] **Step 2: Write `prompts/opsx-ff.md`.**
- [ ] **Step 3: Delete the placeholder skill and prompt** with `git rm -r skills/superspec-placeholder prompts/opsx-placeholder.md`.
- [ ] **Step 4: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: all PASS, including `tests/extension.test.ts` and `tests/planning-commands.test.ts`.

- [ ] **Step 5: Run the grep named in the done-when criteria**

Run: `grep -rn "AskUserQuestion\|TodoWrite\|Task tool" skills prompts`
Expected: no output, exit status 1.

- [ ] **Step 6: Commit**

```bash
git add skills prompts
git commit -m "feat: add opsx-ff and remove placeholder resources"
```

### Task 5: Manual end-to-end in pi — implements 4.2

**Files:** none (verification only; findings fixed in the owning task's files).

- [ ] **Step 1: Prepare** a temp git repo, run `/opsx-init` from this branch (`pi -e <worktree>`), reload.
- [ ] **Step 2: Run** `/opsx-new demo-change`, then `/opsx-continue` (answer brainstorm, approve) → `brainstorm.md` exists; `/opsx-continue` again → `proposal.md` exists and the agent stops after each.
- [ ] **Step 3: Run** `/opsx-ff demo-two`: only brainstorm asks questions; the run ends with `plan.md` present, no apply artifact, and a pointer to `/opsx-apply`.
- [ ] **Step 4: Record** the result (pass/fail per step) in the verify artifact later; fix any divergence in the relevant SKILL.md and re-run `npm test`.
