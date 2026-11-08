## MODIFIED Requirements

### Requirement: Usage guide executor variants
The guide SHALL describe how apply behaves with a detected subagent plugin (subagent-driven development, agents chosen by role requirements, unblocked tasks in parallel lanes with their own worktrees, thinking from task difficulty) and without one (`executing-plans` in-session, tasks one after another), and MUST describe the optional tool fallbacks for `rpiv-ask-user-question` and `rpiv-todo`.

#### Scenario: Both executors described
- **WHEN** a reader looks for the no-subagent path
- **THEN** the guide states that `executing-plans` is used and that a whole-branch review is still requested

#### Scenario: Parallel lanes described
- **WHEN** a reader looks for how tasks run with a subagent plugin
- **THEN** the guide explains `Blocked by` and `Difficulty`, the lane worktrees and merge-after-review, and the difficulty-to-thinking mapping

### Requirement: Usage guide existing-codebase bootstrap
`docs/usage-guide.md` SHALL document how to bootstrap specs for a project that already has code: `/opsx-init --generate`, then `/opsx-generate-specs`, then `/opsx-ff bootstrap-specs`, then `/opsx-apply` through `/opsx-archive`. It MUST explain the confirmation question, that scouts are delegated when a subagent plugin is detected and run sequentially in the session otherwise, that requirements marked `Confidence: inferred` need the reviewer's attention, and that existing specs are never overwritten.

#### Scenario: Bootstrap path covered
- **WHEN** a reader looks for the existing-codebase path
- **THEN** the guide lists the commands in order and names `openspec/changes/bootstrap-specs/` as where the drafts are written

#### Scenario: Inferred label explained
- **WHEN** a reader sees `Confidence: inferred` in a generated spec
- **THEN** the guide explains what it means and that the review gate is where to confirm or remove it
