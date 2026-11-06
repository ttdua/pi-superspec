## ADDED Requirements

### Requirement: Outdated schema notice
At `session_start` in an activated project with an interactive UI, the extension SHALL show one notice when the project schema is upgradable (pointing to `/opsx-init`), or older or edited (pointing to `/opsx-init --force`, which keeps a backup). It MUST NOT show it otherwise, MUST NOT write any file, and MUST NOT raise an error when classification fails.

#### Scenario: Upgradable schema
- **WHEN** `session_start` fires with a UI in a project whose v6 schema is pristine and the bundled schema is v7
- **THEN** one notice names v6, v7 and `/opsx-init`, and no file changes

#### Scenario: Older schema with local edits
- **WHEN** `session_start` fires with a UI in a project whose v6 schema is not pristine
- **THEN** one notice names `/opsx-init --force`

#### Scenario: Edited schema
- **WHEN** `session_start` fires with a UI in a project whose schema is edited
- **THEN** one notice names `/opsx-init --force`

#### Scenario: Identical schema
- **WHEN** `session_start` fires in a project whose schema is identical to the bundled one
- **THEN** no schema notice is shown

#### Scenario: Classification fails
- **WHEN** `session_start` fires and reading the project schema throws
- **THEN** no error reaches the user and the session starts normally

#### Scenario: No UI
- **WHEN** `session_start` fires without a UI in a project whose schema is upgradable
- **THEN** no schema notice is shown
