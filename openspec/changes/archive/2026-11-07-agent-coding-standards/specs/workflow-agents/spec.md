## MODIFIED Requirements

### Requirement: Recon and review authority
The scout SHALL return file/line evidence, entry points, constraints, risks, open questions, and candidate observable behaviors without editing product files or official artifacts. Spec, plan, and task reviewers SHALL return evidence-backed findings with criterion references, severity, a concrete recommendation, limitations, and a verdict; they MUST NOT edit files, invoke shell commands, or approve human gates. The task reviewer MUST support exact per-task and whole-branch review targets. The task reviewer SHALL review code quality and structure in the stated range in addition to spec compliance, and SHALL report each violation that the range introduces as a finding. The plan reviewer SHALL check that the design and plan split units by responsibility before contracts are fixed, and SHALL report an entry point or contract that owns several responsibilities as a finding. A finding's criterion MAY cite a coding standard rule instead of a requirement, scenario or task ID, and a structure finding alone MAY lead to `CHANGES_REQUESTED`. The reviewer definitions MUST NOT state numeric thresholds for function size or complexity.

#### Scenario: Evidence-only scout
- **WHEN** a scout investigates a capability
- **THEN** its report cites source, tests, and documentation or explicitly names unavailable evidence, and official spec files remain unchanged by the scout

#### Scenario: Independent reviewer
- **WHEN** a reviewer inspects a supplied artifact or committed-range review package
- **THEN** it reports evidence and limitations without write/shell tools or approval authority, and never claims to have reviewed an unavailable diff

#### Scenario: Task reviewer reviews structure
- **WHEN** the task reviewer definition is read
- **THEN** it tells the reviewer to review code quality and structure alongside spec compliance, to report each violation the range introduces as a finding that may cite a coding standard rule, and allows `CHANGES_REQUESTED` for structure alone

#### Scenario: Plan reviewer checks decomposition
- **WHEN** the plan reviewer definition is read
- **THEN** it tells the reviewer to check that units are split by responsibility before contracts are fixed, and to report an entry point or contract that owns several responsibilities

#### Scenario: No numeric thresholds
- **WHEN** the task and plan reviewer definitions are read
- **THEN** neither contains a digit sequence next to the word `lines` or `complexity`

### Requirement: Task-scoped implementation
The implementer SHALL execute one approved task with TDD and fresh validation in the assigned worktree, report changed files, commit range, tests, deviations and blockers, and escalate unapproved scope or contract changes. It MUST NOT dispatch children, edit official planning/progress/receipt artifacts, or authorize publication. It SHALL explicitly select `test-driven-development`, `verification-before-completion`, `systematic-debugging` and `coding-standards` skills. It SHALL apply the coding standard while writing code, including the refactor step after each passing test, and MUST NOT defer a split required by the standard to a later task.

#### Scenario: Implementation boundary
- **WHEN** implementation needs an unapproved contract or scope change
- **THEN** the implementer stops and reports it to the parent instead of changing the approved artifacts or publishing

#### Scenario: Coding standard while writing
- **WHEN** the implementer definition is read
- **THEN** it selects `coding-standards` and tells the implementer to apply it at the refactor step after each passing test without deferring splits to a later task

## ADDED Requirements

### Requirement: Optional coding standard skill
The implementer, task reviewer and plan reviewer SHALL select a skill named `coding-standards`, provided by the user or the project. The package MUST NOT ship, generate or edit that skill. When a role cannot load it, the role SHALL record that under Limitations and SHALL apply the project's own conventions (such as `AGENTS.md` or a contributing guide) instead. A reviewer MUST NOT return `INCOMPLETE` only because the skill is missing. No other bundled role selects `coding-standards`.

#### Scenario: Selected by code-facing roles only
- **WHEN** the bundled agent definitions are read
- **THEN** the implementer, task reviewer and plan reviewer select `coding-standards`, and the scout, spec reviewer and verifier do not

#### Scenario: Not shipped
- **WHEN** the published package files are listed
- **THEN** no skill named `coding-standards` is among them

#### Scenario: Skill missing
- **WHEN** the definitions of the three roles are read
- **THEN** each tells the agent to record a missing coding standard under Limitations and fall back to project conventions, and the reviewers do not return `INCOMPLETE` for that reason alone
