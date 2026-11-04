## MODIFIED Requirements

### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 6`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `6` and `x-pi-superspec.version` is `6`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

#### Scenario: No artifact ID changes
- **WHEN** the version 6 schema is compared with version 5
- **THEN** every artifact ID of version 5 still exists, so no migration step is needed

## ADDED Requirements

### Requirement: Verify evidence follows the delta operation
The `verify` instruction SHALL check each delta requirement according to its operation: ADDED and MODIFIED need implementation evidence, REMOVED needs evidence that the baseline behavior is gone, and RENAMED needs the behavior kept under the new name. Scenarios under a REMOVED requirement MUST be skipped.

#### Scenario: Removed requirement
- **WHEN** a change removes a requirement and the code no longer implements it
- **THEN** the requirement-evidence check passes and is not reported as "no implementation found"

#### Scenario: Removed requirement still implemented
- **WHEN** a change removes a requirement and code for its baseline behavior remains
- **THEN** the requirement-evidence check reports a failure for that requirement

#### Scenario: Baseline source
- **WHEN** the check needs the text of a removed requirement
- **THEN** the instruction tells the agent to read it from the main spec and to fall back to git history, and to report the check as not verified if neither yields it

#### Scenario: Renamed requirement
- **WHEN** a change renames a requirement
- **THEN** the check looks for the behavior under the new name and does not require the old name to be absent from code

### Requirement: Skipped checks never pass
The `verify` instruction and template SHALL record a check that could not run as "not verified" with its reason, and MUST NOT score it as passing. A verify run with a not-verified check SHALL have outcome `PASS_WITH_WARNINGS` at best.

#### Scenario: Check skipped
- **WHEN** a verify check cannot run
- **THEN** `verify.md` lists it as not verified with the reason and the outcome is not `PASS`

#### Scenario: Not applicable
- **WHEN** a check does not apply to the change, such as scenario mapping on a removal-only change
- **THEN** it is recorded as not applicable and does not lower the outcome
