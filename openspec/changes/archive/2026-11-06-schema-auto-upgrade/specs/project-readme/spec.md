## MODIFIED Requirements

### Requirement: README command table
The README SHALL contain a table of every shipped command: `/opsx-init`, `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive` and `/opsx-generate-specs`, with a one-line behaviour each, and MUST state that `opsx-propose` and `opsx-bulk-archive` are not shipped. The `/opsx-init` row MUST mention the `--generate` and `--force` options. Near the table, the README MUST say that `/opsx-init` upgrades an older schema that is unchanged since install after confirmation, and that a schema with local edits is replaced only with `--force`, which keeps a backup.

#### Scenario: Table matches shipped prompts
- **WHEN** the table is compared with the files in `prompts/` plus `/opsx-init`
- **THEN** every command appears in both, and no command appears in only one

#### Scenario: Init row mentions the flag
- **WHEN** the `/opsx-init` row is read
- **THEN** it mentions `--generate` and `--force`

#### Scenario: Upgrade behaviour stated
- **WHEN** a reader looks for what happens to an existing schema after a package update
- **THEN** the README describes the confirmed upgrade and `--force` with backup
