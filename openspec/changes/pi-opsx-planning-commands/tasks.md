## 1. Content test (red first)

- [x] 1.1 Add `tests/planning-commands.test.ts`: four skill/prompt pairs exist, skill `name` equals directory, each prompt names its skill and contains `$@`, no placeholder resources remain
- [x] 1.2 In the same test, scan `skills/` and `prompts/` for `AskUserQuestion`, `TodoWrite` and `Task tool` and expect no matches
- [x] 1.3 Update `tests/extension.test.ts` to assert the real commands (not the placeholders) are returned for a marked project and absent for an unmarked one

## 2. Skills

- [x] 2.1 Write `skills/opsx-explore/SKILL.md` adapted from `openspec-explore` (pi tool mapping, credit line)
- [x] 2.2 Write `skills/opsx-new/SKILL.md` adapted from `openspec-new-change` (no `--schema`, stop after first-artifact instructions)
- [x] 2.3 Write `skills/opsx-continue/SKILL.md` adapted from `openspec-continue-change`, including the Superpowers-artifact rule
- [x] 2.4 Write `skills/opsx-ff/SKILL.md` adapted from `openspec-ff-change`: interactive brainstorm, unattended proposal → plan, stop before apply, Superpowers-artifact rule
- [x] 2.5 Confirm the registered tool names of `rpiv-ask-user-question` and `rpiv-todo` and use them with the "if available" fallback wording

## 3. Prompts and placeholder removal

- [x] 3.1 Write the four thin prompts `prompts/opsx-{explore,new,continue,ff}.md`
- [x] 3.2 Delete `skills/superspec-placeholder/` and `prompts/opsx-placeholder.md`

## 4. Verification

- [x] 4.1 Run `npm test` and `npm run typecheck`
- [ ] 4.2 Manual in-pi run in an activated temp project: `/opsx-new` + `/opsx-continue` produce `brainstorm.md` then `proposal.md`; `/opsx-ff` reaches `plan.md` and stops (pending: manual in-pi run, needs a live model)
