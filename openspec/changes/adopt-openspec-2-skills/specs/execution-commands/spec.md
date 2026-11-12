## ADDED Requirements

### Requirement: Execution commands run stock skills
The package SHALL provide the apply, verify, sync and archive prompts and MUST NOT ship a skill for them. Each prompt SHALL tell the agent to read the stock skill it maps to (`openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs`, `openspec-archive-change`) and its section of `openspec/schemas/superspec/workflow.md`, with `workflow.md` winning where they differ, and to treat `$@` as the user input. The package MUST NOT ship `opsx-propose` or `opsx-bulk-archive` prompts.

#### Scenario: Prompts exist without package skills
- **WHEN** `prompts/` and `skills/` are listed
- **THEN** the four execution prompts exist and no `skills/opsx-apply`, `skills/opsx-verify`, `skills/opsx-sync` or `skills/opsx-archive` directory exists

#### Scenario: Mapped stock skill missing
- **WHEN** an execution prompt runs and its stock skill is not in the available skills list
- **THEN** the prompt directs the agent to name the missing skill, point to `openspec config profile` and `openspec update` (or `/opsx-init`), and stop without implementing, verifying, syncing or archiving another way

#### Scenario: Prompt maps to its stock skill
- **WHEN** `prompts/opsx-apply.md` is read
- **THEN** it names `openspec-apply-change` and `openspec/schemas/superspec/workflow.md`, states that `workflow.md` wins on conflict, references `$@`, and contains no step-by-step logic

#### Scenario: Excluded commands absent
- **WHEN** `prompts/` is listed
- **THEN** no `opsx-propose` or `opsx-bulk-archive` prompt exists

### Requirement: Execution rules live in workflow.md
`schema/superspec/workflow.md` SHALL hold, under one section per command (apply, verify, sync, archive), every execution rule that the stock skills and the schema instructions do not already enforce. Delegation steps MUST refer to the routing note's Subagent integration paragraph and MUST NOT name a subagent plugin, plugin tool or plugin parameter. User questions MUST refer to the Interaction channel paragraph.

#### Scenario: Sections present
- **WHEN** `schema/superspec/workflow.md` is read
- **THEN** it has a section for each of apply, verify, sync and archive

#### Scenario: Delegation through the paragraph
- **WHEN** `workflow.md` is searched for `pi-subagents`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** there are no matches, and delegation steps refer to the Subagent integration paragraph

## MODIFIED Requirements

### Requirement: Apply follows the schema apply block
`/opsx-apply` SHALL read the change's apply instruction with `openspec instructions apply --change <name> --json` and follow it in place of the stock skill's own implementation loop, handling `blocked` by cause (missing artifacts: `/opsx-continue`; missing tracking file: repaired per "Apply pauses on scope changes") and `all_done` by pointing to `/opsx-verify` and `/opsx-archive`. It MUST stop after the final whole-branch review and the `apply.md` receipt, MUST NOT invoke `finishing-a-development-branch`, and MUST NOT open the code review gate, which belongs to finalize.

#### Scenario: Blocked change
- **WHEN** `/opsx-apply` runs on a change whose apply instruction reports `blocked` because artifacts are missing
- **THEN** the agent shows the message, suggests `/opsx-continue`, and changes no code

#### Scenario: Blocked by a missing tracking file
- **WHEN** the apply instruction reports `blocked` because the tracking file is missing
- **THEN** the agent repairs it as described in "Apply pauses on scope changes" instead of pointing to `/opsx-continue`

#### Scenario: Stops after the receipt
- **WHEN** the executor finishes and the whole-branch review passes
- **THEN** `apply.md` is written and committed in the worktree and the agent points to `/opsx-verify` without merging, pushing, finishing the branch or opening a code review gate

#### Scenario: Schema apply block replaces the stock loop
- **WHEN** the apply section of `workflow.md` is read
- **THEN** it states that the apply instruction's steps (step 0 commit, worktree, executor, receipt) replace the stock skill's task loop, and that the first apply and every fix iteration before finalize implement only in the `<change-name>` worktree, while post-PR mode works on the feature branch as "Post-PR feedback loop" states

### Requirement: Executor depends on subagent availability
`/opsx-apply` SHALL use the detected subagent integration with Superpowers `subagent-driven-development`, resolving availability and selecting agents by role requirements through the shared integration reference. It SHALL use an agent meeting the implementer role for each task and an agent meeting the task reviewer role for the existing task and final whole-branch review seats, with no duplicate generic reviewer pipeline. It MUST keep one implementation writer per worktree, SHALL schedule unblocked independent tasks into parallel lanes as the parallel apply lanes capability defines, and MUST NOT set a model. If the Subagent integration paragraph reports that delegation is unavailable, it SHALL use Superpowers `executing-plans` in-session, run tasks one after another, and request a whole-branch review over the full commit range before writing `apply.md`. It MUST NOT fabricate calls, bypass a role no agent meets or a failed launch, or omit the executor actually used from `apply.md`.

#### Scenario: With pi-subagents
- **WHEN** a subagent plugin is detected and agents meeting the implementer and task reviewer roles are available
- **THEN** apply executes the plan through SDD with the selected implementer and task/final-review seats, announces the chosen agents, and records that executor

#### Scenario: Without pi-subagents
- **WHEN** the Subagent integration paragraph reports that delegation is unavailable
- **THEN** apply uses `executing-plans`, follows TDD manually, requests a whole-branch review, and records `executing-plans` in `apply.md`

#### Scenario: Unusable delegated executor
- **WHEN** no available agent meets a role or a child launch fails
- **THEN** apply reports and stops the affected lane without silently going inline

### Requirement: Post-PR feedback loop
`/opsx-apply` SHALL support post-PR review feedback: it MUST load `receiving-code-review`, apply fixes on the feature branch in the main checkout with TDD, append a "post-PR iteration N+1" entry with the new commit range to `apply.md`, direct the agent to re-run `/opsx-verify`, and update `finalize.md`. Pushing and the reviewer comment MUST follow the finalize policy, which a project `AGENTS.md` policy overrides.

#### Scenario: Feedback after a PR is open
- **WHEN** `/opsx-apply` runs on a finalized change with an open PR and review comments to address
- **THEN** `apply.md` gains an iteration N+1 entry with the new commit range and the agent directs a verify re-run

### Requirement: Verify runs in the worktree
`/opsx-verify` SHALL read the verify instruction with `openspec instructions verify --change <name> --json`, run every `openspec` call and check with the worktree as the working directory, require `apply.md` to exist (otherwise point to `/opsx-apply`), run the project test command fresh and record its result, and write `verify.md` with outcome `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. It MUST NOT perform the delta-spec sync check.

#### Scenario: Missing apply receipt
- **WHEN** `/opsx-verify` runs and `apply.md` does not exist
- **THEN** the agent stops and points to `/opsx-apply`

#### Scenario: Verify in the worktree
- **WHEN** `/opsx-verify` runs on an applied change
- **THEN** its `openspec` calls and test run use the worktree directory and `verify.md` records the outcome and the fresh test result

#### Scenario: Failing verify
- **WHEN** the outcome is `FAIL` with code-fixable items
- **THEN** the agent directs the agent to load `systematic-debugging` and re-apply, and to stop after 5 iterations

### Requirement: Sync merges delta specs without archiving
`/opsx-sync` SHALL merge the change's delta specs into `openspec/specs/<capability>/spec.md` (applying RENAMED, REMOVED, MODIFIED, then ADDED), report what changed, and MUST NOT move the change to the archive. It SHALL read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints.

#### Scenario: Sync only
- **WHEN** `/opsx-sync` runs on a change with a delta spec
- **THEN** the main spec reflects the delta and the change directory is still active

#### Scenario: Project rules applied
- **WHEN** `openspec/config.yaml` has `rules` for the `specs` artifact
- **THEN** the agent applies them to the text it writes and does not copy them into any spec

#### Scenario: Instructions unavailable
- **WHEN** reading the specs instructions fails
- **THEN** the agent stops and reports the error without writing any spec

### Requirement: Archive performs the delta-sync check
`/opsx-archive` SHALL check artifact and task completion (warning, not blocking), compare each delta spec with its main spec to decide whether a sync is needed, offer the sync when needed, re-compare every delta after the sync, and archive with the OpenSpec CLI only when all deltas match or the user chose to archive without syncing. The archive step MUST be `openspec archive "<name>" --skip-specs -y`, which overrides the stock skill's move of the change directory; the agent MUST NOT move the change directory by hand.

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
- **THEN** the agent takes the counts from `openspec list --json` and stops with an error if that output is invalid

#### Scenario: Skipped artifact
- **WHEN** an artifact has status `skipped`
- **THEN** it counts as complete

#### Scenario: Unclear answer
- **WHEN** the user's answer to the sync prompt is none of the offered choices
- **THEN** the agent asks again and does not archive

#### Scenario: Archive through the CLI
- **WHEN** `/opsx-archive` reaches the archive step
- **THEN** `workflow.md` directs the agent to run `openspec archive "<name>" --skip-specs -y` and not to move the change directory with `mv`

### Requirement: Superpowers-backed steps
When an artifact or apply instruction names `superpowers:<x>`, `/opsx-apply` and `/opsx-verify` SHALL direct the agent to drop the prefix, read the `SKILL.md` of skill `<x>`, follow it, and ignore that skill's own closing handoff. If skill `<x>` is not available the agent MUST stop and tell the user to install Superpowers.

#### Scenario: Skill missing
- **WHEN** a named Superpowers skill cannot be found during apply or verify
- **THEN** the agent stops and reports that Superpowers must be installed

### Requirement: Apply uses task locations
`/opsx-apply` SHALL tick a task at the `sourcePath` and `line` the apply instruction returns, after confirming the checkbox at that line still matches the task. It MUST mark a task `[x]` only when its behavior is fully implemented.

#### Scenario: Located tick
- **WHEN** a task is finished
- **THEN** the agent ticks the box at the returned location

#### Scenario: Checkbox changed
- **WHEN** the line at the location no longer matches the task
- **THEN** the agent re-reads the tracking file and does not tick a different task

#### Scenario: Partial behavior
- **WHEN** only part of the specified behavior is implemented
- **THEN** the task stays unticked

### Requirement: Apply pauses on scope changes
`/opsx-apply` SHALL pause and ask the user before adding scope the change does not specify, or narrowing or deferring behavior it does. A blocked apply state SHALL be handled by cause: missing artifacts lead to `/opsx-continue`, and a missing tracking file is repaired before any implementation.

#### Scenario: Added scope
- **WHEN** implementing a task would add behavior no artifact specifies
- **THEN** the agent pauses and asks whether to add it to the artifacts or leave it out

#### Scenario: Deferred behavior
- **WHEN** a specified behavior would be deferred or reduced
- **THEN** the agent asks the user before continuing

#### Scenario: Tracking file missing
- **WHEN** the state is blocked because the tracking file is missing
- **THEN** the agent reports it, offers to repair it, and starts no implementation

#### Scenario: All tracked tasks done
- **WHEN** every tracked task is ticked
- **THEN** the agent says the tracked tasks are complete and points to `/opsx-verify` before `/opsx-archive`

### Requirement: Verify never implements and reports skipped checks
`/opsx-verify` MUST NOT implement or archive anything while verifying. A check it could not run SHALL appear in `verify.md` as not verified with its reason, and MUST NOT count toward a `PASS` outcome.

#### Scenario: Verify stays read-only
- **WHEN** `/opsx-verify` finds a failing check
- **THEN** the agent records the failure and follows the fix loop without archiving the change

#### Scenario: Progress from apply
- **WHEN** the tasks check runs
- **THEN** the agent reads task progress from the apply instruction and reports unavailable tracking files as not verified

#### Scenario: Skipped check
- **WHEN** a check is skipped
- **THEN** `verify.md` marks it not verified and the outcome is at most `PASS_WITH_WARNINGS`

### Requirement: Apply enforces plan contracts
`/opsx-apply` SHALL tell the executor to read the `## Contracts` section of `plan.md` and follow the apply instruction's per-task contract order. It MUST stop the executor when a contract shape has to change, and MUST ask the user when the contract is `public`. For an internal contract it SHALL update `plan.md` with the reason and write the change into `apply.md` under "Contract deviations", including on iteration N+1 and in the post-PR loop.

#### Scenario: Executor briefed on contracts
- **WHEN** `/opsx-apply` starts the executor
- **THEN** the briefing names the Contracts section of `plan.md` and the per-task order of declarations, typecheck, failing test and implementation

#### Scenario: Public contract needs a change
- **WHEN** the executor finds that a `public` contract must change
- **THEN** the agent stops the executor and asks the user before any code relies on the new shape

#### Scenario: Internal contract change recorded
- **WHEN** the executor changes an internal contract
- **THEN** `plan.md` is updated with the reason and `apply.md` lists the change under "Contract deviations"

### Requirement: Verify compares contracts
`/opsx-verify` SHALL follow check 5 of the verify instruction by comparing the `plan.md` Contracts and the "Contract deviations" in `apply.md` with the code. A mismatch SHALL be recorded as a warning and MUST NOT by itself produce `FAIL`. A contract the skill cannot compare MUST be recorded as not verified with its reason.

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
Verify SHALL use an agent meeting the verifier role through the shared policy to collect independent evidence for the existing six checks, or verify inline when the integration is absent. Only commands run in the authoritative worktree during this invocation SHALL count as fresh. The parent MUST inspect evidence, perform remaining available checks, apply existing outcome rules, and write/commit `verify.md`; the child MUST NOT fix code or write the receipt.

#### Scenario: Fresh delegated evidence
- **WHEN** the verifier runs project tests during this verify invocation in the authoritative worktree
- **THEN** the parent records the exact command, cwd, result and evidence in its official receipt after checking the report

#### Scenario: Failing or missing evidence
- **WHEN** tests fail or evidence for a check is unavailable
- **THEN** the parent records FAIL for failing tests or not verified for the unavailable check, never invents a passing result, and does not let the verifier fix code

#### Scenario: Inline verify fallback
- **WHEN** the optional integration is absent
- **THEN** the parent runs the same fresh checks inline and writes the existing receipt format without fabricating child evidence

## REMOVED Requirements

### Requirement: Execution command and skill pairs

**Reason**: The package no longer ships execution skills; each execution command is a prompt that runs a stock OpenSpec skill under `workflow.md`.

**Migration**: Covered by "Execution commands run stock skills". Install the stock skills with OpenSpec 2.0.

### Requirement: No Claude tool names in execution commands

**Reason**: The package no longer owns the execution skill text.

**Migration**: The tool-name and delegation-name rules apply to `workflow.md` through "Planning rules live in workflow.md" (planning-commands) and "Execution rules live in workflow.md".
