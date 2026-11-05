# interaction-channel Specification

## Purpose
Choose, on every `context` event, the interaction channel the session can actually use for review gates and questions (Plannotator Inbox, the `plannotator` tool, the Plannotator CLI, the ask tool, or plain text), and inject that channel's mechanics into the routing note so skills stay tool-neutral.

## Requirements

### Requirement: Channel detection
On every `context` event in an activated project, the extension SHALL select exactly one interaction channel, taking the first that holds: `inbox` (active tool `plannotator_inbox`), `plannotator-tool` (active tool `plannotator`), `plannotator-cli` (cached probe found the binary), `ask-tool` (active tool `ask_user_question`), else `plain`. Only tools in the active tool set MUST count.

#### Scenario: Inbox preferred
- **WHEN** the active tools include `plannotator_inbox`, `plannotator` and `ask_user_question`
- **THEN** the selected channel is `inbox`

#### Scenario: Plannotator tool without Inbox
- **WHEN** the active tools include `plannotator` and `ask_user_question` but not `plannotator_inbox`
- **THEN** the selected channel is `plannotator-tool`

#### Scenario: CLI only
- **WHEN** no Plannotator tool is active and the CLI probe found the `plannotator` binary
- **THEN** the selected channel is `plannotator-cli`

#### Scenario: Ask tool only
- **WHEN** no Plannotator tool is active, the CLI probe found no binary, and `ask_user_question` is active
- **THEN** the selected channel is `ask-tool`

#### Scenario: Nothing available
- **WHEN** none of the tools is active and the CLI probe found no binary
- **THEN** the selected channel is `plain`

#### Scenario: Configured but inactive tool
- **WHEN** `plannotator_inbox` is configured but not in the active tool set
- **THEN** it does not count and the next channel is checked

#### Scenario: Tool set changes mid-session
- **WHEN** `plannotator_inbox` becomes active between two `context` events
- **THEN** the second event selects `inbox` without a reload

### Requirement: Prefixed tool names
Tool name matching SHALL accept the exact name or the name after a host prefix that ends in `__`, so that a tool listed as `mcp__plannotator__plannotator_inbox` matches `plannotator_inbox`. A name that only contains the tool name elsewhere MUST NOT match.

#### Scenario: Prefixed Inbox tool
- **WHEN** the active tools include `mcp__plannotator__plannotator_inbox`
- **THEN** the selected channel is `inbox`

#### Scenario: Look-alike name
- **WHEN** the active tools include `plannotator_inbox_legacy` and nothing else relevant
- **THEN** the channel is not `inbox`

### Requirement: CLI probe once per session
The extension SHALL probe for the `plannotator` binary once per session start (including reload, which `/opsx-init` triggers after activating a project) in an activated project and cache the result for later `context` events. A `context` event that runs before the probe finishes MUST treat the CLI as unavailable. A failing probe MUST be treated as unavailable and MUST NOT raise an error to the user.

#### Scenario: Probe cached
- **WHEN** several `context` events fire after one session start
- **THEN** the probe has run once

#### Scenario: Probe pending
- **WHEN** a `context` event fires before the probe has finished
- **THEN** the CLI counts as unavailable for that event

#### Scenario: Probe fails
- **WHEN** the probe command exits non-zero or throws
- **THEN** the CLI counts as unavailable and no error is shown

### Requirement: Interaction channel paragraph
The routing note SHALL include an Interaction channel paragraph that names the selected channel and gives its mechanics (open a review gate, read each outcome, ask a question), then the mechanics of the next available channel as the fallback, then plain text as the last resort. Unavailable channels and any other mechanics MUST NOT appear. The paragraph MUST be at most 4096 bytes.

#### Scenario: Paragraph names the channel
- **WHEN** the selected channel is `plannotator-cli`
- **THEN** the paragraph describes running the CLI gate in the background with a fresh result file and classifying from `decision` and `feedback`

#### Scenario: Fallback is the next available channel
- **WHEN** `plannotator` and `ask_user_question` are active and the CLI probe found no binary
- **THEN** the selected channel is `plannotator-tool`, the fallback is `ask-tool` with its mechanics, and plain text is the last resort

#### Scenario: Fallback list omits unavailable channels
- **WHEN** only `plannotator_inbox` is active and the CLI probe found no binary
- **THEN** the paragraph names `inbox`, then plain text, and does not mention `--result-file` or `ask_user_question`

#### Scenario: Other mechanics absent
- **WHEN** the selected channel is `ask-tool`
- **THEN** the paragraph does not mention `--result-file` or `plannotator_inbox`

#### Scenario: Size cap
- **WHEN** the paragraph is built for every combination of available channels
- **THEN** each is at most 4096 bytes

### Requirement: Self-contained Inbox gate
On the `inbox` channel, the paragraph SHALL direct the agent to open a review gate as one Inbox message with a summary of what was produced and why, every reviewed file attached in artifact order, and one single-choice question with the choices `Approve`, `Approve with notes` and `Request changes` and a `Stakes:` line. The agent MUST end its turn after sending, and the message MUST be understandable without the terminal.

#### Scenario: Artifact gate message
- **WHEN** a review gate opens on `proposal.md` on the `inbox` channel
- **THEN** the agent sends one message with a summary, `proposal.md` attached, and the three-choice question, then ends its turn

#### Scenario: Several files
- **WHEN** the gate reviews proposal, design and two spec files
- **THEN** all four are attached in that order in the same message

#### Scenario: One thread per change
- **WHEN** gates and questions of one change are sent on the `inbox` channel
- **THEN** they go to one thread named after the change, and replies are answered in that thread

#### Scenario: Code review on the Inbox
- **WHEN** the code review gate of finalize opens on the `inbox` channel
- **THEN** the message carries the commit range, `git diff --stat`, and the full branch diff against the feature branch recorded in `apply.md` as an attached patch file

### Requirement: Inbox reply mapping
On the `inbox` channel, the paragraph SHALL define how a reply maps to a gate outcome: `Approve` with no notes or annotations is `approved`; `Approve` with written notes or file annotations, or `Approve with notes`, is `approved_with_notes`; `Request changes` is `changes_requested`; a skipped question, a set-aside thread or a closed question is `dismissed`. A reply that cannot be mapped MUST NOT be treated as an approval; the agent MUST ask again in the same thread.

#### Scenario: Approve with annotations
- **WHEN** the reply answers `Approve` and carries annotations on an attached file
- **THEN** the outcome is `approved_with_notes`

#### Scenario: Set aside
- **WHEN** the person sets the thread aside without answering
- **THEN** the outcome is `dismissed`

#### Scenario: Unclear reply
- **WHEN** the reply only contains prose that does not pick a choice
- **THEN** the agent asks again in the same thread and does not continue

### Requirement: Plannotator tool reply mapping
On the `plannotator-tool` channel, the paragraph SHALL map the decision message to an outcome: approval without notes is `approved`; approval with notes or comments is `approved_with_notes`; annotations or requested changes are `changes_requested`; closed without a decision is `dismissed`. An ambiguous message MUST be asked about. A code review MUST be confirmed to show the full branch diff, else the next channel is used.

#### Scenario: Tool approval with comments
- **WHEN** the decision message approves and carries comments
- **THEN** the outcome is `approved_with_notes`

#### Scenario: Tool review closed
- **WHEN** the review is closed without a decision
- **THEN** the outcome is `dismissed`

#### Scenario: Compare mode not confirmed
- **WHEN** the reviewer says the code review does not show the full branch diff
- **THEN** the agent opens the code review gate on the next available channel

### Requirement: Plannotator CLI failure and missing result
On the `plannotator-cli` channel, the paragraph SHALL treat the gate as failed to open when the CLI exits with code 2, or exits non-zero and leaves no result file, and SHALL treat a missing or unreadable result file after a zero exit as `dismissed`.

#### Scenario: Exit code 2
- **WHEN** the CLI gate exits with code 2
- **THEN** the gate failed to open and the agent uses the fallback channel

#### Scenario: Zero exit without result
- **WHEN** the CLI exits 0 and the result file is missing
- **THEN** the outcome is `dismissed`

### Requirement: Questions on the selected channel
The paragraph SHALL describe how to ask the user on the selected channel, and skills SHALL use it for every workflow question (explore, brainstorming, change selection, missing input, pauses). On the `inbox` channel each question MUST be a question block with short context and a `Recommended:` line, sent in the change's thread (or a topic thread before a change exists), after which the agent MUST end its turn.

#### Scenario: Brainstorm question
- **WHEN** brainstorming needs a decision on the `inbox` channel
- **THEN** the agent sends it as an Inbox question with context and a recommendation and ends its turn

#### Scenario: Plain channel question
- **WHEN** the selected channel is `plain`
- **THEN** the paragraph directs the agent to ask in plain text with numbered options, recommended first, and wait

### Requirement: Fallback on open failure
When the selected channel fails to open a gate or send a question, the agent SHALL tell the user and use the next channel in the listed fallback order, without a retry loop on the failed channel.

#### Scenario: Inbox send refused
- **WHEN** an Inbox send fails on the `inbox` channel
- **THEN** the agent reports it and opens the gate on the next listed channel
