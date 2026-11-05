## MODIFIED Requirements

### Requirement: No Claude tool names
The skill and prompt SHALL NOT contain `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` or `plannotator`. Where a decision is needed the text MUST direct the agent to ask as the routing note's Interaction channel paragraph describes, and where subagents are dispatched it MUST use the `subagent` tool from `pi-subagents`, with a plain fallback when that tool is unavailable.

#### Scenario: Forbidden names absent
- **WHEN** the skill and prompt are searched for `AskUserQuestion`, `TodoWrite`, `Task tool`, `ask_user_question` and `plannotator`
- **THEN** there are no matches

#### Scenario: Ask fallback
- **WHEN** the skill asks the user to confirm the candidate list
- **THEN** it directs the agent to ask as the Interaction channel paragraph describes, which on the `plain` channel is plain text with numbered options, recommended first, then wait
