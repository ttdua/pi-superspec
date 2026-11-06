# workflow-agents Specification

## Purpose

Define the bundled Superspec specialist catalog and each role's authority, context, and evidence responsibilities.

## Requirements

### Requirement: Namespaced specialist catalog
The package SHALL bundle exactly six agent definitions with canonical identities `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, and `superspec.verifier`. Each definition MUST use a local `name` with `package: superspec`, a non-empty description, and `advertise: false`, and MUST NOT define an unqualified alias that shadows a generic agent.

#### Scenario: Catalog identities
- **WHEN** the installed package agent definitions are discovered
- **THEN** all six canonical identities are available without replacing generic scout, worker, or reviewer identities

### Requirement: Explicit context and model ownership
Every bundled definition SHALL use fresh context, inherit applicable project and global instructions, omit the ambient skills catalog, disable unsolicited progress files and nested delegation, and specify a strict tools allowlist. Definitions and workflow dispatch instructions MUST NOT pin a model, provider, or thinking level; user/project configuration SHALL remain authoritative. Explicit role-specific skills MAY be selected without inheriting the whole catalog.

#### Scenario: Bounded child context
- **WHEN** an agent starts from a workflow handoff
- **THEN** it receives fresh task context and applicable instructions, has no nested-delegation grant or unsolicited progress-file duty, and uses configured model settings

### Requirement: Recon and review authority
The scout SHALL return file/line evidence, entry points, constraints, risks, open questions, and candidate observable behaviors without editing product files or official artifacts. Spec, plan, and task reviewers SHALL return evidence-backed findings with criterion references, severity, a concrete recommendation, limitations, and a verdict; they MUST NOT edit files, invoke shell commands, or approve human gates. The task reviewer MUST support exact per-task and whole-branch review targets.

#### Scenario: Evidence-only scout
- **WHEN** a scout investigates a capability
- **THEN** its report cites source, tests, and documentation or explicitly names unavailable evidence, and official spec files remain unchanged by the scout

#### Scenario: Independent reviewer
- **WHEN** a reviewer inspects a supplied artifact or committed-range review package
- **THEN** it reports evidence and limitations without write/shell tools or approval authority, and never claims to have reviewed an unavailable diff

### Requirement: Task-scoped implementation
The implementer SHALL execute one approved task with TDD and fresh validation in the assigned worktree, report changed files, commit range, tests, deviations and blockers, and escalate unapproved scope or contract changes. It MUST NOT dispatch children, edit official planning/progress/receipt artifacts, or authorize publication. It SHALL explicitly select `test-driven-development`, `verification-before-completion`, and `systematic-debugging` skills.

#### Scenario: Implementation boundary
- **WHEN** implementation needs an unapproved contract or scope change
- **THEN** the implementer stops and reports it to the parent instead of changing the approved artifacts or publishing

### Requirement: Independent verification evidence
The verifier SHALL inspect the six existing verify checks and return per-check evidence, fresh validation command results, issue severity, and unverified items with reasons. It MUST NOT fix product code or write official receipts. It SHALL select `verification-before-completion`; shell access SHALL be limited by instruction to assigned inspection/check commands, not described as a filesystem sandbox.

#### Scenario: Incomplete or failing evidence
- **WHEN** tests fail or a check cannot be performed in this verify invocation
- **THEN** the verifier reports the failure or not-verified reason and does not fix code or claim the check passed

### Requirement: Spec reviewer compares with the baseline
The spec reviewer SHALL compare each `MODIFIED`, `REMOVED` and `RENAMED` delta with the main spec supplied in its handoff: a header without an exact match in the main spec and a scenario present in the main spec but missing from a `MODIFIED` block without being named as intentional MUST each be reported as a finding. When a needed main spec is not supplied, the reviewer MUST record it under Limitations and MUST NOT report the comparison as passed.

#### Scenario: Unmatched header
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to report a `MODIFIED`, `REMOVED` or `RENAMED` header that has no exact match in the supplied main spec

#### Scenario: Dropped scenario
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to report a scenario dropped from a `MODIFIED` block without being named as intentional

#### Scenario: Baseline missing
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to record a missing main spec under Limitations instead of passing the comparison
