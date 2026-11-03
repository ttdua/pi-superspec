# usage-guide Specification

## Purpose
Define the English usage guide `docs/usage-guide.md`: the step-by-step walkthrough, the fast-forward path, executor variants, the shipped treatment of existing project schemas, and troubleshooting.

## Requirements
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

### Requirement: Usage guide schema states and troubleshooting
The guide SHALL describe what `/opsx-init` does with an existing project schema as shipped: a fresh install writes the schema and lock file, an identical schema is left as is, and any other state (foreign, older, newer, edited) produces a warning and no writes. It MUST state that automatic upgrade, `--force` and backup are not yet shipped, and MUST include troubleshooting for at least: commands not appearing, OpenSpec version too old, and Superpowers not found.

#### Scenario: Commands not appearing
- **WHEN** a reader's `opsx-*` commands are missing
- **THEN** the guide explains that the project must be activated by `/opsx-init` and the session reloaded

#### Scenario: Existing schema is not overwritten
- **WHEN** a reader runs `/opsx-init` in a project whose schema differs from the bundled one
- **THEN** the guide explains that nothing is written and that upgrade tooling is not yet shipped
