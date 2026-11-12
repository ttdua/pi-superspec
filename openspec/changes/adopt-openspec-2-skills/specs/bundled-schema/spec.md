## ADDED Requirements

### Requirement: Workflow rules file
The bundled schema directory SHALL contain `workflow.md` with the Superspec rules that override the stock OpenSpec skills. Every artifact `instruction` and the `apply` instruction SHALL begin by directing the agent to follow `openspec/schemas/superspec/workflow.md`, which overrides the running skill where they differ. `openspec schema validate superspec` MUST still pass.

#### Scenario: File shipped
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains `workflow.md` with sections for explore, new, continue, ff, apply, verify, sync and archive, the Review gate, the Superpowers rule, and the stock skills not used (`openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change`, `openspec-onboard`)

#### Scenario: Every instruction points to it
- **WHEN** each artifact instruction and the apply instruction of `schema.yaml` is read
- **THEN** its first sentence names `openspec/schemas/superspec/workflow.md` and says it overrides the running skill

#### Scenario: Still valid
- **WHEN** the schema directory with `workflow.md` is copied into a temp project and `openspec schema validate superspec` runs
- **THEN** validation passes

### Requirement: Subagent routing reference in the schema
The bundled schema directory SHALL contain `subagent-routing.md`, the shared integration reference, and `workflow.md` SHALL link it by relative path. The package MUST NOT keep a second copy under `skills/references/`.

#### Scenario: Reference location
- **WHEN** `schema/superspec/` and `skills/` are listed
- **THEN** `schema/superspec/subagent-routing.md` exists and `skills/references/` does not

#### Scenario: Linked from workflow.md
- **WHEN** `workflow.md` is read
- **THEN** it links `subagent-routing.md` relatively

## MODIFIED Requirements

### Requirement: Schema identity
The bundled schema at `schema/superspec/schema.yaml` SHALL have `name: superspec`, an integer `version: 9`, and a top-level `x-pi-superspec` block whose `version` equals `version`. It MUST pass `openspec schema validate superspec` when copied into a project's `openspec/schemas/superspec/`. The directory SHALL credit upstream Superspec v4 and include its MIT license.

#### Scenario: Identity fields
- **WHEN** `schema/superspec/schema.yaml` is parsed
- **THEN** `name` is `superspec`, `version` is `9` and `x-pi-superspec.version` is `9`

#### Scenario: Validates in a temp project
- **WHEN** the schema directory is copied into a temp project's `openspec/schemas/superspec/` and `openspec schema validate superspec` runs
- **THEN** validation passes

#### Scenario: Upstream credit
- **WHEN** `schema/superspec/` is listed
- **THEN** it contains the upstream `LICENSE` and `schema.yaml` names Superspec v4 in its header comment

#### Scenario: No artifact ID changes
- **WHEN** the version 9 schema is compared with version 8
- **THEN** every artifact ID of version 8 still exists, so no migration step is needed

### Requirement: Harness-neutral wording
Schema, template, `workflow.md` and `subagent-routing.md` text SHALL NOT contain pi-specific tool names or Claude Code-only tool names, and SHALL spell commands as `/opsx-<name>`. Stock OpenSpec skill names (`openspec-<id>`) are allowed.

#### Scenario: No tool names
- **WHEN** `schema.yaml`, `templates/*.md`, `workflow.md` and `subagent-routing.md` are searched for `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool`, and `/opsx:`
- **THEN** no match is found

