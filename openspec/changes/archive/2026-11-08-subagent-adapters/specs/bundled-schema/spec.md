## MODIFIED Requirements

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

## ADDED Requirements

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
