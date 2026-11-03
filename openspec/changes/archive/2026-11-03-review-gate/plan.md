# Review Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a document review gate to `/opsx-continue` and `/opsx-ff`, and a code review gate to `finalize`, each with the outcomes approved / approved with notes / changes requested / dismissed.

**Architecture:** The schema carries only tool-neutral wording (brainstorm approves the file; finalize step 2b requires code review). The mechanism (Plannotator tool → Plannotator CLI → `ask_user_question` → plain text) lives in one "Review gate" section of the `opsx-continue` skill, copied byte-for-byte into `opsx-ff`. Tests assert text, since the product is prose.

**Tech Stack:** Markdown skills and prompts, `schema/superspec/schema.yaml`, vitest (`npm test`), `tsc --noEmit`.

**Spec:** `openspec/changes/review-gate/specs/` (review-gate, planning-commands, bundled-schema) and `openspec/changes/review-gate/design.md`.

## Global Constraints

- All repository content is English.
- The schema and its templates MUST NOT contain `plannotator`, `AskUserQuestion`, `ask_user_question`, `rpiv-`, `pi-subagents`, `Skill tool`; commands are spelled `/opsx-<name>`, never `/opsx:`.
- Do not edit `openspec/schemas/superspec/` (upstream schema used to develop this repo).
- Existing pinned text must stay: `3. Switch to the feature branch and pull:`, `8. Write finalize.md`, `9. Commit the receipt` in the finalize instruction; the two sentences pinned in `tests/schema.test.ts` for the brainstorm instruction ("Keep technical decisions out of brainstorm.md; they belong in design.md. The two must not repeat each other." and "do NOT invoke writing-plans or any other skill the brainstorming skill hands off to").
- Prompts stay thin (≤15 lines, delegate to `SKILL.md`, contain `$@`); command logic stays in skills.
- Review outcome names are exactly `approved`, `approved_with_notes`, `changes_requested`, `dismissed`. Plannotator results are classified by `decision` (`approved`, `annotated`, `dismissed`) and `feedback`, never by message text; an unknown `decision` is `dismissed`.
- Run all commands from the worktree root. Commit after each task on branch `worktree-review-gate`.

## Review Focus

- A reused result-file path makes `plannotator annotate --result-file` fail (the file must not exist); each gate round needs a fresh path. Pinned in Task 2.
- A change with two or more `specs/<capability>/spec.md` files: the final packet must list every one, never a folder. Pinned in Task 3.
- Reviewer closes the tab: `dismissed`, never an approval. Pinned in Task 2.
- Agent cannot run a background command or `plannotator` exits 2: fall to the next tier and say so, no retry loop. Pinned in Task 2.
- A note that looks like wording but changes meaning: when unsure, reopen the gate. Pinned in Task 2.

---

## File Structure

| File | Change |
|---|---|
| `schema/superspec/schema.yaml` | brainstorm instruction order; finalize step 2b and step 8 field |
| `schema/superspec/templates/finalize.md` | code review section |
| `skills/opsx-continue/SKILL.md` | "Review gate" section; gate after artifact; finalize path |
| `skills/opsx-ff/SKILL.md` | same section; brainstorm gate; final gate |
| `tests/schema.test.ts` | schema assertions |
| `tests/planning-commands.test.ts` | skill assertions |
| `docs/workflow.md`, `docs/architecture.md`, `docs/usage-guide.md`, `README.md`, `README.vi.md`, `CHANGELOG.md` | wording |

---

### Task 1 — implements 1.1, 1.2, 1.3, 1.4, 1.5

**Files:**
- Modify: `schema/superspec/schema.yaml` (brainstorm `instruction`; finalize `instruction` between step 2 and step 3, and step 8's required values)
- Modify: `schema/superspec/templates/finalize.md`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: finalize step label `2b. Code review gate`; template field `**Code review**` with the values `approved` | `approved with notes` | `skipped (<reason>)`, plus `Reviewer tier` and `Commit range reviewed`. Tasks 2 and 3 refer to "finalize step 2b".

- [ ] **Step 1: Write failing tests** in `tests/schema.test.ts`, reusing `instructionFor` and `tpl`:
  - `it("brainstorm approves the written file before returning to the flow")`: flat brainstorm text; `indexOf` of "brainstorm.md` first" (the sentence that writes the file) < `indexOf` of "approve that file" < `indexOf` of "Return to the OpenSpec flow"; the two pinned sentences still present.
  - `it("brainstorm and finalize instructions name no review tool")`: for ids `brainstorm` and `finalize`, text does not match `/plannotator|AskUserQuestion|ask_user_question/`.
  - `it("finalize step 2b sits between the worktree tests and the checkout")`: flat finalize; `indexOf("2. Verify tests pass in the worktree")` < `indexOf("2b.")` < `indexOf("3. Switch to the feature branch and pull:")`; step 2b slice contains `$FEATURE_BRANCH`, `apply.md`, "approved with notes" and "never treat" (no decision is not approval).
  - `it("finalize template records the code review")`: `tpl("finalize.md")` contains `Code review`, `Reviewer tier`, `Commit range reviewed`.
- [ ] **Step 2: Run** `npx vitest run tests/schema.test.ts` — expect the four new tests FAIL, the rest PASS.
- [ ] **Step 3: Edit the brainstorm instruction** in `schema.yaml`: keep the existing bullets, replace "After brainstorming completes, summarize the agreed design in brainstorm.md" with: write the validated design to this change's `brainstorm.md` first; then have the reviewer approve that file; only then return to the OpenSpec flow. No tool names.
- [ ] **Step 4: Add finalize step `2b. Code review gate:`** after step 2: before the feature branch is touched, obtain the reviewer's approval of the worktree's code changes compared with `$FEATURE_BRANCH` (commit range from `apply.md`). Outcomes: approved → continue; approved with notes or changes requested → apply them on the worktree branch, append an iteration entry to `apply.md`, run `/opsx-verify`, re-enter finalize (the gate reopens after changes requested, and after notes only when a note changed behaviour or a requirement); no decision → ask the user, never treat as approval. Add the code review outcome to step 8's required values. Do not renumber other steps.
- [ ] **Step 5: Add to `templates/finalize.md`** a `## Code review` section with the three fields from Interfaces (same style as the `## PR comment` section).
- [ ] **Step 6: Run** `npx vitest run tests/schema.test.ts` — expect all PASS, including the pinned finalize and brainstorm tests.
- [ ] **Step 7: Commit**

```bash
git add schema/superspec tests/schema.test.ts
git commit -m "feat(schema): approve brainstorm file and gate finalize on code review"
```

---

### Task 2 — implements 2.1, 2.2, 2.2b, 3.1, 3.1b, 3.2, 3.3

**Files:**
- Modify: `skills/opsx-continue/SKILL.md`
- Modify (only if its description misstates behaviour): `prompts/opsx-continue.md`
- Test: `tests/planning-commands.test.ts`

**Interfaces:**
- Consumes: finalize step 2b from Task 1.
- Produces: a block in `skills/opsx-continue/SKILL.md` that starts at the line `**Review gate**` and ends before the next bold heading line; Task 3 copies it verbatim into `opsx-ff`. Test helper `reviewGate(text: string): string` returns that block (in `tests/planning-commands.test.ts`).

- [ ] **Step 1: Write failing tests** in `tests/planning-commands.test.ts` with `const gate = reviewGate(skill("continue"))`:
  - `continue has a review gate section`: `gate.length > 0`.
  - `gate lists the four outcomes`: contains `approved`, `approved_with_notes`, `changes_requested`, `dismissed`; `dismissed` sentence contains "not an approval" and "ask".
  - `gate picks the reviewer in order`: indexes ascending of "`plannotator` tool", "command -v plannotator", "ask_user_question", "plain text".
  - `gate falls through when a tier fails`: contains "falls to the next tier" (or "fall to the next tier") and "cannot run a background command".
  - `gate runs the CLI with a fresh result file`: contains `plannotator annotate`, `--gate`, `--json`, `--result-file`, "does not exist yet", "fresh path for every gate", and says the path is outside the change directory.
  - `gate classifies by decision only`: contains "`decision`", "never from message text", "unknown `decision` is `dismissed`".
  - `gate handles notes`: contains "wording", "short diff", "When unsure, reopen".
  - `gate defines the cascade`: contains `openspec status --change`, "only the files that changed".
  - `gate covers code review`: contains `plannotator review`, "stdout", "`git diff --stat`", "feature branch recorded in `apply.md`", "`receiving-code-review`", "`/opsx-verify`".
  - `continue runs the gate before it stops`: in the "Act based on status" step text, "Review gate" appears after "Create the artifact file" and before "STOP after creating that one artifact".
  - `continue does not advance after approval`: guardrails contain "Approval does not create the next artifact".
  - `continue runs the code review gate for finalize`: the text contains "finalize" and "code review" within the Review gate section or step 3.
- [ ] **Step 2: Run** `npx vitest run tests/planning-commands.test.ts` — expect the new tests FAIL.
- [ ] **Step 3: Implement `reviewGate`** in the test file: slice from `**Review gate**` to the next line that is a bold heading (`^\*\*[^*\n]+\*\*$`), trimmed.
- [ ] **Step 4: Write the `**Review gate**` section** in `skills/opsx-continue/SKILL.md` per `design.md` decisions 2–5, 7 and 9: outcomes table (Plannotator → outcome), reviewer order, CLI command form, fresh `review-<n>.json` path in the session scratch directory or a `mktemp -d`, `decision`/`feedback` classification, notes handling, cascade, and the code review variant (agent tool `review` on the worktree; CLI `plannotator review --base <feature branch from apply.md> --gate --json <worktree>` with stdout redirected to a scratch file; fallback shows `git diff --stat` and the commit range). Pi tool names appear only here, never in the schema.
- [ ] **Step 5: Wire the gate into the skill:** after "Create the artifact file" and before the STOP in step 3, add "Run the **Review gate** on the written file(s); on `approved` or `approved_with_notes` handled per the gate, then STOP"; add the finalize path note (finalize artifact: run the code review gate at its step 2b, using this section); add the guardrail "Approval does not create the next artifact; the next artifact needs the next `/opsx-continue`"; update the Output prompt line to mention the review outcome. Keep "Create exactly one artifact per invocation".
- [ ] **Step 6: Run** `npx vitest run tests/planning-commands.test.ts` — expect all PASS (including the existing "continue creates one artifact then stops").
- [ ] **Step 7: Commit**

```bash
git add skills/opsx-continue tests/planning-commands.test.ts prompts/opsx-continue.md
git commit -m "feat(skills): add the review gate to opsx-continue"
```

---

### Task 3 — implements 4.1, 4.2, 4.3, 4.4, 2.3

**Files:**
- Modify: `skills/opsx-ff/SKILL.md`
- Test: `tests/planning-commands.test.ts`

**Interfaces:**
- Consumes: the `**Review gate**` block and `reviewGate()` from Task 2.
- Produces: `opsx-ff` with the identical block, a brainstorm gate, and a final gate.

- [ ] **Step 1: Write failing tests** in `tests/planning-commands.test.ts`:
  - `ff and continue share an identical review gate`: `reviewGate(skill("ff"))` equals `reviewGate(skill("continue"))` and is non-empty.
  - `ff gates brainstorm.md before later artifacts`: in the ff text, "Review gate" on `brainstorm.md` appears before "create every remaining artifact".
  - `ff final gate lists the packet explicitly`: contains `proposal.md`, `design.md`, "every `specs/<capability>/spec.md`", `tasks.md`, `plan.md`, "explicit ordered list", "never a folder", and "does not repeat `brainstorm.md`".
  - `ff points to /opsx-apply only after the final gate`: the final-output prompt line is preceded by "only after the final gate is approved".
  - `ff artifact rule no longer forbids the gate`: the "Superpowers artifact rule" text no longer contains "approval gates, self-review, or commit steps must not cause a stop before the plan is written" unmodified; it says the review gate is the only permitted stop.
  - `ff reopens everything when brainstorm changes late`: contains "all five" artifacts.
- [ ] **Step 2: Run** `npx vitest run tests/planning-commands.test.ts` — expect the new tests FAIL.
- [ ] **Step 3: Copy the `**Review gate**` block** from `skills/opsx-continue/SKILL.md` into `skills/opsx-ff/SKILL.md` byte-for-byte, placed before **Output**.
- [ ] **Step 4: Edit the interaction boundary** in `opsx-ff`: gate on `brainstorm.md` right after it is written; then unattended generation (proposal, design, specs, tasks, plan); then one final gate over `proposal.md design.md specs/*/spec.md tasks.md plan.md` (each spec file by path); the pointer "Run `/opsx-apply`" only after the final gate is approved. Rewrite the clause in the Superpowers artifact rule so the only permitted stop is the review gate; keep the guardrail "Run the brainstorm artifact interactively; do not fabricate the user's answers or approval".
- [ ] **Step 5: Run** `npx vitest run tests/planning-commands.test.ts` — expect all PASS (including "ff stops before apply and points to /opsx-apply").
- [ ] **Step 6: Commit**

```bash
git add skills/opsx-ff tests/planning-commands.test.ts
git commit -m "feat(skills): add brainstorm and final review gates to opsx-ff"
```

---

### Task 4 — implements 5.1, 5.2, 5.3, 5.4

**Files:**
- Modify: `docs/workflow.md` (Commands table rows for `/opsx-continue` and `/opsx-ff`; Conflicts resolved #9; finalize row and step rules; a "Review gates" subsection)
- Modify: `docs/architecture.md` (pi tool mapping: add a `plannotator` row)
- Modify: `docs/usage-guide.md` (the `ff` section lines about "without stopping for review" and the unattended phase; the `continue` section)
- Modify: `README.md`, `README.vi.md` (only where `ff` is described as unattended or `continue` as stop-only)
- Modify: `CHANGELOG.md`
- Test: `tests/schema.test.ts` and the existing docs assertions (run the full suite)

**Interfaces:**
- Consumes: behaviour from Tasks 1–3.

- [ ] **Step 1: Write failing tests** where docs are already asserted (check `grep -n "workflow.md\|usage-guide" tests/*.test.ts`); add `it("workflow doc describes the review gates")` in `tests/planning-commands.test.ts` asserting `docs/workflow.md` contains "Review gate", "plannotator" and "brainstorm.md", and `docs/architecture.md` contains a `plannotator` row with the CLI fallback.
- [ ] **Step 2: Run** `npx vitest run` — expect the new test FAIL.
- [ ] **Step 3: Update the docs** per `design.md` decision 10: Conflicts #9 now reads "ff gates brainstorm.md, runs the rest unattended, then one final gate"; `continue` row says it gates its artifact; finalize step rules mention the code review gate; architecture tool mapping row: `plannotator` tool, fallback "CLI in the background with `--result-file`, then `ask_user_question`, then plain text". README files change only the sentences that contradict the gates. Add a `CHANGELOG.md` entry in the style of the existing ones.
- [ ] **Step 4: Run** `npx vitest run` — expect all PASS.
- [ ] **Step 5: Commit**

```bash
git add docs README.md README.vi.md CHANGELOG.md tests
git commit -m "docs: describe the review gates and the code review"
```

---

### Task 5 — implements 6.1, 6.2, 6.3, 6.4

**Files:**
- Modify: `openspec/changes/review-gate/design.md` (record results in Open Questions)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Run** `npm test` and `npm run typecheck` fresh; expect both exit 0. Record the counts.
- [ ] **Step 2: Run** `openspec validate review-gate`; expect "is valid".
- [ ] **Step 3 (needs the user):** run `plannotator review --base <feature branch> --gate --json <worktree> > <scratch>/code-review.json` in the background and ask the user to approve once; confirm the captured JSON has a `decision` field (6.4).
- [ ] **Step 4 (needs the user, on a real pi session):** run the CLI document-gate path once with `--result-file`, covering `approved`, `annotated` and a closed tab (6.3). If pi cannot run a background command, record that the agent falls to the next tier.
- [ ] **Step 5: Record** the outcomes of steps 3 and 4 in `design.md` Open Questions as answered, and commit.

```bash
git add openspec/changes/review-gate/design.md
git commit -m "docs(openspec): record review gate verification results"
```

---

## Scenario → test coverage

| Spec scenario | Test (file) |
|---|---|
| Gate outcomes (4 scenarios) | `gate lists the four outcomes` (planning-commands) |
| Reviewer selection (5 scenarios) | `gate picks the reviewer in order`, `gate falls through when a tier fails` |
| CLI invocation (4 scenarios) | `gate runs the CLI with a fresh result file`, `gate classifies by decision only` |
| Notes handling (3 scenarios) | `gate handles notes` |
| Fast-forward review packet (2) | `ff final gate lists the packet explicitly` |
| Cascade on revision (2) | `gate defines the cascade`, `ff reopens everything when brainstorm changes late` |
| Identical gate section | `ff and continue share an identical review gate` |
| Code review gate position, tiers, dismissed | `finalize step 2b sits between the worktree tests and the checkout` (schema), `gate covers code review` |
| Code review changes requested (4) | `gate covers code review` (loop text), step 2b assertions |
| Code review receipt | `finalize template records the code review` |
| planning-commands: continue (3) | `continue runs the gate before it stops`, `continue does not advance after approval` |
| planning-commands: ff (3) | `ff gates brainstorm.md before later artifacts`, `ff points to /opsx-apply only after the final gate` |
| bundled-schema: brainstorm (2) | `brainstorm approves the written file…`, `brainstorm and finalize instructions name no review tool` |
| bundled-schema: finalize (3) | `finalize step 2b sits between…`, the no-tool-name test, `finalize template records the code review` |
