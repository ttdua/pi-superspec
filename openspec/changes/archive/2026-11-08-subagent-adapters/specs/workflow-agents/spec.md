## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Plugin-neutral agent bodies
The body of every bundled definition SHALL name no plugin tool or parameter. When an agent needs a decision, is blocked, or finds the handoff ambiguous, its body SHALL tell it to use the escalation channel named in its handoff and wait for the answer, and, when the handoff names none, to stop and put the question under Blockers in its report. It MUST NOT guess.

#### Scenario: No plugin tool names
- **WHEN** `agents/*.md` are searched for `contact_supervisor`, `subagents_enable`, `ask_parent`, `notify_parent`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** no match is found

#### Scenario: Escalation from the handoff
- **WHEN** an agent body is read
- **THEN** it tells the agent to use the handoff's escalation channel, or to stop and report the question under Blockers when none is named
