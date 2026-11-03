# Apply Receipt

> Generated at the end of the apply phase to mark code-implementation
> complete and provide verify with the state it needs.
> Overwritten on each apply iteration; iteration counter grows.

**Change**: `docs-release`
**Iteration**: `1`
**Applied at**: `2026-11-03 17:44`
**Executor**: `subagent-driven-development`

---

## Workspace

- **Worktree path**: `/Users/naicoi/Projects/oss/pi-superspec.feat-docs-release/.claude/worktrees/docs-release`
- **Worktree branch**: `docs-release`
- **Feature branch**: `feat/docs-release`
- **Base branch**: `main`

---

## Commits

- **Range**: `0ca9c1a..7e4a36b`
- **Count**: `23`

---

## Tasks

- **Completed**: `16 of 16` checkboxes in tasks.md flipped to `- [x]`
- **Remaining**: none

---

## Next step

Run `/opsx-verify`.

---

## Notes for verify

- Plan tasks 1-8 each passed a task review (spec + quality); fix rounds: task 1 (1), task 3 (1), task 5 (1), task 6 (1), task 7 (1). A whole-branch review (most capable model) returned "With fixes"; one fix wave (`7e4a36b`) was applied and a scoped re-review approved it with no open findings.
- Test evidence from this apply: `npm test` 163 passed, `npm run typecheck` clean, `openspec validate docs-release` valid.
- The clean-repo dry run (plan Task 8) ran everything that does not need a live pi session: the real `runInit()` with a stub IO, commit of the init output, feature branch, `openspec new change`, `openspec status`, `openspec instructions apply`, `openspec archive` CLI form. Everything that needs pi (`/opsx-*` commands, brainstorming, subagents, worktree/finalize/gh/push, the archive prompt flow) was **not** exercised and is covered only by `docs/e2e-checklist.md`.

## Findings (documentation could not be made true without code, or is unverified)

- Schema auto-upgrade, `--force`, backup and upgrade write guards are described in the original design docs but are **not shipped**: `extensions/init/init.ts` blocks on any non-identical schema, and the lock file `.pi-superspec.json` is written but never read. The docs now label these as planned (change `schema-auto-upgrade`, which does not exist yet). The maintainer approved this ruling. `docs/architecture.md` Goal 4 was corrected accordingly.
- Unverified claims remain in the docs, carried with qualifiers: the `rpiv-ask-user-question` and `rpiv-todo` package names (`docs/architecture.md`, `README.md`) and "OpenSpec strips unknown top-level keys" (`docs/architecture.md`). Verify them before tagging a release.
- Finalize runs a plain `git pull` and pushes without `-u` (`schema/superspec/schema.yaml`), and `/opsx-continue` has no worktree discovery. The docs now tell the user to push the feature branch with `-u` first and to start pi in the worktree path for finalize. A schema or skill change could remove both prerequisites in a later change.
- `package.json` is still `0.0.0`; `CHANGELOG.md` uses `[Unreleased]`. Bump the version and date the entry at release time.
- Deferred minors: `docs/workflow.md:57-58` says verify "runs with the worktree as working directory" (true for its `openspec` calls; could add "it locates the worktree itself"); `usage-guide.md` lists `gh missing` both under no-PR and failed (mirrors `schema.yaml:576`).
