## ADDED Requirements

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
