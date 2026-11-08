## MODIFIED Requirements

### Requirement: No Claude tool names in execution commands
The execution skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. Where the OpenSpec source skill asked the user, the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes. Where it tracked todos or loaded a skill, the text MUST use the `todo` tool or reading `SKILL.md`, each with a plain fallback when the tool is unavailable. Where it dispatched a subagent, the text MUST direct the agent to delegate as the routing note's Subagent integration paragraph describes, and MUST NOT name a subagent plugin, plugin tool or plugin parameter.

#### Scenario: Forbidden names absent
- **WHEN** the files of `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive` under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** an execution skill needs a decision from the user
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes, which on the `plain` channel is plain text with numbered options, recommended first, then wait

#### Scenario: Delegation through the paragraph
- **WHEN** the execution skills are searched for `pi-subagents`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `get_subagent_result`, `steer_subagent`, `Agent(` and `subagent(`
- **THEN** there are no matches, and delegation steps refer to the Subagent integration paragraph

### Requirement: Executor depends on subagent availability
The `opsx-apply` skill SHALL use the detected subagent integration with Superpowers `subagent-driven-development`, resolving availability and selecting agents by role requirements through the shared integration reference. It SHALL use an agent meeting the implementer role for each task and an agent meeting the task reviewer role for the existing task and final whole-branch review seats, with no duplicate generic reviewer pipeline. It MUST keep one implementation writer per worktree, SHALL schedule unblocked independent tasks into parallel lanes as the parallel apply lanes capability defines, and MUST NOT set a model. If the Subagent integration paragraph reports that delegation is unavailable, it SHALL use Superpowers `executing-plans` in-session, run tasks one after another, and request a whole-branch review over the full commit range before writing `apply.md`. It MUST NOT fabricate calls, bypass a role no agent meets or a failed launch, or omit the executor actually used from `apply.md`.

#### Scenario: With pi-subagents
- **WHEN** a subagent plugin is detected and agents meeting the implementer and task reviewer roles are available
- **THEN** apply executes the plan through SDD with the selected implementer and task/final-review seats, announces the chosen agents, and records that executor

#### Scenario: Without pi-subagents
- **WHEN** the Subagent integration paragraph reports that delegation is unavailable
- **THEN** apply uses `executing-plans`, follows TDD manually, requests a whole-branch review, and records `executing-plans` in `apply.md`

#### Scenario: Unusable delegated executor
- **WHEN** no available agent meets a role or a child launch fails
- **THEN** apply reports and stops the affected lane without silently going inline

### Requirement: Delegated verify evidence with parent receipt
Verify SHALL use an agent meeting the verifier role through the shared policy to collect independent evidence for the existing six checks, or verify inline when the integration is absent. Only commands run in the authoritative worktree during this invocation SHALL count as fresh. The parent MUST inspect evidence, perform remaining available checks, apply existing outcome rules, and write/commit `verify.md`; the child MUST NOT fix code or write the receipt.

#### Scenario: Fresh delegated evidence
- **WHEN** the verifier runs project tests during this verify invocation in the authoritative worktree
- **THEN** the parent records the exact command, cwd, result and evidence in its official receipt after checking the report

#### Scenario: Failing or missing evidence
- **WHEN** tests fail or evidence for a check is unavailable
- **THEN** the parent records FAIL for failing tests or not verified for the unavailable check, never invents a passing result, and does not let the verifier fix code

#### Scenario: Inline verify fallback
- **WHEN** the optional integration is absent
- **THEN** the parent runs the same fresh checks inline and writes the existing receipt format without fabricating child evidence
