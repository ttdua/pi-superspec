## ADDED Requirements

### Requirement: Routing note injection is limited to activated projects
On every `context` event the extension SHALL inject the routing note only when the project for the session working directory is activated. For an unactivated project, or a directory with no project root, it MUST leave the messages unchanged.

#### Scenario: Activated project
- **WHEN** a `context` event fires in a marked project
- **THEN** the resulting messages contain the routing note

#### Scenario: Unmarked project
- **WHEN** a `context` event fires in an unmarked project
- **THEN** the messages are returned unchanged

#### Scenario: Outside any project
- **WHEN** a `context` event fires in a directory with no project root
- **THEN** the messages are returned unchanged

### Requirement: Routing note placement
The extension SHALL place the routing note immediately after the message containing the Superpowers bootstrap marker `superpowers:using-superpowers bootstrap for pi` when such a message exists. Otherwise it SHALL place the note at the first index that is not a leading `compactionSummary` message. Placement MUST NOT depend on extension load order.

#### Scenario: Bootstrap present
- **WHEN** the messages contain a Superpowers bootstrap message
- **THEN** the routing note is the message directly after the bootstrap message

#### Scenario: Bootstrap absent
- **WHEN** the messages contain no Superpowers bootstrap message
- **THEN** the routing note is inserted at the first index that is not a leading `compactionSummary`

#### Scenario: Bootstrap after leading compaction summary
- **WHEN** the messages start with a `compactionSummary` followed by the bootstrap message
- **THEN** the order is compaction summary, bootstrap, routing note

#### Scenario: Our handler runs before Superpowers
- **WHEN** the routing note is inserted first and the Superpowers handler then inserts its bootstrap at the first non-summary index
- **THEN** the bootstrap precedes the routing note

### Requirement: Routing note is not duplicated
The routing note SHALL carry its own marker, and the extension MUST NOT insert it when a message already contains that marker.

#### Scenario: Note already present
- **WHEN** the messages already contain the routing note marker
- **THEN** the messages are returned unchanged

### Requirement: Routing note content
The routing note SHALL tell the agent that work adding or changing behaviour MUST first be proposed as a change with `/opsx-new` before brainstorming, that small work changing no spec (bug fix restoring specified behaviour, typo, refactor) is done directly with TDD and no change directory, and that design docs and plans MUST NOT be written to `docs/superpowers/`. The note SHALL be guidance only; the extension MUST NOT block any tool call.

#### Scenario: Note text
- **WHEN** the routing note is injected
- **THEN** its text mentions `/opsx-new`, direct TDD for small fixes, and `docs/superpowers/`

#### Scenario: No enforcement
- **WHEN** the extension is loaded
- **THEN** it registers no `tool_call` handler that blocks tools

### Requirement: Missing Superpowers warning
At `session_start` in an activated project with an interactive UI, the extension SHALL warn once when the `skill:brainstorming` command is not discoverable. The warning MUST include the command `pi install git:github.com/obra/superpowers`. It MUST NOT warn when Superpowers is discoverable, in unactivated projects, or without a UI.

#### Scenario: Superpowers missing
- **WHEN** `session_start` fires in an activated project with a UI and no `skill:brainstorming` command
- **THEN** one warning is shown that contains `pi install git:github.com/obra/superpowers`

#### Scenario: Superpowers installed
- **WHEN** `session_start` fires in an activated project and `skill:brainstorming` is discoverable
- **THEN** no warning is shown

#### Scenario: Unactivated project
- **WHEN** `session_start` fires in an unactivated project
- **THEN** no warning is shown

#### Scenario: No UI
- **WHEN** `session_start` fires in an activated project without a UI
- **THEN** no warning is shown
