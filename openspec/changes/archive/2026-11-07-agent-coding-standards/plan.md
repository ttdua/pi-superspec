# Agent Coding Standards Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` (`workflow-agents`, `subagent-routing`, `routing-note`, `project-readme`) and `design.md`.

**Goal:** The bundled implementer, task reviewer and plan reviewer load and apply a user-provided `coding-standards` skill. When the skill is missing, the user is warned and the workflow never stops.

**Architecture:**
- The three agent definitions gain one frontmatter skill and a short duty paragraph. The criteria stay in the skill (design D1–D3).
- The routing reference splits role skills into required and optional (D4).
- The extension gains a pure detector and a warning constant beside the Superpowers pair, and the `session_start` handler emits the warning under the same guards (D5).
- Docs and READMEs name the dependency (D6).

**Tech Stack:** TypeScript, Vitest (`bun run test`, which runs `vitest run`), `tsc --noEmit` (`bun run typecheck`), Markdown agent definitions parsed with `parseFrontmatter` from `@earendil-works/pi-coding-agent`.

## Global Constraints

- No file under `schema/superspec/` changes. The schema stays at version 7, and `tests/schema-version-pin.test.ts` must stay green.
- No new dependency in `package.json`. `files` stays `extensions, skills, prompts, schema, agents`.
- No skill named `coding-standards` is added to the repository.
- Agent prompts contain no digits next to `lines` or `complexity`.
- Agent frontmatter keeps `inheritSkills: false`, `defaultContext: fresh` and no model, provider or thinking keys (`workflow-agents`, "Explicit context and model ownership").
- All repository content is in English, except `README.vi.md`, which is Vietnamese and keeps the section order of `README.md`.
- Relative imports in `extensions/` and `tests/` use the `.ts` extension.

## Review Focus

- **The implementer's existing three skills must not be lost or reordered** when `coding-standards` is appended. Test: in Task 1, the exact unsorted list of four skills.
- **The implementer's Escalation tells it to stop on "missing environment or skills"**, which would stop it for a missing `coding-standards`. Test: in Task 1, the Escalation section names `coding-standards` as the exception.
- **A reviewer returning `INCOMPLETE` only because the skill is missing** would block apply, which contradicts the user's ruling. Test: in Task 1, the reviewer bodies state that a missing coding standard is not a reason for `INCOMPLETE`.
- **The routing Failures section still says "required skills … stop"**, so a reader could apply it to `coding-standards`. Test: in Task 2, the Failures section names optional skills as an exception, and SA-R03 stays green.
- **The two `session_start` warnings must be independent.** A missing Superpowers must not suppress the coding standard warning, and the reverse. Test: "both missing" in Task 3.
- **The existing Superpowers handler tests filter on `"Superpowers"`.** The new warning text must not contain that word, or those tests break. Test: in Task 3, `CODING_STANDARDS_MISSING_WARNING` does not contain `Superpowers`.

---

## Contracts

| Name | new / modified | Shape | public |
|---|---|---|---|
| `hasCodingStandards` | new | `(commands: { name: string }[]) => boolean` in `extensions/routing-note.ts`; true iff some `name === "skill:coding-standards"` | no |
| `CODING_STANDARDS_MISSING_WARNING` | new | `string` constant in `extensions/routing-note.ts`: `"pi-superspec agents use a coding-standards skill, which was not found. Without it the implementer and reviewers fall back to project conventions (AGENTS.md, contributing guide). Add your own under ~/.agents/skills/coding-standards/ or .agents/skills/coding-standards/."` | no |
| Agent frontmatter `skills` (`agents/implementer.md`) | modified | `test-driven-development, verification-before-completion, systematic-debugging, coding-standards` | yes (pi-subagents agent definition, overridable by users) |
| Agent frontmatter `skills` (`agents/task-reviewer.md`, `agents/plan-reviewer.md`) | new | `coding-standards` | yes |
| Agent report contract (task and plan reviewers) | modified | Findings: the `criterion` may name a coding standard rule. Sections and verdict values are unchanged. | yes |

---

## Task 1: Bundled agents — implements 1.1, 1.2, 1.3, 1.4

**Files:**
- Modify: `agents/implementer.md`, `agents/task-reviewer.md`, `agents/plan-reviewer.md`.
- Test: `tests/agents.test.ts`.

**Interfaces:** Produces the agent frontmatter `skills` and report contract entries (see Contracts).

- [ ] **Step 1: Write the failing tests** in `tests/agents.test.ts`:
  - Replace `"selects explicit skills only for implementer and verifier"` with `"selects explicit skills per role"`. Assert:
    - implementer skills, unsorted, equal `["test-driven-development","verification-before-completion","systematic-debugging","coding-standards"]`;
    - verifier equals `["verification-before-completion"]`;
    - task-reviewer and plan-reviewer equal `["coding-standards"]`;
    - scout and spec-reviewer `skills` are `undefined`.
  - `"coding standard is optional for code-facing roles"`. For implementer, task-reviewer and plan-reviewer, assert the body:
    - contains `coding-standards`;
    - matches `/Limitations/`;
    - matches `/project conventions/i`;
    - for both reviewers, also matches `/not[^.]*INCOMPLETE[^.]*(missing|unavailable)|(missing|unavailable)[^.]*not[^.]*INCOMPLETE/i`.
  - `"implementer applies the coding standard at refactor"`. Assert the body matches `/refactor/i` and `/(do not|never) defer/i`. Also assert that the text from `## Escalation` to the next `## ` matches `/except[^.]*`coding-standards`/`.
  - `"task-reviewer reviews code quality and structure"`. Assert the body matches `/code quality/i`, `/structure/i`, `/coding standard rule/i` and `/CHANGES_REQUESTED[^.]*structure|structure[^.]*CHANGES_REQUESTED/i`.
  - `"plan-reviewer checks decomposition by responsibility"`. Assert the body matches `/responsibilit/i`, `/before[^.]*contracts?[^.]*fixed/i` and `/entry point/i`.
  - `"reviewer prompts state no numeric thresholds"`. For task-reviewer and plan-reviewer, assert the body does not match `/\d+\s*(lines|complexity)|(lines|complexity)\D{0,12}\d/i`.
  - `"package ships no coding-standards skill"`. For every entry of `package.json` `files`, walk the directory recursively with `readdirSync(..., { recursive: true })`. Assert that no path segment equals `coding-standards`.
- [ ] **Step 2: Run** `bun run test tests/agents.test.ts`. Expected: FAIL on the new tests, while the existing tests still pass.
- [ ] **Step 3: Edit the three agent files.** In each, append `coding-standards` to `skills:` (implementer: after `systematic-debugging`; reviewers: add the `skills: coding-standards` line after `acceptanceRole`). Add one paragraph to `## Permitted work`:
  - Implementer: "Load the `coding-standards` skill and apply it while writing code, including the refactor step after each green test; do not defer a split it requires to a later task. If the skill is unavailable, say so under Limitations and apply the project conventions (AGENTS.md, contributing guide) instead." In `## Escalation`, change "missing environment or skills" to "missing environment or skills (except a missing `coding-standards` skill, which follows the fallback in Permitted work)".
  - Task reviewer: add the code-quality and structure duty to Purpose ("…against the task, plan contracts, specs, and the coding standard"). In Permitted work: "Load the `coding-standards` skill. Review code quality and structure in the range as well as spec compliance. Report each violation the range introduces as a finding whose criterion is the coding standard rule; a structure finding alone may justify `CHANGES_REQUESTED`. If the skill is unavailable, say so under Limitations and use the project conventions; a missing coding standard is not a reason for `INCOMPLETE`." Update the Findings line so the criterion may also be a coding standard rule.
  - Plan reviewer: Purpose gains "unit decomposition". Permitted work: "Load the `coding-standards` skill. Check that the design and plan split units by responsibility before contracts are fixed; an entry point or contract that owns several responsibilities is a finding. If the skill is unavailable, say so under Limitations and use the project conventions; a missing coding standard is not a reason for `INCOMPLETE`." Update the Findings line in the same way.
- [ ] **Step 4: Run** `bun run test tests/agents.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `agents/implementer.md agents/task-reviewer.md agents/plan-reviewer.md tests/agents.test.ts` with the message `feat(workflow-agents): apply the coding standard in code-facing roles`.

---

## Task 2: Optional role skills in routing — implements 2.1

**Files:**
- Modify: `skills/references/subagent-routing.md` (`## Availability` item 2, `## Failures` first bullet).
- Test: `tests/subagent-routing.test.ts`.

- [ ] **Step 1: Write the failing test** `"SA-R09 treats coding-standards as the only optional role skill"`:
  - `section("Availability")` matches `/optional/i` and contains `` `coding-standards` ``.
  - It matches `/once per stage/i`, `/dispatch/i` and `/project conventions/i`.
  - It matches `/not found|skill:coding-standards/`.
  - It matches `/only optional/i`, `/(does not|not) stop/i` and `/no settings/i`.
  - `section("Failures")` matches `/optional skill[^.]*does not stop/i`.
  - The existing SA-R03 stays unchanged.
- [ ] **Step 2: Run** `bun run test tests/subagent-routing.test.ts`. Expected: FAIL on SA-R09.
- [ ] **Step 3: Edit the reference.**
  - Availability item 2: keep its existing first sentences (list or inspect agents, resolve each canonical name) unchanged and before the new text, because SA-R01 checks that order. Then add: role skills are required or optional. `coding-standards` (implementer, task reviewer, plan reviewer) is the only optional role skill; every other role skill is required. Treat it as missing when the management surface reports it not found for the role or `skill:coding-standards` is not discoverable. Then announce once per stage that the coding standard is unavailable and agents fall back to project conventions, and dispatch as usual: a missing optional skill does not stop the stage, and the parent writes no settings. A missing required skill goes to Failures.
  - Failures first bullet: "required skills or tools are unavailable" stays, followed by "(a missing optional skill is handled in Availability and does not stop the stage)".
- [ ] **Step 4: Run** `bun run test tests/subagent-routing.test.ts`. Expected: PASS, including SA-R03.
- [ ] **Step 5: Commit** with the message `feat(subagent-routing): never stop a stage for a missing coding standard`.

---

## Task 3: Missing coding standard warning — implements 3.1, 3.2

**Files:**
- Modify: `extensions/routing-note.ts`, `extensions/superspec.ts` (the `session_start` handler).
- Test: `tests/routing-note.test.ts`, `tests/extension.test.ts` (`describe("session_start handler")`).

**Interfaces:** Produces `hasCodingStandards` and `CODING_STANDARDS_MISSING_WARNING` (see Contracts).

- [ ] **Step 1: Write the failing unit tests** in `tests/routing-note.test.ts`:
  - `describe("hasCodingStandards")`:
    - true for `[{ name: "skill:coding-standards" }]`;
    - false for `[]`, for `[{ name: "skill:brainstorming" }]` and for `[{ name: "coding-standards" }]`.
  - `describe("CODING_STANDARDS_MISSING_WARNING")`:
    - it contains `coding-standards` and `project conventions`;
    - it does not contain `pi install` or `Superpowers`.
- [ ] **Step 2: Write the failing handler tests** in `tests/extension.test.ts`, using a helper `startCodingStandards = start(...).filter(([m]) => m.includes("coding-standards"))`:
  - `"warns once when the coding standard is missing"`: fixture `marked`, commands `[{ name: "skill:brainstorming" }]` → one call, level `"warning"`.
  - `"does not warn when the coding standard is discoverable"`: commands include `skill:coding-standards` → zero calls.
  - `"does not warn about the coding standard in an unmarked project"` → zero calls.
  - `"does not warn about the coding standard without a UI"` → zero calls.
  - `"warns separately when Superpowers and the coding standard are both missing"`: commands `[]` → exactly one Superpowers call and one coding-standards call.
  - The `schema notice` tests count every call, so change `sp` (around line 233) to `[{ name: "skill:brainstorming" }, { name: "skill:coding-standards" }]`.
  - In `"swallows a rejected probe without a notification"` (around line 343), add `&& !m.includes("coding-standards")` to the filter. That setup passes `getCommands: () => []`, so both warnings fire.
- [ ] **Step 3: Run** `bun run test tests/routing-note.test.ts tests/extension.test.ts`. Expected: FAIL on the new tests only. The two edited existing tests still pass before the implementation.
- [ ] **Step 4: Implement.**
  - Add `hasCodingStandards` and the constant beside `hasSuperpowers` in `routing-note.ts`.
  - In `superspec.ts` `session_start`, directly after the Superpowers check, add: `if (ctx.hasUI && !hasCodingStandards(pi.getCommands())) ctx.ui.notify(CODING_STANDARDS_MISSING_WARNING, "warning");`.
- [ ] **Step 5: Run** `bun run test` and `bun run typecheck`. Expected: all tests pass and tsc reports no errors.
- [ ] **Step 6: Commit** with the message `feat(routing-note): warn when no coding standard skill is installed`.

---

## Task 4: Documentation — implements 4.1, 4.2

**Files:**
- Modify: `README.md`, `README.vi.md` (Prerequisites), `docs/architecture.md` (Components table, Package agents row), `docs/workflow.md` ("Optional specialist seats" paragraph).
- Test: new file `tests/project-readme.test.ts` with `describe("README prerequisites")`, reading `README.md` and `README.vi.md` from the repository root.

- [ ] **Step 1: Write the failing test** `"READMEs name the coding-standards prerequisite"`. For `README.md`, take the text between `## Prerequisites` and the next `## `, and assert it:
  - contains `coding-standards`;
  - matches `/implementer/i` and `/reviewer/i`;
  - contains `.agents/skills/`;
  - matches `/project conventions/i` and `/(does not|never) stop/i`.
  For `README.vi.md`, take the section `## Yêu cầu`. Assert it contains `coding-standards` and `.agents/skills/`, and matches `/implementer/i` and `/reviewer/i`. Also assert that it matches `/convention của project/i` and `/không dừng/i`. The Vietnamese bullet keeps these English role names and uses these two phrases.
  Add a docs check: `docs/architecture.md` and `docs/workflow.md` each contain `coding-standards`.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Edit the docs.**
  - `README.md`: add a Prerequisites bullet after Superpowers: "A `coding-standards` skill that you write or install yourself, under `~/.agents/skills/` or the project's `.agents/skills/`. The bundled implementer and reviewers apply it. Without it they fall back to project conventions and the workflow does not stop; pi shows a warning at session start."
  - `README.vi.md`: the same bullet in Vietnamese, in the same position: "Một skill `coding-standards` do bạn tự viết hoặc cài, đặt ở `~/.agents/skills/` hoặc `.agents/skills/` của project. Implementer và các reviewer đi kèm áp dụng nó. Nếu thiếu, chúng dùng convention của project và workflow không dừng; pi hiện cảnh báo khi bắt đầu session."
  - `docs/architecture.md` Package agents row: add "The implementer, task reviewer and plan reviewer select a user-provided `coding-standards` skill; it is optional (missing: warning, fallback to project conventions)."
  - `docs/workflow.md` specialist seats paragraph: one sentence saying that those three seats apply the user's coding standard.
- [ ] **Step 4: Run** `bun run test`. Expected: PASS.
- [ ] **Step 5: Commit** `README.md README.vi.md docs/architecture.md docs/workflow.md tests/project-readme.test.ts` with the message `docs: document the coding-standards skill dependency`.

---

## Scenario → test

workflow-agents:
- Evidence-only scout → existing `tests/agents.test.ts` "scout contract (SA-A03)".
- Independent reviewer → existing "reviewer contract (SA-A04)" `%s reports findings, verdict and limitations`.
- Task reviewer reviews structure → Task 1, "task-reviewer reviews code quality and structure".
- Plan reviewer checks decomposition → Task 1, "plan-reviewer checks decomposition by responsibility".
- No numeric thresholds → Task 1, "reviewer prompts state no numeric thresholds".
- Implementation boundary → existing "implementer contract (SA-A05)" `escalates and refuses publication…`.
- Coding standard while writing → Task 1, "implementer applies the coding standard at refactor" and "selects explicit skills per role".
- Selected by code-facing roles only → Task 1, "selects explicit skills per role".
- Not shipped → Task 1, "package ships no coding-standards skill".
- Skill missing → Task 1, "coding standard is optional for code-facing roles".

subagent-routing:
- Lazy tool activation → existing SA-R01.
- Optional integration absent → existing SA-R02.
- Disabled or incompatible agent → existing SA-R03.
- Failed child lane → existing SA-R04.
- Optional skill missing → Task 2, SA-R09.

routing-note:
- Coding standard missing → Task 3, "warns once when the coding standard is missing".
- Coding standard installed → Task 3, "does not warn when the coding standard is discoverable".
- Unactivated project → Task 3, "does not warn about the coding standard in an unmarked project".
- No UI → Task 3, "does not warn about the coding standard without a UI".
- Both skills missing → Task 3, "warns separately when Superpowers and the coding standard are both missing".

project-readme:
- Required install commands present → baseline scenario with no automated test today; unchanged by this change; the README edit adds a bullet only, checked by reading the diff.
- Optional packages explained → same: baseline, no automated test today, and the change does not touch it.
- Coding standard skill explained → Task 4, `tests/project-readme.test.ts` "READMEs name the coding-standards prerequisite".
