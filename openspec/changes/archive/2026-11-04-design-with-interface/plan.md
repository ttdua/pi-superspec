# design-with-interface Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `brainstorm.md` (no `design.md`: the change has no non-trivial technical decision beyond the Contracts below).

**Goal:** Make `plan.md` the reviewed source of truth for contract shapes, and bind apply and verify to it.

**Architecture:** Text-only change to the bundled schema (`schema/superspec/schema.yaml` and templates), two skills (`opsx-apply`, `opsx-verify`) and docs. Three new strings are the contracts every task shares; tests pin them in `tests/schema.test.ts` and `tests/execution-commands.test.ts`.

**Tech Stack:** Markdown/YAML, TypeScript tests (ESM, tabs, double quotes), vitest, `openspec` >= 1.16.

## Contracts

All three are file-format contracts of the bundled schema; all are `public` (installed projects and skills read them). The exact strings below are the single definition; tasks refer to them by name.

| Name | new / modified | Shape | public |
|---|---|---|---|
| `plan-contracts-section` | new | In `templates/plan.md`: heading `## Contracts` placed before `## Task 1`, an HTML comment explaining entries and the `None – <reason>` form, then the table header `\| Name \| new / modified \| Shape \| public \|` with one placeholder row | yes |
| `apply-contract-deviations` | new | In `templates/apply.md`: heading `## Contract deviations` placed before `## Next step`, one list item `- <contract name>: <what changed and why>`, or the word `none`; the list is cumulative across iterations | yes |
| `verify-check-5` | modified | Instruction label `5. **Design and contract coherence**`; template heading `## 5. Design and Contract Coherence (warning only)`; mismatch is a warning; an entry or plan that cannot be compared is `not verified` | yes |

## Global Constraints

- The bundled schema stays at `version: 6` and `x-pi-superspec.version: 6`; edit in place, no bump.
- Do not edit `openspec/schemas/superspec/` (upstream v4).
- Schema and template text must not contain `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool` or `/opsx:`; commands are spelled `/opsx-<name>`.
- Contracts wording is language-neutral: never mention TypeScript in the new schema text.
- Verify keeps exactly six checks; do not add a seventh.
- Do not rename the existing requirements "Apply receipt branch facts" or "Single verify check list".
- No new dependency. All content in English. Match existing style (tabs, double quotes in TS).

## Review Focus

- A `plan.md` without a Contracts section (written before this rule): verify records the plan-contracts part as `not verified` with the reason "plan.md has no Contracts section"; it never fails. Pinned in Task 5.
- `None` given with no reason: the plan instruction requires a reason after `None`. Pinned in Task 1.
- Fix iterations and the post-PR loop rewrite `apply.md`: "Contract deviations" must stay cumulative, not be reset. Pinned in Task 4.
- Types-first read as a project-wide phase: the apply text says "for each task" and never "all contracts first". Pinned in Task 3.
- A `public` contract change must stop for the user even when the executor has no subagent tool (the `executing-plans` fallback). Pinned in Task 3 and Task 4.

---

## Task 1: Plan contracts section — implements 1.1

**Files:**
- Modify: `schema/superspec/templates/plan.md`, `schema/superspec/schema.yaml` (the `plan` artifact `instruction`)
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `plan-contracts-section` (see Contracts).

- [ ] **Step 1: Write the failing tests** in `tests/schema.test.ts`, inside `describe("final review findings")` next to the other template tests (it has `tpl(name)` and `instructionFor(id)`):
  - `plan template has a Contracts section before Task 1`: `tpl("plan.md")` contains `## Contracts`, its index is below the index of `## Task 1`, and it contains `| Name | new / modified | Shape | public |`.
  - `plan instruction requires Contracts, a reason after None and name references`: `instructionFor("plan")` contains `## Contracts`, `None` followed by a reason, and `refer to contract names`; it does not match `/TypeScript/`.
- [ ] **Step 2:** `npx vitest run tests/schema.test.ts` → the two tests FAIL.
- [ ] **Step 3: Implement.** In `templates/plan.md` insert the section (comment, table header, one `—` row) before `## Task 1`. In the `plan` instruction append a paragraph: the plan MUST have `## Contracts` before the tasks, one entry per new or modified type, schema, signature, CLI argument, config key or file format (name, `new` or `modified`, exact shape, `public` flag); write `None – <reason>` when there is none; per-task `Interfaces` blocks refer to contract names instead of restating shapes.
- [ ] **Step 4:** `npx vitest run tests/schema.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(schema): require a Contracts section in plan.md`.

## Task 2: Design hint — implements 1.2

**Files:**
- Modify: `schema/superspec/templates/design.md`, `schema/superspec/schema.yaml` (the `design` instruction)
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: `plan-contracts-section` (name only).

- [ ] **Step 1: Write the failing test** `design instruction and template point contract shapes to the plan`: both `instructionFor("design")` and `tpl("design.md")` contain `public` and `Contracts`; the instruction still contains `No design needed:`.
- [ ] **Step 2:** run it → FAIL.
- [ ] **Step 3: Implement.** One sentence in each: record the decision and the reason for any `public` contract here; its full shape belongs in the `Contracts` section of plan.md.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(schema): point contract shapes from design to plan`.

## Task 3: Apply block and receipt — implements 2.1, 2.2, 2.4

**Files:**
- Modify: `schema/superspec/schema.yaml` (the top-level `apply:` block), `schema/superspec/templates/apply.md`
- Test: `tests/schema.test.ts` (`describe("apply block")`)

**Interfaces:**
- Consumes: `plan-contracts-section`.
- Produces: `apply-contract-deviations` (see Contracts).

- [ ] **Step 1: Write the failing tests:**
  - `apply instruction orders each task around the Contracts`: the apply instruction contains `Contracts`, `for each task`, `typecheck`, `failing test` in that order, and does not contain `all contracts first`.
  - `apply instruction stops on a contract change`: it contains `public` with `ask the user`, and `Contract deviations`; the wording sits in a section that applies to both the 2a and 2b executors.
  - `apply.md template has Contract deviations before Next step`: `tpl("apply.md")` contains `## Contract deviations`, its index is below `## Next step`, and it contains `none`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** In `apply:` add a "Contracts rule (both executors)" paragraph before step 2a, and one clause in step 3 saying the receipt lists "Contract deviations" cumulatively. Add the section to `templates/apply.md`.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(schema): per-task contract order and stop rule in apply`.

## Task 4: opsx-apply skill — implements 2.3

**Files:**
- Modify: `skills/opsx-apply/SKILL.md`
- Test: `tests/execution-commands.test.ts`

**Interfaces:**
- Consumes: `apply-contract-deviations`.

- [ ] **Step 1: Write the failing test** `apply briefs the executor on Contracts and keeps deviations`: `skill("apply")` contains `Contracts`, `Contract deviations`, and `public`; the fix-iteration step (step 8) and the post-PR mode text each mention keeping `Contract deviations`.
- [ ] **Step 2:** run `npx vitest run tests/execution-commands.test.ts` → FAIL.
- [ ] **Step 3: Implement.** In step 5 add a bullet for both executors: read `plan.md` Contracts, follow the schema's per-task order, stop on a contract change (`public` asks the user). In the receipt step and step 8 add that `Contract deviations` is carried forward. Do not copy the schema's step text; refer to it.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(opsx-apply): brief the executor on plan Contracts`.

## Task 5: Verify check 5 — implements 3.1, 3.3

**Files:**
- Modify: `schema/superspec/schema.yaml` (the `verify` instruction), `schema/superspec/templates/verify.md`
- Test: `tests/schema.test.ts` (`describe("verify artifact")`)

**Interfaces:**
- Consumes: `plan-contracts-section`, `apply-contract-deviations`.
- Produces: `verify-check-5`.

- [ ] **Step 1: Write the failing test** `verify check 5 compares design decisions and plan Contracts`: instruction contains `5. **Design and contract coherence**`, `Contracts`, `Contract deviations`, `warning`, and `no Contracts section`; template contains `## 5. Design and Contract Coherence (warning only)`. The existing `verify has the six checks` test must still pass unchanged.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** Rewrite check 5 and the template section 5 per `verify-check-5`; a missing Contracts section is recorded as `not verified` with that reason.
- [ ] **Step 4:** `npx vitest run tests/schema.test.ts` → all PASS.
- [ ] **Step 5: Commit** `feat(schema): verify check 5 covers plan Contracts`.

## Task 6: opsx-verify skill — implements 3.2

**Files:**
- Modify: `skills/opsx-verify/SKILL.md`
- Test: `tests/execution-commands.test.ts`

**Interfaces:**
- Consumes: `verify-check-5`.

- [ ] **Step 1: Write the failing test** `verify compares Contracts as a warning and marks uncomparable ones not verified`: `skill("verify")` contains `Contracts`, `Contract deviations`, a statement that a mismatch is a warning, and `not verified`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** Add one bullet near the "Evidence" bullet of step 5 and one line in the `verify.md` contents list (step 6). Keep "six checks" wording.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(opsx-verify): compare plan Contracts in check 5`.

## Task 7: Docs and changelog — implements 4.1, 4.2, 4.3

**Files:**
- Modify: `docs/workflow.md`, `docs/domain-model.md`, `docs/usage-guide.md`, `docs/glossary.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: all three Contracts.

- [ ] **Step 1:** `docs/workflow.md`: plan row says it opens with `## Contracts`; step rules add the Contracts line and the apply rule, widen verify check 5, and `apply.md` records Contract deviations. `docs/domain-model.md`: `ApplyReceipt` gets a `contractDeviations` row; `VerifyReport` check 5 wording. Do not change the Artifact table (`tests/artifact-table.test.ts` parses it).
- [ ] **Step 2:** `docs/usage-guide.md` verify bullet names "design and contract coherence"; `docs/glossary.md` gets a **Contracts** entry next to **Plan**; `CHANGELOG.md` gets one `### Added` bullet under Unreleased.
- [ ] **Step 3:** `npm test` → PASS (docs parse tests included).
- [ ] **Step 4: Commit** `docs: describe plan Contracts, deviations and check 5`.

## Task 8: Final check — implements 5.1

- [ ] **Step 1:** `npm test`, `npm run typecheck` → PASS.
- [ ] **Step 2:** `openspec validate --all --json` → every item `"valid": true`.
- [ ] **Step 3:** `grep -n "^version:" schema/superspec/schema.yaml` → `version: 6`; `git diff --stat main -- openspec/schemas/superspec` → empty.
- [ ] **Step 4:** tick `5.1` in `tasks.md`; no new commit is needed unless a file changed.

---

## Scenario → test

**bundled-schema**
- Template has the section → Task 1 `plan template has a Contracts section before Task 1`
- Instruction requires the section → Task 1 `plan instruction requires Contracts…`
- Language-neutral wording → Task 1 (no `/TypeScript/` assertion)
- Stub instruction → Task 2 (`No design needed:` still present)
- Contract hint → Task 2 `design instruction and template point contract shapes to the plan`
- Apply block returned / Apply stops before finishing / Worktree branch and authority → existing `apply block` tests, unchanged
- Per-task contract order → Task 3 `apply instruction orders each task around the Contracts`
- Public contract change / Internal contract change → Task 3 `apply instruction stops on a contract change`
- Template fields → existing `apply.md` template tests, unchanged
- Deviations section → Task 3 `apply.md template has Contract deviations before Next step`
- Six checks → existing `verify has the six checks and no sync check`
- Contract coherence in check 5 → Task 5 `verify check 5 compares design decisions and plan Contracts`
- Uncomparable contract → Task 5 (same test, `no Contracts section` and `not verified`)
- Sync deferred → existing verify/finalize tests, unchanged

**execution-commands**
- Executor briefed on contracts / Public contract needs a change / Internal contract change recorded → Task 4 `apply briefs the executor on Contracts and keeps deviations`
- Matching contracts / Mismatched contract / Contract cannot be compared → Task 6 `verify compares Contracts as a warning and marks uncomparable ones not verified`
