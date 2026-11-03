## ADDED Requirements

### Requirement: Detect legacy files
`/opsx-init` SHALL detect files created by `openspec init --tools pi`: `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*` under the project root. When none exist it MUST do nothing and print nothing about them.

#### Scenario: No legacy files
- **WHEN** neither pattern matches any path
- **THEN** no prompt is shown and nothing is deleted

#### Scenario: Legacy files found
- **WHEN** matching paths exist
- **THEN** every matching path is listed to the user

### Requirement: Confirm before deleting
Deletion SHALL happen only after the user explicitly confirms the listed paths. Declining, or running without an interactive UI, MUST leave all files in place and MUST NOT fail the command. Paths that do not match the two patterns MUST never be deleted.

#### Scenario: User confirms
- **WHEN** the user confirms the listed paths
- **THEN** exactly those paths are deleted

#### Scenario: User declines
- **WHEN** the user declines
- **THEN** no file is deleted and the command continues

#### Scenario: Non-interactive session
- **WHEN** no interactive UI is available
- **THEN** no file is deleted and the legacy paths are reported

#### Scenario: Unrelated files preserved
- **WHEN** `.pi/prompts/` also holds `custom.md`
- **THEN** `custom.md` remains after confirmed deletion
