# Routing Note Specification

## Purpose

Steer agents in activated projects toward the OpenSpec workflow: inject a routing note through the `context` event after the Superpowers bootstrap (or at the head of the messages when there is none), and warn once per session start when Superpowers is not installed.

## Requirements

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
The extension SHALL place the routing note immediately after the bootstrap message, defined as the first user message containing the Superpowers bootstrap marker `superpowers:using-superpowers bootstrap for pi`, when such a message exists. Otherwise it SHALL place the note at the first index that is not a leading `compactionSummary` message. Placement MUST NOT depend on extension load order.

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
The routing note SHALL carry its own marker at the start of its text, and the extension MUST NOT insert it when a user message already is the routing note (the marker is at the start of that user message's text).

#### Scenario: Note already present
- **WHEN** a user message already starts with the routing note marker
- **THEN** the messages are returned unchanged

#### Scenario: Marker quoted elsewhere
- **WHEN** an assistant or tool message merely quotes the routing note marker
- **THEN** the routing note is still inserted

### Requirement: Routing note content
The routing note SHALL guide the agent to choose a path that fits the work and to state the chosen path with a one-line reason before starting. It MUST describe four paths: work that changes no project spec (a small mistake, a typo, a fix restoring specified behaviour, a refactor) is done directly with TDD and no change directory; work that changes specs and whose requirements are clear goes to `/opsx-ff`; work that changes specs and needs careful step-by-step review goes to `/opsx-new` and then `/opsx-continue`; questions, research and reviews are answered directly without proposing a change. Before treating work as a fix restoring specified behaviour, the note MUST tell the agent to confirm that behaviour in the living specs under `openspec/specs/`, and that behaviour not specified there makes the work a spec change. The note MUST state that design docs and plans are not written to `docs/superpowers/`. The note MUST NOT require every behaviour change to go through `/opsx-new`. The note SHALL also contain the document language paragraph and the Interaction channel paragraph. The note SHALL be guidance only; the extension MUST NOT block any tool call.

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
- **THEN** it contains the document language paragraph and the Interaction channel paragraph, and still starts with the routing note marker

#### Scenario: No enforcement
- **WHEN** the extension is loaded
- **THEN** it registers no `tool_call` handler that blocks tools

### Requirement: Missing Superpowers warning
At `session_start` in an activated project with an interactive UI, the extension SHALL warn once per session start (including reload) when the `skill:brainstorming` command is not discoverable. The warning MUST include the command `pi install git:github.com/obra/superpowers`. It MUST NOT warn when Superpowers is discoverable, in unactivated projects, or without a UI.

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

### Requirement: Document language paragraph
The routing note SHALL include a paragraph, built on each `context` event from the project's effective document language, that tells the agent to write the prose of OpenSpec documents in that language. The effective language is the valid `language:` value of `openspec/config.yaml`, or `en` when the file or the key is missing or the value is invalid. The note MUST still start with the routing note marker so that the duplicate check applies.

#### Scenario: Language set
- **WHEN** a `context` event fires in an activated project whose config has `language: vi`
- **THEN** the injected note contains `vi`, the instruction to keep structural tokens in English, and the instruction to update `language:` on request

#### Scenario: Structural tokens stay English
- **WHEN** the language paragraph is built
- **THEN** it tells the agent to keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file names and capability names in English

#### Scenario: Code and commits unaffected
- **WHEN** the language paragraph is built
- **THEN** it states that code, comments and commits are not affected

#### Scenario: Language change request
- **WHEN** the language paragraph is built
- **THEN** it tells the agent that a request to change the document language is handled by updating `language:` in `openspec/config.yaml`

#### Scenario: Language absent
- **WHEN** a `context` event fires in an activated project whose config has no `language:`
- **THEN** the injected note contains the language paragraph naming `en`

#### Scenario: Invalid language
- **WHEN** a `context` event fires in an activated project whose config has a 100-character `language:` value
- **THEN** the injected note contains the language paragraph naming `en`

#### Scenario: Language changed mid-session
- **WHEN** `language:` changes from `vi` to `en` between two `context` events
- **THEN** the second event injects a note naming `en` without a reload

#### Scenario: Marker preserved
- **WHEN** the note is built with a language
- **THEN** its text starts with the routing note marker and is not inserted twice

### Requirement: Missing coding standard warning
At `session_start` in an activated project with an interactive UI, the extension SHALL warn once per session start (including reload) when the `skill:coding-standards` command is not discoverable. The warning MUST say that the bundled implementer and reviewers fall back to project conventions without the skill, and MUST NOT name an install command. It MUST NOT warn when the skill is discoverable, in unactivated projects, or without a UI.

#### Scenario: Coding standard missing
- **WHEN** `session_start` fires in an activated project with a UI and no `skill:coding-standards` command
- **THEN** one warning is shown that names `coding-standards` and project conventions

#### Scenario: Coding standard installed
- **WHEN** `session_start` fires in an activated project and `skill:coding-standards` is discoverable
- **THEN** no coding standard warning is shown

#### Scenario: Unactivated project
- **WHEN** `session_start` fires in an unactivated project without `skill:coding-standards`
- **THEN** no coding standard warning is shown

#### Scenario: No UI
- **WHEN** `session_start` fires in an activated project without a UI
- **THEN** no coding standard warning is shown

#### Scenario: Both skills missing
- **WHEN** `session_start` fires in an activated project with a UI and neither `skill:brainstorming` nor `skill:coding-standards` is discoverable
- **THEN** the Superpowers warning and the coding standard warning are each shown once, as separate warnings
