## Context

The extension (`extensions/superspec.ts`) injects one routing note per agent run through the
`context` event, built by `routingNote(language)` in `extensions/routing-note.ts`. The note today
holds a fixed routing paragraph and the document language paragraph. Reviewer and question
tools are named inside the skills: `opsx-continue` and `opsx-ff` carry an identical "Review
gate" section with a four-tier list, and seven other skills name `ask_user_question` with a
plain-text fallback. Specs `review-gate`, `planning-commands`, `execution-commands` and
`generate-specs-command` encode those names and tests assert them.

Pi's extension API exposes `pi.getActiveTools()` (names declared to the model),
`pi.getAllTools()` and `pi.exec()`. The `context` handler is synchronous with respect to the
messages it returns, but it may be `async`.

## Goals / Non-Goals

**Goals:**
- Choose one interaction channel per `context` event from what the session really has, and
  inject guidance for it (and for the fallback chain below it) into the routing note.
- Keep skills tool-neutral: they refer to "the review gate", "an approval gate" and "ask the
  user" and defer to the injected guidance for the mechanics.
- Make `/opsx-continue` continue after approval up to `plan`.
- Rewrite the routing paragraph as path guidance.

**Non-Goals:**
- Blocking tool calls or enforcing the path the agent picks.
- Changing gate outcomes, notes handling, cascade, ff's two gates, or the code review gate's
  position and loop.
- Editing `schema/superspec/` (its instructions are already tool-neutral) or bumping the schema
  version.

## Decisions

### D1. Channel detection runs in the extension, per `context` event

`detectChannel(activeTools, cliAvailable)` is a pure function returning one of `inbox`,
`plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain`, checked in that order:

| Channel | Condition |
|---|---|
| `inbox` | an active tool named `plannotator_inbox` |
| `plannotator-tool` | an active tool named `plannotator` |
| `plannotator-cli` | the `plannotator` binary is on `PATH` |
| `ask-tool` | an active tool named `ask_user_question` |
| `plain` | none of the above |

Tool names are matched exactly or after a host prefix ending in `__` (for example
`mcp__x__plannotator_inbox`), so wrapped hosts still match. Only active tools count: a tool
that is configured but not declared to the model cannot be called, and pointing the agent at
it would fail.

*Alternative:* let the agent probe as today. Rejected by the brainstorm (option A).

### D2. CLI availability is probed once per session

`command -v plannotator` through `pi.exec("sh", ["-c", …])` runs at `session_start` and the
result is cached in the extension closure; `context` reads the cache. A missing cache (probe not
finished yet) counts as unavailable for that turn. Probing on every turn would add a process
spawn per LLM call.

### D3. Injected text: one channel section, plus the chain below it

The routing note gains an "Interaction channel" paragraph built by
`channelGuidance(channel)`. It names the selected channel and gives:
- **Review gate**: how to open it on that channel and how to read each outcome.
- **Asking the user**: how to ask a question (explore, brainstorm, missing input).
- **Fallback**: the mechanics of the next *available* channel (the one detection would pick
  if the selected channel were absent), then plain text as the last resort. Unavailable
  channels are omitted, so a fallback never points at a tool the session lacks, and the agent
  has what it needs to fall through without probing.

For `inbox` the text requires a self-contained message: a summary of what was produced and
why, each reviewed file in `attachments` in artifact order, and one `:::question` whose
choices are `Approve`, `Approve with notes` and `Request changes`, with a `Stakes:` line. It
also says to end the turn after sending, and maps the reply to outcomes:
- the chosen label gives `approved`, `approved_with_notes` or `changes_requested`;
- file annotations or written notes on `Approve` count as notes;
- `Skipped`, set aside or a closed question gives `dismissed`.

The full per-channel mechanics currently in the skills' "Review gate" section (CLI flags,
result file rules, JSON classification, the code review variants) move into the channel
paragraphs for `plannotator-tool` and `plannotator-cli`. Only the selected channel and its one fallback are
injected, which keeps the per-turn cost bounded (hard cap: 4 KB per combination, tested).

*Alternative:* inject every channel's text and let the agent pick. Rejected because it
reintroduces probing and costs more tokens.

On the `inbox` channel, all gates and questions of a change go to one thread named after the
change. The finalize code review on the Inbox attaches the full branch diff as a patch file
with the commit range and `git diff --stat`, since an Inbox message has no live diff view.

### D4. Skills keep the workflow, lose the mechanics

The identical "Review gate" section stays in `opsx-continue` and `opsx-ff` (the
`review-gate` spec keeps the identity requirement). It keeps the outcome table, the
notes and cascade rules and the code review gate's position and loop; the outcome table's
"Plannotator result" column becomes a channel-neutral "Result on the channel". Its reviewer-tier
paragraph, CLI paragraph and per-tier classification are replaced by one line: "Open the gate
on the channel named in the routing note's Interaction channel paragraph and follow it." Other
skills replace "use the `ask_user_question` tool if available, otherwise plain text with
numbered options" with "ask the user as the routing note's Interaction channel paragraph
describes".

The "no Claude tool names" requirements stay: `AskUserQuestion`, `TodoWrite` and `Task tool`
stay forbidden. The `todo` and `subagent` tool references are untouched.

### D5. Continue after approval

`opsx-continue` keeps "create exactly one artifact, then gate it". On `approved` (or on
`approved_with_notes` handled per the gate) it loops: re-read `openspec status`, and if the next
ready artifact is a planning artifact other than `apply`, create it and open its gate. It stops
when planning is complete or the next artifact is `apply`, and then points to `/opsx-apply`.
`dismissed` and `changes_requested` behave as today. The internal spec and plan reviews
still run before each human gate. ff is unchanged.

The gate itself is the user's consent to continue, so no extra prompt is added between
artifacts.

`finalize.md` keeps its "Reviewer tier" field; it now records the channel name (`inbox`,
`plannotator-tool`, ...). The bundled schema and template wording stay unchanged.

### D6. Routing paragraph

The `MUST` sentence is replaced by guidance:
- **No spec change** (small mistakes, typos, a fix restoring specified behaviour, a refactor):
  work directly with TDD, no change directory.
- **Spec change, requirements clear**: `/opsx-ff`.
- **Spec change needing close review**: `/opsx-new`, then `/opsx-continue`.
- **Questions, research, reviews**: answer directly.

The agent states the path it picked and a one-line reason before starting. The note keeps
"never write to `docs/superpowers/`" and keeps the marker as its first line, so the
duplicate check and existing insertion rules are unchanged.

### D7. Public surface

- The routing note text is the only injected contract. It is internal to the package (no
  export is consumed outside it), so no public contract changes.
- `routingNote(language)` becomes `routingNote(language, channel)`. It is internal: its
  callers are the extension and the tests.

## Risks / Trade-offs

- [The Inbox tool is off by default in Pi] → detection falls to `plannotator-tool` or
  `plannotator-cli`; `docs/usage-guide.md` says how to turn the Inbox tool on.
- [Inbox replies are prose, not JSON, so outcome mapping is less strict] → the gate's
  question has exactly three choices, the mapping is written into the injected text, and an
  ambiguous reply is asked about again in the same thread, never assumed approved.
- [The active tool set changes mid-session] → detection runs on every `context` event, so the
  next turn uses the new channel. A gate already sent to the Inbox stays there.
- [The channel text lives in TypeScript and is harder to review] → one test per channel snapshots
  the injected text, and a size test caps it.
- [Auto-continue runs several artifacts in one session] → it never passes `apply`; every step
  still has its own human gate.
- [Specs that assert `ask_user_question` in skills] → their deltas replace those scenarios with
  "defers to the injected channel" in the same change, so tests and specs move together.

## Migration Plan

No data or schema migration. The change ships with the package; activated projects get the
new note on the next turn, and the CLI probe runs at the next session start or reload.
Rollback is a package downgrade. In-flight changes are unaffected: artifact IDs and the DAG are
unchanged.

## Open Questions

None.
