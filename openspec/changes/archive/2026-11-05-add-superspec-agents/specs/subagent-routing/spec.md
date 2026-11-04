## Purpose

Define shared delegation policy for Superspec skills using the optional pi-subagents integration.

## ADDED Requirements

### Requirement: Shared integration reference
Explore, continue, ff, apply, verify, and generate-specs SHALL read one packaged shared integration reference before delegation. The reference MUST NOT introduce a slash command, runtime registration, settings writes, dependency installation, or pi-specific schema/template text. It SHALL document package discovery, namespaced-agent, override, and output-routing capability requirements and identify smoke-tested builds without claiming untested versions or forks are compatible.

#### Scenario: Integration policy loaded
- **WHEN** an affected skill delegates workflow work
- **THEN** it loads the same packaged reference and follows stage-specific instructions without modifying schema or settings

### Requirement: Availability and failure handling
The parent SHALL resolve lazy tool activation and canonical role availability before dispatch. It SHALL distinguish absent integration from incompatible/disabled agents and child failures. Only absence SHALL select the announced inline fallback; incompatibility and failures MUST stop the affected delegated stage without changing operator settings or silently choosing a generic agent, CLI, or inline recovery.

#### Scenario: Lazy tool activation
- **WHEN** only `subagents_enable` is visible
- **THEN** the parent enables it, re-evaluates on the next model turn, and inspects the installed management surface to resolve canonical agents before dispatching

#### Scenario: Optional integration absent
- **WHEN** neither the tool nor its activation helper is available
- **THEN** the parent announces and performs the existing inline path with the same gates and evidence rules and fabricates no child calls

#### Scenario: Disabled or incompatible agent
- **WHEN** a required canonical agent is disabled/missing, discovery is unsupported, or required skills/tools are unavailable
- **THEN** the parent reports the named cause and stops the affected delegated stage without bypassing user settings

#### Scenario: Failed child lane
- **WHEN** a child launch or runtime fails
- **THEN** the parent reports the exact failure and known run/worktree/partial state and does not silently switch execution mechanisms

### Requirement: Bounded handoff and reports
Each child handoff SHALL identify the goal, authoritative cwd/change root, resolved input paths, task or criterion IDs, edit boundary, relevant constraints and refs, acceptance criteria, validation, stop conditions, and report contract. Reports SHALL be routed using the subagent `output` parameter to run-managed or explicit scratch artifacts. The parent MUST check returned evidence before accepting a report and MUST treat missing required evidence as incomplete rather than success.

#### Scenario: Recoverable bounded handoff
- **WHEN** a child starts with no parent history
- **THEN** its brief supplies the scope, paths, constraints, expected evidence, and output binding needed to complete its bounded assignment

#### Scenario: Incomplete report
- **WHEN** a report omits required criteria, evidence, or validation results
- **THEN** the parent records the gap and does not infer task completion from a successful process exit or report headings

### Requirement: Parent authority and concurrency
The parent SHALL own official artifact writes, task checkbox updates, receipt outcomes, human gates, and publication decisions. It SHALL keep one implementation writer per worktree, allow parallel independent reads/reviews only, use fresh child contexts without nested delegation, and omit per-dispatch model/thinking overrides. Tool availability MUST NOT by itself authorize delegation outside the requested workflow or applicable user/project instructions.

#### Scenario: One review seat and one writer
- **WHEN** apply executes a task and its review
- **THEN** one authorized implementer writes in that worktree and the parent dispatches the existing task-review seat without a duplicate generic review pipeline

#### Scenario: Report is not authority
- **WHEN** a child recommends completion, approval, or publication
- **THEN** the parent checks evidence and retains official artifact, outcome, human-gate, and publication authority
