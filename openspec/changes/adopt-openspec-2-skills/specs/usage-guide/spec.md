## MODIFIED Requirements

### Requirement: Usage guide schema states and troubleshooting
The guide SHALL describe what `/opsx-init` does with an existing project schema as shipped: a fresh install writes the schema and lock file; an identical schema is left as is; an older schema unchanged since install is replaced after confirmation, or only reported without a UI; an older schema with local edits, an edited, a newer and a foreign schema produce a warning and no writes unless `--force` is given; `--force` backs up the existing directory to `~/.pi/superspec-backups/` and replaces it. It MUST explain how "unchanged since install" is decided (the lock file), MUST describe the session-start notice, MUST say that `--lang vi --force` now sets the language to `vi` and enables `--force`, and MUST include troubleshooting for at least: commands not appearing, OpenSpec version too old, the OpenSpec profile missing workflows, stock skills missing after `openspec update`, Superpowers not found, and restoring a schema from a backup. It MUST explain that the stock skills are upgraded with `openspec update` and the Superspec rules with the package and `/opsx-init`.

#### Scenario: Commands not appearing
- **WHEN** a reader's `opsx-*` commands are missing
- **THEN** the guide explains that the project must be activated by `/opsx-init` and the session reloaded

#### Scenario: Existing schema is not overwritten
- **WHEN** a reader runs `/opsx-init` in a project whose schema has local edits
- **THEN** the guide explains that nothing is written without `--force` and that `--force` keeps a backup

#### Scenario: Upgrade after a package update
- **WHEN** a reader updates the package and the installed schema is older and unchanged
- **THEN** the guide explains the session-start notice, the confirmation in `/opsx-init`, and committing `openspec/schemas/superspec/` afterwards

#### Scenario: Profile missing workflows
- **WHEN** `/opsx-init` stops because the OpenSpec profile lacks workflows
- **THEN** the guide shows `openspec config profile`, the eight workflows to select, and running `/opsx-init` again

#### Scenario: Stock skills removed by an update
- **WHEN** a reader sees the session-start warning about missing stock skills
- **THEN** the guide explains that `openspec update` follows the profile and shows how to add the workflows back

#### Scenario: Two upgrade paths
- **WHEN** a reader looks for how to upgrade
- **THEN** the guide says `openspec update` upgrades the stock skills and the package update plus `/opsx-init` upgrades the schema and `workflow.md`

#### Scenario: Skill commands not appearing
- **WHEN** a reader's `/skill:openspec-*` commands are missing
- **THEN** the guide explains that the stock skills come from `openspec init --tools pi` (run by `/opsx-init`) and the OpenSpec profile, that the pi setting `enableSkillCommands` must be `true`, and that otherwise the reader can ask the agent to run the skill

#### Scenario: Restore from backup
- **WHEN** a reader wants their replaced schema back
- **THEN** the guide names the backup path pattern and how to copy it back

### Requirement: Usage guide step-by-step walkthrough
`docs/usage-guide.md` SHALL walk through one change from a clean repository to an archived change using the step-by-step path: `/opsx-init`, `openspec-new-change`, repeated `openspec-continue-change`, `openspec-apply-change`, `openspec-verify-change`, finalize and `openspec-archive-change`. Each stock skill MUST be shown as invoked with `/skill:<id>` or by asking the agent, and each step MUST say what the user does, what the agent produces, and where the result is written.

#### Scenario: Every workflow step covered
- **WHEN** the guide's steps are compared with the ten steps in `docs/workflow.md`
- **THEN** each of the ten steps is covered in order

#### Scenario: Each step names its output
- **WHEN** a reader reaches any step
- **THEN** the guide names the artifact or file that step produces

### Requirement: Usage guide fast-forward path
The guide SHALL document the `openspec-ff-change` skill, invoked as `/skill:openspec-ff-change <name>` or by asking the agent: that brainstorming runs interactively, that the remaining artifacts through `plan` are generated unattended, and that it stops before apply. It MUST show how to continue with `openspec-apply-change` afterwards.

#### Scenario: ff stops before apply
- **WHEN** a reader follows the ff section
- **THEN** it states that apply is not run and names `openspec-apply-change` as the next skill

### Requirement: Usage guide existing-codebase bootstrap
`docs/usage-guide.md` SHALL document how to bootstrap specs for a project that already has code: `/opsx-init --generate`, then `/opsx-generate-specs`, then `/skill:openspec-ff-change bootstrap-specs`, then `openspec-apply-change` through `openspec-archive-change`. It MUST explain the confirmation question, that scouts are delegated when a subagent plugin is detected and run sequentially in the session otherwise, that requirements marked `Confidence: inferred` need the reviewer's attention, and that existing specs are never overwritten.

#### Scenario: Bootstrap path covered
- **WHEN** a reader looks for the existing-codebase path
- **THEN** the guide lists the commands in order and names `openspec/changes/bootstrap-specs/` as where the drafts are written

#### Scenario: Inferred label explained
- **WHEN** a reader sees `Confidence: inferred` in a generated spec
- **THEN** the guide explains what it means and that the review gate is where to confirm or remove it
