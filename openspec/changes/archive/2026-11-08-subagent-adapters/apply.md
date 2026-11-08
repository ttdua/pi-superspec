# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `subagent-adapters`
**Iteration**: `2`
**Applied at**: `2026-11-08 02:11` (UTC, `2026-11-08T02:11:16Z`)
**Executor**: `subagent-driven-development` with parallel lanes (plugin `@gotgenes/pi-subagents` 25.0.5; agents selected by role requirements: implementer `general-purpose`, or `easy-worker` for the Easy task; per-task, fix-round and whole-branch review `code-reviewer`; thinking from task difficulty, no model override)

---

## Workspace

- **Worktree path**: `/Users/naicoi/Projects/oss/pi-superspec.subagent-adapters`
- **Worktree branch**: `subagent-adapters`
- **Feature branch**: `feat/subagent-adapters`
- **Base branch**: `main`

---

## Commits

- **Range**: `dd3b63c..44b569b` (covers the lane merges and iteration 2)
- **Count**: `35`

---

## Tasks

- **Completed**: `23 of 23` checkboxes in tasks.md flipped to `- [x]`
- **Remaining**: none

---

## Contract deviations

> Contracts changed during apply, each with its reason. Cumulative:
> keep entries from earlier iterations. Write `none` if there are none.

- `detectSubagentAdapter` (internal): the pi-subagents rule is `agent` or `task`, and now also requires no `subagent_type` parameter (design D1 named only `agent` or `task`). Reason: the final review found that a gotgenes-style `subagent` tool with an extra `task` parameter would otherwise be read as pi-subagents. The signature is unchanged.
- `resolveSubagentIntegration` and `SubagentIntegration` (internal, iteration 2): new export that detects the adapter and picks the spawn tool through the provenance tie-break; `extensions/superspec.ts` now uses it. Reason: verify W1, the provenance SHALL did not reach runtime.
- `subagentParagraph` (internal, iteration 2): optional `toolName` that renames every reference to the selected spawn tool (spawn, list, resume) when it differs from the default; with no `toolName` the text is unchanged except the pi-subagents thinking line, which now gives its reason (verify W2).

---

## Lanes

> One row per plan task. Lane branch is `<change-name>--task-<N>` or
> `sequential`. The Commit range above covers the lane merges too.

| Task | Lane branch | Lane range | Review | Merge commit |
|---|---|---|---|---|
| `Task 1` | `subagent-adapters--task-1` | `dd3b63c..136b48f` | approved after 1 fix round | `b9d55d2` |
| `Task 2` | `subagent-adapters--task-2` | `dd3b63c..9c7a6ab` | approved | `8fff065` |
| `Task 3` | `subagent-adapters--task-3` | `dd3b63c..98f98c9` | approved | `7485d3a` |
| `Task 4` | `subagent-adapters--task-4` | `6b72d99..3a60348` | approved after 1 fix round | `8419760` |
| `Task 5` | `subagent-adapters--task-5` | `6b72d99..e3e4eaa` | approved after 1 fix round | `0eb418e` |
| `Task 6` | `subagent-adapters--task-6` | `d29e1bd..4ff451d` | approved after 1 fix round | `2b642fd` |
| `Task 7` | `subagent-adapters--task-7` | `d29e1bd..d5cb6bf` | approved after 1 fix round | `47a8efe` |
| `Task 8` | `subagent-adapters--task-8` | `b327908..04c123a` | approved after 2 fix rounds | `2f7c79b` |

Whole-branch review over `dd3b63c..0ddb253`: no Critical, 1 Important (apply did not override the SDD rule against parallel implementers), 6 Minor. One fix wave (`0ddb253..980ca3d`) addressed all seven, and the scoped re-review approved it.

Validation on `980ca3d`: `npm test` 662/662 passed, `npm run typecheck` clean, `openspec validate subagent-adapters --strict` valid.

Iteration 2 (user decision after verify PASS_WITH_WARNINGS): fixes W1–W3 and the textual W4 assertions in the change worktree, one writer, `sequential` (no lanes). The range is `3b14505..44b569b`, 5 commits.
- Review seat `code-reviewer`. First review: 2 Important (metadata test depended on git history; MCP-prefixed name not renamed in listing lines) and 1 Minor (contracts).
- Fixed in 2 rounds, final re-review approved.

Validation on `44b569b`: `npm test` 667/667 passed, `npm run typecheck` clean, `openspec validate subagent-adapters --strict` valid.

---

## Next step

Run `/opsx-verify subagent-adapters` (iteration 2).
