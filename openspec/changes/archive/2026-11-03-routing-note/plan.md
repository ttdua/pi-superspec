# Routing Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In activated projects, inject the routing note through the pi `context` event after the Superpowers bootstrap, and warn once at `session_start` when Superpowers is missing.

**Architecture:** A new pure module `extensions/routing-note.ts` owns the note text, the placement function and the Superpowers check; `extensions/superspec.ts` wires `context` and `session_start` handlers gated by `findProjectRoot` + `isActivated`. Placement is derived from `event.messages` (bootstrap marker), never from handler load order.

**Tech Stack:** TypeScript (ESM, `.ts` import suffixes, tabs), vitest, `@earendil-works/pi-coding-agent` types.

**Spec:** `openspec/changes/routing-note/specs/routing-note/spec.md`, `design.md`, `brainstorm.md` (same directory).

## Global Constraints

- Bootstrap marker (exact): `superpowers:using-superpowers bootstrap for pi`.
- Install command (exact): `pi install git:github.com/obra/superpowers`.
- Superpowers detection (exact): a command named `skill:brainstorming` in `pi.getCommands()`.
- Note is guidance only: register no `tool_call` handler; do not edit `openspec/schemas/superspec/`.
- Repository content (code, comments, docs, commits) is English. Match existing style: tabs, `node:` imports, `.ts` suffixes.
- No new dependencies.

## Review Focus

- Messages whose `content` is a plain string (not a parts array) must still be matched for the bootstrap marker.
- Empty `messages` array: note is inserted, no crash.
- Messages consisting only of `compactionSummary` entries: note goes after all of them.
- `context` fired with a `cwd` outside any project: messages returned unchanged (handler returns `undefined`).
- Repeated `context` events on the already-modified array never produce two notes.

---

## Task 1: Placement function and note text

**Files:**
- Create: `extensions/routing-note.ts`
- Test: `tests/routing-note.test.ts`

**Interfaces:**
- Produces:
  - `export const BOOTSTRAP_MARKER: string` (exact marker above)
  - `export const ROUTING_NOTE_MARKER: string` (e.g. `pi-superspec routing note`)
  - `export const ROUTING_NOTE: string` (full user-message text, begins with the marker, mentions `/opsx-new`, direct TDD for small fixes, and `docs/superpowers/`)
  - `export function insertRoutingNote<T>(messages: T[], note: T): T[] | undefined` returns a new array with `note` inserted, or `undefined` when a message already contains `ROUTING_NOTE_MARKER`.
  - `export function createRoutingNoteMessage(): { role: "user"; content: { type: "text"; text: string }[]; timestamp: number }`

- [ ] **Step 1: Write the failing tests** in `tests/routing-note.test.ts` for `insertRoutingNote`, using minimal message literals (`{ role, content }`), covering: bootstrap present (note directly after it, content as parts array); bootstrap with string `content`; absent (inserted after leading `compactionSummary` messages); `[compactionSummary, bootstrap, user]` gives order summary, bootstrap, note, user; empty array gives `[note]`; only summaries gives note last; already-present marker returns `undefined`; `ROUTING_NOTE` contains `/opsx-new`, `docs/superpowers/`, and the word `TDD`.
- [ ] **Step 2: Run** `npx vitest run tests/routing-note.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the exports above in `extensions/routing-note.ts`. A helper `containsMarker(message: unknown, marker: string): boolean` handles string and parts-array `content` (same shape handling as the Superpowers extension). Insertion index: one past the last message containing `BOOTSTRAP_MARKER`, else the first index whose `role` is not `compactionSummary`.
- [ ] **Step 4: Run** `npx vitest run tests/routing-note.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `git add extensions/routing-note.ts tests/routing-note.test.ts && git commit -m "feat(routing-note): add note text and placement function"`

## Task 2: Superpowers check and warning text

**Files:**
- Modify: `extensions/routing-note.ts`, `extensions/superspec.ts:46-48` (the `superpowersAvailable` lambda)
- Test: `tests/routing-note.test.ts`

**Interfaces:**
- Consumes: `pi.getCommands(): { name: string }[]`.
- Produces:
  - `export function hasSuperpowers(commands: { name: string }[]): boolean` (true iff a command named `skill:brainstorming` exists)
  - `export const SUPERPOWERS_MISSING_WARNING: string` (mentions Superpowers and contains the exact install command)

- [ ] **Step 1: Write failing tests**: `hasSuperpowers([{name:"skill:brainstorming"}])` is true; `[]` and `[{name:"opsx-init"}]` are false; `SUPERPOWERS_MISSING_WARNING` contains `pi install git:github.com/obra/superpowers`.
- [ ] **Step 2: Run** `npx vitest run tests/routing-note.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both exports; change `superpowersAvailable` in `superspec.ts` to `() => hasSuperpowers(pi.getCommands())` so `/opsx-init` shares the check.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS, including existing init tests.
- [ ] **Step 5: Commit** `git commit -am "feat(routing-note): share Superpowers detection and add warning text"`

## Task 3: Wire `context` and `session_start` handlers

**Files:**
- Modify: `extensions/superspec.ts`
- Test: `tests/extension.test.ts`

**Interfaces:**
- Consumes: `insertRoutingNote`, `createRoutingNoteMessage`, `hasSuperpowers`, `SUPERPOWERS_MISSING_WARNING` from Task 1 and 2; `findProjectRoot`, `isActivated` from `./activation.ts`.
- Produces: `context` handler `(event: { messages: unknown[] }, ctx: { cwd: string }) => { messages } | undefined`; `session_start` handler `(event, ctx: { cwd: string; hasUI: boolean; ui: { notify(message: string, level: string): void } })`.

- [ ] **Step 1: Write failing tests** in `tests/extension.test.ts`. Extend `loadAll` to accept a fake `getCommands` and keep handler lookup generic (handler type becomes `(event: any, ctx?: any) => unknown`). Cases: `context` in the `marked` fixture returns messages containing the note after a bootstrap message; in `unmarked` and in a temp dir with no `openspec/` returns `undefined`; calling `context` twice (feeding the result back) leaves exactly one note; `loadAll` registers no `tool_call` handler; `session_start` in `marked` with `getCommands: () => []` and `hasUI: true` calls `notify` once with a message containing the install command and level `"warning"`; no notify when `getCommands` returns `skill:brainstorming`, in `unmarked`, or when `hasUI` is false.
- [ ] **Step 2: Run** `npx vitest run tests/extension.test.ts`. Expected: FAIL (handlers not registered).
- [ ] **Step 3: Implement** the two `pi.on` registrations in `superspec.ts`. `context`: resolve root from `ctx.cwd`; if not activated return `undefined`; `const messages = insertRoutingNote(event.messages, createRoutingNoteMessage())`; return `messages && { messages }`. `session_start`: same gating plus `ctx.hasUI`; warn only when `!hasSuperpowers(pi.getCommands())`. Once-per-session follows from `session_start` firing once per session start.
- [ ] **Step 4: Run** `npm test && npm run typecheck`. Expected: all PASS. If `npm run typecheck` rejects the handler signatures or `ctx.ui.notify` at `session_start`, adjust to the types in `node_modules/@earendil-works/pi-coding-agent` (run `npm install` first if `node_modules` is missing); if `notify` is unavailable there, use `pi.sendMessage({ customType: "superspec-warning", content, display: true })` as `/opsx-init` does and update the test and spec scenario wording to match.
- [ ] **Step 5: Commit** `git commit -am "feat(routing-note): inject routing note and warn when Superpowers is missing"`

## Task 4: Docs and manual check

**Files:**
- Modify: `docs/architecture.md` (Components table row "Extension"; Runtime flow `context` and `session_start` lines), `docs/workflow.md` (Routing note section)

- [ ] **Step 1: Update docs**: architecture Runtime flow says the note is appended after the bootstrap message, or at the head after compaction summaries when no bootstrap is present, and that `session_start` warns once with `pi install git:github.com/obra/superpowers` when Superpowers is missing; mirror the placement sentence in `docs/workflow.md` Routing note.
- [ ] **Step 2: Run** `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 3: Manual check in pi** from a marked project with Superpowers installed: ask for a new feature; expected: the agent proposes `/opsx-new` and writes nothing to `docs/superpowers/specs`. Then without Superpowers installed: expected: the warning with the install command appears at session start. Record the outcome in `apply.md`.
- [ ] **Step 4: Commit** `git commit -am "docs: describe routing note placement and Superpowers warning"`
