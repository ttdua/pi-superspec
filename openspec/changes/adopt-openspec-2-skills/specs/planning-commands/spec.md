## ADDED Requirements

### Requirement: Planning commands run stock skills
The package SHALL provide the explore, new, continue and ff prompts and MUST NOT ship a skill for them. Each prompt SHALL tell the agent to read the stock skill it maps to (`openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`) and its section of `openspec/schemas/superspec/workflow.md`, with `workflow.md` winning where they differ, and to treat `$@` as the user input. A prompt MUST NOT carry the command logic itself.

#### Scenario: Prompts exist without package skills
- **WHEN** `prompts/` and `skills/` are listed
- **THEN** the four planning prompts exist and no `skills/opsx-explore`, `skills/opsx-new`, `skills/opsx-continue` or `skills/opsx-ff` directory exists

#### Scenario: Mapped stock skill missing
- **WHEN** a planning prompt runs and its stock skill is not in the available skills list
- **THEN** the prompt directs the agent to name the missing skill, point to `openspec config profile` and `openspec update` (or `/opsx-init`), and stop without scaffolding, writing an artifact or doing the work another way

#### Scenario: Prompt maps to its stock skill
- **WHEN** `prompts/opsx-ff.md` is read
- **THEN** it names `openspec-ff-change` and `openspec/schemas/superspec/workflow.md`, states that `workflow.md` wins on conflict, references `$@`, and contains no step-by-step logic

### Requirement: Planning rules live in workflow.md
`schema/superspec/workflow.md` SHALL hold, in one section per planning command, every planning rule the stock skills do not enforce. Its text MUST NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. It MUST direct questions to the Interaction channel paragraph, delegation to the Subagent integration paragraph, and progress tracking to the `todo` tool with a plain checklist fallback.

#### Scenario: Sections present
- **WHEN** `schema/superspec/workflow.md` is read
- **THEN** it has a section for each of explore, new, continue and ff

#### Scenario: Forbidden names absent
- **WHEN** `schema/superspec/workflow.md` is searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Questions defer to the channel
- **WHEN** a planning rule needs a decision from the user
- **THEN** `workflow.md` directs the agent to ask as the Interaction channel paragraph describes

#### Scenario: Progress tracking fallback
- **WHEN** `workflow.md` describes tracking progress through artifacts or tasks
- **THEN** it names the `todo` tool and the plain checklist in the reply as the fallback, and `tasks.md` stays the official status

#### Scenario: Explore overrides the stock hand-off
- **WHEN** the explore section of `workflow.md` is read
- **THEN** it tells the agent to point to `/opsx-continue <name>` after scaffolding, not to `openspec-propose`

## MODIFIED Requirements

### Requirement: Superpowers-backed artifacts
When an artifact instruction names `superpowers:<x>`, `/opsx-continue` and `/opsx-ff` SHALL direct the agent to drop the prefix, read the SKILL.md of skill `<x>`, follow it, write output only where the instruction says, and ignore that skill's own closing handoff. If skill `<x>` is not available the agent MUST stop and tell the user to install Superpowers.

#### Scenario: Brainstorm redirected
- **WHEN** the brainstorm artifact instruction names `superpowers:brainstorming`
- **THEN** the agent reads the `brainstorming` skill and writes `brainstorm.md` in the change directory, not under `docs/superpowers/`

#### Scenario: Skill missing
- **WHEN** the named Superpowers skill cannot be found
- **THEN** the agent stops and reports that Superpowers must be installed

### Requirement: New change creation
`/opsx-new` SHALL create a change with `openspec new change <name>` without passing `--schema`, show its status and the first artifact's instructions, and stop without creating any artifact. If the change already exists it MUST suggest continuing it.

#### Scenario: Change created and stopped
- **WHEN** `/opsx-new <name>` runs in an activated project
- **THEN** the change directory exists, no artifact file exists, and the agent waits for direction

#### Scenario: Name exists
- **WHEN** `/opsx-new` names an existing change
- **THEN** the agent suggests `/opsx-continue` instead of creating it

### Requirement: Continue advances after approval
`/opsx-continue` SHALL create exactly the next ready artifact and run the review gate on that artifact's file(s). When the outcome is `approved`, or `approved_with_notes` handled per the gate, it SHALL re-read the change status and, if planning is not complete and the next ready artifact is not `apply`, create that artifact and run its gate in the same way, without a new command. It MUST stop when planning is complete or the next artifact is `apply`, and then point to `/opsx-apply`. It MUST NOT create an `apply` artifact, run `/opsx-apply`, or continue after `changes_requested` (before the revised gate is approved) or `dismissed`. When planning is already complete at invocation, it SHALL create nothing except a `finalize` artifact that is ready after verify, and otherwise point to `/opsx-apply`. When no change name is given and several changes exist, it MUST ask the user to choose.

#### Scenario: Brainstorm then proposal
- **WHEN** `/opsx-continue` creates `brainstorm.md` and the reviewer approves it
- **THEN** the agent creates `proposal.md` and opens its gate without a new command

#### Scenario: Gate before stop
- **WHEN** `/opsx-continue` creates an artifact
- **THEN** the review gate runs on that file before the next artifact is created

#### Scenario: Approval does not advance
- **WHEN** the reviewer approves `plan.md`, the last planning artifact before `apply`
- **THEN** no apply artifact is created, `/opsx-apply` is not run, and the agent points to `/opsx-apply`

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
- **THEN** the agent creates nothing and points to `/opsx-apply`

#### Scenario: Planning completes mid-loop
- **WHEN** an approval leaves `isPlanningComplete` true
- **THEN** the agent stops and points to `/opsx-apply`

### Requirement: Fast-forward interaction boundary
`/opsx-ff` SHALL run the brainstorm artifact interactively and run the review gate on `brainstorm.md` once it is written. After that gate is approved it SHALL create each remaining artifact up to the schema's apply requirement (`plan`) without asking the user, asking only when required input is missing, and then run one final review gate over the remaining artifacts. It MUST NOT start apply and MUST end by pointing to `/opsx-apply` only after the final gate is approved.

#### Scenario: Reaches plan and gates
- **WHEN** `/opsx-ff <name>` runs and the brainstorm is approved
- **THEN** `plan.md` exists, the final review gate has run, no apply artifact exists, and the final message points to `/opsx-apply`

#### Scenario: Brainstorm gate first
- **WHEN** `/opsx-ff <name>` writes `brainstorm.md`
- **THEN** the review gate runs on that file before `proposal.md` is created

#### Scenario: Final gate blocks apply pointer
- **WHEN** the final gate outcome is `changes_requested`
- **THEN** the artifacts are revised and the gate is opened again before the agent points to `/opsx-apply`

### Requirement: Explore writes no code
`/opsx-explore` SHALL provide free-form thinking and MUST NOT create or modify implementation code, schemas, templates or `config.yaml`; it MAY read files and offer to capture insights, writing only after the user names the scope and agrees.

#### Scenario: No implementation
- **WHEN** `/opsx-explore` is used to discuss an idea
- **THEN** no source files are changed

#### Scenario: Consent before writing
- **WHEN** the agent wants to capture an insight into a change artifact
- **THEN** the agent names the file and scope and writes only after the user agrees, unless the user asked for the capture

#### Scenario: Schema edits refused
- **WHEN** the user asks explore to edit a schema, a template or `config.yaml`
- **THEN** the agent treats it as implementing and points to creating a change

#### Scenario: Scaffold and hand off
- **WHEN** an insight needs a new change
- **THEN** the agent may run `openspec new change <name>`, never creates `openspec/changes/` by hand, and points to `/opsx-continue <name>` without writing `brainstorm.md` or running a review gate

#### Scenario: Plain diagrams
- **WHEN** explore draws a diagram
- **THEN** the agent uses ASCII characters only

### Requirement: Continue completes partial artifacts
`/opsx-continue` SHALL, for an artifact that spans several files such as `specs`, compare the files the proposal calls for with `existingOutputPaths` and write only the missing ones as that step's artifact, then run the review gate and, after approval, continue as "Continue advances after approval" states. It SHALL treat `isPlanningComplete` (falling back to `isComplete`) as the end of planning and a `skipped` artifact as satisfied.

#### Scenario: Interrupted specs
- **WHEN** `specs` is `done` but a capability in the proposal has no spec file
- **THEN** `/opsx-continue` writes that spec file, runs the gate on it, and after approval continues with the next planning artifact

#### Scenario: Planning complete
- **WHEN** `isPlanningComplete` is true
- **THEN** the agent says planning is done and points to `/opsx-apply`

#### Scenario: Older status output
- **WHEN** the status output has no `isPlanningComplete`
- **THEN** the agent uses `isComplete`

#### Scenario: Dependencies re-read
- **WHEN** the agent creates an artifact
- **THEN** the agent reads every dependency file from disk first

### Requirement: Fast-forward grounds and reports
`/opsx-ff` SHALL read the relevant repository code, tests and docs before drafting the unattended artifacts, and SHALL list each artifact it skipped with the reason in its final summary. It MUST create `design` and MUST NOT skip it even though its instruction calls it optional.

#### Scenario: Grounded tasks
- **WHEN** ff drafts `tasks.md`
- **THEN** the tasks reference files or tests found in the repository, not a generic "explore the codebase" step

#### Scenario: Design always created
- **WHEN** ff reaches `design`
- **THEN** the agent writes `design.md` and the final gate packet still lists it

#### Scenario: Skipped artifact reported
- **WHEN** status reports another artifact as `skipped`
- **THEN** the final summary names it and why

### Requirement: Bounded planning reconnaissance
`/opsx-explore`, `/opsx-continue` and `/opsx-ff` SHALL support an agent meeting the scout role through the shared integration reference when repository reconnaissance materially helps exploration or brainstorming. Small conceptual work SHALL remain inline. The parent MUST retain the user conversation and artifact ownership; a scout MUST NOT bypass explore's no-code/no-schema boundary or create brainstorm/plan artifacts.

#### Scenario: Explore with repository recon
- **WHEN** explore needs a non-trivial repository investigation and a subagent plugin is detected
- **THEN** the parent can dispatch an evidence-only scout with bounded paths and keep code, schema, and official artifacts unchanged

#### Scenario: Small conceptual question
- **WHEN** exploration can be answered without a useful independent repository investigation
- **THEN** the parent works inline rather than dispatching solely because agents exist

### Requirement: Internal spec and plan review seats
`/opsx-continue` and `/opsx-ff` SHALL use an agent meeting the spec reviewer role for completed specs and an agent meeting the plan reviewer role for the completed plan through the shared integration policy, or perform the checks inline when the integration is absent. They MUST resolve substantive findings and re-review substantive revisions before the existing human gate, without adding approvals or replacing human authority. An internal review verdict MUST NOT advance continue to the next artifact; only the human gate's approval does.

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
When `/opsx-continue` or `/opsx-ff` runs the internal spec review, the handoff SHALL include, besides the delta specs and their dependencies, the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename. A modified capability without a main spec MUST be named in the handoff as having no baseline. The inline self-check used when the integration is absent SHALL compare the deltas with the same main specs.

#### Scenario: Continue passes main specs
- **WHEN** continue dispatches the spec reviewer for a specs artifact with a `MODIFIED` delta
- **THEN** `workflow.md` directs it to include the main spec of that capability in the handoff

#### Scenario: Fast-forward passes main specs
- **WHEN** ff dispatches the spec reviewer after specs are complete
- **THEN** `workflow.md` directs it to include the main specs of the modified capabilities in the handoff

#### Scenario: Inline check uses the baseline
- **WHEN** the optional integration is absent
- **THEN** `workflow.md` directs the inline self-check to compare the deltas with the same main specs


## REMOVED Requirements

### Requirement: Command and skill pairs

**Reason**: The package no longer ships planning skills; each planning command is a prompt that runs a stock OpenSpec skill under `workflow.md`.

**Migration**: Covered by "Planning commands run stock skills". Install the stock skills with OpenSpec 2.0 (`/opsx-init` runs `openspec init --tools pi`).

### Requirement: No Claude tool names

**Reason**: The package no longer owns the planning skill text; the stock skills are OpenSpec's.

**Migration**: The tool-name rule applies to `workflow.md` through "Planning rules live in workflow.md".
