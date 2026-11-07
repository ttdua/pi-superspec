## 1. Bundled agents

- [x] 1.1 Add `coding-standards` to the implementer's skills and its coding standard duty (apply while writing, at the refactor step, no deferred splits; fallback to project conventions under Limitations), with contract tests in `tests/agents.test.ts`
- [x] 1.2 Add `coding-standards` to the task reviewer's skills and its code quality and structure duty (findings may cite a coding standard rule, `CHANGES_REQUESTED` allowed for structure, no `INCOMPLETE` only for a missing skill, fallback under Limitations, no numeric thresholds), with contract tests
- [x] 1.3 Add `coding-standards` to the plan reviewer's skills and its decomposition duty (units split by responsibility before contracts; one entry point or contract owning several responsibilities is a finding; same fallback and threshold rules), with contract tests
- [x] 1.4 Assert that the scout, spec reviewer and verifier do not select `coding-standards` and that the published package files contain no `coding-standards` skill

## 2. Routing policy

- [x] 2.1 Split role skills into required and optional in `skills/references/subagent-routing.md` (Availability and Failures): `coding-standards` is the only optional skill; how the parent detects it missing; announce once per stage and dispatch; required skills still stop the stage. Update `tests/subagent-routing.test.ts`

## 3. Missing coding standard warning

- [ ] 3.1 Add `hasCodingStandards` and `CODING_STANDARDS_MISSING_WARNING` to `extensions/routing-note.ts`, with unit tests in `tests/routing-note.test.ts`
- [ ] 3.2 Emit the warning from the `session_start` handler in `extensions/superspec.ts` with the Superpowers guards, with handler tests in `tests/extension.test.ts` (missing, installed, unactivated, no UI, both missing)

## 4. Documentation

- [ ] 4.1 Add the `coding-standards` prerequisite to `README.md` and `README.vi.md` (who provides it, where pi discovers it, which roles apply it, fallback, no stop), with a README test in `tests/project-readme.test.ts`
- [ ] 4.2 Name the three roles that carry the coding standard in `docs/architecture.md` (Package agents) and `docs/workflow.md` (specialist seats)
