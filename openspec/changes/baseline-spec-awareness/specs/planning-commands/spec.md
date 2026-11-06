## ADDED Requirements

### Requirement: Spec review receives the baseline
When continue or ff runs the internal spec review, the handoff SHALL include, besides the delta specs and their dependencies, the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename. A modified capability without a main spec MUST be named in the handoff as having no baseline. The inline self-check used when the integration is absent SHALL compare the deltas with the same main specs.

#### Scenario: Continue passes main specs
- **WHEN** continue dispatches `superspec.spec-reviewer` for a specs artifact with a `MODIFIED` delta
- **THEN** the skill text directs it to include the main spec of that capability in the handoff

#### Scenario: Fast-forward passes main specs
- **WHEN** ff dispatches `superspec.spec-reviewer` after specs are complete
- **THEN** the skill text directs it to include the main specs of the modified capabilities in the handoff

#### Scenario: Inline check uses the baseline
- **WHEN** the optional integration is absent
- **THEN** the skill text directs the inline self-check to compare the deltas with the same main specs
