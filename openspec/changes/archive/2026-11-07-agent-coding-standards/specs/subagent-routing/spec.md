## MODIFIED Requirements

### Requirement: Availability and failure handling
The parent SHALL resolve lazy tool activation and canonical role availability before dispatch. It SHALL distinguish absent integration from incompatible/disabled agents and child failures. Only absence SHALL select the announced inline fallback; incompatibility and failures MUST stop the affected delegated stage without changing operator settings or silently choosing a generic agent, CLI, or inline recovery. Role skills SHALL be either required or optional; `coding-standards` is the only optional role skill. The parent SHALL treat `coding-standards` as missing when the agent management surface reports it not found for the role or `skill:coding-standards` is not discoverable. A missing optional skill MUST NOT stop the stage: the parent SHALL announce once per stage that the coding standard is unavailable and that agents fall back to project conventions, and SHALL dispatch as usual. A missing required skill SHALL be handled as an unavailable role skill.

#### Scenario: Lazy tool activation
- **WHEN** only `subagents_enable` is visible
- **THEN** the parent enables it, re-evaluates on the next model turn, and inspects the installed management surface to resolve canonical agents before dispatching

#### Scenario: Optional integration absent
- **WHEN** neither the tool nor its activation helper is available
- **THEN** the parent announces and performs the existing inline path with the same gates and evidence rules and fabricates no child calls

#### Scenario: Disabled or incompatible agent
- **WHEN** a required canonical agent is disabled/missing, discovery is unsupported, or required skills/tools are unavailable
- **THEN** the parent reports the named cause and stops the affected delegated stage without bypassing user settings

#### Scenario: Failed child lane
- **WHEN** a child launch or runtime fails
- **THEN** the parent reports the exact failure and known run/worktree/partial state and does not silently switch execution mechanisms

#### Scenario: Optional skill missing
- **WHEN** a role's `coding-standards` skill is unavailable and its other requirements are met
- **THEN** the parent announces once that the coding standard is unavailable, dispatches the role, and neither stops the stage nor writes settings
