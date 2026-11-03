## 1. Schema scaffold

- [x] 1.1 Copy upstream v4 `schema.yaml`, `templates/*.md` and `LICENSE` into `schema/superspec/`; set `name`, `version: 5`, `x-pi-superspec`, credit header and new description
- [x] 1.2 Add test helper that copies the schema into a temp OpenSpec project; test identity fields and `openspec schema validate superspec`

## 2. Workflow edits

- [ ] 2.1 Harness-neutral wording and `/opsx-` spelling across schema and templates, with a forbidden-names test
- [ ] 2.2 design stub instruction and test
- [ ] 2.3 Apply block: stop after final review, worktree branch `<change-name>`, worktree authority, `executing-plans` review; update `templates/apply.md` branch facts; tests
- [ ] 2.4 Single verify check list in the instruction and `templates/verify.md`; sync check deferred to archive; tests
- [ ] 2.5 Finalize reads `apply.md`, AGENTS.md override; tests

## 3. DAG and apply integration

- [ ] 3.1 Test: DAG from `openspec status --json` equals the table parsed from `docs/domain-model.md`
- [ ] 3.2 Test: `openspec instructions apply --json` in a temp project returns the apply block

## 4. Manifest and verification

- [ ] 4.1 Add `schema` to `package.json` `files`; update the manifest test
- [ ] 4.2 Run `npm test`, `npm run typecheck`; confirm `openspec/schemas/superspec/` is unchanged
