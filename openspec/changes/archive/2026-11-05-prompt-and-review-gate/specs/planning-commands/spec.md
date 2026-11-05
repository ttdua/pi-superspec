## RENAMED Requirements

- FROM: `### Requirement: Continue creates one artifact`
- TO: `### Requirement: Continue advances after approval`

## MODIFIED Requirements

### Requirement: No Claude tool names
Skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite` or `Task tool`, and the planning skills and prompts (`opsx-explore`, `opsx-new`, `opsx-continue`, `opsx-ff`) MUST NOT contain `ask_user_question` or `plannotator`. Where the OpenSpec source skill asked the user, the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes. Where it tracked todos or loaded a skill, the text MUST use the `todo` tool (package `rpiv-todo`) or reading `SKILL.md`, with a plain-text fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** all files under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite` and `Task tool`
- **THEN** there are no matches

#### Scenario: Planning skills name no channel tool
- **WHEN** the files of `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff` are searched for `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Questions defer to the channel
- **WHEN** a planning skill needs a decision, including a question during explore or brainstorming
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes

#### Scenario: Ask fallback
- **WHEN** the Interaction channel paragraph names the `plain` channel and a decision is needed
- **THEN** the agent asks in plain text with numbered options, recommended first, and waits

### Requirement: Continue advances after approval
The `opsx-continue` skill SHALL create exactly the next ready artifact and run the review gate on that artifact's file(s). When the outcome is `approved`, or `approved_with_notes` handled per the gate, it SHALL re-read the change status and, if planning is not complete and the next ready artifact is not `apply`, create that artifact and run its gate in the same way, without a new command. It MUST stop when planning is complete or the next artifact is `apply`, and then point to `/opsx-apply`. It MUST NOT create an `apply` artifact, run `/opsx-apply`, or continue after `changes_requested` (before the revised gate is approved) or `dismissed`. When planning is already complete at invocation, it SHALL create nothing except a `finalize` artifact that is ready after verify, and otherwise point to `/opsx-apply`. When no change name is given and several changes exist, it MUST ask the user to choose.

#### Scenario: Brainstorm then proposal
- **WHEN** `/opsx-continue` creates `brainstorm.md` and the reviewer approves it
- **THEN** the skill creates `proposal.md` and opens its gate without a new command

#### Scenario: Gate before stop
- **WHEN** `/opsx-continue` creates an artifact
- **THEN** the review gate runs on that file before the next artifact is created

#### Scenario: Approval does not advance
- **WHEN** the reviewer approves `plan.md`, the last planning artifact before `apply`
- **THEN** no apply artifact is created, `/opsx-apply` is not run, and the skill points to `/opsx-apply`

#### Scenario: Changes requested
- **WHEN** the gate outcome is `changes_requested`
- **THEN** the artifact is revised and its gate reopened, and no later artifact is created until it is approved

#### Scenario: Dismissed
- **WHEN** the gate outcome is `dismissed`
- **THEN** no later artifact is created and the agent asks the user how to proceed

#### Scenario: Meaningful note on approval
- **WHEN** the outcome is `approved_with_notes` and a note changes a requirement
- **THEN** the gate is reopened on the changed files and the next artifact is created only after that gate is approved

#### Scenario: Planning already complete
- **WHEN** `/opsx-continue` runs on a change whose planning is complete and whose `finalize` is not ready
- **THEN** it creates nothing and points to `/opsx-apply`

#### Scenario: Planning completes mid-loop
- **WHEN** an approval leaves `isPlanningComplete` true
- **THEN** the skill stops and points to `/opsx-apply`

### Requirement: Continue completes partial artifacts
The `opsx-continue` skill SHALL, for an artifact that spans several files such as `specs`, compare the files the proposal calls for with `existingOutputPaths` and write only the missing ones as that step's artifact, then run the review gate and, after approval, continue as "Continue advances after approval" states. It SHALL treat `isPlanningComplete` (falling back to `isComplete`) as the end of planning and a `skipped` artifact as satisfied.

#### Scenario: Interrupted specs
- **WHEN** `specs` is `done` but a capability in the proposal has no spec file
- **THEN** `/opsx-continue` writes that spec file, runs the gate on it, and after approval continues with the next planning artifact

#### Scenario: Planning complete
- **WHEN** `isPlanningComplete` is true
- **THEN** the skill says planning is done and points to `/opsx-apply`

#### Scenario: Older status output
- **WHEN** the status output has no `isPlanningComplete`
- **THEN** the skill uses `isComplete`

#### Scenario: Dependencies re-read
- **WHEN** the skill creates an artifact
- **THEN** it reads every dependency file from disk first

### Requirement: Internal spec and plan review seats
Continue and ff SHALL use `superspec.spec-reviewer` for completed specs and `superspec.plan-reviewer` for the completed plan through the shared integration policy, or perform the checks inline when the integration is absent. They MUST resolve substantive findings and re-review substantive revisions before the existing human gate, without adding approvals or replacing human authority. An internal review verdict MUST NOT advance continue to the next artifact; only the human gate's approval does.

#### Scenario: Continue reviews one artifact
- **WHEN** continue completes all files of a specs artifact or the plan artifact
- **THEN** the corresponding specialist checks that artifact before its human gate, and only the human approval lets continue advance

#### Scenario: Fast-forward retains two planned stops
- **WHEN** ff creates specs and plan after brainstorm approval
- **THEN** their internal reviews occur before the existing final packet gate without introducing another human approval stop

#### Scenario: Planning review without subagents
- **WHEN** the optional integration is absent during planning
- **THEN** the parent checks spec/plan quality inline and preserves the existing review-gate order and outcomes
