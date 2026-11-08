# generate-specs-command Specification

## Purpose
Define the `/opsx-generate-specs` command: the skill and prompt pair, the map, confirm and scout stages, the spec output format, the generated document language, and the hand-off to `/opsx-ff bootstrap-specs`.

## Requirements

### Requirement: Command and skill pair
The package SHALL provide `opsx-generate-specs` as a skill `skills/opsx-generate-specs/SKILL.md` whose frontmatter `name` is `opsx-generate-specs`, and a prompt `prompts/opsx-generate-specs.md`. The prompt MUST instruct the agent to read the matching `SKILL.md`, follow it, and treat `$@` as the user input, and MUST NOT carry the command logic itself.

#### Scenario: Pair exists
- **WHEN** `skills/` and `prompts/` are listed
- **THEN** `skills/opsx-generate-specs/SKILL.md` and `prompts/opsx-generate-specs.md` exist and the frontmatter name matches the directory

#### Scenario: Prompt delegates to skill
- **WHEN** the prompt file is read
- **THEN** it names `opsx-generate-specs`, references `$@`, and contains no step-by-step logic

### Requirement: No Claude tool names
The skill and prompt SHALL NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. Where a decision is needed the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes, and where subagents are dispatched it MUST direct the agent to delegate as the routing note's Subagent integration paragraph describes, with the inline path when that paragraph reports delegation unavailable. It MUST NOT name a subagent plugin, plugin tool or plugin parameter.

#### Scenario: Forbidden names absent
- **WHEN** the skill and prompt are searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** the skill asks the user to confirm the candidate list
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes, which on the `plain` channel is plain text with numbered options, recommended first, then wait

#### Scenario: Delegation through the paragraph
- **WHEN** the skill and prompt are searched for `pi-subagents`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `Agent(` and `subagent(`
- **THEN** there are no matches, and delegation steps refer to the Subagent integration paragraph

### Requirement: Activation and project precondition
The skill SHALL run only in an activated project. When the project has no source code to scan (no files outside ignored directories), it MUST stop, say so, and create no change.

#### Scenario: Empty project
- **WHEN** the skill runs in a project whose only files are under `openspec/`, `.git` or ignored directories
- **THEN** it reports that there is no code to scan and creates no change

### Requirement: Map stage
The skill SHALL first map the codebase with one agent meeting the scout role through the shared integration policy, or map it inline when the optional integration is absent. It MUST NOT set a model or thinking level per dispatch. The map MUST read the directory tree, package manifests, README and entry points, skip `node_modules`, `dist`, `build`, `vendor`, `.git` and generated files, and return a list of at most 12 capability candidates, each with a kebab-case name of at least two words, a one-line purpose and the directories it covers.

#### Scenario: Candidate list shape
- **WHEN** the map stage finishes
- **THEN** every candidate has a kebab-case name of at least two words, a purpose and one or more directories, and there are at most 12 candidates

#### Scenario: Ignored directories
- **WHEN** the project contains a `node_modules` directory
- **THEN** no candidate covers it

#### Scenario: Map respects configured model
- **WHEN** the map is delegated
- **THEN** it uses an agent meeting the scout role without a per-call model/thinking override or artifact-edit authority

### Requirement: Existing specs untouched
A candidate whose name matches an existing directory under `openspec/specs/` SHALL be dropped from the list and reported to the user. The skill MUST NOT modify or replace any file under `openspec/specs/`.

#### Scenario: Name collision
- **WHEN** a candidate is named `user-auth` and `openspec/specs/user-auth/` exists
- **THEN** the candidate is dropped, the user is told, and the existing spec is unchanged

### Requirement: Confirm before scouting
After the map stage and before any capability scout runs, the skill SHALL ask the user once to confirm the candidate list, showing each candidate with its purpose and an estimate of the work (candidate count and directories covered), and allowing the user to keep, drop or rename candidates. No capability scout MUST run before the user confirms; the initial map scout is not a capability scout. If the user cancels, no change is created.

#### Scenario: User trims the list
- **WHEN** the user drops two of five candidates
- **THEN** only the remaining three are scouted

#### Scenario: User cancels
- **WHEN** the user cancels the confirmation after the map
- **THEN** no change directory is created and no capability scout runs

### Requirement: Bootstrap change
After confirmation the skill SHALL create the change `bootstrap-specs` with `openspec new change "bootstrap-specs"`. When a change with that name already exists, the skill MUST ask whether to continue it, MUST skip artifacts that are `done`, and MUST NOT overwrite them.

#### Scenario: Fresh project
- **WHEN** no change named `bootstrap-specs` exists and the user confirmed
- **THEN** `openspec/changes/bootstrap-specs/` is created

#### Scenario: Existing change
- **WHEN** `bootstrap-specs` already exists and its `proposal` is `done`
- **THEN** the user is asked whether to continue and the `proposal` file is not rewritten

### Requirement: Scout dispatch
The skill SHALL run one evidence-only scout per confirmed capability whose spec file is still missing, reapplying existing-name filtering after user edits. When a subagent plugin is detected it SHALL dispatch agents meeting the scout role, using configured models and parallel independent reads where useful. Otherwise it SHALL scout capabilities sequentially inline, writing each parent-authored spec before the next. Scouts MUST NOT write official specs; the parent SHALL consume their reports and write only the missing files, never overwrite existing specs or completed artifacts, and never fabricate child calls.

#### Scenario: With pi-subagents
- **WHEN** a subagent plugin is detected and three confirmed capabilities have missing specs
- **THEN** three evidence-only scouts are dispatched and the parent writes the three official delta specs

#### Scenario: Without pi-subagents
- **WHEN** the optional integration is absent
- **THEN** the parent investigates capabilities sequentially and writes each spec before starting the next without child calls

#### Scenario: Interrupted generation
- **WHEN** an existing bootstrap-specs change already contains one of the confirmed capability specs
- **THEN** that file is not rewritten or re-scouted and only the still-missing confirmed capabilities are processed

### Requirement: Spec output format
The parent SHALL write `specs/<capability>/spec.md` inside the `bootstrap-specs` change from scout evidence, containing only a `## ADDED Requirements` section. Every requirement MUST contain `SHALL` or `MUST` on its first body line, have at least one `#### Scenario:` with `WHEN` and `THEN` lines, and carry an `Evidence:` line after its normative statement. Scouts MUST read tests and documentation as well as source. An agent meeting the spec reviewer role SHALL check the completed drafts before final strict validation when available; otherwise the parent SHALL check them inline, without a new human gate.

#### Scenario: Evidence on every requirement
- **WHEN** a generated spec file is read
- **THEN** every requirement has an `Evidence:` line

#### Scenario: Evidence content
- **WHEN** a requirement carries an `Evidence:` line
- **THEN** the line names the files, with line numbers where known, tests or documents the requirement is drawn from

#### Scenario: Inferred label
- **WHEN** a requirement is drawn from source code and no test or document states it
- **THEN** it carries `Confidence: inferred`

#### Scenario: Observable behaviour
- **WHEN** a requirement is written
- **THEN** it describes observable behaviour, not module or function structure

#### Scenario: Tests and docs read
- **WHEN** a scout works on a capability
- **THEN** it reads tests and documentation as well as source

#### Scenario: Format validates
- **WHEN** the parent has drafted and internally reviewed the generated delta specs
- **THEN** it runs `openspec validate bootstrap-specs --strict`, fixes invalid files and reruns until validation passes

#### Scenario: Parent authors official specs
- **WHEN** capability scout reports finish
- **THEN** reports remain run/scratch artifacts and the parent alone writes and validates the official spec files

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
