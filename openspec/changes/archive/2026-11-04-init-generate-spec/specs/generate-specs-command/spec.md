## ADDED Requirements

### Requirement: Command and skill pair
The package SHALL provide `opsx-generate-specs` as a skill `skills/opsx-generate-specs/SKILL.md` whose frontmatter `name` is `opsx-generate-specs`, and a prompt `prompts/opsx-generate-specs.md`. The prompt MUST instruct the agent to read the matching `SKILL.md`, follow it, and treat `$@` as the user input, and MUST NOT carry the command logic itself.

#### Scenario: Pair exists
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** `skills/opsx-generate-specs/SKILL.md` and `prompts/opsx-generate-specs.md` exist and the frontmatter name matches the directory

#### Scenario: Prompt delegates to skill
- **WHEN** the prompt file is read
- **THEN** it names `opsx-generate-specs`, references `$@`, and contains no step-by-step logic

### Requirement: No Claude tool names
The skill and prompt SHALL NOT contain `AskUserQuestion`, `TodoWrite` or `Task tool`. Where a decision is needed the text MUST use the `ask_user_question` tool, and where subagents are dispatched it MUST use the `subagent` tool from `pi-subagents`, each with a plain fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** the skill and prompt are searched for `AskUserQuestion`, `TodoWrite` and `Task tool`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** the ask tool is unavailable and a decision is needed
- **THEN** the skill directs the agent to ask in plain text with numbered options, recommended first, and wait

### Requirement: Activation and project precondition
The skill SHALL run only in an activated project. When the project has no source code to scan (no files outside ignored directories), it MUST stop, say so, and create no change.

#### Scenario: Empty project
- **WHEN** the skill runs in a project whose only files are under `openspec/`, `.git` or ignored directories
- **THEN** it reports that there is no code to scan and creates no change

### Requirement: Map stage
The skill SHALL first map the codebase with one agent running a fast model when the `subagent` tool allows choosing a model, otherwise the default model. The map MUST read the directory tree, package manifests, README and entry points, skip `node_modules`, `dist`, `build`, `vendor`, `.git` and generated files, and return a list of at most 12 capability candidates, each with a kebab-case name of at least two words, a one-line purpose and the directories it covers.

#### Scenario: Candidate list shape
- **WHEN** the map stage finishes
- **THEN** every candidate has a kebab-case name of at least two words, a purpose and one or more directories, and there are at most 12 candidates

#### Scenario: Ignored directories
- **WHEN** the project contains a `node_modules` directory
- **THEN** no candidate covers it

### Requirement: Existing specs untouched
A candidate whose name matches an existing directory under `openspec/specs/` SHALL be dropped from the list and reported to the user. The skill MUST NOT modify or replace any file under `openspec/specs/`.

#### Scenario: Name collision
- **WHEN** a candidate is named `user-auth` and `openspec/specs/user-auth/` exists
- **THEN** the candidate is dropped, the user is told, and the existing spec is unchanged

### Requirement: Confirm before scouting
After the map stage and before any scout runs, the skill SHALL ask the user once to confirm the candidate list, showing each candidate with its purpose and an estimate of the work (candidate count and directories covered), and allowing the user to keep, drop or rename candidates. No scout MUST run before the user confirms. If the user cancels, no change is created.

#### Scenario: User trims the list
- **WHEN** the user drops two of five candidates
- **THEN** only the remaining three are scouted

#### Scenario: User cancels
- **WHEN** the user cancels the confirmation
- **THEN** no change directory is created and no scout runs

### Requirement: Bootstrap change
After confirmation the skill SHALL create the change `bootstrap-specs` with `openspec new change "bootstrap-specs"`. When a change with that name already exists, the skill MUST ask whether to continue it, MUST skip artifacts that are `done`, and MUST NOT overwrite them.

#### Scenario: Fresh project
- **WHEN** no change named `bootstrap-specs` exists and the user confirmed
- **THEN** `openspec/changes/bootstrap-specs/` is created

#### Scenario: Existing change
- **WHEN** `bootstrap-specs` already exists and its `proposal` is `done`
- **THEN** the user is asked whether to continue and the `proposal` file is not rewritten

### Requirement: Scout dispatch
The skill SHALL run one scout per confirmed capability. When the `subagent` tool from `pi-subagents` exists in the session, scouts MUST be dispatched as subagents, in parallel where the tool allows, on a fast model when the tool allows choosing one. Otherwise the skill MUST scout the capabilities one after another in the current session, writing each spec file before starting the next. The skill MUST NOT invent subagent calls when the tool is absent.

#### Scenario: With pi-subagents
- **WHEN** the `subagent` tool exists and three capabilities are confirmed
- **THEN** three scouts are dispatched as subagents

#### Scenario: Without pi-subagents
- **WHEN** the `subagent` tool does not exist
- **THEN** the capabilities are scouted sequentially in the current session and no subagent call is made

### Requirement: Spec output format
Each scout SHALL write `specs/<capability>/spec.md` inside the `bootstrap-specs` change, containing only a `## ADDED Requirements` section. Every requirement MUST contain `SHALL` or `MUST`, MUST have at least one `#### Scenario:` with `WHEN` and `THEN` lines, and MUST carry an `Evidence:` line naming the files, with line numbers where known, tests or documents the requirement is drawn from. A requirement supported by code alone, without a test or document that states the behaviour, MUST also carry a `Confidence: inferred` line. Requirements MUST describe observable behaviour, not module or function structure. The scout MUST read tests and documentation as well as source.

#### Scenario: Evidence on every requirement
- **WHEN** a generated spec file is read
- **THEN** every requirement has an `Evidence:` line

#### Scenario: Inferred label
- **WHEN** a requirement is drawn from source code and no test or document states it
- **THEN** it carries `Confidence: inferred`

#### Scenario: Format validates
- **WHEN** `openspec validate bootstrap-specs --strict` runs after the scouts finish
- **THEN** the generated delta specs pass, and the skill fixes the files and reruns when they do not

### Requirement: Generated document language
The skill SHALL write all generated prose in the document language from `openspec/config.yaml`, and MUST keep the keywords `SHALL`, `MUST`, `WHEN`, `THEN`, `Requirement` and `Scenario` in English.

#### Scenario: Vietnamese project
- **WHEN** `config.yaml` has `language: vi`
- **THEN** requirement text and scenario prose are Vietnamese and the keywords stay English

### Requirement: Other artifacts and hand-off
Besides the delta specs the skill SHALL write `brainstorm.md` (the map result and confirmed capability list), `proposal.md` (why, scope, excluded directories and the capability list) and `design.md` as a two-line stub beginning `No design needed:`. It MUST then stop and tell the user to run `/opsx-ff bootstrap-specs`, and MUST NOT write `tasks.md`, `plan.md` or any later artifact itself.

#### Scenario: Stops after specs
- **WHEN** the scouts have finished
- **THEN** `brainstorm.md`, `proposal.md`, `design.md` and the specs exist, `tasks.md` does not, and the final message names `/opsx-ff bootstrap-specs`

#### Scenario: Design stub
- **WHEN** `design.md` is read
- **THEN** it begins with `No design needed:`
