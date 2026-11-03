## 1. Ground truth

- [x] 1.1 Read `extensions/`, `prompts/`, `skills/` and `schema/superspec/schema.yaml` and record every user-visible behaviour the docs will state (init output, upgrade cases, `--force`, command arguments)
- [x] 1.2 List where `docs/*.md` differ from the shipped package

## 2. Release metadata

- [x] 2.1 Add root `LICENSE` (MIT) and leave `schema/superspec/LICENSE` unchanged
- [x] 2.2 Add `repository`, `homepage` and `bugs` to `package.json`
- [x] 2.3 Add `CHANGELOG.md` for the first release
- [x] 2.4 Add `CONTRIBUTING.md`

## 3. README

- [x] 3.1 Write `README.md`: what it is, prerequisites, optional packages, install, `/opsx-init` quick start, command table, uninstall behaviour, credits and license
- [x] 3.2 Write `README.vi.md` mirroring the section order of `README.md`, with cross-links

## 4. Usage guide and checklist

- [x] 4.1 Write `docs/usage-guide.md`: step-by-step walkthrough through archive
- [x] 4.2 Add the `/opsx-ff` section, executor variants (with and without `pi-subagents`), upgrades and troubleshooting
- [x] 4.3 Write `docs/e2e-checklist.md` with the two runs and expected results

## 5. Docs consistency

- [x] 5.1 Update `docs/architecture.md` (component list, anything that differs from what shipped)
- [x] 5.2 Update `docs/workflow.md`, `docs/domain-model.md` and `docs/glossary.md` where they differ

## 6. Verification

- [x] 6.1 Dry-run the README in a scratch git repo and record every command and any undocumented step; fix gaps
- [x] 6.2 Check every command, flag and path named in the docs against the repository
- [x] 6.3 Run `npm test`, `npm run typecheck` and `openspec validate docs-release`
