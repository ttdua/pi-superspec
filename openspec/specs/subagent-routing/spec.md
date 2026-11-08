# subagent-routing Specification

## Purpose

Define shared delegation policy for Superspec skills using the optional pi-subagents integration.

## Requirements

### Requirement: Shared integration reference
Explore, continue, ff, apply, verify, and generate-specs SHALL read one packaged shared integration reference before delegation. The reference MUST NOT introduce a slash command, runtime registration, settings writes, dependency installation, or pi-specific schema/template text. It SHALL describe delegation by function (spawn a role, collect its report, wait, answer an escalation) and SHALL define each role by its requirements: access (`read-only` or `writer`), required tools, required and optional skills, and report contract. It MUST NOT name a subagent plugin, a plugin tool or a plugin parameter, and SHALL point to the Subagent integration paragraph of the routing note for the mechanics. Smoke-tested builds per plugin SHALL be identified in the compatibility documentation (`docs/architecture.md` and `docs/e2e-checklist.md`), which the reference links to, without claiming untested versions or forks are compatible.

#### Scenario: Integration policy loaded
- **WHEN** an affected skill delegates workflow work
- **THEN** it loads the same packaged reference and follows stage-specific instructions without modifying schema or settings

#### Scenario: Plugin-neutral reference
- **WHEN** `skills/references/subagent-routing.md` is searched for `pi-subagents`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `ask_parent`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** none is found

#### Scenario: Role requirements listed
- **WHEN** the reference is read
- **THEN** it lists scout, spec reviewer, plan reviewer, implementer, task reviewer and verifier, each with access, required tools, skills and report contract

### Requirement: Availability and failure handling
The parent SHALL resolve availability through the detected Subagent integration paragraph before dispatch, including lazy tool activation when the paragraph says so. It SHALL list the available agents through that paragraph's mechanism and SHALL select, per role, one agent whose tools and skills evidently meet the role's requirements. It MUST NOT give bundled agents precedence over other qualifying agents, and SHALL announce the chosen agent for each role once per stage. A `read-only` role MUST only take an agent whose tool set is known and contains no edit or write tool. It SHALL distinguish absent integration from a role no available agent meets and from child failures. Only absence SHALL select the announced inline fallback. A role no agent meets, and child failures, MUST stop the affected delegated stage without changing operator settings or silently going inline. Role skills SHALL be either required or optional; `coding-standards` is the only optional role skill. The parent SHALL treat `coding-standards` as missing when the agent listing reports it unavailable for the chosen agent or `skill:coding-standards` is not discoverable. A missing optional skill MUST NOT stop the stage: the parent SHALL announce once per stage that the coding standard is unavailable and that agents fall back to project conventions, and SHALL dispatch as usual. A missing required skill SHALL be handled as a role no available agent meets.

#### Scenario: Lazy tool activation
- **WHEN** the Subagent integration paragraph reports helper-only activation
- **THEN** the parent enables the tool, re-evaluates on the next model turn, and lists the available agents before dispatching

#### Scenario: Optional integration absent
- **WHEN** the Subagent integration paragraph reports that delegation is unavailable
- **THEN** the parent announces and performs the existing inline path with the same gates and evidence rules and fabricates no child calls

#### Scenario: Selection by requirements
- **WHEN** a bundled agent and another agent both meet the scout role's requirements
- **THEN** the parent may choose either, gives the bundled one no precedence, and announces the chosen agent

#### Scenario: Disabled or incompatible agent
- **WHEN** no available agent meets a role's requirements (agents disabled, tool set unknown or containing edit or write tools for a read-only role, or required skills or tools unavailable)
- **THEN** the parent reports the role and the missing requirement and stops the affected delegated stage without bypassing user settings

#### Scenario: Failed child lane
- **WHEN** a child launch or runtime fails
- **THEN** the parent reports the exact failure and known run/worktree/partial state and does not silently switch execution mechanisms

#### Scenario: Optional skill missing
- **WHEN** a role's `coding-standards` skill is unavailable and its other requirements are met
- **THEN** the parent announces once that the coding standard is unavailable, dispatches the role, and neither stops the stage nor writes settings

### Requirement: Bounded handoff and reports
Each child handoff SHALL identify the goal, authoritative cwd/change root, resolved input paths, task or criterion IDs, edit boundary, relevant constraints and refs, acceptance criteria, validation, stop conditions, report contract, and the escalation channel the child uses to ask the parent, taken from the Subagent integration paragraph. The parent SHALL collect each report through the paragraph's mechanism and SHALL keep it as a run-managed or explicit scratch artifact, writing it there itself when the plugin cannot. The parent SHALL treat a child that escalated as waiting for an answer, not as finished. The parent MUST check returned evidence before accepting a report and MUST treat missing required evidence as incomplete rather than success.

#### Scenario: Recoverable bounded handoff
- **WHEN** a child starts with no parent history
- **THEN** its brief supplies the scope, paths, constraints, expected evidence, escalation channel and report destination needed to complete its bounded assignment

#### Scenario: Report kept as scratch artifact
- **WHEN** the plugin returns a child's report inline instead of writing a file
- **THEN** the parent writes the report to a scratch file before checking its evidence

#### Scenario: Escalation answered
- **WHEN** a child asks the parent a question through its escalation channel
- **THEN** the parent answers through the paragraph's answer mechanism, or asks the user when the decision is theirs, and does not record the child as complete

#### Scenario: Incomplete report
- **WHEN** a report omits required criteria, evidence, or validation results
- **THEN** the parent records the gap and does not infer task completion from a successful process exit or report headings

### Requirement: Parent authority and concurrency
The parent SHALL own official artifact writes, task checkbox updates, receipt outcomes, human gates, and publication decisions. It SHALL keep exactly one implementation writer per worktree and MAY run several writer lanes at once only in separate worktrees as the parallel apply lanes capability defines. It SHALL allow parallel independent reads and reviews, use fresh child contexts without nested delegation, and omit per-dispatch model overrides. It MAY pass a thinking level only as derived from task difficulty. Tool availability MUST NOT by itself authorize delegation outside the requested workflow or applicable user/project instructions.

#### Scenario: One review seat and one writer
- **WHEN** apply executes a task and its review
- **THEN** one authorized implementer writes in that task's worktree and the parent dispatches the existing task-review seat without a duplicate generic review pipeline

#### Scenario: Parallel writers isolated
- **WHEN** two writer lanes run at the same time
- **THEN** each runs in its own worktree and no worktree has two writers

#### Scenario: Report is not authority
- **WHEN** a child recommends completion, approval, or publication
- **THEN** the parent checks evidence and retains official artifact, outcome, human-gate, and publication authority
