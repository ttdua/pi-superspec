# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `prompt-and-review-gate`
**Iteration**: `1`
**Applied at**: `2026-11-05 09:52`
**Executor**: `subagent-driven-development`

Seats: `superspec.implementer` per task and `superspec.task-reviewer` per task. The final whole-branch review was also a `superspec.task-reviewer` seat. At the user's request, independent tasks ran in parallel lanes in separate Worktrunk worktrees:
- lane A (`prompt-and-review-gate-lane-a`): tasks 1, 2 and 4;
- lane B (`prompt-and-review-gate-lane-b`): tasks 3 and 8;
- the main worktree: tasks 5, 6 and 7.

Each lane was merged into the worktree branch after its task review passed.

---

## Workspace

- **Worktree path**: `/Users/naicoi/Projects/oss/pi-superspec.prompt-and-review-gate`
- **Worktree branch**: `prompt-and-review-gate`
- **Feature branch**: `spec/prompt-and-review-gate`
- **Base branch**: `main`

---

## Commits

- **Range**: `091dba9..3daa139`. The receipt commit follows.
- **Count**: `19`. These are implementation, fix, tick and lane-merge commits.

Review outcomes:

| Task | Review |
|---|---|
| T1, T3, T4, T5, T6, T7 | clean |
| T2 | clean after 1 fix round |
| T8 | clean after 1 fix round |

The final whole-branch review returned "Ready with fixes" with 0 Critical and 0 Important findings. One fix wave followed (`3daa139`, doc wording only), and its scoped re-review was clean.

Evidence at `3daa139`:
- `npm test` passed 451/451 across 20 files.
- `npm run typecheck` exited 0.
- `openspec validate prompt-and-review-gate --strict` reported the change valid.

---

## Tasks

- **Completed**: `16 of 18` checkboxes in tasks.md are flipped to `- [x]`.
- **Remaining**:
  - `4.5`: deferred by design. It updates the Purpose line of `openspec/specs/planning-commands/spec.md` and is done at `/opsx-sync` or `/opsx-archive`.
  - `5.2`: manual check in pi, only partially verified.
    - **Verified:** a harness (`/tmp/prg-e2e/run.ts`) drove the real extension entry: a real `session_start` probe running `sh -c "command -v plannotator"`, and the real `context` hook with stubbed `getActiveTools`. It selected:
      - `inbox` (1915 B) with the Inbox tool on;
      - `plannotator-tool` (2515 B) with the Inbox off and the plannotator tool active;
      - `plannotator-cli` (1745 B) with no tools and the CLI on `PATH`;
      - `plain` (294 B) with no tools and no CLI.
    - **Not verified:** a live interactive pi session, and a live `/opsx-continue` Inbox gate advancing after approval. An interactive pi session could not be started from the apply controller.
    - **Fallback evidence:** the harness above, plus the unit tests for detection, paragraph, wiring and skill text.

---

## Contract deviations

> Contracts changed during apply, each with its reason. Cumulative:
> keep entries from earlier iterations. Write `none` if there are none.

- `channelParagraph(available: readonly Channel[]): string` replaces `channelGuidance(selected, fallback)`, the name in tasks.md 1.2 and design.md D3. The rename was recorded in plan.md Contracts before apply. Behaviour is unchanged: taking the ordered available list lets one function decide both the fallback and the omission of unavailable channels. The contract is internal.

---

## Rulings made during apply

Each ruling is listed with the cost if it is wrong. All are recorded in the SDD ledger.

- **Task 6 left the change-selection ask sentence to Task 7**, so the sentence had a single writer. Cost if wrong: one extra edit.
- **Independent tasks ran in parallel lanes** (A: T1→T2→T4, B: T3→T8, main: T5→T6→T7), at the user's request. Cost if wrong: hand-resolved merge conflicts. None occurred.
- **A dismissed gate asks on the Interaction channel, not "in chat"**, per the review-gate spec "Dismissed code review". This was applied in both skills and in the channel paragraph. Cost if wrong: one sentence.
- **On `plannotator-tool` and `plannotator-cli`, questions are asked in plain text** with numbered options, recommended first, then wait. Neither tool has a question primitive. Cost if wrong: one line per channel block.
- **`docs/e2e-checklist.md` was added to Task 8's scope.** It described the old stop-after-each-gate behaviour, so the manual release check would fail. Cost if wrong: one doc edit.

---

## Next step

Run `/opsx-verify prompt-and-review-gate`, with this worktree as the working directory.
