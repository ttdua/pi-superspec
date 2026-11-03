## MODIFIED Requirements

### Requirement: README command table
The README SHALL contain a table of every shipped command: `/opsx-init`, `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive` and `/opsx-generate-specs`, with a one-line behaviour each, and MUST state that `opsx-propose` and `opsx-bulk-archive` are not shipped. The `/opsx-init` row MUST mention the `--generate` option.

#### Scenario: Table matches shipped prompts
- **WHEN** the table is compared with the files in `prompts/` plus `/opsx-init`
- **THEN** every command appears in both, and no command appears in only one

#### Scenario: Init row mentions the flag
- **WHEN** the `/opsx-init` row is read
- **THEN** it mentions `--generate`
