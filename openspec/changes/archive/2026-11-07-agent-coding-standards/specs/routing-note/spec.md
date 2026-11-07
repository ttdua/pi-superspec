## ADDED Requirements

### Requirement: Missing coding standard warning
At `session_start` in an activated project with an interactive UI, the extension SHALL warn once per session start (including reload) when the `skill:coding-standards` command is not discoverable. The warning MUST say that the bundled implementer and reviewers fall back to project conventions without the skill, and MUST NOT name an install command. It MUST NOT warn when the skill is discoverable, in unactivated projects, or without a UI.

#### Scenario: Coding standard missing
- **WHEN** `session_start` fires in an activated project with a UI and no `skill:coding-standards` command
- **THEN** one warning is shown that names `coding-standards` and project conventions

#### Scenario: Coding standard installed
- **WHEN** `session_start` fires in an activated project and `skill:coding-standards` is discoverable
- **THEN** no coding standard warning is shown

#### Scenario: Unactivated project
- **WHEN** `session_start` fires in an unactivated project without `skill:coding-standards`
- **THEN** no coding standard warning is shown

#### Scenario: No UI
- **WHEN** `session_start` fires in an activated project without a UI
- **THEN** no coding standard warning is shown

#### Scenario: Both skills missing
- **WHEN** `session_start` fires in an activated project with a UI and neither `skill:brainstorming` nor `skill:coding-standards` is discoverable
- **THEN** the Superpowers warning and the coding standard warning are each shown once, as separate warnings
