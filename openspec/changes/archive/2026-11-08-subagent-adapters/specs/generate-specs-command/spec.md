## MODIFIED Requirements

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
