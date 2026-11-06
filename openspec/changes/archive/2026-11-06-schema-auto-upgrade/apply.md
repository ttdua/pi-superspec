# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `schema-auto-upgrade`
**Iteration**: `1`
**Applied at**: `2026-11-06T08:00Z`
**Executor**: `subagent-driven-development` (pi-subagents: `superspec.implementer` per task, `superspec.task-reviewer` per task and for the final whole-branch review)

---

## Workspace

- **Worktree path**: `/Users/naicoi/Projects/oss/pi-superspec.schema-auto-upgrade`
- **Worktree branch**: `schema-auto-upgrade`
- **Feature branch**: `feat/schema-auto-upgrade`
- **Base branch**: `main`

---

## Commits

- **Range**: `4ef366c..6d65666` (the receipt commit follows)
- **Count**: `18`

---

## Tasks

- **Completed**: `18 of 18` checkboxes in tasks.md flipped to `- [x]`
- **Remaining**: none

Reviews:
- Every task had a task review. Tasks 3 and 7 each had one fix round, and both re-reviews approved the fixes.
- The final whole-branch review approved the branch with no critical or important findings.
- One fix wave followed (`d6ec907`): an unreadable schema now gives a blocked notice instead of throwing, and the replace-failed prefix appears once. Its scoped re-review approved it.
- Every other minor finding was deferred with a ruling. They are cosmetic, test-only, or pre-existing (symlinks ignored by `listFiles`).

Evidence:
- `npm test`: 522/522 passed (23 files).
- `npm run typecheck`: clean.
- `openspec validate schema-auto-upgrade --strict`: valid.
- End-to-end run against the real `openspec` 1.16.0, real fs, real `createInitIO` and the `session_start` handler, in a scratch git repo with a temporary `HOME`:
  - Fresh install.
  - Pristine v6: the session notice appears, and no notice appears without a UI.
  - No UI: blocked. Declined: blocked. Confirmed: upgraded from v6 to v7 and equal to the bundled schema.
  - A second run is a no-op.
  - Edited schema: a notice and a block without `--force`.
  - `--force --lang vi`: the schema is replaced, the backup holds the edit, and `language: vi` is set.
  - `openspec schema which --all` lists only `superspec`.
  - No staging or old directories are left behind.
- Limit: no live pi TUI session was driven. The notice wording is verified by unit tests and by the handler-level run above.

---

## Contract deviations

none

---

## Next step

Run `/opsx-verify`.
