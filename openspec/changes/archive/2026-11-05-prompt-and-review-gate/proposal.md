## Why

Skills hard-code reviewer and question tools (`plannotator`, the Plannotator CLI,
`ask_user_question`) and make the agent probe for them, every approval stops the workflow until
the user types the next command, and the routing note forces all behaviour work into the
Superspec flow with `MUST` wording. The user wants to review remotely through the Plannotator
Inbox, wants approvals to carry the workflow forward, and wants the agent to pick a path that
fits the work. Moving channel choice into the extension, which already injects the document
language per turn, keeps skills tool-neutral and puts only the channels that really exist into
the prompt.

## What Changes

**Interaction channel guidance**
- From: each skill lists reviewer tiers and ask-tool fallbacks by tool name.
- To: the extension detects the available channel on each `context` event and injects review
  gate and question guidance for it into the routing note. Preference: Plannotator Inbox →
  `plannotator` tool → Plannotator CLI → `ask_user_question` → plain text. Skills say only
  "review gate", "approval gate" or "ask the user".
- Reason: user request (1) and (3); remote review.
- Impact: non-breaking for users; skills and specs that name tools are rewritten.

**Self-contained Inbox gates and questions**
- To: an Inbox gate carries a summary, the reviewed files as attachments, and the decision as a
  question whose choices are the gate outcomes. Questions in `/opsx-explore` and brainstorming
  use the same channel.
- Reason: decide without reading the terminal.

**Approval continues planning**
- From: `/opsx-continue` creates one artifact, gates it, and stops; approval does not advance.
- To: after `approved` (or `approved with notes` handled as today) it creates the next planning
  artifact and gates it, until `plan` is done; it stops before `apply`.
- Reason: user request (2). Impact: behaviour change of `/opsx-continue`.

**Routing note as path guidance**
- From: behaviour work MUST go through `/opsx-new`; small no-spec work uses TDD.
- To: no spec change → direct work outside Superspec; spec change with clear requirements →
  `/opsx-ff`; spec change needing close review → `/opsx-new`; questions and research are
  answered directly. The agent states its choice in one line.
- Reason: user request (4).

**Docs** — `docs/workflow.md`, `docs/architecture.md`, `docs/glossary.md`,
`docs/domain-model.md`, `docs/usage-guide.md` and both READMEs are updated to match.

## Capabilities

### New Capabilities
- `interaction-channel`: detection of the available review and question channel, its
  preference order and fallback, the injected per-channel guidance, and the self-contained
  content rule for Inbox gates and questions.

### Modified Capabilities
- `routing-note`: note content becomes path guidance; the note gains the interaction channel
  paragraph next to the document language paragraph.
- `review-gate`: reviewer selection and Plannotator invocation defer to the injected channel
  guidance; outcomes, notes handling, cascade and the code review gate stay.
- `planning-commands`: `/opsx-continue` continues after approval and stops before apply; skills
  name no ask or review tool; explore and brainstorm questions use the injected channel.
- `execution-commands`: asking the user uses the injected channel instead of naming
  `ask_user_question`.
- `generate-specs-command`: the confirmation question uses the injected channel instead of
  naming `ask_user_question`.

## Impact

- Code: `extensions/routing-note.ts`, `extensions/superspec.ts` (channel detection in the
  `context` hook); tests under `tests/` for the note, the skills and the specs that name tools.
- Skills: `opsx-continue`, `opsx-ff`, `opsx-explore`, `opsx-new`, `opsx-apply`, `opsx-verify`,
  `opsx-sync`, `opsx-archive`, `opsx-generate-specs`.
- Bundled schema: no change expected (its instructions are already tool-neutral).
- Dependencies: none added. Push and PR policy unchanged.
