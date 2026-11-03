# execution-commands Specification

## Purpose
Defines the `/opsx-apply`, `/opsx-verify`, `/opsx-sync` and `/opsx-archive` command and skill pairs that execute a planned change. Apply follows the schema apply block, verify checks the result in the worktree, sync merges delta specs into main specs, and archive performs the delta-sync check and archives the change.

## Requirements
### Requirement: Execution command and skill pairs
The package SHALL provide `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive`, each as a skill `skills/<name>/SKILL.md` whose frontmatter `name` equals its directory name, and a prompt `prompts/<name>.md`. Each prompt MUST instruct the agent to read the matching `SKILL.md`, follow it, and treat `$@` as the user input, and MUST NOT carry the command logic itself. The package MUST NOT ship `opsx-propose` or `opsx-bulk-archive`.

#### Scenario: Pairs exist
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** all four execution skills and prompts exist with matching names

#### Scenario: Prompt delegates to skill
- **WHEN** an execution prompt file is read
- **THEN** it names its skill, references `$@`, and contains no step-by-step command logic

#### Scenario: Excluded commands absent
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** no `opsx-propose` or `opsx-bulk-archive` skill or prompt exists

### Requirement: No Claude tool names in execution commands
The execution skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite` or `Task tool`. Where the OpenSpec source skill asked the user, tracked todos, dispatched a subagent or loaded a skill, the text MUST use the `ask_user_question` tool, the `todo` tool, the `subagent` tool from `pi-subagents`, or reading `SKILL.md`, each with a plain fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** all files under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite` and `Task tool`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** the ask tool is unavailable and an execution skill needs a decision
- **THEN** the skill directs the agent to ask in plain text with numbered options, recommended first, and wait

### Requirement: Apply follows the schema apply block
The `opsx-apply` skill SHALL read the change's apply instruction with `openspec instructions apply --change <name> --json` and follow it, handling the `blocked` and `all_done` states by pointing to `/opsx-continue` or `/opsx-verify` and `/opsx-archive` respectively. It MUST stop after the final whole-branch review and the `apply.md` receipt and MUST NOT invoke `finishing-a-development-branch`.

#### Scenario: Blocked change
- **WHEN** `/opsx-apply` runs on a change whose apply instruction reports `blocked`
- **THEN** the agent shows the message, suggests `/opsx-continue`, and changes no code

#### Scenario: Stops after the receipt
- **WHEN** the executor finishes and the whole-branch review passes
- **THEN** `apply.md` is written and committed in the worktree and the agent points to `/opsx-verify` without merging, pushing or finishing the branch

### Requirement: Executor depends on subagent availability
The `opsx-apply` skill SHALL use the `pi-subagents` `subagent` tool with Superpowers `subagent-driven-development` when that tool is present in the session, and SHALL otherwise use Superpowers `executing-plans` in-session and request a whole-branch review over the full commit range before writing `apply.md`. It MUST NOT fabricate subagent calls when the tool is absent and MUST record the executor actually used in `apply.md`.

#### Scenario: With pi-subagents
- **WHEN** the `subagent` tool is available
- **THEN** the skill directs the agent to execute `plan.md` through `subagent-driven-development` and `apply.md` records that executor

#### Scenario: Without pi-subagents
- **WHEN** the `subagent` tool is not available
- **THEN** the skill directs the agent to use `executing-plans`, follow TDD manually, run a whole-branch review, and record `executing-plans` in `apply.md`

### Requirement: Post-PR feedback loop
The `opsx-apply` skill SHALL support post-PR review feedback: it MUST load `receiving-code-review`, apply fixes on the feature branch in the main checkout with TDD, append a "post-PR iteration N+1" entry with the new commit range to `apply.md`, direct the agent to re-run `/opsx-verify`, and update `finalize.md`. Pushing and the reviewer comment MUST follow the finalize policy, which a project `AGENTS.md` policy overrides.

#### Scenario: Feedback after a PR is open
- **WHEN** `/opsx-apply` runs on a finalized change with an open PR and review comments to address
- **THEN** `apply.md` gains an iteration N+1 entry with the new commit range and the agent directs a verify re-run

### Requirement: Verify runs in the worktree
The `opsx-verify` skill SHALL read the verify instruction with `openspec instructions verify --change <name> --json`, run every `openspec` call and check with the worktree as the working directory, require `apply.md` to exist (otherwise point to `/opsx-apply`), run the project test command fresh and record its result, and write `verify.md` with outcome `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. It MUST NOT perform the delta-spec sync check.

#### Scenario: Missing apply receipt
- **WHEN** `/opsx-verify` runs and `apply.md` does not exist
- **THEN** the agent stops and points to `/opsx-apply`

#### Scenario: Verify in the worktree
- **WHEN** `/opsx-verify` runs on an applied change
- **THEN** its `openspec` calls and test run use the worktree directory and `verify.md` records the outcome and the fresh test result

#### Scenario: Failing verify
- **WHEN** the outcome is `FAIL` with code-fixable items
- **THEN** the skill directs the agent to load `systematic-debugging` and re-apply, and to stop after 5 iterations

### Requirement: Sync merges delta specs without archiving
The `opsx-sync` skill SHALL merge the change's delta specs into `openspec/specs/<capability>/spec.md` (applying RENAMED, REMOVED, MODIFIED, then ADDED), report what changed, and MUST NOT move the change to the archive.

#### Scenario: Sync only
- **WHEN** `/opsx-sync` runs on a change with a delta spec
- **THEN** the main spec reflects the delta and the change directory is still active

### Requirement: Archive performs the delta-sync check
The `opsx-archive` skill SHALL check artifact and task completion (warning, not blocking), compare each delta spec with its main spec to decide whether a sync is needed, offer the sync when needed, and then archive the change with the OpenSpec CLI.

#### Scenario: Unsynced deltas
- **WHEN** `/opsx-archive` runs and a delta spec differs from the main spec
- **THEN** the agent reports the difference and offers to sync before archiving

#### Scenario: Already synced
- **WHEN** `/opsx-archive` runs and all delta specs are already reflected in the main specs
- **THEN** the agent archives without syncing

#### Scenario: Incomplete artifacts
- **WHEN** some artifacts or tasks are incomplete at archive time
- **THEN** the agent warns, asks whether to proceed, and archives only on confirmation

### Requirement: Superpowers-backed steps
When an artifact or apply instruction names `superpowers:<x>`, the execution skills that load Superpowers skills SHALL direct the agent to drop the prefix, read the `SKILL.md` of skill `<x>`, follow it, and ignore that skill's own closing handoff. If skill `<x>` is not available the agent MUST stop and tell the user to install Superpowers.

#### Scenario: Skill missing
- **WHEN** a named Superpowers skill cannot be found during apply or verify
- **THEN** the agent stops and reports that Superpowers must be installed
