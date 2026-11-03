## 1. Content test (red first)

- [ ] 1.1 Add `tests/execution-commands.test.ts`: four skill/prompt pairs exist, skill `name` equals directory, each prompt names its skill, contains `$@` and is at most 15 lines; `opsx-propose` and `opsx-bulk-archive` are absent
- [ ] 1.2 In the same test, scan `skills/` and `prompts/` for `AskUserQuestion`, `TodoWrite` and `Task tool` and expect no matches
- [ ] 1.3 Assert skill content: apply names `subagent`, `subagent-driven-development`, `executing-plans`, whole-branch review and post-PR iteration; verify names the worktree and `apply.md`; archive names the delta-sync check; the Superpowers-missing STOP rule is present
- [ ] 1.4 Update `tests/extension.test.ts` to assert `opsx-apply` is returned for a marked project and absent for an unmarked one

## 2. Skills

- [ ] 2.1 Write `skills/opsx-apply/SKILL.md` adapted from `openspec-apply-change`: wrap `openspec instructions apply`, executor selection by `subagent` tool presence, whole-branch review fallback, post-PR mode, Superpowers rule
- [ ] 2.2 Write `skills/opsx-verify/SKILL.md` adapted from `openspec-verify-change`: wrap `openspec instructions verify`, run in the worktree, require `apply.md`, fresh test run, no delta-sync check
- [ ] 2.3 Write `skills/opsx-sync/SKILL.md` adapted from `openspec-sync-specs`: merge deltas in archive order, report changes, validate, do not archive
- [ ] 2.4 Write `skills/opsx-archive/SKILL.md` adapted from `openspec-archive-change`: completion warnings, delta-sync check with sync offer, archive via CLI

## 3. Prompts

- [ ] 3.1 Write the four thin prompts `prompts/opsx-{apply,verify,sync,archive}.md`

## 4. Verification

- [ ] 4.1 Run `npm test` and `npm run typecheck`
- [ ] 4.2 Manual in-pi end-to-end with `pi-subagents` installed: one tiny change through plan, apply, verify (PASS), finalize, archive (manual, non-blocking: needs a live model; not run by the executor)
- [ ] 4.3 Manual in-pi end-to-end without `pi-subagents`: same change, `executing-plans` path (manual, non-blocking: needs a live model; not run by the executor)
