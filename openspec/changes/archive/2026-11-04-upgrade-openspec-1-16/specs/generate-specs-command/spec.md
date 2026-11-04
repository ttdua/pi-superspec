## MODIFIED Requirements

### Requirement: Spec output format
Each scout SHALL write `specs/<capability>/spec.md` inside the `bootstrap-specs` change, containing only a `## ADDED Requirements` section. Every requirement MUST contain `SHALL` or `MUST`, have at least one `#### Scenario:` with `WHEN` and `THEN` lines, and carry an `Evidence:` line. The scout MUST read tests and documentation as well as source.

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
- **WHEN** `openspec validate bootstrap-specs --strict` runs after the scouts finish
- **THEN** the generated delta specs pass, and the skill fixes the files and reruns when they do not
