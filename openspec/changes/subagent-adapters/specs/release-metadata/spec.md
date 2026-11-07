## MODIFIED Requirements

### Requirement: Package metadata
`package.json` SHALL include `repository`, `homepage` and `bugs` fields pointing at `https://github.com/ttdua/pi-superspec`. A release MUST NOT change `scripts`, dependencies or `files`, and MUST NOT change the `pi` manifest except for the package-agent discovery keys that the package manifest capability requires.

#### Scenario: Metadata added only
- **WHEN** `package.json` is diffed against the previous version
- **THEN** apart from `repository`, `homepage` and `bugs`, the only manifest addition is the package-agent discovery metadata required by the package manifest capability

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
