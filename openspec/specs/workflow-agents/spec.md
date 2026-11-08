# workflow-agents Specification

## Purpose

Define the bundled Superspec specialist catalog and each role's authority, context, and evidence responsibilities.

## Requirements

### Requirement: Namespaced specialist catalog
The package SHALL bundle exactly six agent definitions whose frontmatter `name` is `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, and `superspec.verifier`, with no `package` key, so that every supported discovering plugin registers the same identity. Each definition MUST have a non-empty description and `advertise: false`, and MUST NOT define an unqualified alias that shadows a generic agent. These definitions are candidates for the roles of the shared routing reference and MUST NOT be required by any skill: skills name roles, not agents.

#### Scenario: Catalog identities
- **WHEN** the installed package agent definitions are discovered
- **THEN** all six identities are available without replacing generic scout, worker, or reviewer identities

#### Scenario: Same identity across plugins
- **WHEN** an agent file is read
- **THEN** its `name` starts with `superspec.` and it has no `package` key

#### Scenario: Skills name roles
- **WHEN** the skills under `skills/` are searched for `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer` and `superspec.verifier`
- **THEN** no match is found

### Requirement: Explicit context and model ownership
Every bundled definition SHALL use fresh context, inherit applicable project and global instructions, omit the ambient skills catalog, disable unsolicited progress files and nested delegation, and specify a strict tools allowlist of built-in tools only. Frontmatter SHALL carry the keys each supported discovering plugin needs for these settings, including `prompt_mode: append` so that project instructions are inherited. Definitions MUST NOT pin a model, provider, or thinking level; user/project configuration SHALL remain authoritative, and a per-dispatch thinking level MAY come only from task difficulty as the parallel apply lanes capability defines. Explicit role-specific skills MAY be selected without inheriting the whole catalog.

#### Scenario: Bounded child context
- **WHEN** an agent starts from a workflow handoff
- **THEN** it receives fresh task context and applicable instructions, has no nested-delegation grant or unsolicited progress-file duty, and uses configured model settings

#### Scenario: Built-in tools only
- **WHEN** the `tools` field of each definition is read
- **THEN** it lists only built-in tools (`read`, `grep`, `find`, `ls`, and `bash`, `edit`, `write` where the role allows them) and no plugin tool

#### Scenario: Both dialects present
- **WHEN** a definition's frontmatter is read
- **THEN** it contains the prompt-inheritance keys for both supported discovering plugins, with `prompt_mode: append`

### Requirement: Recon and review authority
The scout SHALL return file/line evidence, entry points, constraints, risks, open questions, and candidate observable behaviors without editing product files or official artifacts. Spec, plan, and task reviewers SHALL return evidence-backed findings with criterion references, severity, a concrete recommendation, limitations, and a verdict; they MUST NOT edit files, invoke shell commands, or approve human gates. The task reviewer MUST support exact per-task and whole-branch review targets. The task reviewer SHALL review code quality and structure in the stated range in addition to spec compliance, and SHALL report each violation that the range introduces as a finding. The plan reviewer SHALL check that the design and plan split units by responsibility before contracts are fixed, and SHALL report an entry point or contract that owns several responsibilities as a finding. The plan reviewer SHALL also check that every plan task has a `Difficulty` and a `Blocked by` value, that every referenced task exists, that the dependencies form no cycle, and that the plan's dependencies cover those of `tasks.md` or state why one is dropped. A finding's criterion MAY cite a coding standard rule instead of a requirement, scenario or task ID, and a structure finding alone MAY lead to `CHANGES_REQUESTED`. The reviewer definitions MUST NOT state numeric thresholds for function size or complexity.

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

#### Scenario: Plan reviewer checks task metadata
- **WHEN** the plan reviewer definition is read
- **THEN** it tells the reviewer to check difficulty and dependency presence, references, cycles and coverage of the `tasks.md` dependencies

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

### Requirement: Plugin-neutral agent bodies
The body of every bundled definition SHALL name no plugin tool or parameter. When an agent needs a decision, is blocked, or finds the handoff ambiguous, its body SHALL tell it to use the escalation channel named in its handoff and wait for the answer, and, when the handoff names none, to stop and put the question under Blockers in its report. It MUST NOT guess.

#### Scenario: No plugin tool names
- **WHEN** `agents/*.md` are searched for `contact_supervisor`, `subagents_enable`, `ask_parent`, `notify_parent`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** no match is found

#### Scenario: Escalation from the handoff
- **WHEN** an agent body is read
- **THEN** it tells the agent to use the handoff's escalation channel, or to stop and report the question under Blockers when none is named
