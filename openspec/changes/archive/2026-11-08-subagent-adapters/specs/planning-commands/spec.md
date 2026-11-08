## MODIFIED Requirements

### Requirement: Bounded planning reconnaissance
The explore, continue, and ff skills SHALL support an agent meeting the scout role through the shared integration reference when repository reconnaissance materially helps exploration or brainstorming. Small conceptual work SHALL remain inline. The parent MUST retain the user conversation and artifact ownership; a scout MUST NOT bypass explore's no-code/no-schema boundary or create brainstorm/plan artifacts.

#### Scenario: Explore with repository recon
- **WHEN** explore needs a non-trivial repository investigation and a subagent plugin is detected
- **THEN** the parent can dispatch an evidence-only scout with bounded paths and keep code, schema, and official artifacts unchanged

#### Scenario: Small conceptual question
- **WHEN** exploration can be answered without a useful independent repository investigation
- **THEN** the parent works inline rather than dispatching solely because agents exist

### Requirement: Internal spec and plan review seats
Continue and ff SHALL use an agent meeting the spec reviewer role for completed specs and an agent meeting the plan reviewer role for the completed plan through the shared integration policy, or perform the checks inline when the integration is absent. They MUST resolve substantive findings and re-review substantive revisions before the existing human gate, without adding approvals or replacing human authority. An internal review verdict MUST NOT advance continue to the next artifact; only the human gate's approval does.

#### Scenario: Continue reviews one artifact
- **WHEN** continue completes all files of a specs artifact or the plan artifact
- **THEN** the corresponding specialist checks that artifact before its human gate, and only the human approval lets continue advance

#### Scenario: Fast-forward retains two planned stops
- **WHEN** ff creates specs and plan after brainstorm approval
- **THEN** their internal reviews occur before the existing final packet gate without introducing another human approval stop

#### Scenario: Planning review without subagents
- **WHEN** the optional integration is absent during planning
- **THEN** the parent checks spec/plan quality inline and preserves the existing review-gate order and outcomes

### Requirement: Spec review receives the baseline
When continue or ff runs the internal spec review, the handoff SHALL include, besides the delta specs and their dependencies, the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename. A modified capability without a main spec MUST be named in the handoff as having no baseline. The inline self-check used when the integration is absent SHALL compare the deltas with the same main specs.

#### Scenario: Continue passes main specs
- **WHEN** continue dispatches the spec reviewer for a specs artifact with a `MODIFIED` delta
- **THEN** the skill text directs it to include the main spec of that capability in the handoff

#### Scenario: Fast-forward passes main specs
- **WHEN** ff dispatches the spec reviewer after specs are complete
- **THEN** the skill text directs it to include the main specs of the modified capabilities in the handoff

#### Scenario: Inline check uses the baseline
- **WHEN** the optional integration is absent
- **THEN** the skill text directs the inline self-check to compare the deltas with the same main specs
