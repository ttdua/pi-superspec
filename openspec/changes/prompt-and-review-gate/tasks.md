## 1. Channel detection and guidance (extension)

- [x] 1.1 Add `extensions/interaction-channel.ts` with a pure `detectChannel(activeTools, cliAvailable)` (order inbox → plannotator-tool → plannotator-cli → ask-tool → plain, exact or `__`-prefixed names only) and `availableChannels(...)`; unit tests in `tests/interaction-channel.test.ts` cover every scenario of "Channel detection" and "Prefixed tool names"
- [ ] 1.2 Add `channelGuidance(selected, fallback)` building the Interaction channel paragraph: selected channel mechanics, next available channel mechanics, plain text last resort; per-channel text for gates, outcome mapping (Inbox reply mapping, plannotator-tool mapping, CLI classification, failure and missing-result rules, code review variants) and questions; tests for content, absence of other mechanics and the 4096-byte cap over every combination
- [ ] 1.3 Add the CLI probe at `session_start` (activated projects, once per session, cached; pending or failing probe → unavailable, no user error) in `extensions/superspec.ts`; tests in `tests/extension.test.ts`
- [ ] 1.4 Feed `pi.getActiveTools()` and the cached probe into the `context` hook and pass the channel to the note builder; test that the channel changes between two `context` events without reload

## 2. Routing note

- [x] 2.1 Rewrite the routing paragraph in `extensions/routing-note.ts` as path guidance (no-spec work direct with TDD, `/opsx-ff`, `/opsx-new` for close review, questions answered directly, state path and reason, `docs/superpowers/` rule), dropping `MUST first be proposed`
- [ ] 2.2 Change `routingNote(language)` to `routingNote(language, channelParagraph)` keeping the marker first; update `createRoutingNoteMessage` and callers
- [ ] 2.3 Update `tests/routing-note.test.ts` and `tests/extension.test.ts` for the new note text, paragraph presence and the "No forced change" check

## 3. Skills

- [x] 3.1 Rewrite the identical "Review gate" section of `skills/opsx-continue/SKILL.md` and `skills/opsx-ff/SKILL.md`: keep outcomes, notes, cascade and code review position/loop; replace tier lists, CLI paragraphs and tool names with "open the gate on the channel in the routing note's Interaction channel paragraph"; rename the result column; keep the sections byte-identical
- [x] 3.2 Change `skills/opsx-continue/SKILL.md` to advance after approval: loop to the next ready planning artifact with its gate, stop when planning is complete or the next artifact is `apply`, handle partial specs, `changes_requested`, `dismissed` and the already-complete case; keep internal spec/plan reviews before each human gate
- [ ] 3.3 Replace `ask_user_question` wording in `opsx-new`, `opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive`, `opsx-generate-specs` and `opsx-ff` with "ask the user as the routing note's Interaction channel paragraph describes"; add that sentence to `opsx-explore` for its questions
- [ ] 3.4 Update `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts` and `tests/generate-specs-command.test.ts`: forbid `ask_user_question` and `plannotator` (case-insensitive in gate sections) in the named skills, assert the channel deferral wording, continue's advance-and-stop wording and gate-section identity

## 4. Docs

- [ ] 4.1 Update `docs/workflow.md` (Review gates, Routing note, Commands `/opsx-continue` row, Conflicts resolved #10) and `docs/architecture.md` (Components Extension row, Runtime flow, pi tool mapping, component tree with `interaction-channel.ts`)
- [ ] 4.2 Update `docs/glossary.md` (routing note, review gate, interaction channel), `docs/domain-model.md` where it describes the note, and `docs/usage-guide.md` (auto-continue, Inbox gates, how to enable the Pi Inbox tool)
- [ ] 4.3 Update `README.md` and `README.vi.md` (optional packages table, `/opsx-continue` description, workflow summary) and the doc-asserting tests in `tests/planning-commands.test.ts`
- [ ] 4.4 Add a CHANGELOG entry
- [ ] 4.5 At sync/archive, update the stale Purpose line of `openspec/specs/planning-commands/spec.md` ("one artifact per run") to describe advancing after approval

## 5. Verification

- [ ] 5.1 Run `npm test` and `npx tsc --noEmit`; run `openspec validate prompt-and-review-gate --strict`
- [ ] 5.2 Manual check in pi: injected note per channel (Inbox on, Inbox off with plannotator tool, CLI only, none) and one `/opsx-continue` gate through the Inbox that advances after approval
