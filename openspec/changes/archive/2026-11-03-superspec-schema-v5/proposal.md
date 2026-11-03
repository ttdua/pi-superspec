## Why

The package needs its own bundled OpenSpec schema that encodes the unified workflow in docs/workflow.md. Upstream Superspec v4 names Claude tools, guesses the feature branch from git log, ends apply in finishing-a-development-branch before verify, and carries two overlapping verify lists. Every later change (opsx-init, schema-auto-upgrade, skills and prompts) depends on a validated schema/superspec to copy, version and drive.

## What Changes

- Add `schema/superspec/schema.yaml` and `templates/*.md`, forked from Superspec v4 (credited, upstream MIT LICENSE copied), `name: superspec`, `version: 5`, `x-pi-superspec: { version: 5 }` marker.
- Harness-neutral wording: no pi or Claude tool names, `/opsx-` command spelling.
- design instruction writes a "No design needed" stub when no technical decision exists.
- Apply stops after the final whole-branch review without finishing-a-development-branch; worktree branch is `<change-name>`; the worktree copy is authoritative until finalize; `apply.md` records branch facts.
- Verify uses one six-item check list; the delta-spec sync check moves to archive.
- Finalize reads branch facts from `apply.md` and lets the project's AGENTS.md override any step.
- Tests: `openspec schema validate` from a temp project, DAG matches docs, `openspec instructions apply` returns the apply block.
- Add `schema` to the published `files` in `package.json`.

## Capabilities

### New Capabilities
- `bundled-schema`: the bundled `superspec` schema v5: identity and marker, artifact DAG, templates, apply block, verify and finalize rules.

### Modified Capabilities
- `package-manifest`: the published files allow-list also includes `schema`.

## Impact

- New: `schema/superspec/**`, schema tests under `tests/`.
- Changed: `package.json` (`files`), manifest test, `package-manifest` spec.
- Untouched: `openspec/schemas/superspec/` (upstream v4 used to develop this repo).
- No new runtime dependencies; tests need `openspec` ≥ 1.4 on PATH.
