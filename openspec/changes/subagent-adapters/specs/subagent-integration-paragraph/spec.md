## ADDED Requirements

### Requirement: Subagent plugin detection
The extension SHALL detect the installed subagent plugin on every `context` event from the active tools and their parameter schemas, checking in this order: `Agent` with `subagent_type` and `prompt` is `tintinweb`; `subagent` with `agent` or `task` is `pi-subagents`; `subagent` with `subagent_type` and `prompt` is `gotgenes`; only `subagents_enable` active is `pi-subagents-helper`; anything else is `none`.

#### Scenario: tintinweb detected
- **WHEN** the active tools include `Agent` with `subagent_type` and `prompt` parameters
- **THEN** detection returns `tintinweb`

#### Scenario: pi-subagents detected
- **WHEN** the active tools include `subagent` with `agent` and `task` parameters
- **THEN** detection returns `pi-subagents`

#### Scenario: gotgenes detected by schema, not name
- **WHEN** the active tools include `subagent` with `subagent_type` and `prompt` parameters and no `agent` or `task` parameter
- **THEN** detection returns `gotgenes`

#### Scenario: Helper only
- **WHEN** `subagents_enable` is the only subagent-related active tool
- **THEN** detection returns `pi-subagents-helper`

#### Scenario: Several plugins active
- **WHEN** both `Agent` (tintinweb schema) and `subagent` (pi-subagents schema) are active
- **THEN** detection returns `tintinweb`

#### Scenario: Nothing detected
- **WHEN** no active tool matches a rule
- **THEN** detection returns `none`

#### Scenario: Lazily registered tool
- **WHEN** a matching tool becomes active after an earlier `context` event that returned `none`
- **THEN** the next `context` event detects the plugin

### Requirement: Detection is schema-based and side-effect free
When two active tools share a name, the tool's provenance (`sourceInfo`) SHALL break the tie. Detection MUST NOT depend on the tool name alone or on package names in settings. Detection MUST NOT write files, change settings or register tools.

#### Scenario: Same name, schema decides
- **WHEN** two active tools are both named `subagent`, one with `agent` and `task` parameters and one with `subagent_type` and `prompt`
- **THEN** detection returns `pi-subagents`, following the rule order

#### Scenario: Same name and schema, provenance decides
- **WHEN** two active tools named `subagent` both match the `pi-subagents` schema and only one has provenance from a known `pi-subagents` package source
- **THEN** detection returns `pi-subagents` based on that tool, and the paragraph describes that tool's mechanics

#### Scenario: No side effects
- **WHEN** detection runs
- **THEN** no file is written, no setting changes and no tool is registered

### Requirement: Subagent integration paragraph content
The routing note SHALL contain a paragraph that starts with `Subagent integration: <adapter>.` for the detected adapter. For `tintinweb`, `pi-subagents` and `gotgenes` it MUST state the spawn call shape, how to list agents with their tools and skills, whether a thinking level is passed per call, how to collect a report and wait for a background child, and the escalation channel a child uses and how the parent answers.

#### Scenario: Paragraph per adapter
- **WHEN** the routing note is built for each of `tintinweb`, `pi-subagents` and `gotgenes`
- **THEN** each paragraph starts with `Subagent integration: <adapter>.` and covers spawn, listing, thinking, report collection, waiting and escalation

#### Scenario: Thinking on pi-subagents
- **WHEN** the paragraph is built for `pi-subagents`
- **THEN** it states that no thinking level is passed per call, because that plugin only takes thinking as a model suffix and the model is not pinned

#### Scenario: Report collection per adapter
- **WHEN** the paragraphs are built
- **THEN** the `pi-subagents` paragraph tells the parent to bind the report with the `output` parameter to a scratch path, and the `tintinweb` and `gotgenes` paragraphs tell it to collect the final result (inline or by waiting on the result tool) and write it to a scratch file before checking evidence

#### Scenario: Escalation channels
- **WHEN** the paragraphs are built
- **THEN** the `pi-subagents` paragraph names `contact_supervisor`, the `gotgenes` paragraph names `ask_parent` with a resume answer, and the `tintinweb` paragraph tells the child to end its turn with the question under Blockers, answered by steering or resume

### Requirement: Paragraph for helper, absent and agent-less plugins
For `pi-subagents-helper` the paragraph MUST tell the agent to call the activation helper and re-evaluate on the next turn. For `none` it MUST state that delegation is unavailable and that the inline path of the shared routing reference applies. For `gotgenes` it MUST state that the package supplies no bundled agents for it. Plugin tool names and parameter names SHALL appear only in this paragraph's source and MUST NOT be required by any skill or agent body.

#### Scenario: Helper activation
- **WHEN** the paragraph is built for `pi-subagents-helper`
- **THEN** it tells the agent to call the activation helper and re-evaluate on the next turn

#### Scenario: Unavailable delegation
- **WHEN** the paragraph is built for `none`
- **THEN** it says delegation is unavailable and the inline path applies, and names no tool to call

#### Scenario: gotgenes has no bundled agents
- **WHEN** the paragraph is built for `gotgenes`
- **THEN** it states that no bundled agents are supplied and that agents are chosen from those the plugin provides

### Requirement: Paragraph module is pure and tested
Detection and paragraph text SHALL live in one module beside the Interaction channel module, exported as pure functions that take a tool list and return an adapter or a paragraph. They MUST be covered by unit tests for every rule and every adapter.

#### Scenario: Pure functions
- **WHEN** the module is imported in a test without a pi runtime
- **THEN** detection and paragraph functions run on plain tool-list input and return deterministic output
