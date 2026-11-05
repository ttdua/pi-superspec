# Interaction Channel and Review Gate Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `design.md`.

**Goal:** Detect the available review and question channel in the extension, inject its guidance into the routing note, make skills tool-neutral, let `/opsx-continue` advance after approval up to `apply`, and rewrite the routing paragraph as path guidance.

**Architecture:** A new pure module `extensions/interaction-channel.ts` lists the available channels from the active tool names and a cached CLI probe, and builds the Interaction channel paragraph: the selected channel, the next available channel as the fallback, then plain text. `extensions/routing-note.ts` composes the routing, language and channel paragraphs. `extensions/superspec.ts` probes the CLI at `session_start` and reads `pi.getActiveTools()` on every `context` event. Skills keep the workflow rules and defer the mechanics to the injected paragraph.

**Tech Stack:** TypeScript (ESM, `.ts` imports), vitest, pi extension API (`getActiveTools`, `exec`, `context`, `session_start`). The package manager stays `npm` because the repository is locked by `package-lock.json`.

## Global Constraints

- Repository content is English. The document language of OpenSpec artifacts is `en`.
- Do not edit `openspec/schemas/superspec/` (upstream). Do not bump the bundled schema version (it stays 6). `schema/superspec/` needs no change.
- No new dependencies. The extension must not block any tool call.
- Paragraph size: at most 4096 bytes (UTF-8) for every combination of available channels. Budget about 1700 bytes per channel block plus a footer of about 200 bytes. If the cap fails, shorten the wording; never drop a rule a spec scenario asserts.
- Channel order: `inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain`.
- Tool names: `plannotator_inbox`, `plannotator`, `ask_user_question`. A name matches when it is exact or follows a prefix ending in `__`.
- Forbidden in skills and prompts:
  - in every file: `AskUserQuestion`, `TodoWrite`, `Task tool`;
  - in every file under `skills/` and `prompts/`: `ask_user_question` and `plannotator`, case-insensitive.
- Gate outcomes stay `approved`, `approved_with_notes`, `changes_requested`, `dismissed`. The two "Review gate" sections stay byte-identical.
- Every task ends with `npm test` and `npm run typecheck` green before its commit.

## Review Focus

1. A context event before the CLI probe resolves must not throw and must treat the CLI as unavailable. Covered in Task 4 by `probe pending`.
2. A `pi` without `getActiveTools` or `exec` (an older host, or the existing test doubles) must still inject a `plain` note, and `session_start` must not throw. Covered in Task 4 by `missing getActiveTools` and `no exec available`.
3. `mcp__plannotator__plannotator` must select `plannotator-tool`, not `inbox`. Covered in Task 1 by `prefixed plannotator is not inbox`.
4. An unclear Inbox reply must never advance `/opsx-continue`. Covered in Task 2 by `inbox outcome mapping`.
5. A stale probe result from an earlier session start must not overwrite a newer one. Covered in Task 4 by `stale probe ignored`.

---

## Contracts

`channelParagraph(available)` replaces the `channelGuidance(selected, fallback)` named in tasks.md 1.2 and design D3. The behaviour is the same, but taking the ordered available list lets one function decide both the fallback and the omission rule.

| Name | new / modified | Shape | public |
|---|---|---|---|
| `Channel` | new | `type Channel = "inbox" \| "plannotator-tool" \| "plannotator-cli" \| "ask-tool" \| "plain"` in `extensions/interaction-channel.ts` | no |
| `CHANNEL_ORDER` | new | `readonly Channel[]`, in the order above | no |
| `availableChannels` | new | `(activeTools: readonly string[], cliAvailable: boolean) => Channel[]`: the available channels in order, always ending with `"plain"` | no |
| `detectChannel` | new | `(activeTools: readonly string[], cliAvailable: boolean) => Channel`: `availableChannels(...)[0]` | no |
| `channelParagraph` | new | `(available: readonly Channel[]) => string`: mechanics of `available[0]`, then of `available[1]` when that is not `"plain"`, then the plain-text last resort; starts with `Interaction channel: <available[0]>.` | no |
| `routingNote` | modified | `(language: string, channelText = "") => string`, previously `(language: string)`; the default only keeps Task 3 green, and Task 4 always passes the argument | no |
| `createRoutingNoteMessage` | modified | `(language: string, channelText = "") => { role: "user"; content: { type: "text"; text: string }[]; timestamp: number }` | no |
| `ROUTING_NOTE` | modified | the routing paragraph only; still starts with `ROUTING_NOTE_MARKER` | no |
| Routing note text | modified | marker and routing paragraph, then the document language paragraph, then the Interaction channel paragraph | no |
| CLI probe state | new | closure in `superspec.ts`: `cliAvailable: boolean` (reset to `false` at each `session_start`) and `probeGeneration: number` (a newer start invalidates older results) | no |
| `finalize.md` "Reviewer tier" value | modified | a `Channel` name | no |

---

## Task 1: Channel detection — implements 1.1

**Files:**
- Create: `extensions/interaction-channel.ts`
- Test: `tests/interaction-channel.test.ts`

**Interfaces:**
- Produces: `Channel`, `CHANNEL_ORDER`, `availableChannels`, `detectChannel`.

- [ ] **Step 1: Write the failing tests** in `describe("detectChannel")`:

  | Test | Input | Expected |
  |---|---|---|
  | `inbox preferred` | `(["plannotator_inbox","plannotator","ask_user_question"], true)` | `"inbox"` |
  | `plannotator tool without inbox` | `(["plannotator","ask_user_question"], true)` | `"plannotator-tool"` |
  | `cli only` | `(["read"], true)` | `"plannotator-cli"` |
  | `ask tool only` | `(["ask_user_question"], false)` | `"ask-tool"` |
  | `nothing available` | `([], false)` | `"plain"` |
  | `inactive tools do not count` | `(["read","bash"], false)` | `"plain"`; the Inbox tool counts only when it is in the active list |
  | `prefixed inbox` | `(["mcp__plannotator__plannotator_inbox"], false)` | `"inbox"` |
  | `prefixed plannotator is not inbox` | `(["mcp__plannotator__plannotator"], false)` | `"plannotator-tool"` |
  | `look-alike name` | `(["plannotator_inbox_legacy"], false)` | `"plain"` |
  | `available list` | `availableChannels(["plannotator","ask_user_question"], false)` | `["plannotator-tool","ask-tool","plain"]` |

- [ ] **Step 2:** Run `npx vitest run tests/interaction-channel.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the four exports. A name matches tool `t` when `name === t || name.endsWith("__" + t)`.
- [ ] **Step 4:** Run the test file, `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(interaction-channel): detect the review channel`.

---

## Task 2: Channel paragraph — implements 1.2

**Files:**
- Modify: `extensions/interaction-channel.ts`
- Test: `tests/interaction-channel.test.ts`

**Interfaces:**
- Consumes: `Channel`, `availableChannels` (Task 1).
- Produces: `channelParagraph(available)`.

Each channel block has a Gate part, an Outcomes part, a Questions part and a Code review part. Where today's "Review gate" section of `skills/opsx-continue/SKILL.md` already has the rule, copy its wording.

- **`inbox`**
  - Gate: one `plannotator_inbox` `send_message`, in a thread named after the change (a topic thread before a change exists). The message carries:
    - a summary of what was produced and why;
    - every reviewed file in `attachments`, in artifact order;
    - one `:::question` with the choices `Approve`, `Approve with notes` and `Request changes`, plus a `Stakes:` line.

    Then end your turn.
  - Outcomes:
    - `Approve` alone is `approved`.
    - `Approve` with notes or annotations, or `Approve with notes`, is `approved_with_notes`.
    - `Request changes` is `changes_requested`.
    - Skipped, set aside or closed is `dismissed`.
    - Anything unclear: ask again in the thread; never treat it as approval.
  - Questions: a `:::question` with short context and a `Recommended:` line, then end your turn.
  - Code review: the commit range, `git diff --stat`, and the full diff against the feature branch from `apply.md`, written to a scratch `.patch` file and attached.
- **`plannotator-tool`**
  - Gate: today's Tier 1. Call the tool with the gate enabled on the target files, end your turn, and take the decision message as the result.
  - Outcomes: approval without notes is `approved`; approval with notes or comments is `approved_with_notes`; annotations are `changes_requested`; closed is `dismissed`; ambiguous means ask.
  - Code review: the `review` action based on the feature branch. Ask the reviewer to confirm that it shows the full branch diff; if not, use the fallback.
- **`plannotator-cli`**
  - Gate: today's "Run the CLI" rules: `plannotator annotate <files> --gate --json --result-file <fresh path in scratch or mktemp -d, outside the change dir>`, run in the background.
  - Outcomes: today's "Classify the result" rules: `decision` and `feedback` only; an unknown decision is dismissed; a result file that is missing or unreadable after exit 0 is dismissed. Tests assert the literal phrases `missing or unreadable` and `an unknown decision is dismissed`.
  - Failure: exit code 2, or a non-zero exit with no result file, means the gate failed to open. A missing result file after exit 0 is `dismissed`.
  - Code review: `plannotator review --base <feature branch> --diff-type merge-base --gate --json` with stdout redirected to a fresh scratch file. Decide from `decision` only; read `message` only to tell plain approval from approval with notes.
- **`ask-tool`**
  - Gate: `ask_user_question` with the three options, notes as free text.
  - Code review: show `git diff --stat` and the commit range.
- **`plain`**
  - Gate and questions: numbered options, recommended first, then wait.
  - Code review: the same summary as `ask-tool`.
- **Footer**: "If <selected> fails to open, tell the user and use <fallback>; as a last resort ask in plain text with numbered options."

Helper for the tests: `namesFor(channels)` maps each channel to its tool name (cli → none).

- [ ] **Step 1: Write the failing tests** in `describe("channelParagraph")`. Each row asserts the scenario's THEN:

  | Test | Input | Assertions |
  |---|---|---|
  | `cli gate and classification` | `["plannotator-cli","plain"]` | contains `--gate --json`, `--result-file`, `mktemp -d`, `change dir`, `decision`, `feedback`, `annotated`, `changes_requested`, `approved_with_notes`, `unknown`, `dismissed` |
  | `cli failure` | `["plannotator-cli","plain"]` | contains `code 2`, `missing or unreadable`, and `an unknown decision is dismissed` |
  | `cli code review` | `["plannotator-cli","plain"]` | contains `plannotator review --base`, `--diff-type merge-base`, `stdout`, ``Decide approve-or-not from `decision` only``, ``use `message` as the reviewer's notes to apply`` |
  | `fallback is next available` | `["plannotator-tool","ask-tool","plain"]` | contains `ask_user_question` and the exact footer `If plannotator-tool fails to open, tell the user and use ask-tool`; no `--result-file`, no `plannotator_inbox` |
  | `omits unavailable` | `["inbox","plain"]` | contains `plannotator_inbox`, `attachments` and the footer naming plain text; no `--result-file`, no `ask_user_question` |
  | `other mechanics absent` | `["ask-tool","plain"]` | contains `three options` and `git diff --stat`; no `--result-file`, no `plannotator_inbox` |
  | `inbox gate content` | `["inbox","plain"]` | contains `thread`, `change`, `attachments`, `artifact order`, `:::question`, `Approve`, `Approve with notes`, `Request changes`, `Stakes:`, `end your turn` |
  | `inbox outcome mapping` | `["inbox","plain"]` | maps annotations → `approved_with_notes`, set aside → `dismissed`, unclear → ask again and `never` approval |
  | `inbox questions` | `["inbox","plain"]` | contains `Recommended:` |
  | `inbox code review` | `["inbox","plain"]` | contains `.patch`, `git diff --stat`, `commit range` |
  | `tool gate and mapping` | `["plannotator-tool","plain"]` | contains `gate`, `end your turn`, comments → `approved_with_notes`, closed → `dismissed`, `full branch diff`, and `if it does not, use the fallback` |
  | `plain questions` | `["plain"]` | contains `numbered options`, `recommended first`, `wait` |
  | `size cap` | every subset of the four non-plain channels, through `availableChannels(namesFor(S), S.includes("plannotator-cli"))` | `Buffer.byteLength(text) <= 4096` |

- [ ] **Step 2:** Run `npx vitest run tests/interaction-channel.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `channelParagraph` as one string-builder per channel block plus the footer.
- [ ] **Step 4:** Run the test file, `npm test` and `npm run typecheck`. Expected: PASS, size cap included.
- [ ] **Step 5:** Commit `feat(interaction-channel): build the channel paragraph`.

---

## Task 3: Routing note text — implements 2.1, 2.2

**Files:**
- Modify: `extensions/routing-note.ts`
- Test: `tests/routing-note.test.ts`

**Interfaces:**
- Produces: `routingNote(language, channelText = "")` and `createRoutingNoteMessage(language, channelText = "")`.

- [ ] **Step 1: Update the tests** in `describe("ROUTING_NOTE")` and `describe("routingNote")`:
  - `starts with marker`: the note starts with `ROUTING_NOTE_MARKER`.
  - `route content`: the note contains `/opsx-ff`, `/opsx-new`, `TDD`, `docs/superpowers/`, and answering questions directly.
  - `states path and reason`: the note contains the instruction to state the chosen path and a one-line reason.
  - `no forced change`: the note contains no `MUST first be proposed`, and every line containing `/opsx-new` also contains `review`.
  - `language then channel`: `routingNote("vi", "Interaction channel: plain.")` contains the language paragraph naming `"vi"` and ends with `Interaction channel: plain.`.
  - The existing one-argument calls stay valid through the default.
- [ ] **Step 2:** Run `npx vitest run tests/routing-note.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Rewrite `ROUTING_NOTE` with four bullets (see design D6), the path-and-reason line, and the `docs/superpowers/` rule. Append `channelText` after the language paragraph when it is non-empty.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS, with `tests/extension.test.ts` still green because of the default.
- [ ] **Step 5:** Commit `feat(routing-note): path guidance and channel paragraph`.

---

## Task 4: Extension wiring — implements 1.3, 1.4, 2.3

**Files:**
- Modify: `extensions/superspec.ts`
- Test: `tests/extension.test.ts`

**Interfaces:**
- Consumes: `availableChannels`, `channelParagraph` (Tasks 1–2), `createRoutingNoteMessage` (Task 3).

- [ ] **Step 1: Write the failing tests.** Give `loadAll` optional `getActiveTools` and `exec` stubs. Without them the fake stays as today.

  | Test | Setup | Expected |
  |---|---|---|
  | `probe cached` | one `session_start` with a UI in a marked project, then three `context` events | `exec` called once, with `sh` and an argument containing `command -v plannotator` |
  | `probe without UI` | `session_start` in a marked project with `hasUI: false` | `exec` called once |
  | `probe only in activated projects` | `session_start` in an unmarked project | `exec` not called |
  | `probe pending` | `exec` returns a never-resolving promise; one `context` event | the note contains `Interaction channel: plain.` and nothing throws |
  | `probe exits non-zero` | `exec` resolves `{ code: 1 }` | the next note is not `plannotator-cli` |
  | `probe fails` | `exec` rejects | awaiting the handler's returned promise resolves; no `ui.notify` call beyond the Superpowers warning; the next note is not `plannotator-cli` |
  | `cli found` | `exec` resolves `{ code: 0 }` | after `await handler(...)`, the next note contains `Interaction channel: plannotator-cli.` |
  | `stale probe ignored` | the first start's `exec` resolves `{ code: 0 }` after a second start whose `exec` resolves `{ code: 1 }` | the note is not `plannotator-cli` |
  | `no exec available` | the fake has no `exec`; `session_start` in a marked project | no throw, and the note is `plain` |
  | `missing getActiveTools` | the fake has no `getActiveTools` | the note contains `Interaction channel: plain.` |
  | `inactive tool not selected` | `getActiveTools` returns `["read"]` | the note contains `Interaction channel: plain.` |
  | `tool set changes mid-session` | `getActiveTools` returns `[]`, then `["plannotator_inbox"]`, on fresh message arrays | the first note says `plain`, the second `inbox` |
  | `no duplicate after channel change` | the messages already contain a note; the channel now differs | the result is `undefined` (unchanged) |

  Update the existing assertions so they expect `routingNote(lang, channelParagraph(["plain"]))`.
- [ ] **Step 2:** Run `npx vitest run tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 3:** In `superspec.ts`:
  - Add the closure state `let cliAvailable = false; let probeGeneration = 0;`.
  - `session_start` becomes `async`:
    1. Return when the project is not activated.
    2. Run the existing Superpowers warning synchronously first, unchanged and UI-only.
    3. Set `cliAvailable = false` and `const gen = ++probeGeneration`.
    4. If `typeof pi.exec === "function"`, `await pi.exec("sh", ["-c", "command -v plannotator"], { timeout: 5000 })` inside try/catch, and when `gen === probeGeneration` set `cliAvailable = result.code === 0`.
  - `context`: `const tools = typeof pi.getActiveTools === "function" ? pi.getActiveTools() : []`, then pass `channelParagraph(availableChannels(tools, cliAvailable))` to `createRoutingNoteMessage`.
  - On a host without `sh` (Windows) the probe fails, which counts as unavailable, as the spec requires.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(extension): inject the interaction channel paragraph`.

---

## Task 5: Tool-neutral review gate section — implements 3.1, 3.4

**Files:**
- Modify: `skills/opsx-continue/SKILL.md`, `skills/opsx-ff/SKILL.md` (the "Review gate" sections, kept byte-identical)
- Test: `tests/planning-commands.test.ts`

- [ ] **Step 1: Update the tests** in `describe("continue review gate")`:
  - Remove `gate picks the reviewer in order`, `gate runs the CLI with a fresh result file`, `code review CLI tier pins the full branch diff mode`, `code review tool tier asks to confirm the full branch diff`, `code review CLI tier keeps approve with notes`, `tool tier takes its decision message as the result` and `a non-zero exit without a result file is a tier failure`. Task 2's tests now cover their rules.
  - Replace `gate classifies by decision only` with `gate defers to the Interaction channel`: the section contains `Interaction channel` and the table header `Result on the channel`.
  - Replace `gate falls through when a tier fails` with `gate falls back when the channel fails`: the section contains `fails to open` and `fallback`.
  - Add `gate section has no tool names`: the section matches neither `/plannotator/i` nor `ask_user_question`.
  - Replace `gate covers code review` with `code review uses the injected channel`: the section contains `code review`, `before the feature branch` and `Interaction channel`.
  - Add `dismissed code review does not proceed`: the section contains `dismissed` near `code review` and `not approved`.
  - Add `receipt records the channel as reviewer tier`: the section contains `reviewer tier` and `channel`.
  - Split `gate keeps review notes, late brainstorm cascade and resume point explicit`. Keep only `open the next gate on every artifact that depends on it`, `at step 3` and `not at step 2b`, and drop the `decision`-only, `message`-as-notes and `missing or unreadable` checks, which now live in Task 2's `cli code review` and `cli failure`.
  - Keep unchanged: `gate lists the four outcomes`, `gate handles notes`, `gate defines the cascade`, `gate does not depend on its position or on continue`, `code review fixes update apply.md as a new iteration`, `late brainstorm revision reopens brainstorm.md plus all five`, `continue runs the finalize code review gate before the document gate`, and `ff and continue share an identical review gate`.
- [ ] **Step 2:** Run `npx vitest run tests/planning-commands.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Edit both sections the same way:
  - Replace the "Choose the reviewer", "When a tier fails to open", "Run the CLI" and "Classify the result" bullets with: "**Open the gate** on the channel named in the routing note's Interaction channel paragraph and follow its mechanics; when it fails to open, tell the user and use the fallback it names."
  - Rename the table column to `Result on the channel` and fill it from channel-neutral wording.
  - In the code review gate, replace items 1–3 with "Open it with the Interaction channel paragraph's code review mechanics; `dismissed` is not approved." Keep items 4–6, and make item 6 record the channel name as the reviewer tier.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `refactor(skills): tool-neutral review gate`.

---

## Task 6: Continue advances after approval — implements 3.2, 3.4

**Files:**
- Modify: `skills/opsx-continue/SKILL.md` (step 3, step 4, Output, Guardrails and the frontmatter description); `prompts/opsx-continue.md` only if its description says "then stops"
- Test: `tests/planning-commands.test.ts`

Surviving wording, decided here:
- "Create exactly one artifact per gate".
- "STOP when planning is complete or the next ready artifact is `apply`".
- "Only a human gate approval advances".

- [ ] **Step 1: Update the tests:**
  - Rename `continue creates one artifact then stops` to `continue creates one artifact per gate`. It asserts `exactly one artifact per gate`.
  - Rename `continue runs the gate before it stops` to `continue runs the gate before advancing`. It asserts, in order: `Create the artifact file`, `Review gate`, `On \`approved\``, `next ready artifact`.
  - Rename `continue does not advance after approval` to `continue stops before apply`. In Guardrails it asserts:
    - `Only a human gate approval advances`;
    - `STOP when planning is complete or the next ready artifact is \`apply\``;
    - `Do NOT create an \`apply\` artifact`;
    - the strings `changes_requested` and `dismissed` in the no-advance sentence.
  - `SA-P03 …` changes from `Create exactly one artifact per invocation` to `Create exactly one artifact per gate`, and adds `/advisory[^.\n]*not (a )?(human )?approval/i` together with `/(verdict|internal review)[^.\n]*(does not|never) advance/i`.
  - `continue completes a partial glob artifact with only the missing files` additionally asserts `after approval, continue`.
  - `continue points to /opsx-apply when planning is complete` additionally asserts that a ready `finalize` is still created.
  - In `continue frontmatter mentions the review gate`, replace `toContain("run a review gate on it, then stop")` with `toContain("run a review gate on it, and after approval continue until apply")` and `not.toContain("then stop")`. Keep `not.toContain("then stop for review")`.
- [ ] **Step 2:** Run `npx vitest run tests/planning-commands.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Edit the skill:
  - Add an approval loop in step 3: on `approved`, or `approved_with_notes` handled per the gate, go back to step 2 and create the next ready artifact. Planning complete or `apply` next means STOP and point to `/opsx-apply`. `changes_requested` reopens the gate; `dismissed` asks the user.
  - Partial artifacts continue after approval.
  - When planning is already complete, create a ready `finalize`; otherwise point to `/opsx-apply`.
  - Make the Guardrails and Output wording match the surviving wording above.
  - New frontmatter description: "Continue an OpenSpec change by creating the next ready artifact, run a review gate on it, and after approval continue until apply. Use when the user wants to progress their change or create the next artifact."
  - Intro line: "Continue working on a change by creating the next artifact, gating it, and advancing after approval."
  - In the Superpowers artifact rule, "run past the STOP after this artifact" becomes "run past the gate for this artifact". Keep the word `STOP` in that rule's "STOP and tell the user to install Superpowers".
  - Replace step 3's last bullet "STOP after creating that one artifact (and its gate)" with the approval loop.
  - Keep these four phrases, in order, for `continue runs the finalize code review gate before the document gate`: `If the artifact is \`finalize\``, `before the git-side closeout`, ``Run the **Review gate** on the written file(s)``, `follow-up commit and push on the feature branch`.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(opsx-continue): advance after approval up to apply`.

---

## Task 7: Ask the user through the channel — implements 3.3, 3.4

**Files:**
- Modify the `SKILL.md` of: `opsx-new`, `opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive`, `opsx-generate-specs`, `opsx-ff`, `opsx-continue` (change selection), `opsx-explore`
- Test: `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts`, `tests/generate-specs-command.test.ts`

- [ ] **Step 1: Update the tests:**
  - `planning-commands.test.ts`:
    - `contains no Claude tool names` additionally asserts `not.toMatch(/ask_user_question|plannotator/i)` over every file under `skills/` and `prompts/`.
    - `skills that ask the user state a plain-text fallback` becomes `skills ask through the Interaction channel`: for new, continue and ff, each contains `Interaction channel` and `numbered options`.
    - Add `explore asks through the Interaction channel`: the explore skill contains `Interaction channel`.
  - `execution-commands.test.ts`:
    - `contains no Claude tool names` additionally asserts `not.toMatch(/ask_user_question|plannotator/i)` over the four execution skills and prompts.
    - `skills that ask the user state a plain-text fallback` becomes `skills ask through the Interaction channel`, with `Interaction channel` replacing `ask_user_question`.
  - `generate-specs-command.test.ts`:
    - `uses no Claude tool names` additionally asserts `not.toMatch(/ask_user_question|plannotator/i)`.
    - In `states the required rules and values`, `ask_user_question` (line ~54) is replaced by `Interaction channel`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL in these files.
- [ ] **Step 3:** Replace each "use the `ask_user_question` tool if available; otherwise … plain text with numbered options (recommended first) and wait" with "ask the user as the routing note's Interaction channel paragraph describes (plain text with numbered options, recommended first, when it names no tool)". Add one line to the explore stance: "Ask questions through the routing note's Interaction channel paragraph."
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `refactor(skills): ask through the interaction channel`.

---

## Task 8: Docs — implements 4.1, 4.2, 4.3, 4.4, 4.5

**Files:**
- Modify: `docs/workflow.md`, `docs/architecture.md`, `docs/glossary.md`, `docs/domain-model.md`, `docs/usage-guide.md`, `README.md`, `README.vi.md`, `CHANGELOG.md`
- Modify at sync/archive: the Purpose line of `openspec/specs/planning-commands/spec.md`
- Test: `tests/planning-commands.test.ts` (`workflow doc describes the review gates`)

- [ ] **Step 1: Update `workflow doc describes the review gates`:**
  - Keep the checks for `Review gate`, `brainstorm.md`, `code review gate`, and the "ff runs unattended" negative.
  - Keep `wf` containing `plannotator`: the doc still names the Inbox and the Plannotator channels.
  - Replace the architecture-row checks (`--result-file`, `plannotator review`, `stdout is redirected`, `ask_user_question`). The new finder is the first `|` row of `docs/architecture.md` containing `` `plannotator_inbox` `` (exactly one such row, the "Review written work" row of the pi tool mapping). It must contain `detected` and `Interaction channel`.
  - Add: workflow.md lists `inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain` in order, and contains "stops before `apply`".
  - Add: the README `/opsx-continue` row does not contain `then stops`.
- [ ] **Step 2:** Run `npx vitest run tests/planning-commands.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Edit the docs:
  - workflow.md: Review gates, Routing note, the Commands row, Conflict #10.
  - architecture.md: the Extension row in Components, the tree with `interaction-channel.ts`, the Runtime flow probe and `context` channel, the pi tool mapping rows.
  - glossary.md: routing note, review gate, a new "Interaction channel" entry.
  - domain-model.md: the routing note mention.
  - usage-guide.md: auto-continue, Inbox gates, and how to turn the Pi Inbox tool on: `{ "inboxTool": { "pi": true } }` in Plannotator's `config.json`, then a new session or `/reload`.
  - README.md and README.vi.md: optional packages, the workflow summary, the command table.
  - CHANGELOG: an Unreleased entry.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `docs: interaction channel, auto-continue and routing paths`.

---

## Task 9: Verification — implements 5.1, 5.2

- [ ] **Step 1:** Run `npm test` (all pass), `npm run typecheck` (exit 0) and `openspec validate prompt-and-review-gate --strict` (valid).
- [ ] **Step 2:** In pi, in this repository, record the `Interaction channel:` line of the injected note in `apply.md` for four cases:
  - the Inbox tool on;
  - the Inbox off with the plannotator tool;
  - no tools, with the CLI on `PATH`;
  - no tools, with plannotator not on `PATH`.
- [ ] **Step 3:** In pi with the Inbox on, run `/opsx-continue` on a throwaway change and approve its brainstorm gate in the Inbox. Confirm that proposal is created and gated without a new command, then delete the throwaway change.

---

## Scenario → test

Test names refer to `describe` › `it` in the file named. Each is defined in a task step above.

**interaction-channel**
- Inbox preferred → `interaction-channel.test.ts` › detectChannel › inbox preferred
- Plannotator tool without Inbox → detectChannel › plannotator tool without inbox
- CLI only → detectChannel › cli only
- Ask tool only → detectChannel › ask tool only
- Nothing available → detectChannel › nothing available
- Configured but inactive tool → detectChannel › inactive tools do not count; `extension.test.ts` › inactive tool not selected
- Tool set changes mid-session → `extension.test.ts` › tool set changes mid-session
- Prefixed Inbox tool → detectChannel › prefixed inbox
- Look-alike name → detectChannel › look-alike name
- Probe cached → `extension.test.ts` › probe cached
- Probe pending → `extension.test.ts` › probe pending
- Probe fails → `extension.test.ts` › probe fails
- Paragraph names the channel → channelParagraph › cli gate and classification
- Fallback is the next available channel → channelParagraph › fallback is next available
- Fallback list omits unavailable channels → channelParagraph › omits unavailable
- Other mechanics absent → channelParagraph › other mechanics absent
- Size cap → channelParagraph › size cap
- Artifact gate message → channelParagraph › inbox gate content; manual Task 9 step 3
- Several files → channelParagraph › inbox gate content (`artifact order`)
- One thread per change → channelParagraph › inbox gate content (`thread`, `change`)
- Code review on the Inbox → channelParagraph › inbox code review
- Approve with annotations → channelParagraph › inbox outcome mapping
- Set aside → channelParagraph › inbox outcome mapping
- Unclear reply → channelParagraph › inbox outcome mapping
- Tool approval with comments → channelParagraph › tool gate and mapping
- Tool review closed → channelParagraph › tool gate and mapping
- Compare mode not confirmed → channelParagraph › tool gate and mapping
- Exit code 2 → channelParagraph › cli failure
- Zero exit without result → channelParagraph › cli failure
- Brainstorm question → channelParagraph › inbox questions; `planning-commands.test.ts` › explore asks through the Interaction channel
- Plain channel question → channelParagraph › plain questions
- Inbox send refused → channelParagraph › fallback is next available (footer)

**routing-note**
- Note text → `routing-note.test.ts` › route content
- Path stated → routing-note › states path and reason
- No forced change → routing-note › no forced change
- Paragraphs present → routing-note › language then channel; routing-note › starts with marker
- No enforcement → `extension.test.ts` › registers no tool_call handler (existing)

**review-gate**
- Gate on the injected channel → `planning-commands.test.ts` › gate defers to the Interaction channel
- Agent tool available → channelParagraph › tool gate and mapping
- CLI only → channelParagraph › cli gate and classification
- No Plannotator → channelParagraph › other mechanics absent (`three options`)
- Nothing installed → channelParagraph › plain questions
- Open failure falls through → planning-commands › gate falls back when the channel fails
- No tool names in the gate section → planning-commands › gate section has no tool names
- Result classification → channelParagraph › cli gate and classification (`feedback`, `approved_with_notes`)
- Annotated → channelParagraph › cli gate and classification (`annotated`, `changes_requested`)
- Known decision values → channelParagraph › cli gate and classification
- Unknown decision → channelParagraph › cli gate and classification (`unknown`, `dismissed`)
- Result file location → channelParagraph › cli gate and classification (`change dir`)
- Result file directory → channelParagraph › cli gate and classification (`mktemp -d`)
- Gate position → planning-commands › code review uses the injected channel
- Reviewer tier order → planning-commands › code review uses the injected channel; channelParagraph › fallback is next available
- Inbox code review → channelParagraph › inbox code review
- Plannotator code review → channelParagraph › tool gate and mapping
- CLI code review → channelParagraph › cli code review
- Decision source → channelParagraph › cli code review
- Diff summary fallback → channelParagraph › other mechanics absent (`git diff --stat`)
- Dismissed code review → planning-commands › dismissed code review does not proceed
- Receipt fields → planning-commands › receipt records the channel as reviewer tier

**planning-commands**
- Forbidden names absent → `planning-commands.test.ts` › contains no Claude tool names
- Planning skills name no channel tool → planning-commands › contains no Claude tool names (the `/ask_user_question|plannotator/i` check)
- Questions defer to the channel → planning-commands › skills ask through the Interaction channel; explore asks through the Interaction channel
- Ask fallback → planning-commands › skills ask through the Interaction channel (`numbered options`)
- Brainstorm then proposal → planning-commands › continue runs the gate before advancing; manual Task 9 step 3
- Gate before stop → planning-commands › continue runs the gate before advancing
- Approval does not advance → planning-commands › continue stops before apply
- Changes requested → planning-commands › continue stops before apply (`changes_requested`)
- Dismissed → planning-commands › continue stops before apply (`dismissed`)
- Meaningful note on approval → planning-commands › gate handles notes (existing)
- Planning already complete → planning-commands › continue points to /opsx-apply when planning is complete
- Planning completes mid-loop → planning-commands › continue stops before apply
- Interrupted specs → planning-commands › continue completes a partial glob artifact with only the missing files
- Planning complete → planning-commands › continue points to /opsx-apply when planning is complete
- Older status output → planning-commands › continue reads isPlanningComplete and falls back to isComplete (existing)
- Dependencies re-read → planning-commands › continue always re-reads dependencies from disk (existing)
- Continue reviews one artifact → planning-commands › SA-P03 continue reviews the completed artifact before the gate, without a second artifact
- Fast-forward retains two planned stops → planning-commands › SA-P04 ff runs internal reviews unattended and keeps its two stops (existing)
- Planning review without subagents → `subagent-routing.test.ts` (existing inline-fallback tests)

**execution-commands**
- Forbidden names absent → `execution-commands.test.ts` › contains no Claude tool names
- Ask fallback → execution-commands › skills ask through the Interaction channel

**generate-specs-command**
- Forbidden names absent → `generate-specs-command.test.ts` › uses no Claude tool names
- Ask fallback → generate-specs-command › states the required rules and values (`Interaction channel`)
