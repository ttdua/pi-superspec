## MODIFIED Requirements

### Requirement: Routing note content
The routing note SHALL guide the agent to choose a path that fits the work and to state the chosen path with a one-line reason before starting. It MUST describe four paths: work that changes no project spec (a small mistake, a typo, a fix restoring specified behaviour, a refactor) is done directly with TDD and no change directory; work that changes specs and whose requirements are clear goes to `/opsx-ff`; work that changes specs and needs careful step-by-step review goes to `/opsx-new` and then `/opsx-continue`; questions, research and reviews are answered directly without proposing a change. Before treating work as a fix restoring specified behaviour, the note MUST tell the agent to confirm that behaviour in the living specs under `openspec/specs/`, and that behaviour not specified there makes the work a spec change. The note MUST state that design docs and plans are not written to `docs/superpowers/`. The note MUST NOT require every behaviour change to go through `/opsx-new`. The note SHALL also contain the document language paragraph, the Interaction channel paragraph and the Subagent integration paragraph, in that order. The note SHALL be guidance only; the extension MUST NOT block any tool call.

#### Scenario: Note text
- **WHEN** the routing note is injected
- **THEN** its text mentions direct work for no-spec changes, `/opsx-ff`, `/opsx-new`, answering questions directly, and `docs/superpowers/`

#### Scenario: Path stated
- **WHEN** the routing note is injected
- **THEN** it tells the agent to state the chosen path and a one-line reason

#### Scenario: Specified behaviour confirmed
- **WHEN** the routing note is injected
- **THEN** it tells the agent to confirm a fix's behaviour in `openspec/specs/` and to treat unspecified behaviour as a spec change

#### Scenario: No forced change
- **WHEN** the routing note is injected
- **THEN** it does not contain `MUST first be proposed`, and every mention of `/opsx-new` is tied to spec changes that need close review

#### Scenario: Paragraphs present
- **WHEN** the routing note is injected
- **THEN** it contains the document language paragraph, the Interaction channel paragraph and the Subagent integration paragraph, and still starts with the routing note marker

#### Scenario: Subagent paragraph last
- **WHEN** the routing note is injected
- **THEN** the Subagent integration paragraph comes after the Interaction channel paragraph

#### Scenario: No enforcement
- **WHEN** the extension is loaded
- **THEN** it registers no `tool_call` handler that blocks tools
