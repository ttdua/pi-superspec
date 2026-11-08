# planning-commands Specification

## Purpose
Defines the `/opsx-explore`, `/opsx-new`, `/opsx-continue` and `/opsx-ff` command and skill pairs that create and plan a change. They cover free-form exploration, change scaffolding, one artifact per review gate with continuation after approval up to apply, and fast-forward planning.

## Requirements

### Requirement: Command and skill pairs
The package SHALL provide `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff`, each as a skill `skills/<name>/SKILL.md` whose frontmatter `name` equals its directory name, and a prompt `prompts/<name>.md`. Each prompt MUST instruct the agent to read the matching `SKILL.md`, follow it, and treat `$@` as the user input, and MUST NOT carry the command logic itself.

#### Scenario: Pairs exist
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** all four skills and all four prompts exist with matching names

#### Scenario: Prompt delegates to skill
- **WHEN** a prompt file is read
- **THEN** it names its skill, references `$@`, and contains no step-by-step command logic

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

### Requirement: Superpowers-backed artifacts
When an artifact instruction names `superpowers:<x>`, the `opsx-continue` and `opsx-ff` skills SHALL direct the agent to drop the prefix, read the SKILL.md of skill `<x>`, follow it, write output only where the instruction says, and ignore that skill's own closing handoff. If skill `<x>` is not available the agent MUST stop and tell the user to install Superpowers.

#### Scenario: Brainstorm redirected
- **WHEN** the brainstorm artifact instruction names `superpowers:brainstorming`
- **THEN** the agent reads the `brainstorming` skill and writes `brainstorm.md` in the change directory, not under `docs/superpowers/`

#### Scenario: Skill missing
- **WHEN** the named Superpowers skill cannot be found
- **THEN** the agent stops and reports that Superpowers must be installed

### Requirement: New change creation
The `opsx-new` skill SHALL create a change with `openspec new change <name>` without passing `--schema`, show its status and the first artifact's instructions, and stop without creating any artifact. If the change already exists it MUST suggest continuing it.

#### Scenario: Change created and stopped
- **WHEN** `/opsx-new <name>` runs in an activated project
- **THEN** the change directory exists, no artifact file exists, and the agent waits for direction

#### Scenario: Name exists
- **WHEN** `/opsx-new` names an existing change
- **THEN** the agent suggests `/opsx-continue` instead of creating it

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

### Requirement: Fast-forward interaction boundary
The `opsx-ff` skill SHALL run the brainstorm artifact interactively and run the review gate on `brainstorm.md` once it is written. After that gate is approved it SHALL create each remaining artifact up to the schema's apply requirement (`plan`) without asking the user, asking only when required input is missing, and then run one final review gate over the remaining artifacts. It MUST NOT start apply and MUST end by pointing to `/opsx-apply` only after the final gate is approved.

#### Scenario: Reaches plan and gates
- **WHEN** `/opsx-ff <name>` runs and the brainstorm is approved
- **THEN** `plan.md` exists, the final review gate has run, no apply artifact exists, and the final message points to `/opsx-apply`

#### Scenario: Brainstorm gate first
- **WHEN** `/opsx-ff <name>` writes `brainstorm.md`
- **THEN** the review gate runs on that file before `proposal.md` is created

#### Scenario: Final gate blocks apply pointer
- **WHEN** the final gate outcome is `changes_requested`
- **THEN** the artifacts are revised and the gate is opened again before the skill points to `/opsx-apply`

### Requirement: Explore writes no code
The `opsx-explore` skill SHALL provide free-form thinking and MUST NOT create or modify implementation code, schemas, templates or `config.yaml`; it MAY read files and offer to capture insights, writing only after the user names the scope and agrees.

#### Scenario: No implementation
- **WHEN** `/opsx-explore` is used to discuss an idea
- **THEN** no source files are changed

#### Scenario: Consent before writing
- **WHEN** the agent wants to capture an insight into a change artifact
- **THEN** it names the file and scope and writes only after the user agrees, unless the user asked for the capture

#### Scenario: Schema edits refused
- **WHEN** the user asks explore to edit a schema, a template or `config.yaml`
- **THEN** the skill treats it as implementing and points to creating a change

#### Scenario: Scaffold and hand off
- **WHEN** an insight needs a new change
- **THEN** the skill may run `openspec new change <name>`, never creates `openspec/changes/` by hand, and points to `/opsx-continue <name>` without writing `brainstorm.md` or running a review gate

#### Scenario: Plain diagrams
- **WHEN** explore draws a diagram
- **THEN** it uses ASCII characters only

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

### Requirement: Fast-forward grounds and reports
The `opsx-ff` skill SHALL read the relevant repository code, tests and docs before drafting the unattended artifacts, and SHALL list each artifact it skipped with the reason in its final summary. It MUST create `design` and MUST NOT skip it even though its instruction calls it optional.

#### Scenario: Grounded tasks
- **WHEN** ff drafts `tasks.md`
- **THEN** the tasks reference files or tests found in the repository, not a generic "explore the codebase" step

#### Scenario: Design always created
- **WHEN** ff reaches `design`
- **THEN** it writes `design.md` and the final gate packet still lists it

#### Scenario: Skipped artifact reported
- **WHEN** status reports another artifact as `skipped`
- **THEN** the final summary names it and why

### Requirement: Bounded planning reconnaissance
The explore, continue, and ff skills SHALL support an agent meeting the scout role through the shared integration reference when repository reconnaissance materially helps exploration or brainstorming. Small conceptual work SHALL remain inline. The parent MUST retain the user conversation and artifact ownership; a scout MUST NOT bypass explore's no-code/no-schema boundary or create brainstorm/plan artifacts.

#### Scenario: Explore with repository recon
- **WHEN** explore needs a non-trivial repository investigation and a subagent plugin is detected
- **THEN** the parent can dispatch an evidence-only scout with bounded paths and keep code, schema, and official artifacts unchanged

#### Scenario: Small conceptual question
- **WHEN** exploration can be answered without a useful independent repository investigation
- **THEN** the parent works inline rather than dispatching solely because agents exist

### Requirement: Internal spec and plan review seats
Continue and ff SHALL use an agent meeting the spec reviewer role for completed specs and an agent meeting the plan reviewer role for the completed plan through the shared integration policy, or perform the checks inline when the integration is absent. They MUST resolve substantive findings and re-review substantive revisions before the existing human gate, without adding approvals or replacing human authority. An internal review verdict MUST NOT advance continue to the next artifact; only the human gate's approval does.

#### Scenario: Continue reviews one artifact
- **WHEN** continue completes all files of a specs artifact or the plan artifact
- **THEN** the corresponding specialist checks that artifact before its human gate, and only the human approval lets continue advance

#### Scenario: Fast-forward retains two planned stops
- **WHEN** ff creates specs and plan after brainstorm approval
- **THEN** their internal reviews occur before the existing final packet gate without introducing another human approval stop

#### Scenario: Planning review without subagents
- **WHEN** the optional integration is absent during planning
- **THEN** the parent checks spec/plan quality inline and preserves the existing review-gate order and outcomes

### Requirement: Spec review receives the baseline
When continue or ff runs the internal spec review, the handoff SHALL include, besides the delta specs and their dependencies, the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename. A modified capability without a main spec MUST be named in the handoff as having no baseline. The inline self-check used when the integration is absent SHALL compare the deltas with the same main specs.

#### Scenario: Continue passes main specs
- **WHEN** continue dispatches the spec reviewer for a specs artifact with a `MODIFIED` delta
- **THEN** the skill text directs it to include the main spec of that capability in the handoff

#### Scenario: Fast-forward passes main specs
- **WHEN** ff dispatches the spec reviewer after specs are complete
- **THEN** the skill text directs it to include the main specs of the modified capabilities in the handoff

#### Scenario: Inline check uses the baseline
- **WHEN** the optional integration is absent
- **THEN** the skill text directs the inline self-check to compare the deltas with the same main specs
