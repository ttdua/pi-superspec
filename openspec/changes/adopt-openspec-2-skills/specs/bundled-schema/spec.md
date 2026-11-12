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
Schema, template, `workflow.md` and `subagent-routing.md` text SHALL NOT contain pi-specific tool names or Claude Code-only tool names, and SHALL name each workflow step by its stock skill id (`openspec-<id>`), not by an `/opsx-<step>` command. Only `/opsx-init` and `/opsx-generate-specs` are spelled as commands.

#### Scenario: No tool names
- **WHEN** `schema.yaml`, `templates/*.md`, `workflow.md` and `subagent-routing.md` are searched for `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool`, and `/opsx:`
- **THEN** no match is found

#### Scenario: No step commands
- **WHEN** `schema.yaml`, `templates/*.md` and `workflow.md` are searched for `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync` and `/opsx-archive`
- **THEN** no match is found

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
- **THEN** it states that `openspec-archive-change` performs it
