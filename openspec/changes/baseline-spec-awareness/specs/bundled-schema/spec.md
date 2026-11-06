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
