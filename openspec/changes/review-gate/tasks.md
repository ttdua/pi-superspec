## 1. Schema: brainstorm step order

- [x] 1.1 Reword the `brainstorm` instruction in `schema/superspec/schema.yaml`: write `brainstorm.md` first, have the reviewer approve the file, then return to the OpenSpec flow; no tool names
- [x] 1.2 Add schema tests in `tests/schema.test.ts` for step order and absence of `plannotator` / `AskUserQuestion` / `ask_user_question` in the brainstorm instruction

- [x] 1.3 Add a code review step to the `finalize` instruction in `schema/superspec/schema.yaml` between step 2 (worktree tests) and step 3 (feature branch checkout), tool-neutral, and renumber or label so later steps are unchanged in meaning
- [x] 1.4 Add a code review line to `schema/superspec/templates/finalize.md` (outcome, tier, commit range, notes)
- [x] 1.5 Add schema tests: finalize step order, no tool names in the finalize instruction, template line present

## 2. Shared review gate section

- [x] 2.1 Write the "Review gate" section: outcomes, four-tier reviewer selection, CLI invocation with result file in a scratch path, `decision` classification, `dismissed` handling
- [x] 2.2 Add notes handling (wording vs meaning, diff, reopen when unsure) and the cascade rule to the section
- [x] 2.2b Add the code review variant to the section: tiers (agent tool `review`, CLI `plannotator review` with stdout to a scratch file, diff summary via ask/text), `decision`-only classification, changes-requested loop (fix on worktree branch, `apply.md` iteration, re-verify, re-enter finalize), notes on an approval applied before the merge (fix, re-verify, resume; gate reopens only for behaviour or requirement changes), diff base = feature branch from `apply.md`, and outcome plus notes recorded in `finalize.md`
- [x] 2.3 Add a test that the "Review gate" sections of `opsx-continue` and `opsx-ff` are byte-identical

## 3. `opsx-continue` gate

- [x] 3.1 Insert the gate section into `skills/opsx-continue/SKILL.md` and run it after the artifact is written, before the STOP
- [x] 3.1b Make the finalize path in `skills/opsx-continue/SKILL.md` run the code review gate before the git-side closeout and point `/opsx-verify`'s next-step text at it if wording changes
- [x] 3.2 Update its output and guardrails: approval does not create the next artifact
- [x] 3.3 Update `prompts/opsx-continue.md` only if its description now misstates the behaviour

## 4. `opsx-ff` gates

- [x] 4.1 Insert the same gate section into `skills/opsx-ff/SKILL.md`
- [x] 4.2 Add the brainstorm gate immediately after `brainstorm.md` is written and before any later artifact
- [x] 4.3 Add the final gate: explicit ordered file list (proposal, design, every spec file, tasks, plan), never a folder, and no `brainstorm.md`
- [x] 4.4 Point to `/opsx-apply` only after the final gate is approved; update the interaction boundary, guardrails and the "Superpowers artifact rule" so it no longer says approval gates must not stop the run before the plan

## 5. Docs and specs wording

- [x] 5.1 Update `docs/workflow.md`: Commands table for `continue` and `ff`, Conflicts resolved #9, and the finalize row and step rules for the code review gate
- [x] 5.2 Add a `plannotator` row with CLI fallback to the pi tool mapping in `docs/architecture.md`
- [x] 5.3 Update `docs/usage-guide.md`, `README.md` and `README.vi.md` wherever they describe `ff` as unattended or `continue` as stop-only
- [x] 5.4 Add a `CHANGELOG.md` entry

## 6. Verification

- [x] 6.1 Run the project test command and `npm run typecheck` fresh and record the results
- [x] 6.2 Run `openspec validate review-gate`
- [ ] 6.3 Try the CLI path once on a real pi session (background run, `--result-file`, `approved`, `annotated`, closed tab) and record the result for the open question in `design.md` (not done: apply ran in Claude Code, no pi session available; left open in `design.md`)
- [x] 6.4 Run `plannotator review --base <feature branch> --gate --json <worktree>` once with stdout redirected to a scratch file, and confirm the captured JSON has `decision`
