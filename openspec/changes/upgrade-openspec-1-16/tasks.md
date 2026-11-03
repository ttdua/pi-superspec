## 1. OpenSpec floor 1.16

- [ ] 1.1 Update `extensions/init/preflight.ts` to require 1.16 (message, version check) and update `tests/init/preflight.test.ts` and the stubbed `1.4.1` versions in `tests/init/init.test.ts`
- [ ] 1.2 Update the version text in `README.md`, `docs/architecture.md` (init step 1 and Constraints), `docs/e2e-checklist.md` and `docs/usage-guide.md` (prerequisite and troubleshooting), and the skip message in `tests/schema.test.ts`

## 2. Schema v6

- [ ] 2.1 Bump `schema/superspec/schema.yaml` to version 6 and `x-pi-superspec.version` to 6, and update `tests/schema.test.ts` identity assertions
- [ ] 2.2 Update `tests/init/schema-install.test.ts` so version 7 is the "newer" case and the other classification cases still hold
- [ ] 2.3 Rewrite verify checks 3 and 4 in `schema.yaml` for ADDED/MODIFIED, REMOVED and RENAMED, add the "not verified, never PASS" rule, and update `schema/superspec/templates/verify.md` and the schema tests that read them

## 3. Execution skills

- [ ] 3.1 `opsx-apply`: task locations, blocked-by-cause, scope pause, "tracked tasks complete" wording, with tests in `tests/execution-commands.test.ts`
- [ ] 3.2 `opsx-verify`: read-only rule, progress from apply, skipped checks not verified, with tests
- [ ] 3.3 `opsx-sync`: rules fetch, delta Purpose, blocked cases, empty Requirements guard, `retire_capabilities`, main-spec format, with tests
- [ ] 3.4 `opsx-archive`: re-check after sync, blocked-sync choices, task counts from `list --json`, skipped counts as complete, unclear answer re-ask, with tests

## 4. Planning skills

- [ ] 4.1 `opsx-continue`: partial glob artifacts, `isPlanningComplete` with fallback, `skipped`, re-read dependencies, with tests in `tests/planning-commands.test.ts`
- [ ] 4.2 `opsx-ff`: ground in the repo, report skipped artifacts, `design` stays mandatory, with tests
- [ ] 4.3 `opsx-explore`: write consent, broader guardrail, scaffold-and-hand-off, ASCII diagrams, spec reads and superspec artifact names in the capture table, with tests
- [ ] 4.4 Update the provenance header in all seven skills to the 1.16.0 sync wording

## 5. Strict validation cleanup

- [ ] 5.1 Replace the placeholder Purpose in `openspec/specs/execution-commands/spec.md` and `openspec/specs/planning-commands/spec.md`
- [ ] 5.2 Run `openspec validate upgrade-openspec-1-16 --strict` and `openspec validate --all --strict` with 1.16 and fix anything left

## 6. Final checks

- [ ] 6.1 Run `npm test` and `npm run typecheck`, and confirm no remaining "1.4" version claims with `grep -rn "1\.4" README.md docs extensions skills schema tests`
