# bundled-schema Specification

## Purpose
Define the bundled `superspec` OpenSpec schema (currently v6) shipped in `schema/superspec/`: identity and marker, artifact DAG, apply, verify and finalize rules, and harness-neutral wording.

## Requirements

### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 6`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `6` and `x-pi-superspec.version` is `6`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

#### Scenario: No artifact ID changes
- **WHEN** the version 6 schema is compared with version 5
- **THEN** every artifact ID of version 5 still exists, so no migration step is needed

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
The `apply.md` template SHALL record the worktree path, worktree branch, feature branch, base branch, commit range, iteration, executor and tasks done of total. It SHALL also have a "Contract deviations" section that lists each contract changed during apply with its reason, or `none`.

#### Scenario: Template fields
- **WHEN** `templates/apply.md` is read
- **THEN** it has a field for each of those facts

#### Scenario: Deviations section
- **WHEN** `templates/apply.md` is read
- **THEN** it has a "Contract deviations" section that allows `none`

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
