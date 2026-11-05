## MODIFIED Requirements

### Requirement: Reviewer selection
The skill SHALL open every review gate on the interaction channel named in the routing note's Interaction channel paragraph and follow that paragraph's mechanics; the skill text MUST NOT name a reviewer tool or list reviewer tiers itself. The channel order (`inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain`) is defined by the `interaction-channel` capability. When the channel fails to open, the skill MUST tell the user and fall to the next listed channel.

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
- **WHEN** the "Review gate" sections of `opsx-continue` and `opsx-ff` are searched case-insensitively for `plannotator` and `ask_user_question`
- **THEN** there are no matches; the outcome table's result column is named for the channel, not for a tool

### Requirement: Plannotator CLI invocation
On the `plannotator-cli` channel, the Interaction channel paragraph SHALL direct the agent to run `plannotator annotate` with the files in DAG order, `--gate`, `--json` and `--result-file`, in the background. The result file MUST NOT exist yet and MUST NOT be inside the change directory. The agent MUST classify the outcome from the `decision` field and `feedback`, never from message text.

#### Scenario: Result classification
- **WHEN** the result file contains `decision: approved` with non-empty `feedback`
- **THEN** the outcome is `approved_with_notes`

#### Scenario: Annotated
- **WHEN** the result file contains `decision: annotated`
- **THEN** the outcome is `changes_requested`

#### Scenario: Known decision values
- **WHEN** the agent reads the result file
- **THEN** it recognises the `decision` values `approved`, `annotated` and `dismissed`, and takes the outcome from `decision` and `feedback`, never from message text

#### Scenario: Unknown decision
- **WHEN** the result file contains an unrecognised `decision` value
- **THEN** the outcome is `dismissed`

#### Scenario: Result file location
- **WHEN** the agent chooses the result file path
- **THEN** the path is outside the change directory and does not exist yet

#### Scenario: Result file directory
- **WHEN** the agent chooses the result file path
- **THEN** the path is in the session scratch directory or in a fresh temporary directory

### Requirement: Code review gate before the feature branch is touched
While creating the `finalize` artifact, the agent SHALL obtain the reviewer's approval of the code changes after the in-worktree test run and before the feature branch is checked out, merged, pushed or opened as a PR, on the interaction channel named in the routing note. The agent MUST NOT proceed to the checkout of the feature branch until the outcome is `approved` or `approved_with_notes`, and MUST treat `dismissed` as not approved. The diff under review MUST be every commit on the worktree branch since the feature branch recorded in `apply.md`.

#### Scenario: Gate position
- **WHEN** finalize runs for a change whose tests pass in the worktree
- **THEN** the code review gate runs before the feature branch is checked out

#### Scenario: Reviewer tier order
- **WHEN** the agent picks the code reviewer
- **THEN** it uses the interaction channel named in the routing note, falling to the next listed channel when that one fails to open

#### Scenario: Inbox code review
- **WHEN** the routing note names the `inbox` channel
- **THEN** the agent sends the commit range, `git diff --stat` and the full branch diff as an attached patch file with the three-choice question, and waits for the reply

#### Scenario: Plannotator code review
- **WHEN** the routing note names the `plannotator-tool` channel
- **THEN** the agent opens a code review of the worktree with the gate enabled, based on the feature branch, asks the reviewer to confirm the compare mode shows the full branch diff, and waits for the decision message

#### Scenario: CLI code review
- **WHEN** the routing note names the `plannotator-cli` channel
- **THEN** the agent runs `plannotator review --base <feature branch> --diff-type merge-base --gate --json` in the background with stdout redirected to a fresh scratch file (that command has no `--result-file`), and reads the JSON from that file

#### Scenario: Decision source
- **WHEN** the agent decides whether a Plannotator code review is approved
- **THEN** it decides from `decision` only, and for an approval reads `message` only to tell a bare approval from approval with notes

#### Scenario: Diff summary fallback
- **WHEN** the routing note names the `ask-tool` or `plain` channel
- **THEN** the agent shows `git diff --stat` and the commit range, asks for the three outcomes, and records the channel in `finalize.md`

#### Scenario: Dismissed code review
- **WHEN** the code review is closed without a decision
- **THEN** finalize does not proceed and the agent asks the user on the interaction channel how to proceed

### Requirement: Code review receipt
`finalize.md` SHALL record the code review outcome (`approved`, `approved with notes` or `skipped` with a reason), the reviewer tier, recorded as the name of the interaction channel that gave the decision, and the commit range reviewed.

#### Scenario: Receipt fields
- **WHEN** finalize completes after an approved code review
- **THEN** `finalize.md` names the outcome, the reviewer tier as a channel name (for example `inbox`), and the commit range
