## MODIFIED Requirements

### Requirement: No Claude tool names in execution commands
The execution skills and prompts SHALL NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. Where the OpenSpec source skill asked the user, the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes. Where it tracked todos, dispatched a subagent or loaded a skill, the text MUST use the `todo` tool, the `subagent` tool from `pi-subagents`, or reading `SKILL.md`, each with a plain fallback when the tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** the files of `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive` under `skills/` and `prompts/` are searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** an execution skill needs a decision from the user
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes, which on the `plain` channel is plain text with numbered options, recommended first, then wait
