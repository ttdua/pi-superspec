## MODIFIED Requirements

### Requirement: Map stage
The skill SHALL first map the codebase with one `superspec.scout` through the shared integration policy, or map it inline when the optional integration is absent. It MUST use configured model settings rather than selecting a fast model per dispatch. The map MUST read the directory tree, package manifests, README and entry points, skip `node_modules`, `dist`, `build`, `vendor`, `.git` and generated files, and return a list of at most 12 capability candidates, each with a kebab-case name of at least two words, a one-line purpose and the directories it covers.

#### Scenario: Candidate list shape
- **WHEN** the map stage finishes
- **THEN** every candidate has a kebab-case name of at least two words, a purpose and one or more directories, and there are at most 12 candidates

#### Scenario: Ignored directories
- **WHEN** the project contains a `node_modules` directory
- **THEN** no candidate covers it

#### Scenario: Map respects configured model
- **WHEN** the map is delegated
- **THEN** it uses `superspec.scout` without a per-call model/thinking override or artifact-edit authority

### Requirement: Confirm before scouting
After the map stage and before any capability scout runs, the skill SHALL ask the user once to confirm the candidate list, showing each candidate with its purpose and an estimate of the work (candidate count and directories covered), and allowing the user to keep, drop or rename candidates. No capability scout MUST run before the user confirms; the initial map scout is not a capability scout. If the user cancels, no change is created.

#### Scenario: User trims the list
- **WHEN** the user drops two of five candidates
- **THEN** only the remaining three are scouted

#### Scenario: User cancels
- **WHEN** the user cancels the confirmation after the map
- **THEN** no change directory is created and no capability scout runs

### Requirement: Scout dispatch
The skill SHALL run one evidence-only scout per confirmed capability whose spec file is still missing, reapplying existing-name filtering after user edits. When the compatible integration is available it SHALL dispatch `superspec.scout`, using configured models and parallel independent reads where useful. Otherwise it SHALL scout capabilities sequentially inline, writing each parent-authored spec before the next. Scouts MUST NOT write official specs; the parent SHALL consume their reports and write only the missing files, never overwrite existing specs or completed artifacts, and never fabricate child calls.

#### Scenario: With pi-subagents
- **WHEN** the compatible integration exists and three confirmed capabilities have missing specs
- **THEN** three evidence-only namespaced scouts are dispatched and the parent writes the three official delta specs

#### Scenario: Without pi-subagents
- **WHEN** the optional integration is absent
- **THEN** the parent investigates capabilities sequentially and writes each spec before starting the next without child calls

#### Scenario: Interrupted generation
- **WHEN** an existing bootstrap-specs change already contains one of the confirmed capability specs
- **THEN** that file is not rewritten or re-scouted and only the still-missing confirmed capabilities are processed

### Requirement: Spec output format
The parent SHALL write `specs/<capability>/spec.md` inside the `bootstrap-specs` change from scout evidence, containing only a `## ADDED Requirements` section. Every requirement MUST contain `SHALL` or `MUST` on its first body line, have at least one `#### Scenario:` with `WHEN` and `THEN` lines, and carry an `Evidence:` line after its normative statement. Scouts MUST read tests and documentation as well as source. A `superspec.spec-reviewer` SHALL check the completed drafts before final strict validation when available; otherwise the parent SHALL check them inline, without a new human gate.

#### Scenario: Evidence on every requirement
- **WHEN** a generated spec file is read
- **THEN** every requirement has an `Evidence:` line

#### Scenario: Evidence content
- **WHEN** a requirement carries an `Evidence:` line
- **THEN** the line names the files, with line numbers where known, tests or documents the requirement is drawn from

#### Scenario: Inferred label
- **WHEN** a requirement is drawn from source code and no test or document states it
- **THEN** it carries `Confidence: inferred`

#### Scenario: Observable behaviour
- **WHEN** a requirement is written
- **THEN** it describes observable behaviour, not module or function structure

#### Scenario: Tests and docs read
- **WHEN** a scout works on a capability
- **THEN** it reads tests and documentation as well as source

#### Scenario: Format validates
- **WHEN** the parent has drafted and internally reviewed the generated delta specs
- **THEN** it runs `openspec validate bootstrap-specs --strict`, fixes invalid files and reruns until validation passes

#### Scenario: Parent authors official specs
- **WHEN** capability scout reports finish
- **THEN** reports remain run/scratch artifacts and the parent alone writes and validates the official spec files
