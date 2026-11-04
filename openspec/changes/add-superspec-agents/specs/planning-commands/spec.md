## ADDED Requirements

### Requirement: Bounded planning reconnaissance
The explore, continue, and ff skills SHALL support `superspec.scout` through the shared integration reference when repository reconnaissance materially helps exploration or brainstorming. Small conceptual work SHALL remain inline. The parent MUST retain the user conversation and artifact ownership; a scout MUST NOT bypass explore's no-code/no-schema boundary or create brainstorm/plan artifacts.

#### Scenario: Explore with repository recon
- **WHEN** explore needs a non-trivial repository investigation and the compatible integration is available
- **THEN** the parent can dispatch an evidence-only scout with bounded paths and keep code, schema, and official artifacts unchanged

#### Scenario: Small conceptual question
- **WHEN** exploration can be answered without a useful independent repository investigation
- **THEN** the parent works inline rather than dispatching solely because agents exist

### Requirement: Internal spec and plan review seats
Continue and ff SHALL use `superspec.spec-reviewer` for completed specs and `superspec.plan-reviewer` for the completed plan through the shared integration policy, or perform the checks inline when the integration is absent. They MUST resolve substantive findings and re-review substantive revisions before the existing human gate, without adding approvals, replacing human authority, or advancing continue to a second artifact.

#### Scenario: Continue reviews one artifact
- **WHEN** continue completes all files of a specs artifact or the plan artifact
- **THEN** the corresponding specialist checks that artifact before its existing human gate, and approval still does not create the next artifact

#### Scenario: Fast-forward retains two planned stops
- **WHEN** ff creates specs and plan after brainstorm approval
- **THEN** their internal reviews occur before the existing final packet gate without introducing another human approval stop

#### Scenario: Planning review without subagents
- **WHEN** the optional integration is absent during planning
- **THEN** the parent checks spec/plan quality inline and preserves the existing review-gate order and outcomes
