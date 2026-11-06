## MODIFIED Requirements

### Requirement: Usage guide schema states and troubleshooting
The guide SHALL describe what `/opsx-init` does with an existing project schema as shipped: a fresh install writes the schema and lock file; an identical schema is left as is; an older schema unchanged since install is replaced after confirmation, or only reported without a UI; an older schema with local edits, an edited, a newer and a foreign schema produce a warning and no writes unless `--force` is given; `--force` backs up the existing directory to `~/.pi/superspec-backups/` and replaces it. It MUST explain how "unchanged since install" is decided (the lock file), MUST describe the session-start notice, MUST say that `--lang vi --force` now sets the language to `vi` and enables `--force`, and MUST include troubleshooting for at least: commands not appearing, OpenSpec version too old, Superpowers not found, and restoring a schema from a backup.

#### Scenario: Commands not appearing
- **WHEN** a reader's `opsx-*` commands are missing
- **THEN** the guide explains that the project must be activated by `/opsx-init` and the session reloaded

#### Scenario: Existing schema is not overwritten
- **WHEN** a reader runs `/opsx-init` in a project whose schema has local edits
- **THEN** the guide explains that nothing is written without `--force` and that `--force` keeps a backup

#### Scenario: Upgrade after a package update
- **WHEN** a reader updates the package and the installed schema is older and unchanged
- **THEN** the guide explains the session-start notice, the confirmation in `/opsx-init`, and committing `openspec/schemas/superspec/` afterwards

#### Scenario: Restore from backup
- **WHEN** a reader wants their replaced schema back
- **THEN** the guide names the backup path pattern and how to copy it back
