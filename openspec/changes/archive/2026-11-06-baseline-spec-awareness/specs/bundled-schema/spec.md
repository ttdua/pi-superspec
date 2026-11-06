## ADDED Requirements

### Requirement: Brainstorm reads the baseline specs
The `brainstorm` instruction SHALL tell the agent to read the living spec under `openspec/specs/` of each capability the change plausibly touches and to cite the existing requirements involved. It MUST tell the agent to state explicitly when a specified requirement is changed on purpose instead of re-deciding it silently. The wording MUST name no review or ask tool.

#### Scenario: Brainstorm cites touched requirements
- **WHEN** the `brainstorm` instruction is read
- **THEN** it tells the agent to read the living specs of the capabilities the change touches and cite the requirements involved

#### Scenario: Deliberate change stated
- **WHEN** the `brainstorm` instruction is read
- **THEN** it tells the agent to state a deliberate change of a specified requirement explicitly

#### Scenario: Brainstorm baseline rule is tool-neutral
- **WHEN** the `brainstorm` instruction is searched for `plannotator`, `AskUserQuestion` and `ask_user_question`
- **THEN** no match is found

### Requirement: Proposal confirms modified capabilities
The `proposal` instruction SHALL tell the agent to list a capability under Modified Capabilities only after confirming in its living spec under `openspec/specs/` that existing requirements change.

#### Scenario: Proposal checks the living spec
- **WHEN** the `proposal` instruction is read
- **THEN** it tells the agent to confirm in the living spec that a Modified Capability's existing requirements change

### Requirement: Delta specs start from the baseline
The `specs` instruction SHALL tell the agent to start every `MODIFIED` requirement from the full current block copied from `openspec/specs/<capability>/spec.md` and then edit it. It MUST require `MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers to match the main spec header exactly. It MUST require any scenario dropped from a `MODIFIED` block to be named as intentional in the requirement text or the proposal.

#### Scenario: Modified block starts from the baseline
- **WHEN** the `specs` instruction is read
- **THEN** it tells the agent to copy the full current requirement block from `openspec/specs/<capability>/spec.md` before editing a `MODIFIED` requirement

#### Scenario: Headers match exactly
- **WHEN** the `specs` instruction is read
- **THEN** it requires `MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers to match the main spec header exactly

#### Scenario: Dropped scenario is visible
- **WHEN** the `specs` instruction is read
- **THEN** it requires a scenario dropped from a `MODIFIED` block to be named as intentional in the requirement text or the proposal

## MODIFIED Requirements

### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 7`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `7` and `x-pi-superspec.version` is `7`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

#### Scenario: No artifact ID changes
- **WHEN** the version 7 schema is compared with version 6
- **THEN** every artifact ID of version 6 still exists, so no migration step is needed
