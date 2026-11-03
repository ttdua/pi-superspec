## Context

The bundled schema lives at `schema/superspec/` (see `docs/architecture.md`,
Components). Upstream Superspec v4 (`openspec/schemas/superspec/`, commit
`e1c8f417`) is the base; it is read-only for this change. `package-skeleton` provides
the repo layout and the vitest harness. `openspec` ≥ 1.4 resolves schemas only from
the project, so tests copy the schema into a temp project.

## Goals / Non-Goals

**Goals:**
- Schema v5 with the documented DAG, apply block and templates.
- Tests proving validity, DAG/doc agreement and the apply block.

**Non-Goals:**
- Installing, locking or upgrading the schema in projects; pi skills and prompts.

## Decisions

1. **Fork v4 in place.** Header comment credits Superspec (Daniel Hanold) and v4
   commit `e1c8f417`. `name: superspec`, `version: 5`, top-level
   `x-pi-superspec: { version: 5 }`. Copy the upstream `LICENSE` next to the schema.
   Description is rewritten for v5.
2. **Harness-neutral wording.** "Use the Skill tool to invoke X" becomes "Load the X
   skill" (bare Superpowers skill names are valid on every harness). `/opsx:` becomes
   `/opsx-`. No pi tool names appear; a test greps the schema for forbidden names.
3. **design stub.** The design instruction writes `No design needed: <reason>` (two
   lines) when there is no non-trivial technical decision. `design` requires only
   `brainstorm`; nothing requires `design`.
4. **Apply block.** Step 0 commits the change dir on the feature branch, creates the
   worktree with branch `<change-name>`, and declares the worktree copy
   authoritative until finalize. After the final whole-branch review it writes
   `apply.md` and stops; `finishing-a-development-branch` is not invoked. The
   `executing-plans` fallback must still request a whole-branch review (conflict #8).
   Verify is no longer run from inside apply; the convergence loop is described in the
   verify artifact only.
5. **`apply.md` template** adds branch facts: worktree path, worktree branch, feature
   branch, base branch, commit range, iteration, executor, tasks X of Y.
6. **Verify.** One six-item list as in workflow.md; `openspec validate <change>`
   replaces `validate --all`; runs with the worktree as working directory; the project
   test command is run fresh and recorded. The delta spec sync check is removed from
   the instruction and template. Because archive is not an artifact in the schema, the
   sync check lives in the `finalize` "next step" text and the verify PASS text
   ("`/opsx-archive` syncs delta specs if needed and warns when they differ"); the
   archive command itself is owned by the later skills/prompts change.
7. **Finalize.** Locates the worktree via `git worktree list --porcelain` filtered on
   `refs/heads/<change-name>` (asks if none), reads worktree path and branch facts
   from that worktree's `apply.md` instead of the v4 `git log` guess, and states that
   a policy in the project's `AGENTS.md` overrides any step. The v4 closeout steps,
   reviewer-comment subroutine and escape hatch are kept.
8. **Tests** (vitest, under `tests/`; skipped with a clear message when `openspec` is
   absent or < 1.4):
   - copy `schema/superspec` into a temp project's `openspec/schemas/superspec`,
     `openspec schema validate superspec` passes;
   - `openspec new change x` + `openspec status --change x --json` DAG equals the
     Artifact table parsed from `docs/domain-model.md`;
   - `openspec instructions apply --change x --json` returns the apply block, whose
     text forbids `finishing-a-development-branch` invocation and mentions
     `<change-name>` branch and worktree authority;
   - the marker, version, name and absence of pi tool names are asserted on the YAML.
9. **Manifest.** `package.json` `files` adds `schema`; delta spec for `package-manifest`.

## Risks / Trade-offs

- [OpenSpec rejects or strips the unknown `x-pi-superspec` key] → validate test covers
  it; architecture.md already states OpenSpec strips unknown keys.
- [Doc table format changes break the parsing test] → the parser fails loudly with the
  expected header; acceptable, it is the drift signal.
- [Large forked text hides accidental v4 drift] → keep edits localized and review the
  diff against upstream in verify.
- [Sync check has no schema home after leaving verify] → documented text only; enforced
  by the archive command in a later change.

## Open Questions

None.
