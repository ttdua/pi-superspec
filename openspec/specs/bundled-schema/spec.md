# bundled-schema Specification

## Purpose
Define the bundled `superspec` OpenSpec schema shipped in `schema/superspec/`: identity and marker, artifact DAG, apply, verify and finalize rules, and harness-neutral wording.

## Requirements

### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 8`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `8` and `x-pi-superspec.version` is `8`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

#### Scenario: No artifact ID changes
- **WHEN** the version 8 schema is compared with version 7
- **THEN** every artifact ID of version 7 still exists, so no migration step is needed

### Requirement: Artifact DAG
The schema SHALL define exactly the artifacts `brainstorm`, `proposal`, `design`, `specs`, `tasks`, `plan`, `apply`, `verify` and `finalize`, with the `requires` relations in the Artifact table of `docs/domain-model.md`. `design` MUST require only `brainstorm` and no artifact MAY require `design`. Each artifact SHALL have a template in `templates/`.

#### Scenario: DAG matches docs
- **WHEN** the artifact IDs and `requires` are read from `openspec status --json` in a temp project and compared with the table parsed from `docs/domain-model.md`
- **THEN** they are identical

#### Scenario: Templates present
- **WHEN** each artifact's `template` is resolved
- **THEN** the file exists under `schema/superspec/templates/`

### Requirement: Design stub
The `design` instruction SHALL tell the author to write a two-line `design.md` beginning `No design needed:` with the reason when the change has no non-trivial technical decision. The `design` instruction and `templates/design.md` SHALL also tell the author to record the decision and reason for any `public` contract and to leave its full shape to `plan.md`.

#### Scenario: Stub instruction
- **WHEN** the `design` instruction is read
- **THEN** it contains the `No design needed:` stub text

#### Scenario: Contract hint
- **WHEN** the `design` instruction and `templates/design.md` are read
- **THEN** each says that a `public` contract's decision and reason belong in the design and its shape belongs in `plan.md`

### Requirement: Harness-neutral wording
Schema and template text SHALL NOT contain pi-specific tool names or Claude Code-only tool names, and SHALL spell commands as `/opsx-<name>`.

#### Scenario: No tool names
- **WHEN** `schema.yaml` and `templates/*.md` are searched for `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool`, and `/opsx:`
- **THEN** no match is found

### Requirement: Apply block
The `apply` block SHALL require `plan` and track `tasks.md`. Step 0 SHALL commit the change directory on the feature branch and create a worktree whose branch is `<change-name>`. It SHALL declare the worktree copy of the change directory authoritative from then until finalize. It MUST end after the final whole-branch review by writing `apply.md`, and MUST NOT invoke `finishing-a-development-branch`. The `executing-plans` fallback SHALL still request a whole-branch review before `apply.md`. The block SHALL direct the executor to follow the plan's Contracts per task: declarations or stubs that match the Contracts first, then the typecheck when the language has one, then the failing test, then the implementation. When the work needs a contract shape that differs from the plan, the executor MUST stop: a `public` contract goes to the user for a decision; an internal contract is updated in `plan.md` with the reason and recorded in `apply.md` under "Contract deviations".

#### Scenario: Apply block returned
- **WHEN** `openspec instructions apply --change x --json` runs in a temp project
- **THEN** the result contains the apply instruction text

#### Scenario: Apply stops before finishing
- **WHEN** the apply instruction is read
- **THEN** it states that apply stops after the final review and does not invoke `finishing-a-development-branch`

#### Scenario: Worktree branch and authority
- **WHEN** the apply instruction is read
- **THEN** it names the worktree branch `<change-name>` and states the worktree copy is authoritative until finalize

#### Scenario: Per-task contract order
- **WHEN** the apply instruction is read
- **THEN** it orders each task as declarations matching Contracts, typecheck where available, failing test, implementation, and does not make types-first a project-wide phase

#### Scenario: Public contract change
- **WHEN** the apply instruction is read
- **THEN** it tells the executor to stop and ask the user before changing a `public` contract

#### Scenario: Internal contract change
- **WHEN** the apply instruction is read
- **THEN** it tells the executor to update `plan.md` with the reason and record the change in `apply.md` under "Contract deviations"

### Requirement: Apply receipt branch facts
The `apply.md` template SHALL record the worktree path, worktree branch, feature branch, base branch, commit range, iteration, executor and tasks done of total. It SHALL also have a "Contract deviations" section that lists each contract changed during apply with its reason, or `none`, and a `## Lanes` section that lists, per task, its ID, lane branch or `sequential`, lane commit range, task review verdict and merge commit.

#### Scenario: Template fields
- **WHEN** `templates/apply.md` is read
- **THEN** it has a field for each of those facts

#### Scenario: Deviations section
- **WHEN** `templates/apply.md` is read
- **THEN** it has a "Contract deviations" section that allows `none`

#### Scenario: Lanes section
- **WHEN** `templates/apply.md` is read
- **THEN** it has a `## Lanes` section with columns for task, lane branch, lane range, review verdict and merge commit

### Requirement: Single verify check list
The `verify` instruction and template SHALL use one check list: `openspec validate <change>` passes; tasks ticked or reasoned; requirement evidence; scenario-to-test mapping with a fresh test run; design and contract coherence (warning only), which compares the `design.md` decisions and the `plan.md` Contracts, including the recorded deviations, with the code; clean working tree with commit range. Outcomes SHALL be `PASS`, `PASS_WITH_WARNINGS` or `FAIL`, and the loop SHALL stop after 5 iterations. The delta spec sync check MUST NOT be part of verify and SHALL be deferred to archive. A contract that cannot be compared with the code MUST be recorded as not verified.

#### Scenario: Six checks
- **WHEN** the verify instruction and template are read
- **THEN** each lists the six checks and neither lists a delta spec sync check

#### Scenario: Contract coherence in check 5
- **WHEN** the verify instruction and template are read
- **THEN** check 5 names both `design.md` decisions and `plan.md` Contracts, and states that a mismatch is a warning

#### Scenario: Uncomparable contract
- **WHEN** a Contracts entry cannot be compared with the code
- **THEN** the verify text directs the author to record it as not verified with a reason

#### Scenario: Sync deferred
- **WHEN** the verify or finalize text mentions delta spec sync
- **THEN** it states that `/opsx-archive` performs it

### Requirement: Finalize reads apply receipt
The `finalize` instruction SHALL locate the worktree with `git worktree list --porcelain` filtered on `branch refs/heads/<change-name>` and ask the user when none is found. It SHALL read worktree path, feature branch and base branch from that worktree's `apply.md` rather than inferring them from `git log`. It SHALL state that a policy in the project's `AGENTS.md` overrides any step.

#### Scenario: Branch facts source
- **WHEN** the finalize instruction is read
- **THEN** it reads branch facts from `apply.md` and contains no `git log` branch-detection command

#### Scenario: AGENTS.md override
- **WHEN** the finalize instruction is read
- **THEN** it states that `AGENTS.md` policy overrides any step

### Requirement: Brainstorm approves the file
The `brainstorm` artifact instruction SHALL direct the agent to write the design to `brainstorm.md` first and to have the reviewer approve that file before returning to the OpenSpec flow. It MUST NOT name any review tool.

#### Scenario: Order of steps
- **WHEN** the `brainstorm` instruction in `schema.yaml` is read
- **THEN** writing `brainstorm.md` comes before the approval of the file, and the approval comes before the proposal step

#### Scenario: Tool-neutral
- **WHEN** the `brainstorm` instruction is searched for `plannotator`, `AskUserQuestion` and `ask_user_question`
- **THEN** no match is found

### Requirement: Finalize requires code review
The `finalize` artifact instruction SHALL direct the agent to obtain the reviewer's approval of the code changes after the in-worktree test run and before the feature branch is checked out, and to record the outcome in `finalize.md`. It MUST NOT name any review tool, and `templates/finalize.md` MUST include a code review line.

#### Scenario: Step order
- **WHEN** the `finalize` instruction in `schema.yaml` is read
- **THEN** the code review approval comes after the worktree test step and before the checkout of the feature branch

#### Scenario: Tool-neutral
- **WHEN** the `finalize` instruction is searched for `plannotator`, `AskUserQuestion` and `ask_user_question`
- **THEN** no match is found

#### Scenario: Template line
- **WHEN** `templates/finalize.md` is read
- **THEN** it contains a code review line

### Requirement: Verify evidence follows the delta operation
The `verify` instruction SHALL check each delta requirement according to its operation: ADDED and MODIFIED need implementation evidence, REMOVED needs evidence that the baseline behavior is gone, and RENAMED needs the behavior kept under the new name. Scenarios under a REMOVED requirement MUST be skipped.

#### Scenario: Removed requirement
- **WHEN** a change removes a requirement and the code no longer implements it
- **THEN** the requirement-evidence check passes and is not reported as "no implementation found"

#### Scenario: Removed requirement still implemented
- **WHEN** a change removes a requirement and code for its baseline behavior remains
- **THEN** the requirement-evidence check reports a failure for that requirement

#### Scenario: Baseline source
- **WHEN** the check needs the text of a removed requirement
- **THEN** the instruction tells the agent to read it from the main spec and to fall back to git history, and to report the check as not verified if neither yields it

#### Scenario: Renamed requirement
- **WHEN** a change renames a requirement
- **THEN** the check looks for the behavior under the new name and does not require the old name to be absent from code

### Requirement: Skipped checks never pass
The `verify` instruction and template SHALL record a check that could not run as "not verified" with its reason, and MUST NOT score it as passing. A verify run with a not-verified check SHALL have outcome `PASS_WITH_WARNINGS` at best.

#### Scenario: Check skipped
- **WHEN** a verify check cannot run
- **THEN** `verify.md` lists it as not verified with the reason and the outcome is not `PASS`

#### Scenario: Not applicable
- **WHEN** a check does not apply to the change, such as scenario mapping on a removal-only change
- **THEN** it is recorded as not applicable and does not lower the outcome

### Requirement: Plan contracts section
The `plan` instruction and `templates/plan.md` SHALL require a `## Contracts` section placed before the first task. Each entry MUST give a name, whether it is `new` or `modified`, the exact shape (type, schema, signature, CLI arguments, config key or file format) and a `public` flag. A change that declares nothing MUST write `None` followed by a reason, so that an absent section is never read as "no contracts". Per-task `Interfaces` blocks SHALL refer to entries by name instead of restating their shape. The wording MUST be language-neutral.

#### Scenario: Template has the section
- **WHEN** `templates/plan.md` is read
- **THEN** it contains a `## Contracts` heading before `## Task 1` with fields for name, `new` or `modified`, shape and `public`

#### Scenario: Instruction requires the section
- **WHEN** the `plan` instruction is read
- **THEN** it requires the Contracts section, allows `None` only with a reason, and tells per-task `Interfaces` blocks to refer to contract names

#### Scenario: Language-neutral wording
- **WHEN** the Contracts text in the plan instruction and template is read
- **THEN** it names types, schemas, signatures, CLI arguments, config and file formats and does not assume TypeScript

### Requirement: Brainstorm reads the baseline specs
The `brainstorm` instruction SHALL tell the agent to read the living spec under `openspec/specs/` of each capability the change plausibly touches and to cite the existing requirements involved. It MUST tell the agent to state explicitly when a specified requirement is changed on purpose instead of re-deciding it silently. The wording MUST name no review or ask tool.

#### Scenario: Brainstorm cites touched requirements
- **WHEN** the `brainstorm` instruction is read
- **THEN** it tells the agent to read the living specs of the capabilities the change touches and cite the requirements involved

#### Scenario: Deliberate change stated
- **WHEN** the `brainstorm` instruction is read
- **THEN** it tells the agent to state a deliberate change of a specified requirement explicitly

#### Scenario: Brainstorm baseline rule is tool-neutral
- **WHEN** the `brainstorm` instruction is searched for `plannotator`, `AskUserQuestion` and `ask_user_question`
- **THEN** no match is found

### Requirement: Proposal confirms modified capabilities
The `proposal` instruction SHALL tell the agent to list a capability under Modified Capabilities only after confirming in its living spec under `openspec/specs/` that existing requirements change.

#### Scenario: Proposal checks the living spec
- **WHEN** the `proposal` instruction is read
- **THEN** it tells the agent to confirm in the living spec that a Modified Capability's existing requirements change

### Requirement: Delta specs start from the baseline
The `specs` instruction SHALL tell the agent to start every `MODIFIED` requirement from the full current block copied from `openspec/specs/<capability>/spec.md` and then edit it. It MUST require `MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers to match the main spec header exactly. It MUST require any scenario dropped from a `MODIFIED` block to be named as intentional in the requirement text or the proposal.

#### Scenario: Modified block starts from the baseline
- **WHEN** the `specs` instruction is read
- **THEN** it tells the agent to copy the full current requirement block from `openspec/specs/<capability>/spec.md` before editing a `MODIFIED` requirement

#### Scenario: Headers match exactly
- **WHEN** the `specs` instruction is read
- **THEN** it requires `MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers to match the main spec header exactly

#### Scenario: Dropped scenario is visible
- **WHEN** the `specs` instruction is read
- **THEN** it requires a scenario dropped from a `MODIFIED` block to be named as intentional in the requirement text or the proposal

### Requirement: Task groups are the unit of work
The `tasks` instruction SHALL state that one task group (`## N. <name>`) is the unit handed to one agent, that its checkboxes are done in order by that agent, and that work which should run independently MUST be its own group rather than a checkbox in another group.

#### Scenario: Instruction states the unit
- **WHEN** the `tasks` instruction is read
- **THEN** it says a group is the unit given to one agent and that independent work becomes its own group

### Requirement: Task dependencies in tasks.md
The `tasks` instruction and `templates/tasks.md` SHALL require, directly under every group heading, one line `Blocked by: none` or `Blocked by: <groups>`, where `<groups>` lists group numbers separated by commas. Dependencies MUST NOT name individual checkboxes. The line MUST NOT be a checkbox, so task progress parsing is unchanged. Groups SHALL still be ordered by dependency.

#### Scenario: Template shows the line
- **WHEN** `templates/tasks.md` is read
- **THEN** every example group heading is followed by a `Blocked by:` line and no checkbox carries one

#### Scenario: Group references only
- **WHEN** the `tasks` instruction is read
- **THEN** it allows only group numbers in `Blocked by`

#### Scenario: Progress unaffected
- **WHEN** a `tasks.md` written to the template is parsed for checkbox progress in a temp project
- **THEN** only the task checkboxes are counted

### Requirement: Plan task difficulty and dependencies
The `plan` instruction and `templates/plan.md` SHALL require each plan `## Task N` to implement exactly `tasks.md` group N and to list the checkboxes it covers, and SHALL require every plan task to carry `**Difficulty:**` with one of `Easy`, `Normal`, `Hard`, `Very Hard`, and `**Blocked by:**` with `none` or a list of plan task references. The instruction SHALL say the metadata is used to choose task order, parallel execution, agent and effort. The wording MUST be harness-neutral.

#### Scenario: Template has the fields
- **WHEN** `templates/plan.md` is read
- **THEN** its task block names the group it implements and contains `**Difficulty:**` and `**Blocked by:**`

#### Scenario: Instruction requires the fields
- **WHEN** the `plan` instruction is read
- **THEN** it requires both fields per task and lists the four difficulty values

#### Scenario: Harness-neutral metadata text
- **WHEN** the metadata text in the tasks and plan instructions and templates is searched for plugin or tool names
- **THEN** none is found

### Requirement: Plan dependencies refine tasks.md
The `plan` instruction SHALL require the plan's dependencies to include every dependency `tasks.md` states for the tasks it implements, unless the plan states a reason for dropping it. A plan MAY add dependencies.

#### Scenario: Dropped dependency needs a reason
- **WHEN** the `plan` instruction is read
- **THEN** it requires carrying over the `tasks.md` dependencies and allows dropping one only with a stated reason

#### Scenario: Dropped without a reason
- **WHEN** a plan omits a `tasks.md` dependency and states no reason
- **THEN** the plan instruction's rule is violated and the plan reviewer reports it

### Requirement: Apply runs unblocked tasks in parallel
The `apply` instruction SHALL say that plan tasks (one task group each) whose dependencies are all merged and whose files do not overlap MAY run at the same time, each writer in its own worktree branched from `<change-name>` and merged back after its task review passes, and that a plan without dependency metadata runs tasks one after another. The wording MUST be harness-neutral.

#### Scenario: Parallel rule present
- **WHEN** the apply instruction is read
- **THEN** it states the readiness rule, one writer per worktree, merge after review, and the sequential default for plans without metadata
