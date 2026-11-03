## ADDED Requirements

### Requirement: Command and skill pairs
The package SHALL provide `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff`, each as a skill `skills/<name>/SKILL.md` whose frontmatter `name` equals its directory name, and a prompt `prompts/<name>.md`. Each prompt MUST instruct the agent to read the matching `SKILL.md`, follow it, and treat `$@` as the user input, and MUST NOT carry the command logic itself.

#### Scenario: Pairs exist
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** all four skills and all four prompts exist with matching names

#### Scenario: Prompt delegates to skill
- **WHEN** a prompt file is read
- **THEN** it names its skill, references `$@`, and contains no step-by-step command logic

### Requirement: No Claude tool names
Skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite` or `Task tool`. Where the OpenSpec source skill asked the user, tracked todos, or loaded a skill, the text MUST use the `rpiv-ask-user-question` tool, the `rpiv-todo` tool, or reading `SKILL.md`, each with a plain-text fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** all files under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite` and `Task tool`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** the ask tool is unavailable and a decision is needed
- **THEN** the skill directs the agent to ask in plain text with numbered options, recommended first, and wait

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

### Requirement: Continue creates one artifact
The `opsx-continue` skill SHALL create exactly the next ready artifact and then stop for review. When no change name is given and several changes exist, it MUST ask the user to choose.

#### Scenario: Brainstorm then proposal
- **WHEN** `/opsx-continue` runs on a new change twice, approving in between
- **THEN** `brainstorm.md` exists after the first run and `proposal.md` after the second

### Requirement: Fast-forward interaction boundary
The `opsx-ff` skill SHALL run the brainstorm artifact interactively, then create each remaining artifact up to the schema's apply requirement (`plan`) without asking the user, asking only when required input is missing. It MUST NOT start apply and MUST end by pointing to `/opsx-apply`.

#### Scenario: Reaches plan and stops
- **WHEN** `/opsx-ff <name>` runs and the brainstorm is approved
- **THEN** `plan.md` exists, no apply artifact exists, and the final message points to `/opsx-apply`

### Requirement: Explore writes no code
The `opsx-explore` skill SHALL provide free-form thinking and MUST NOT create or modify implementation code; it MAY read files and offer to capture insights into change artifacts.

#### Scenario: No implementation
- **WHEN** `/opsx-explore` is used to discuss an idea
- **THEN** no source files are changed
