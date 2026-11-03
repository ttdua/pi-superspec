## Context

pi-superspec has shipped its schema, `/opsx-init`, activation, execution and planning commands, and the routing note. It has no README, root LICENSE, usage guide or e2e checklist. `docs/architecture.md` still lists a `README.md` component and describes the shipped pieces at design level. See `brainstorm.md` for intent and scope.

## Goals / Non-Goals

**Goals:**
- Every claim in a user-facing doc is traceable to shipped code, a prompt, a skill or the bundled schema.
- A clean-repo walkthrough reaches an archived change with no unstated step.

**Non-Goals:**
- Code or schema changes. If a doc cannot be made true without one, record it as a finding instead of fixing it here.

## Decisions

- **File set.** `README.md`, `README.vi.md`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/usage-guide.md`, `docs/e2e-checklist.md`, `package.json` metadata, plus edits to `docs/architecture.md`, `docs/workflow.md`, `docs/glossary.md` and `docs/domain-model.md` where they differ from what shipped.
- **README is a front door, the guide is the manual.** The README holds install, quick start, command table, uninstall and credits only; walkthroughs live in `docs/usage-guide.md`. Alternative: one long README (rejected, see `brainstorm.md`).
- **Single source for commands.** The command table is derived from `docs/workflow.md` and checked against `prompts/opsx-*.md`; the guide links to workflow.md instead of restating the conflict table.
- **Vietnamese only for the README.** `README.vi.md` mirrors the README section for section so drift is a diff away; it links to the English guide.
- **Verification by dry run.** In a scratch git repo, follow the README literally with a stand-in change, recording each command, and compare with the checklist. Anything not in the README is a gap to fix. Where pi or network access is unavailable, say so in `verify.md` rather than claim a pass.
- **LICENSE.** MIT text with the repository owner's copyright. Credits (Superspec by Daniel Hanold, JiangWay `sdd-plus-superpowers`, OpenSpec's generated skills) go in the README, and `schema/superspec/LICENSE` is kept as is.

## Risks / Trade-offs

- [Docs describe behaviour that differs from the code] → read `extensions/` and `prompts/` before writing each claim; list unverified claims in `verify.md`.
- [README.vi.md drifts from README.md] → same section order and headings; CONTRIBUTING asks for both to change together.
- [Copyright holder or year in LICENSE is wrong] → use the git author and 2026, flag it for the maintainer to confirm at review.
- [Uninstall wording overpromises] → state exactly what remains in a project after the package is removed.

## Open Questions

- None.
