## ADDED Requirements

### Requirement: Usage guide existing-codebase bootstrap
`docs/usage-guide.md` SHALL document how to bootstrap specs for a project that already has code: `/opsx-init --generate`, then `/opsx-generate-specs`, then `/opsx-ff bootstrap-specs`, then `/opsx-apply` through `/opsx-archive`. It MUST explain the confirmation question, that scouts use `pi-subagents` when installed and run sequentially in the session otherwise, that requirements marked `Confidence: inferred` need the reviewer's attention, and that existing specs are never overwritten.

#### Scenario: Bootstrap path covered
- **WHEN** a reader looks for the existing-codebase path
- **THEN** the guide lists the commands in order and names `openspec/changes/bootstrap-specs/` as where the drafts are written

#### Scenario: Inferred label explained
- **WHEN** a reader sees `Confidence: inferred` in a generated spec
- **THEN** the guide explains what it means and that the review gate is where to confirm or remove it
