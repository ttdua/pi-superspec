# bundled-schema Specification

## Purpose
Define the bundled `superspec` OpenSpec schema v5 shipped in `schema/superspec/`: identity and marker, artifact DAG, apply, verify and finalize rules, and harness-neutral wording.
## Requirements
### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 5`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `5` and `x-pi-superspec.version` is `5`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

### Requirement: Artifact DAG
The schema SHALL define exactly the artifacts `brainstorm`, `proposal`, `design`, `specs`, `tasks`, `plan`, `apply`, `verify` and `finalize`, with the `requires` relations in the Artifact table of `docs/domain-model.md`. `design` MUST require only `brainstorm` and no artifact MAY require `design`. Each artifact SHALL have a template in `templates/`.

#### Scenario: DAG matches docs
- **WHEN** the artifact IDs and `requires` are read from `openspec status --json` in a temp project and compared with the table parsed from `docs/domain-model.md`
- **THEN** they are identical

#### Scenario: Templates present
- **WHEN** each artifact's `template` is resolved
- **THEN** the file exists under `schema/superspec/templates/`

### Requirement: Design stub
The `design` instruction SHALL tell the author to write a two-line `design.md` beginning `No design needed:` with the reason when the change has no non-trivial technical decision.

#### Scenario: Stub instruction
- **WHEN** the `design` instruction is read
- **THEN** it contains the `No design needed:` stub text

### Requirement: Harness-neutral wording
Schema and template text SHALL NOT contain pi-specific tool names or Claude Code-only tool names, and SHALL spell commands as `/opsx-<name>`.

#### Scenario: No tool names
- **WHEN** `schema.yaml` and `templates/*.md` are searched for `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool`, and `/opsx:`
- **THEN** no match is found

### Requirement: Apply block
The `apply` block SHALL require `plan` and track `tasks.md`. Step 0 SHALL commit the change directory on the feature branch and create a worktree whose branch is `<change-name>`. It SHALL declare the worktree copy of the change directory authoritative from then until finalize. It MUST end after the final whole-branch review by writing `apply.md`, and MUST NOT invoke `finishing-a-development-branch`. The `executing-plans` fallback SHALL still request a whole-branch review before `apply.md`.

#### Scenario: Apply block returned
- **WHEN** `openspec instructions apply --change x --json` runs in a temp project
- **THEN** the result contains the apply instruction text

#### Scenario: Apply stops before finishing
- **WHEN** the apply instruction is read
- **THEN** it states that apply stops after the final review and does not invoke `finishing-a-development-branch`

#### Scenario: Worktree branch and authority
- **WHEN** the apply instruction is read
- **THEN** it names the worktree branch `<change-name>` and states the worktree copy is authoritative until finalize

### Requirement: Apply receipt branch facts
The `apply.md` template SHALL record the worktree path, worktree branch, feature branch, base branch, commit range, iteration, executor and tasks done of total.

#### Scenario: Template fields
- **WHEN** `templates/apply.md` is read
- **THEN** it has a field for each of those facts

### Requirement: Single verify check list
The `verify` instruction and template SHALL use one check list: `openspec validate <change>` passes; tasks ticked or reasoned; requirement evidence; scenario-to-test mapping with a fresh test run; design coherence (warning only); clean working tree with commit range. Outcomes SHALL be `PASS`, `PASS_WITH_WARNINGS` or `FAIL`, and the loop SHALL stop after 5 iterations. The delta spec sync check MUST NOT be part of verify and SHALL be deferred to archive.

#### Scenario: Six checks
- **WHEN** the verify instruction and template are read
- **THEN** each lists the six checks and neither lists a delta spec sync check

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
