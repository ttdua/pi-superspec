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
The guide SHALL describe how apply behaves with a detected subagent plugin (subagent-driven development, agents chosen by role requirements, unblocked tasks in parallel lanes with their own worktrees, thinking from task difficulty) and without one (`executing-plans` in-session, tasks one after another), and MUST describe the optional tool fallbacks for `rpiv-ask-user-question` and `rpiv-todo`.

#### Scenario: Both executors described
- **WHEN** a reader looks for the no-subagent path
- **THEN** the guide states that `executing-plans` is used and that a whole-branch review is still requested

#### Scenario: Parallel lanes described
- **WHEN** a reader looks for how tasks run with a subagent plugin
- **THEN** the guide explains `Blocked by` and `Difficulty`, the lane worktrees and merge-after-review, and the difficulty-to-thinking mapping

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

### Requirement: Usage guide existing-codebase bootstrap
`docs/usage-guide.md` SHALL document how to bootstrap specs for a project that already has code: `/opsx-init --generate`, then `/opsx-generate-specs`, then `/opsx-ff bootstrap-specs`, then `/opsx-apply` through `/opsx-archive`. It MUST explain the confirmation question, that scouts are delegated when a subagent plugin is detected and run sequentially in the session otherwise, that requirements marked `Confidence: inferred` need the reviewer's attention, and that existing specs are never overwritten.

#### Scenario: Bootstrap path covered
- **WHEN** a reader looks for the existing-codebase path
- **THEN** the guide lists the commands in order and names `openspec/changes/bootstrap-specs/` as where the drafts are written

#### Scenario: Inferred label explained
- **WHEN** a reader sees `Confidence: inferred` in a generated spec
- **THEN** the guide explains what it means and that the review gate is where to confirm or remove it
