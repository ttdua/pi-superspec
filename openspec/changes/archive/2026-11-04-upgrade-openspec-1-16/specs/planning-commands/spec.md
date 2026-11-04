## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Continue completes partial artifacts
The `opsx-continue` skill SHALL, for an artifact that spans several files such as `specs`, compare the files the proposal calls for with `existingOutputPaths` and write only the missing ones as that call's one artifact, then run the review gate. It SHALL treat `isPlanningComplete` (falling back to `isComplete`) as the end of planning and a `skipped` artifact as satisfied.

#### Scenario: Interrupted specs
- **WHEN** `specs` is `done` but a capability in the proposal has no spec file
- **THEN** `/opsx-continue` writes that spec file, runs the gate on it, and stops

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
