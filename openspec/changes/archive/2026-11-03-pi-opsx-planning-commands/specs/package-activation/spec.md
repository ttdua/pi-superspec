## RENAMED Requirements

- FROM: `### Requirement: Placeholder commands prove activation`
- TO: `### Requirement: Planning commands are visible only when activated`

## MODIFIED Requirements

### Requirement: Planning commands are visible only when activated
The package SHALL ship the `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff` skills and prompts, and SHALL NOT ship a placeholder skill or prompt. These resources MUST be visible in pi only in an activated project.

#### Scenario: Visible when marked
- **WHEN** pi is started with `pi -e .` inside a marked fixture project
- **THEN** the `opsx-new` command and the `opsx-new` skill are available

#### Scenario: Hidden when unmarked
- **WHEN** pi is started with `pi -e .` inside an unmarked fixture project
- **THEN** none of the planning commands or skills are available

#### Scenario: No placeholder resources
- **WHEN** the package resource directories are listed
- **THEN** no placeholder skill or prompt exists
