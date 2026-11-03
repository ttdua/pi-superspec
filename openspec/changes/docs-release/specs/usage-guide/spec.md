## ADDED Requirements

### Requirement: Usage guide step-by-step walkthrough
`docs/usage-guide.md` SHALL walk through one change from a clean repository to an archived change using the step-by-step path: `/opsx-init`, `/opsx-new`, repeated `/opsx-continue`, `/opsx-apply`, `/opsx-verify`, finalize and `/opsx-archive`. Each step MUST say what the user does, what the agent produces, and where the result is written.

#### Scenario: Every workflow step covered
- **WHEN** the guide's steps are compared with the ten steps in `docs/workflow.md`
- **THEN** each of the ten steps is covered in order

#### Scenario: Each step names its output
- **WHEN** a reader reaches any step
- **THEN** the guide names the artifact or file that step produces

### Requirement: Usage guide fast-forward path
The guide SHALL document `/opsx-ff <name>`: that brainstorming runs interactively, that the remaining artifacts through `plan` are generated unattended, and that it stops before apply. It MUST show how to continue with `/opsx-apply` afterwards.

#### Scenario: ff stops before apply
- **WHEN** a reader follows the ff section
- **THEN** it states that apply is not run and names `/opsx-apply` as the next command

### Requirement: Usage guide executor variants
The guide SHALL describe how apply behaves with `pi-subagents` (subagent-driven development) and without it (`executing-plans` in-session), and MUST describe the optional tool fallbacks for `rpiv-ask-user-question` and `rpiv-todo`.

#### Scenario: Both executors described
- **WHEN** a reader looks for the no-subagent path
- **THEN** the guide states that `executing-plans` is used and that a whole-branch review is still requested

### Requirement: Usage guide upgrades and troubleshooting
The guide SHALL explain schema upgrade behaviour (automatic in the main checkout of a trusted interactive session, notify-only otherwise, `/opsx-init --force` for edited schemas) and MUST include troubleshooting for at least: commands not appearing, OpenSpec version too old, and Superpowers not found.

#### Scenario: Commands not appearing
- **WHEN** a reader's `opsx-*` commands are missing
- **THEN** the guide explains that the project must be activated by `/opsx-init` and the session reloaded

#### Scenario: Edited schema
- **WHEN** a reader has edited the project schema and sees an upgrade notice
- **THEN** the guide explains that nothing is overwritten and how `--force` backs up first
