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
`package.json` SHALL include `repository`, `homepage` and `bugs` fields pointing at `https://github.com/ttdua/pi-superspec`. A release MUST NOT change `scripts`, dependencies or `files`, and MUST NOT change the `pi` manifest except for the package-agent discovery keys that the package manifest capability requires.

#### Scenario: Metadata added only
- **WHEN** `package.json` is diffed against the previous version
- **THEN** apart from `repository`, `homepage` and `bugs`, the only manifest addition is the package-agent discovery metadata required by the package manifest capability

### Requirement: Changelog and contributing guide
The repository SHALL contain `CHANGELOG.md` describing the first release, and `CONTRIBUTING.md` covering the OpenSpec-driven workflow for changes, running `npm test` and `npm run typecheck`, the rule that `openspec/schemas/superspec/` is never edited, keeping `README.md` and `README.vi.md` in sync, and English-only repository content apart from `README.vi.md`.

#### Scenario: Contributing covers the rules
- **WHEN** a contributor reads `CONTRIBUTING.md`
- **THEN** it states the test and typecheck commands, the upstream-schema rule and the README sync rule

### Requirement: Manual end-to-end checklist
`docs/e2e-checklist.md` SHALL list manual end-to-end steps that take one small change through all ten workflow steps, in runs with `@tintinweb/pi-subagents`, with `pi-subagents` and without any subagent plugin, and SHALL include a smoke procedure for `@gotgenes/pi-subagents` covering detection, agent selection and escalation. Each item MUST state an observable expected result. The run with a subagent plugin SHALL include a change with two independent tasks so that parallel lanes are observed.

#### Scenario: Both runs covered
- **WHEN** the checklist is read
- **THEN** it has a run with `@tintinweb/pi-subagents`, a run with `pi-subagents` and a run without a subagent plugin, each covering init through archive

#### Scenario: gotgenes smoke
- **WHEN** the checklist is read
- **THEN** it has a `@gotgenes/pi-subagents` procedure that observes the detected paragraph, the announced agent choices and an escalation answered by resume

#### Scenario: Parallel lanes observed
- **WHEN** the tintinweb run's apply step is read
- **THEN** it expects two lane worktrees, merge after review, and a `## Lanes` table in `apply.md`

#### Scenario: Expected results stated
- **WHEN** any checklist item is read
- **THEN** it names what the tester should observe

### Requirement: Documentation consistency with shipped package
After this change, `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md` and `docs/glossary.md` SHALL NOT describe components, commands or behaviour that differ from the shipped package, and the architecture component list MUST include the README files, LICENSE and the new docs.

#### Scenario: Component list matches repository
- **WHEN** the architecture component tree is compared with the repository's top-level contents
- **THEN** every shipped top-level file or directory is listed and nothing listed is missing
