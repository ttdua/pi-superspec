## Why

The package has no README, root LICENSE, usage guide or end-to-end checklist, so a new user cannot install it or reach a first archived change from the repository alone. This is the last change before release, and architecture.md already commits to the license, the credits and a manual end-to-end test.

## What Changes

- Add `README.md` (English) and `README.vi.md` (Vietnamese), cross-linked: what it is, prerequisites, optional packages, install, `/opsx-init` quick start, command table, uninstall behaviour, credits.
- Add `docs/usage-guide.md` (English): a step-by-step walkthrough of one change, the `/opsx-ff` fast path, runs with and without `pi-subagents`, existing-schema behaviour as shipped (auto-upgrade is not yet shipped) and troubleshooting.
- Add `docs/e2e-checklist.md`: the manual end-to-end checklist from the Testing section.
- Add root `LICENSE` (MIT), `CHANGELOG.md` and `CONTRIBUTING.md`; add `repository`, `homepage` and `bugs` to `package.json`.
- Update `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md` and `docs/glossary.md` wherever they differ from what shipped.
- No code, schema or behaviour changes.

## Capabilities

### New Capabilities
- `project-readme`: the English and Vietnamese READMEs, their required content and cross-linking.
- `usage-guide`: the English usage guide covering the step-by-step flow, `/opsx-ff`, and the with and without `pi-subagents` paths.
- `release-metadata`: LICENSE, CHANGELOG, CONTRIBUTING, `package.json` metadata, credits, the e2e checklist, and consistency of `docs/*.md` with the shipped package.

### Modified Capabilities

## Impact

Documentation and metadata only. Touches the repository root, `docs/` and `package.json` (metadata fields, not scripts, dependencies or the `pi` manifest). No effect on the extension, prompts, skills or bundled schema, and no new dependencies.
