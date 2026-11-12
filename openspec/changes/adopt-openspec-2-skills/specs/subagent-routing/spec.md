## MODIFIED Requirements

### Requirement: Shared integration reference
Explore, continue, ff, apply, verify, and generate-specs SHALL read one shared integration reference before delegation: `subagent-routing.md` in the superspec schema directory (`openspec/schemas/superspec/subagent-routing.md` in a project, shipped as `schema/superspec/subagent-routing.md`). For the workflow commands the rules in `workflow.md` link it; `opsx-generate-specs` names its project path. The reference MUST NOT introduce a slash command, runtime registration, settings writes, dependency installation, or pi-specific schema/template text. It SHALL describe delegation by function (spawn a role, collect its report, wait, answer an escalation) and SHALL define each role by its requirements: access (`read-only` or `writer`), required tools, required and optional skills, and report contract. It MUST NOT name a subagent plugin, a plugin tool or a plugin parameter, and SHALL point to the Subagent integration paragraph of the routing note for the mechanics. Smoke-tested builds per plugin SHALL be identified in the compatibility documentation (`docs/architecture.md` and `docs/e2e-checklist.md` of the pi-superspec repository), which the reference names by absolute URL because the file is copied into projects, without claiming untested versions or forks are compatible.

#### Scenario: Integration policy loaded
- **WHEN** a workflow command delegates workflow work
- **THEN** the agent loads the same reference from the project's schema directory and follows stage-specific instructions without modifying schema or settings

#### Scenario: Plugin-neutral reference
- **WHEN** `schema/superspec/subagent-routing.md` is searched for `pi-subagents`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `ask_parent`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** none is found

#### Scenario: Role requirements listed
- **WHEN** the reference is read
- **THEN** it lists scout, spec reviewer, plan reviewer, implementer, task reviewer and verifier, each with access, required tools, skills and report contract

#### Scenario: Compatibility links survive the copy
- **WHEN** the reference is read from a project's `openspec/schemas/superspec/`
- **THEN** its links to the compatibility documentation are absolute URLs, not relative paths
