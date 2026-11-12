## ADDED Requirements

### Requirement: Missing stock skills warning
At `session_start` in an activated project with a UI, the extension SHALL warn once when any of the eight required stock skills has no `SKILL.md` under `.agents/skills/`, naming the missing skills, `openspec config profile` and `openspec update`. The check MUST NOT run a command or write a file. It MUST NOT warn when all are present, in unactivated projects or without a UI, and a check failure MUST NOT reach the user.

#### Scenario: Skills removed by an update
- **WHEN** `session_start` fires with a UI in an activated project whose `.agents/skills/` lacks `openspec-ff-change` and `openspec-verify-change`
- **THEN** one warning names both skills, `openspec config profile` and `openspec update`

#### Scenario: All stock skills present
- **WHEN** `session_start` fires in an activated project whose `.agents/skills/` has `openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs` and `openspec-archive-change`
- **THEN** no stock skills warning is shown

#### Scenario: No side effects
- **WHEN** the check runs
- **THEN** no command is executed and no file changes

#### Scenario: No UI
- **WHEN** `session_start` fires without a UI in an activated project with missing stock skills
- **THEN** no warning is shown

## MODIFIED Requirements

### Requirement: Routing note content
The routing note SHALL guide the agent to choose a path that fits the work and to state the chosen path with a one-line reason before starting. It MUST describe four paths: work that changes no project spec (a small mistake, a typo, a fix restoring specified behaviour, a refactor) is done directly with TDD and no change directory; work that changes specs and whose requirements are clear goes to the `openspec-ff-change` skill; work that changes specs and needs careful step-by-step review goes to the `openspec-new-change` skill, then the `openspec-continue-change` skill; questions, research and reviews are answered directly without proposing a change. Before treating work as a fix restoring specified behaviour, the note MUST tell the agent to confirm that behaviour in the living specs under `openspec/specs/`, and that behaviour not specified there makes the work a spec change. The note MUST state that design docs and plans are not written to `docs/superpowers/`. The note MUST NOT require every behaviour change to go through `openspec-new-change`. The note SHALL also contain a stock skills paragraph, the document language paragraph, the Interaction channel paragraph and the Subagent integration paragraph, in that order. The stock skills paragraph MUST name, for each of the eight workflow steps, the stock skill that runs it (`openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs` and `openspec-archive-change`); MUST tell the agent to read the step's section of `openspec/schemas/superspec/workflow.md` before running that skill, with `workflow.md` winning where they differ; MUST tell the agent to stop with instructions when a stock skill is not in the available skills list; and MUST name `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard` as not part of the workflow, telling the agent to suggest the matching workflow skill instead. The note SHALL be guidance only; the extension MUST NOT block any tool call.

#### Scenario: Note text
- **WHEN** the routing note is injected
- **THEN** its text mentions direct work for no-spec changes, `openspec-ff-change`, `openspec-new-change`, answering questions directly, and `docs/superpowers/`

#### Scenario: Path stated
- **WHEN** the routing note is injected
- **THEN** it tells the agent to state the chosen path and a one-line reason

#### Scenario: Specified behaviour confirmed
- **WHEN** the routing note is injected
- **THEN** it tells the agent to confirm a fix's behaviour in `openspec/specs/` and to treat unspecified behaviour as a spec change

#### Scenario: No forced change
- **WHEN** the routing note is injected
- **THEN** it does not contain `MUST first be proposed`, and every mention of `openspec-new-change` in the path guidance is tied to spec changes that need close review; the stock skills paragraph may name `openspec-new-change` only to map it to its stock skill

#### Scenario: Paragraphs present
- **WHEN** the routing note is injected
- **THEN** it contains the stock skills paragraph, the document language paragraph, the Interaction channel paragraph and the Subagent integration paragraph, and still starts with the routing note marker

#### Scenario: Stock skill mapping
- **WHEN** the routing note is injected
- **THEN** it names `openspec-ff-change` as the stock skill of the ff step and `openspec-apply-change` as that of the apply step, names `openspec/schemas/superspec/workflow.md` as overriding, and names `openspec-propose` as not part of the workflow

#### Scenario: Section read before the stock skill
- **WHEN** the routing note is injected
- **THEN** it tells the agent to read the matching section of `openspec/schemas/superspec/workflow.md`, with the Shared rules, Review gate and Superpowers rule sections, before running any stock skill

#### Scenario: Missing stock skill stop
- **WHEN** the routing note is injected
- **THEN** it tells the agent to name a stock skill missing from the available skills list, point to `openspec config profile` and `openspec update` (or `/opsx-init`), and stop without doing the work another way

#### Scenario: Stock skills paragraph first
- **WHEN** the routing note is injected
- **THEN** the stock skills paragraph comes before the document language paragraph

#### Scenario: Subagent paragraph last
- **WHEN** the routing note is injected
- **THEN** the Subagent integration paragraph comes after the Interaction channel paragraph

#### Scenario: No enforcement
- **WHEN** the extension is loaded
- **THEN** it registers no `tool_call` handler that blocks tools
