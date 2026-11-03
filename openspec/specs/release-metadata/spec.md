# release-metadata Specification

## Purpose
Define the release metadata and supporting documents: the MIT license file, package metadata, changelog and contributing guide, the manual end-to-end checklist, and consistency of the project docs with the shipped package.

## Requirements
### Requirement: MIT license file
The repository root SHALL contain a `LICENSE` file with the MIT license text, and `package.json` MUST declare `"license": "MIT"`. The existing `schema/superspec/LICENSE` MUST be left unchanged.

#### Scenario: License files consistent
- **WHEN** `LICENSE` and `package.json` are inspected
- **THEN** both identify MIT and `schema/superspec/LICENSE` is unmodified

### Requirement: Package metadata
`package.json` SHALL include `repository`, `homepage` and `bugs` fields pointing at `https://github.com/ttdua/pi-superspec`, and MUST NOT change `scripts`, dependencies, `files` or the `pi` manifest.

#### Scenario: Metadata added only
- **WHEN** `package.json` is diffed against the previous version
- **THEN** only `repository`, `homepage` and `bugs` are added

### Requirement: Changelog and contributing guide
The repository SHALL contain `CHANGELOG.md` describing the first release, and `CONTRIBUTING.md` covering the OpenSpec-driven workflow for changes, running `npm test` and `npm run typecheck`, the rule that `openspec/schemas/superspec/` is never edited, keeping `README.md` and `README.vi.md` in sync, and English-only repository content apart from `README.vi.md`.

#### Scenario: Contributing covers the rules
- **WHEN** a contributor reads `CONTRIBUTING.md`
- **THEN** it states the test and typecheck commands, the upstream-schema rule and the README sync rule

### Requirement: Manual end-to-end checklist
`docs/e2e-checklist.md` SHALL list manual end-to-end steps that take one small change through all ten workflow steps, in two runs: with `pi-subagents` and without it. Each item MUST state an observable expected result.

#### Scenario: Both runs covered
- **WHEN** the checklist is read
- **THEN** it has one run with `pi-subagents` and one without, each covering init through archive

#### Scenario: Expected results stated
- **WHEN** any checklist item is read
- **THEN** it names what the tester should observe

### Requirement: Documentation consistency with shipped package
After this change, `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md` and `docs/glossary.md` SHALL NOT describe components, commands or behaviour that differ from the shipped package, and the architecture component list MUST include the README files, LICENSE and the new docs.

#### Scenario: Component list matches repository
- **WHEN** the architecture component tree is compared with the repository's top-level contents
- **THEN** every shipped top-level file or directory is listed and nothing listed is missing
