# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `adopt-openspec-2-skills`
**Iteration**: `1`
**Applied at**: `2026-11-12 10:52`
**Executor**: `subagent-driven-development`

Implementers were general-purpose agents briefed with the superspec implementer contract; reviewers were `code-reviewer` agents (read-only) per task, plus one whole-branch review. The bundled `superspec.*` agents are not registered under gotgenes, so the generic agents were used with the role handoff.

---

## Workspace

- **Worktree path**: `/Users/naicoi/Projects/oss/pi-superspec.adopt-openspec-2-skills`
- **Worktree branch**: `adopt-openspec-2-skills`
- **Feature branch**: `spec/adopt-openspec-2-skills`
- **Base branch**: `main`

---

## Commits

- **Range**: `574e1b3..56ea9e4` (this receipt is committed on top)
- **Count**: `15`

---

## Tasks

- **Completed**: `23 of 23` checkboxes in tasks.md flipped to `- [x]`
- **Remaining**: none

---

## Contract deviations

- `v9 schema digest`: `workflow.md` changed after the first v9 digest was recorded (review fixes). v9 is unreleased, so the `"9"` entry in `tests/fixtures/schema-checksums.json` was updated instead of bumping to v10.
- `missingStockSkills` test seam: the throwing-check test uses `vi.mock` in a separate file (`tests/extension-stock-skills.test.ts`) rather than injecting a checker; the exported signature is unchanged.

---

## Lanes

| Task | Lane branch | Lane range | Review | Merge commit |
|---|---|---|---|---|
| Task 1 | sequential | `574e1b3..39124dd` | pass after fixes (archive fallback, positive scenario tests) | n/a |
| Task 2 | sequential | `39124dd..2921012` | pass after fixes (project-root path, exact skills layout, prompt phrases) | n/a |
| Task 3 | sequential | `2921012..31499c5` | pass after fixes (failure-silence assertion, symlink cases) | n/a |
| Task 4 | sequential | `31499c5..d283292` | pass after fixes (hermetic integration env, config-call guard, restore case) | n/a |
| Task 5 | sequential | `d283292..e8aaeec` | covered by whole-branch review | n/a |
| Final | sequential | `e8aaeec..56ea9e4` | whole-branch review: pass-with-fixes, fixed (workspace-mode scope, explore capture override, minor docs) | n/a |

---

## Validation at receipt time

- `bun run typecheck`: exit 0.
- `bun run test`: 806 passed, 6 skipped (integration tests skip on the local OpenSpec 1.17).
- `PATH=/tmp/os2shim:$PATH bun run test tests/init/integration.test.ts tests/schema.test.ts` (OpenSpec 2.0.0 via shim): 74 passed.
- `openspec validate adopt-openspec-2-skills --strict`: valid.
- Not yet verified: an agentic E2E run of the shipped layout in pi (the `docs/e2e-checklist.md` "Shipped layout and OpenSpec 2.0" section). The spike covered the same checks with the overlay in the routing note, not in the schema.

---

## Next step

Run `/opsx-verify` from this worktree.
