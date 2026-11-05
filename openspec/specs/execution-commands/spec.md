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
The execution skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. Where the OpenSpec source skill asked the user, the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes. Where it tracked todos, dispatched a subagent or loaded a skill, the text MUST use the `todo` tool, the `subagent` tool from `pi-subagents`, or reading `SKILL.md`, each with a plain fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** the files of `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive` under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** an execution skill needs a decision from the user
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes, which on the `plain` channel is plain text with numbered options, recommended first, then wait

### Requirement: Apply follows the schema apply block
The `opsx-apply` skill SHALL read the change's apply instruction with `openspec instructions apply --change <name> --json` and follow it, handling `blocked` by cause (missing artifacts: `/opsx-continue`; missing tracking file: repaired per "Apply pauses on scope changes") and `all_done` by pointing to `/opsx-verify` and `/opsx-archive`. It MUST stop after the final whole-branch review and the `apply.md` receipt and MUST NOT invoke `finishing-a-development-branch`.

#### Scenario: Blocked change
- **WHEN** `/opsx-apply` runs on a change whose apply instruction reports `blocked` because artifacts are missing
- **THEN** the agent shows the message, suggests `/opsx-continue`, and changes no code

#### Scenario: Blocked by a missing tracking file
- **WHEN** the apply instruction reports `blocked` because the tracking file is missing
- **THEN** the agent repairs it as described in "Apply pauses on scope changes" instead of pointing to `/opsx-continue`

#### Scenario: Stops after the receipt
- **WHEN** the executor finishes and the whole-branch review passes
- **THEN** `apply.md` is written and committed in the worktree and the agent points to `/opsx-verify` without merging, pushing or finishing the branch

### Requirement: Executor depends on subagent availability
The `opsx-apply` skill SHALL use the compatible `pi-subagents` integration with Superpowers `subagent-driven-development`, resolving lazy tool activation and canonical role availability through the shared integration reference. It SHALL use `superspec.implementer` for each task and `superspec.task-reviewer` for the existing task and final whole-branch review seats, with no duplicate generic reviewer pipeline. It MUST preserve one implementation writer per worktree and configured model selection. If the optional tool and activation helper are absent it SHALL use Superpowers `executing-plans` in-session and request a whole-branch review over the full commit range before writing `apply.md`. It MUST NOT fabricate calls, bypass disabled/missing roles or failed launches, or omit the executor actually used from `apply.md`.

#### Scenario: With pi-subagents
- **WHEN** the compatible integration and required canonical roles are available
- **THEN** apply executes the plan through SDD with the namespaced implementer and existing namespaced task/final-review seats and records that executor

#### Scenario: Without pi-subagents
- **WHEN** neither the subagent tool nor its activation helper is available
- **THEN** apply uses `executing-plans`, follows TDD manually, requests a whole-branch review, and records `executing-plans` in `apply.md`

#### Scenario: Unusable delegated executor
- **WHEN** a canonical role is disabled/missing or a child launch fails
- **THEN** apply reports and stops the affected lane without dispatching a generic substitute or silently going inline

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
The `opsx-sync` skill SHALL merge the change's delta specs into `openspec/specs/<capability>/spec.md` (applying RENAMED, REMOVED, MODIFIED, then ADDED), report what changed, and MUST NOT move the change to the archive. It SHALL read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints.

#### Scenario: Sync only
- **WHEN** `/opsx-sync` runs on a change with a delta spec
- **THEN** the main spec reflects the delta and the change directory is still active

#### Scenario: Project rules applied
- **WHEN** `openspec/config.yaml` has `rules` for the `specs` artifact
- **THEN** the skill applies them to the text it writes and does not copy them into any spec

#### Scenario: Instructions unavailable
- **WHEN** reading the specs instructions fails
- **THEN** the skill stops and reports the error without writing any spec

### Requirement: Archive performs the delta-sync check
The `opsx-archive` skill SHALL check artifact and task completion (warning, not blocking), compare each delta spec with its main spec to decide whether a sync is needed, offer the sync when needed, re-compare every delta after the sync, and archive with the OpenSpec CLI only when all deltas match or the user chose to archive without syncing.

#### Scenario: Unsynced deltas
- **WHEN** `/opsx-archive` runs and a delta spec differs from the main spec
- **THEN** the agent reports the difference and offers to sync before archiving

#### Scenario: Already synced
- **WHEN** `/opsx-archive` runs and all delta specs are already reflected in the main specs
- **THEN** the agent archives without syncing

#### Scenario: Incomplete artifacts
- **WHEN** some artifacts or tasks are incomplete at archive time
- **THEN** the agent warns, asks whether to proceed, and archives only on confirmation

#### Scenario: Sync verified before archive
- **WHEN** a sync finishes during `/opsx-archive`
- **THEN** the agent compares every delta with its main spec again, reports "Synced" only if all match, and stops without archiving if any differs

#### Scenario: Missing main spec
- **WHEN** a delta has no main spec yet
- **THEN** the agent does not treat that alone as unsynced and decides by the delta operations as the sync requirements define

#### Scenario: Task counts from the CLI
- **WHEN** the agent checks task completion
- **THEN** it takes the counts from `openspec list --json` and stops with an error if that output is invalid

#### Scenario: Skipped artifact
- **WHEN** an artifact has status `skipped`
- **THEN** it counts as complete

#### Scenario: Unclear answer
- **WHEN** the user's answer to the sync prompt is none of the offered choices
- **THEN** the agent asks again and does not archive

### Requirement: Superpowers-backed steps
When an artifact or apply instruction names `superpowers:<x>`, the execution skills that load Superpowers skills SHALL direct the agent to drop the prefix, read the `SKILL.md` of skill `<x>`, follow it, and ignore that skill's own closing handoff. If skill `<x>` is not available the agent MUST stop and tell the user to install Superpowers.

#### Scenario: Skill missing
- **WHEN** a named Superpowers skill cannot be found during apply or verify
- **THEN** the agent stops and reports that Superpowers must be installed

### Requirement: Sync keeps the delta Purpose
When sync creates a main spec for a new capability, it SHALL create it only from ADDED requirements, copy the delta's `## Purpose` text, and use `# <capability> Specification` as the title. It MUST NOT write delta headers into a main spec, and MUST NOT overwrite the Purpose of an existing main spec.

#### Scenario: New capability with a Purpose
- **WHEN** a delta for a capability without a main spec has a `## Purpose`
- **THEN** the new main spec carries that Purpose verbatim and no delta section header

#### Scenario: No Purpose in the delta
- **WHEN** the delta has no `## Purpose`
- **THEN** the main spec gets a `TBD` Purpose and the summary flags it

#### Scenario: Existing main spec
- **WHEN** the main spec already has a Purpose
- **THEN** sync leaves that Purpose unchanged

### Requirement: Sync blocks unsafe merges
Sync SHALL stop without writing when a delta for a missing main spec has MODIFIED or RENAMED operations or only REMOVED ones, or when applying it would leave a main spec with no requirements. A spec MAY be deleted only when `.openspec.yaml` of the change sets `retire_capabilities: true`.

#### Scenario: Modified against a missing spec
- **WHEN** a delta has MODIFIED requirements and no main spec exists
- **THEN** sync reports the capability as blocked and writes nothing

#### Scenario: Last requirement removed
- **WHEN** applying a delta would leave `## Requirements` empty
- **THEN** sync stops, writes no empty section, and reports it

#### Scenario: Retirement marker
- **WHEN** every requirement is removed and `retire_capabilities: true` is set
- **THEN** sync deletes the spec, reports its Purpose and says it can be restored with git

#### Scenario: Blocked sync at archive
- **WHEN** archive runs and a sync is blocked
- **THEN** the agent offers only "archive without syncing" or "cancel"

### Requirement: Apply uses task locations
The `opsx-apply` skill SHALL tick a task at the `sourcePath` and `line` the apply instruction returns, after confirming the checkbox at that line still matches the task. It MUST mark a task `[x]` only when its behavior is fully implemented.

#### Scenario: Located tick
- **WHEN** a task is finished
- **THEN** the skill ticks the box at the returned location

#### Scenario: Checkbox changed
- **WHEN** the line at the location no longer matches the task
- **THEN** the skill re-reads the tracking file and does not tick a different task

#### Scenario: Partial behavior
- **WHEN** only part of the specified behavior is implemented
- **THEN** the task stays unticked

### Requirement: Apply pauses on scope changes
The `opsx-apply` skill SHALL pause and ask the user before adding scope the change does not specify, or narrowing or deferring behavior it does. A blocked apply state SHALL be handled by cause: missing artifacts lead to `/opsx-continue`, and a missing tracking file is repaired before any implementation.

#### Scenario: Added scope
- **WHEN** implementing a task would add behavior no artifact specifies
- **THEN** the skill pauses and asks whether to add it to the artifacts or leave it out

#### Scenario: Deferred behavior
- **WHEN** a specified behavior would be deferred or reduced
- **THEN** the skill asks the user before continuing

#### Scenario: Tracking file missing
- **WHEN** the state is blocked because the tracking file is missing
- **THEN** the skill reports it, offers to repair it, and starts no implementation

#### Scenario: All tracked tasks done
- **WHEN** every tracked task is ticked
- **THEN** the skill says the tracked tasks are complete and points to `/opsx-verify` before `/opsx-archive`

### Requirement: Verify never implements and reports skipped checks
The `opsx-verify` skill MUST NOT implement or archive anything while verifying. A check it could not run SHALL appear in `verify.md` as not verified with its reason, and MUST NOT count toward a `PASS` outcome.

#### Scenario: Verify stays read-only
- **WHEN** `/opsx-verify` finds a failing check
- **THEN** it records the failure and follows the fix loop without archiving the change

#### Scenario: Progress from apply
- **WHEN** the tasks check runs
- **THEN** the skill reads task progress from the apply instruction and reports unavailable tracking files as not verified

#### Scenario: Skipped check
- **WHEN** a check is skipped
- **THEN** `verify.md` marks it not verified and the outcome is at most `PASS_WITH_WARNINGS`

### Requirement: Apply enforces plan contracts
The `opsx-apply` skill SHALL tell the executor to read the `## Contracts` section of `plan.md` and follow the apply instruction's per-task contract order. It MUST stop the executor when a contract shape has to change, and MUST ask the user when the contract is `public`. For an internal contract it SHALL update `plan.md` with the reason and write the change into `apply.md` under "Contract deviations", including on iteration N+1 and in the post-PR loop.

#### Scenario: Executor briefed on contracts
- **WHEN** `/opsx-apply` starts the executor
- **THEN** the briefing names the Contracts section of `plan.md` and the per-task order of declarations, typecheck, failing test and implementation

#### Scenario: Public contract needs a change
- **WHEN** the executor finds that a `public` contract must change
- **THEN** the skill stops the executor and asks the user before any code relies on the new shape

#### Scenario: Internal contract change recorded
- **WHEN** the executor changes an internal contract
- **THEN** `plan.md` is updated with the reason and `apply.md` lists the change under "Contract deviations"

### Requirement: Verify compares contracts
The `opsx-verify` skill SHALL follow check 5 of the verify instruction by comparing the `plan.md` Contracts and the "Contract deviations" in `apply.md` with the code. A mismatch SHALL be recorded as a warning and MUST NOT by itself produce `FAIL`. A contract the skill cannot compare MUST be recorded as not verified with its reason.

#### Scenario: Matching contracts
- **WHEN** every Contracts entry matches the code
- **THEN** `verify.md` records check 5 as passed with the files compared

#### Scenario: Mismatched contract
- **WHEN** a Contracts entry differs from the code and no deviation records it
- **THEN** `verify.md` records a warning naming the entry and the outcome is at most `PASS_WITH_WARNINGS`

#### Scenario: Contract cannot be compared
- **WHEN** a Contracts entry has no checkable counterpart in the code, such as a documented file format
- **THEN** `verify.md` marks it not verified with the reason

### Requirement: Delegated verify evidence with parent receipt
Verify SHALL use `superspec.verifier` through the shared policy to collect independent evidence for the existing six checks, or verify inline when the integration is absent. Only commands run in the authoritative worktree during this invocation SHALL count as fresh. The parent MUST inspect evidence, perform remaining available checks, apply existing outcome rules, and write/commit `verify.md`; the child MUST NOT fix code or write the receipt.

#### Scenario: Fresh delegated evidence
- **WHEN** the verifier runs project tests during this verify invocation in the authoritative worktree
- **THEN** the parent records the exact command, cwd, result and evidence in its official receipt after checking the report

#### Scenario: Failing or missing evidence
- **WHEN** tests fail or evidence for a check is unavailable
- **THEN** the parent records FAIL for failing tests or not verified for the unavailable check, never invents a passing result, and does not let the verifier fix code

#### Scenario: Inline verify fallback
- **WHEN** the optional integration is absent
- **THEN** the parent runs the same fresh checks inline and writes the existing receipt format without fabricating child evidence
