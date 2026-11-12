## ADDED Requirements

### Requirement: Single gate section
`schema/superspec/workflow.md` SHALL contain exactly one "Review gate" section, holding the outcomes, notes handling, cascade on revision and the code review gate. The continue, ff and finalize rules MUST refer to that section instead of restating it.

#### Scenario: One section
- **WHEN** `schema/superspec/workflow.md` is read
- **THEN** it has exactly one heading named "Review gate"

#### Scenario: Referenced, not repeated
- **WHEN** the continue and ff sections of `workflow.md` are read
- **THEN** each refers to the Review gate section and neither contains an outcome table

## MODIFIED Requirements

### Requirement: Reviewer selection
The agent SHALL open every review gate on the interaction channel named in the routing note's Interaction channel paragraph and follow that paragraph's mechanics; the Review gate section of `workflow.md` MUST NOT name a reviewer tool or list reviewer tiers itself. The channel order (`inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain`) is defined by the `interaction-channel` capability. When the channel fails to open, the agent MUST tell the user and fall to the next listed channel.

#### Scenario: Gate on the injected channel
- **WHEN** a gate opens and the routing note names the `inbox` channel
- **THEN** the gate is sent as a self-contained Inbox message and the agent ends its turn until the reply arrives

#### Scenario: Agent tool available
- **WHEN** the routing note names the `plannotator-tool` channel
- **THEN** the agent calls that tool with the gate enabled on the target files, ends its turn, and continues when the decision message arrives

#### Scenario: CLI only
- **WHEN** the routing note names the `plannotator-cli` channel
- **THEN** the agent runs the CLI in the background and reads the decision from the result file

#### Scenario: No Plannotator
- **WHEN** the routing note names the `ask-tool` channel
- **THEN** the agent asks the three gate options with that tool

#### Scenario: Nothing installed
- **WHEN** the routing note names the `plain` channel
- **THEN** the agent asks in plain text with three numbered options and waits

#### Scenario: Open failure falls through
- **WHEN** the selected channel fails to open
- **THEN** the agent reports the failure and uses the next listed channel

#### Scenario: No tool names in the gate section
- **WHEN** the "Review gate" section of `schema/superspec/workflow.md` is searched case-insensitively for `plannotator` and `ask_user_question`
- **THEN** there are no matches; the outcome table's result column is named for the channel, not for a tool


### Requirement: Code review changes requested
When the code review outcome is `changes_requested`, the agent SHALL stop finalize before the feature branch is touched, fix the code on the worktree branch following `receiving-code-review`, update `apply.md` as iteration N+1, run `openspec-verify-change` again, and re-enter finalize so the gate runs again. The diff base MUST be the feature branch recorded in `apply.md`.

#### Scenario: Requested change loop
- **WHEN** the reviewer requests changes on the diff
- **THEN** no merge, push or PR happens, the fix is committed on the worktree branch, `apply.md` is updated as iteration N+1, and verify runs again before finalize resumes

#### Scenario: Iteration update
- **WHEN** the agent updates `apply.md` as iteration N+1
- **THEN** it raises `Iteration:` and extends the commit range, as the apply template directs

#### Scenario: Notes on approval
- **WHEN** the reviewer approves the diff with notes
- **THEN** no merge, push or PR happens until the notes are applied on the worktree branch, `apply.md` is updated as iteration N+1, verify has passed again, and finalize is re-entered before the feature branch is touched

#### Scenario: Reopen after changes requested
- **WHEN** the outcome was `changes_requested`
- **THEN** the code gate is always reopened

#### Scenario: Reopen after approval with notes
- **WHEN** the outcome was `approved_with_notes` and a note changed behaviour or a requirement, or the agent is unsure
- **THEN** the code gate is reopened

#### Scenario: Wording-only notes
- **WHEN** every note on an approved diff is only wording and none changes behaviour or a requirement
- **THEN** finalize resumes after re-verify without reopening the code gate

#### Scenario: Diff base
- **WHEN** the code review opens
- **THEN** it compares the worktree against the feature branch recorded in `apply.md`

## REMOVED Requirements

### Requirement: Identical gate section

**Reason**: The continue and ff skills no longer exist in the package; there is one gate section in `workflow.md`, so there is nothing to keep identical.

**Migration**: Covered by "Single gate section".
