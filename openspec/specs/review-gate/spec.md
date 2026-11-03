# review-gate Specification

## Purpose
Define the review gate used by `opsx-continue`, `opsx-ff` and finalize: the gate outcomes, reviewer selection, Plannotator invocation, notes handling, cascade on revision and the code review gate before the feature branch is touched.

## Requirements
### Requirement: Gate outcomes
A review gate SHALL end in exactly one of four normalised outcomes: `approved`, `approved_with_notes`, `changes_requested` or `dismissed`. Only `approved` and `approved_with_notes` MUST allow the workflow to continue. `dismissed` MUST NOT be treated as an approval; the agent MUST ask the user in chat how to proceed.

#### Scenario: Plain approval
- **WHEN** the reviewer approves without notes
- **THEN** the outcome is `approved` and the workflow continues

#### Scenario: Approval with notes
- **WHEN** the reviewer approves and attaches notes
- **THEN** the outcome is `approved_with_notes` and the notes are handled as the notes requirement states

#### Scenario: Changes requested
- **WHEN** the reviewer requests changes with notes
- **THEN** the outcome is `changes_requested`, the artifact is revised from the notes and the gate is opened again

#### Scenario: Dismissed review
- **WHEN** the reviewer closes the review without deciding
- **THEN** the outcome is `dismissed`, the workflow does not continue, and the agent asks the user in chat

### Requirement: Reviewer selection
The skill SHALL pick the reviewer each time a gate opens, in this order: the `plannotator` agent tool when it is available; otherwise the Plannotator CLI when `plannotator` is on the PATH; otherwise the `ask_user_question` tool when available; otherwise plain text with three numbered options. When a tier fails to open, the skill MUST fall to the next tier and tell the user.

#### Scenario: Agent tool available
- **WHEN** the `plannotator` agent tool is available
- **THEN** the skill calls it with the gate enabled, ends its turn, and continues when the decision message arrives

#### Scenario: CLI only
- **WHEN** no `plannotator` agent tool exists but `command -v plannotator` succeeds
- **THEN** the skill runs the CLI in the background and reads the decision from the result file

#### Scenario: No Plannotator
- **WHEN** neither the tool nor the CLI is available and `ask_user_question` is available
- **THEN** the skill asks the three gate options with that tool

#### Scenario: Nothing installed
- **WHEN** none of the three are available
- **THEN** the skill asks in plain text with three numbered options and waits

#### Scenario: Open failure falls through
- **WHEN** the CLI exits with code 2
- **THEN** the skill reports the failure and uses the next tier

### Requirement: Plannotator CLI invocation
When using the CLI, the skill SHALL run `plannotator annotate` with the files in DAG order, `--gate`, `--json` and `--result-file`, in the background. The result file MUST be a path that does not exist yet, in the session scratch directory or a fresh temporary directory, and MUST NOT be inside the change directory. The skill MUST classify the outcome from the `decision` field (`approved`, `annotated`, `dismissed`) and `feedback`, never from message text, and MUST treat an unknown `decision` as `dismissed`.

#### Scenario: Result classification
- **WHEN** the result file contains `decision: approved` with non-empty `feedback`
- **THEN** the outcome is `approved_with_notes`

#### Scenario: Annotated
- **WHEN** the result file contains `decision: annotated`
- **THEN** the outcome is `changes_requested`

#### Scenario: Unknown decision
- **WHEN** the result file contains an unrecognised `decision` value
- **THEN** the outcome is `dismissed`

#### Scenario: Result file location
- **WHEN** the skill chooses the result file path
- **THEN** the path is outside the change directory and does not exist yet

### Requirement: Notes handling
For `approved_with_notes` and `changes_requested`, the agent SHALL apply the notes to the reviewed artifact(s). After `approved_with_notes`, if every note is only wording, formatting or clarification and none changes a requirement, scope, decision, scenario or the meaning of another artifact, the workflow MUST continue and the agent MUST show a short diff of what changed. Otherwise the gate MUST be opened again on the changed files. When the agent is unsure, it MUST open the gate again.

#### Scenario: Wording note
- **WHEN** an approval carries a note that fixes a typo
- **THEN** the typo is fixed, a short diff is shown, and the workflow continues without a new gate

#### Scenario: Requirement note
- **WHEN** an approval carries a note that changes a requirement
- **THEN** the artifact is updated and the gate is opened again on it

#### Scenario: Uncertain note
- **WHEN** the agent cannot tell whether a note changes meaning
- **THEN** the gate is opened again

### Requirement: Fast-forward review packet
The final gate of `opsx-ff` SHALL review `proposal.md`, `design.md`, every `specs/<capability>/spec.md`, `tasks.md` and `plan.md` as one review with one decision, passed as an explicit ordered list of file paths and never as a folder. It MUST NOT repeat `brainstorm.md`, which is approved as a file at its own gate before the unattended phase.

#### Scenario: Packet contents
- **WHEN** the final gate of `opsx-ff` opens for a change with two capability specs
- **THEN** the review lists proposal, design, both spec files, tasks and plan in that order, and not `brainstorm.md`

#### Scenario: Not a folder
- **WHEN** the final gate opens
- **THEN** every target is a file path

### Requirement: Cascade on revision
When an artifact is revised after a gate, the agent SHALL find its dependents from the dependency data of `openspec status --change <name> --json`, edit them to stay consistent, and open the next gate on only the files that changed. If `brainstorm.md` is revised after the unattended phase, the next gate MUST list all five final-packet artifacts.

#### Scenario: Proposal revised
- **WHEN** a requested change alters `proposal.md` at the final gate
- **THEN** specs, tasks and plan are updated to match and the next gate lists the changed files

#### Scenario: Brainstorm revised late
- **WHEN** a revision touches `brainstorm.md` after the unattended phase
- **THEN** the next gate lists proposal, design, specs, tasks and plan

### Requirement: Code review gate before the feature branch is touched
While creating the `finalize` artifact, the agent SHALL obtain the reviewer's approval of the code changes after the in-worktree test run and before the feature branch is checked out, merged, pushed or opened as a PR. The reviewer tiers are, in order: the `plannotator` agent tool with the `review` action on the worktree; otherwise `plannotator review` on the CLI against the feature branch recorded in `apply.md`; otherwise `ask_user_question` or plain text showing `git diff --stat` and the commit range. The agent MUST decide approve or not from `decision` only (for an approval, `message` is read only to tell a bare approval from approval with notes), MUST treat `dismissed` as not approved, and MUST NOT proceed to the checkout of the feature branch until the outcome is `approved` or `approved_with_notes`.

#### Scenario: Gate position
- **WHEN** finalize runs for a change whose tests pass in the worktree
- **THEN** the code review gate runs before the feature branch is checked out

#### Scenario: Plannotator code review
- **WHEN** the `plannotator` agent tool is available
- **THEN** the agent opens a code review of the worktree with the gate enabled and waits for the decision message

#### Scenario: Diff summary fallback
- **WHEN** neither Plannotator tier is available
- **THEN** the agent shows `git diff --stat` and the commit range, asks for the three outcomes, and records the tier in `finalize.md`

#### Scenario: Dismissed code review
- **WHEN** the code review is closed without a decision
- **THEN** finalize does not proceed and the agent asks the user in chat

### Requirement: Code review changes requested
When the code review outcome is `changes_requested`, the agent SHALL stop finalize before the feature branch is touched, fix the code on the worktree branch following `receiving-code-review`, update `apply.md` as iteration N+1 (raise `Iteration:` and extend the commit range, as the apply template directs), run `/opsx-verify` again, and re-enter finalize so the gate runs again. When the outcome is `approved_with_notes`, the agent MUST apply the notes on the worktree branch, update `apply.md` as iteration N+1, run `/opsx-verify` again and re-enter finalize before the feature branch is touched. After `approved_with_notes` the gate MUST be reopened only if a note changed behaviour or a requirement or the agent is unsure; after `changes_requested` it MUST always be reopened. The diff base MUST be the feature branch recorded in `apply.md`.

#### Scenario: Requested change loop
- **WHEN** the reviewer requests changes on the diff
- **THEN** no merge, push or PR happens, the fix is committed on the worktree branch, `apply.md` is updated as iteration N+1, and verify runs again before finalize resumes

#### Scenario: Notes on approval
- **WHEN** the reviewer approves the diff with notes
- **THEN** no merge, push or PR happens until the notes are applied on the worktree branch and verify has passed again

#### Scenario: Wording-only notes
- **WHEN** every note on an approved diff is only wording and none changes behaviour or a requirement
- **THEN** finalize resumes after re-verify without reopening the code gate

#### Scenario: Diff base
- **WHEN** the code review opens
- **THEN** it compares the worktree against the feature branch recorded in `apply.md`

### Requirement: Code review receipt
`finalize.md` SHALL record the code review outcome (`approved`, `approved with notes` or `skipped` with a reason), the reviewer tier used and the commit range reviewed.

#### Scenario: Receipt fields
- **WHEN** finalize completes after an approved code review
- **THEN** `finalize.md` names the outcome, the tier and the commit range

### Requirement: Identical gate section
The `opsx-continue` and `opsx-ff` skills SHALL each contain a "Review gate" section, and the two sections MUST be identical.

#### Scenario: Sections match
- **WHEN** the "Review gate" sections of both skills are compared
- **THEN** they are byte-identical
