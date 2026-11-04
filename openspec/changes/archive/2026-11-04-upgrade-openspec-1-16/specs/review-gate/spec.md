## MODIFIED Requirements

### Requirement: Plannotator CLI invocation
When using the CLI, the skill SHALL run `plannotator annotate` with the files in DAG order, `--gate`, `--json` and `--result-file`, in the background. The result file MUST NOT exist yet and MUST NOT be inside the change directory. The skill MUST classify the outcome from the `decision` field and `feedback`, never from message text.

#### Scenario: Result classification
- **WHEN** the result file contains `decision: approved` with non-empty `feedback`
- **THEN** the outcome is `approved_with_notes`

#### Scenario: Annotated
- **WHEN** the result file contains `decision: annotated`
- **THEN** the outcome is `changes_requested`

#### Scenario: Known decision values
- **WHEN** the skill reads the result file
- **THEN** it recognises the `decision` values `approved`, `annotated` and `dismissed`, and takes the outcome from `decision` and `feedback`, never from message text

#### Scenario: Unknown decision
- **WHEN** the result file contains an unrecognised `decision` value
- **THEN** the outcome is `dismissed`

#### Scenario: Result file location
- **WHEN** the skill chooses the result file path
- **THEN** the path is outside the change directory and does not exist yet

#### Scenario: Result file directory
- **WHEN** the skill chooses the result file path
- **THEN** the path is in the session scratch directory or in a fresh temporary directory

### Requirement: Code review gate before the feature branch is touched
While creating the `finalize` artifact, the agent SHALL obtain the reviewer's approval of the code changes after the in-worktree test run and before the feature branch is checked out, merged, pushed or opened as a PR. The agent MUST NOT proceed to the checkout of the feature branch until the outcome is `approved` or `approved_with_notes`, and MUST treat `dismissed` as not approved.

#### Scenario: Gate position
- **WHEN** finalize runs for a change whose tests pass in the worktree
- **THEN** the code review gate runs before the feature branch is checked out

#### Scenario: Plannotator code review
- **WHEN** the `plannotator` agent tool is available
- **THEN** the agent opens a code review of the worktree with the gate enabled and waits for the decision message

#### Scenario: Reviewer tier order
- **WHEN** the agent picks the code reviewer
- **THEN** it uses, in order, the `plannotator` agent tool with the `review` action on the worktree; otherwise `plannotator review` on the CLI against the feature branch recorded in `apply.md`; otherwise `ask_user_question` or plain text showing `git diff --stat` and the commit range

#### Scenario: Decision source
- **WHEN** the agent decides whether the code review is approved
- **THEN** it decides from `decision` only, and for an approval reads `message` only to tell a bare approval from approval with notes

#### Scenario: Diff summary fallback
- **WHEN** neither Plannotator tier is available
- **THEN** the agent shows `git diff --stat` and the commit range, asks for the three outcomes, and records the tier in `finalize.md`

#### Scenario: Dismissed code review
- **WHEN** the code review is closed without a decision
- **THEN** finalize does not proceed and the agent asks the user in chat

### Requirement: Code review changes requested
When the code review outcome is `changes_requested`, the agent SHALL stop finalize before the feature branch is touched, fix the code on the worktree branch following `receiving-code-review`, update `apply.md` as iteration N+1, run `/opsx-verify` again, and re-enter finalize so the gate runs again. The diff base MUST be the feature branch recorded in `apply.md`.

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
