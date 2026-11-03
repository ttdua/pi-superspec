# Work With Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project declare an optional document language in `openspec/config.yaml`, set by `/opsx-init`, applied to agents through the routing note.

**Architecture:** `extensions/init/config.ts` gains pure line-based helpers to validate, read and write a top-level `language:` line (no YAML parser). `/opsx-init` parses `--lang`, optionally prompts, and writes the line after schema classification. The `context` handler reads the language on every event and passes it to the routing note builder, which appends one paragraph.

**Tech Stack:** TypeScript (ES2022, NodeNext, `.ts` import specifiers, tab indentation), vitest, pi extension API. No new dependencies.

**Spec:** `openspec/changes/work-with-language/` (`proposal.md`, `design.md`, `specs/*/spec.md`, `tasks.md`). Task numbers below map to `tasks.md` groups: Tasks 1-2 = group 1, Task 3 = group 2, Tasks 4-6 = group 3, Task 7 = group 4, Task 8 = group 5.

## Global Constraints

- No new dependency; `schema/superspec/` and `openspec/schemas/superspec/` MUST NOT change (no schema version bump).
- Language value: single line, trimmed, 1 to 64 characters, no Unicode control characters (category Cc) and no U+2028 or U+2029; anything else counts as "no language".
- Written bare when it matches `/^[\p{L}\p{N}][\p{L}\p{N} _.()-]*$/u`, otherwise as a double-quoted JSON string; inserted directly after the top-level `schema:` line.
- Structural tokens that stay English: section headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file names, capability names.
- The routing note keeps its marker (`pi-superspec routing note`) at the start, and without a valid language it is byte-identical to today's `ROUTING_NOTE`.
- All repository content (code, comments, docs, commits) is English.
- Commit after each task; never push.

## Review Focus

- A language value containing `:`, `#` or quotes (`zh: simplified`, `a # b`) must round-trip write then read to the same value.
- `config.yaml` with CRLF endings, or with `schema:` as the last line without a trailing newline: the inserted line keeps the file's line ending style and does not merge into the previous line.
- A non-ASCII value (`Tiếng Việt`) is written bare and read back unchanged.
- An invalid value already on disk (100 characters, empty, `language: ""`) leaves the routing note unchanged and makes `/opsx-init` ask again.
- A `--lang` value with an embedded newline or control character is rejected before anything is written.
- Re-running `/opsx-init` without a flag over `language: vi` leaves `config.yaml` byte-identical.

---

## Task 1: Validate and read the language

**Files:**
- Modify: `extensions/init/config.ts`
- Test: `tests/init/config.test.ts`

**Interfaces:**
- Produces: `validateLanguage(value: string): string | undefined` (trimmed value, or undefined when invalid); `parseLanguage(text: string): string | undefined`; `readLanguage(root: string): string | undefined` (reads `<root>/openspec/config.yaml`, missing file yields undefined).

- [ ] **Step 1: Write failing tests** in `tests/init/config.test.ts`, a `describe("validateLanguage")` and a `describe("parseLanguage / readLanguage")`:
  - `validateLanguage("  vi ")` is `"vi"`; `""`, `"   "`, `"a".repeat(65)` and `"a\nb"` are undefined; `"a".repeat(64)` is valid; `"Tiếng Việt"` is valid.
  - `parseLanguage("schema: superspec\nlanguage: vi\n")` is `"vi"`; `parseLanguage('language: "zh: simplified"\n')` is `"zh: simplified"`; `parseLanguage("language: vi # note\n")` is `"vi"`; `parseLanguage("x:\n  language: vi\n")` is undefined; `parseLanguage("language: \n")` and `parseLanguage('language: ""\n')` are undefined; CRLF input `"language: vi\r\n"` is `"vi"`; a leading BOM before `language:` still parses.
  - `readLanguage` on a temp dir with no `openspec/config.yaml` is undefined; with the file it returns the value.
- [ ] **Step 2: Run** `npx vitest run tests/init/config.test.ts`. Expected: FAIL, the new functions are not exported.
- [ ] **Step 3: Implement** the three functions in `config.ts`. `parseLanguage` matches `^language:(.*)$` with the `m` flag; a value starting with `"` is `JSON.parse`d (invalid JSON yields undefined); a bare value drops a trailing ` #...` comment; the result goes through `validateLanguage`. Export `MAX_LANGUAGE_LENGTH = 64`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git add extensions/init/config.ts tests/init/config.test.ts && git commit -m "feat(init): validate and read the document language"`

## Task 2: Write the language into config.yaml

**Files:**
- Modify: `extensions/init/config.ts`
- Test: `tests/init/config.test.ts`

**Interfaces:**
- Consumes: `validateLanguage`, `parseLanguage` from Task 1.
- Produces: `mergeLanguage(text: string | undefined, value: string): string` (value already validated); `applyLanguage(root: string, value: string): "written" | "unchanged"`.

- [ ] **Step 1: Write failing tests**, a `describe("mergeLanguage")` and a `describe("applyLanguage")`:
  - `mergeLanguage("schema: superspec\ncontext: |\n  x\n", "vi")` is `"schema: superspec\nlanguage: vi\ncontext: |\n  x\n"`.
  - Replacement: `mergeLanguage("schema: superspec\nlanguage: vi\nx: 1\n", "en")` is `"schema: superspec\nlanguage: en\nx: 1\n"`.
  - Quoting: `mergeLanguage("schema: superspec\n", "zh: simplified")` is `'schema: superspec\nlanguage: "zh: simplified"\n'`; `"a # b"` is also quoted; `"Tiếng Việt"` stays bare.
  - Nested key: `mergeLanguage("schema: superspec\nx:\n  language: vi\n", "en")` adds a top-level line and leaves the nested one.
  - CRLF: `mergeLanguage("schema: superspec\r\nb: 1\r\n", "vi")` is `"schema: superspec\r\nlanguage: vi\r\nb: 1\r\n"`.
  - No trailing newline: `mergeLanguage("schema: superspec", "vi")` is `"schema: superspec\nlanguage: vi\n"`.
  - No `schema:` line: the language line is prepended; BOM stays first; `undefined` input yields `"language: vi\n"`.
  - Same value again returns the input unchanged (idempotent).
  - Round trip: for `["vi", "zh: simplified", "a # b", "Tiếng Việt", 'say "hi"']`, `parseLanguage(mergeLanguage("schema: superspec\n", v))` equals `v`.
  - `applyLanguage` on a temp project: first call returns `"written"`, second `"unchanged"`, and the file bytes outside the language line match the original.
- [ ] **Step 2: Run** `npx vitest run tests/init/config.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions. Format the value with the bare/JSON rule from Global Constraints. Follow the structure of `mergeConfig` (BOM handling, CRLF detection by `includes("\r\n")`). Insert directly after the `schema:` line including its line ending, adding an eol when that line is the last without one. `applyLanguage` mirrors `applyConfig` (read, merge, skip the write when equal).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(init): write the document language to config.yaml"`

## Task 3: Routing note carries the language

**Files:**
- Modify: `extensions/routing-note.ts`, `extensions/superspec.ts`
- Test: `tests/routing-note.test.ts`, `tests/extension.test.ts`

**Interfaces:**
- Consumes: `readLanguage(root)` from Task 1.
- Produces: `routingNote(language?: string): string` (no argument returns `ROUTING_NOTE` exactly); `createRoutingNoteMessage(language?: string)`.

- [ ] **Step 1: Write failing tests.**
  - `routing-note.test.ts`: `routingNote()` equals `ROUTING_NOTE`; `routingNote("vi")` starts with `ROUTING_NOTE_MARKER`, starts with the whole `ROUTING_NOTE` text, and contains `"vi"`, `WHEN`, `SHALL`, `openspec/config.yaml` and `language:`; `routingNote("zh: simplified")` contains the JSON-quoted `"zh: simplified"`; `insertRoutingNote` still returns `undefined` when a message created with `createRoutingNoteMessage("vi")` is already present; a message quoting the marker only from an assistant role still gets the note.
  - `extension.test.ts`, using its `loadAll` and fixture helpers: in a temp activated project (copy `tests/fixtures/marked`) whose `openspec/config.yaml` has `language: vi`, the `context` handler's returned messages contain the language paragraph; after rewriting the file to `language: en`, a second call names `en` (no reload); with no `language:` the injected text equals `ROUTING_NOTE`; an invalid on-disk value (100 characters) behaves as absent; the handler set still registers no `tool_call` handler.
- [ ] **Step 2: Run** `npx vitest run tests/routing-note.test.ts tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `routingNote` by appending a blank line and a paragraph to `ROUTING_NOTE`. The paragraph states: write the prose of OpenSpec documents (change artifacts and main specs) in the language, shown JSON-quoted; keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file and capability names in English; code, comments and commit messages are not affected; if the user asks to change the document language, update `language:` in `openspec/config.yaml`. Leave `ROUTING_NOTE` and `isRoutingNote` unchanged. In `superspec.ts`, the `context` handler calls `readLanguage(root)` and passes it to `createRoutingNoteMessage`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(routing-note): add the document language paragraph"`

## Task 4: Parse `/opsx-init` arguments

**Files:**
- Create: `extensions/init/args.ts`
- Test: `tests/init/args.test.ts`

**Interfaces:**
- Consumes: `validateLanguage` from Task 1.
- Produces: `parseInitArgs(args: string): { lang?: string } | { error: string }`.

- [ ] **Step 1: Write failing tests:** `""` and `"   "` give `{}`; `"--lang vi"` and `"--lang=vi"` give `{ lang: "vi" }`; `"--lang Tiếng Việt"` gives `{ lang: "Tiếng Việt" }` (the value is everything after the flag, trimmed); `'--lang "Tiếng Việt"'` and `"--lang 'x y'"` strip the surrounding quotes; `"--lang"`, `"--lang="` and `"--lang   "` give an `error` mentioning `--lang`; a 65-character value and a value containing `\n` or `\u0007` give an `error`; `"--force"` gives an `error` mentioning `Unknown argument`.
- [ ] **Step 2: Run** `npx vitest run tests/init/args.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `parseInitArgs` as specified; a value is accepted only if `validateLanguage` returns it.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git add extensions/init/args.ts tests/init/args.test.ts && git commit -m "feat(init): parse the --lang argument"`

## Task 5: Prompt capability in InitIO

**Files:**
- Modify: `extensions/init/io.ts`, `extensions/superspec.ts`, `tests/helpers/io.ts`
- Test: `tests/extension.test.ts`

**Interfaces:**
- Produces: `InitIO.prompt(title: string, placeholder?: string): Promise<string | undefined>` (undefined when the user cancels); `fakeIO` default `prompt` returns `undefined`.

- [ ] **Step 1: Verify the pi API.** Run `npm ci`, then read `node_modules/@earendil-works/pi-coding-agent` type declarations for the `ctx.ui` type and look for a text-input method (expected name `input`). Expected: its signature is found. If no text input exists, stop and report to the user: the prompt is dropped (flag-only) and `design.md` plus the `init-command` Language prompt requirement need amending before continuing.
- [ ] **Step 2: Write a failing test** in `tests/extension.test.ts`: invoking the registered `opsx-init` handler with a fake `ctx` whose `ui.input` (or the verified method) returns `"vi"` makes `io.prompt` resolve to `"vi"`; this is observable by stubbing `pi.exec` so the run stops at preflight, and asserting the wiring through a small exported factory if needed (extract the `InitIO` construction from `superspec.ts` into `createInitIO(pi, ctx)` to make this testable).
- [ ] **Step 3: Run** `npx vitest run tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** `prompt` in `InitIO`, `createInitIO(pi, ctx): InitIO` in `superspec.ts` delegating to the verified `ctx.ui` method, and the `fakeIO` default.
- [ ] **Step 5: Run** `npx vitest run && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `git commit -am "feat(init): add a text prompt to InitIO"`

## Task 6: `runInit` applies the language

**Files:**
- Modify: `extensions/init/init.ts`, `extensions/superspec.ts`
- Test: `tests/init/init.test.ts`, `tests/init/integration.test.ts`

**Interfaces:**
- Consumes: `parseInitArgs` (Task 4), `applyLanguage`/`readLanguage`/`validateLanguage` (Tasks 1-2), `InitIO.prompt` (Task 5).
- Produces: `runInit(io: InitIO, packageRoot: string, args?: string): Promise<InitOutcome>`; `InitOutcome` gains `"invalid-arguments"`.

- [ ] **Step 1: Write failing tests** in `tests/init/init.test.ts`, using the existing `recording(...)` and `fixtures` helpers:
  - `runInit(io, root, "--lang")` and `runInit(io, root, "--lang " + "a".repeat(65))` return `"invalid-arguments"`, call no `openspec` command, and leave the directory unchanged (no `openspec/`); an error notice is emitted.
  - `runInit(io, root, "--lang vi")` on a fresh git repo ends `"activated"` and `config.yaml` contains `language: vi` directly after `schema: superspec`.
  - With `language: vi` present, `--lang=en` rewrites it to `language: en`.
  - Prompt: no flag, key absent, `hasUI` true, `prompt` returns `"vi"`: the file gets `language: vi`; `prompt` returns `undefined`, `""` or a 100-character answer: no `language:` line, the run still ends `"activated"`; key already `vi`: `prompt` is never called; `hasUI` false: `prompt` is never called; an invalid value already on disk makes `prompt` run.
  - Idempotency: run twice with `--lang vi`, then once without a flag, and assert `config.yaml` is byte-identical after the last two runs.
  - Blocked state (existing foreign schema fixture): no `language:` is written and `prompt` is not called.
  - `tests/init/integration.test.ts`: on a temp git repo with real `openspec`, `runInit(io, root, "--lang vi")` then `openspec schema validate superspec` exits 0 and `openspec status` runs successfully with `language: vi` in the config (skip pattern the file already uses when `openspec` is unavailable).
- [ ] **Step 2: Run** `npx vitest run tests/init`. Expected: FAIL.
- [ ] **Step 3: Implement** in `init.ts`: parse `args` first and return `"invalid-arguments"` after an error notice, before `checkOpenspec`. After the blocked check and `cleanLegacy`, run the language step: `lang` from the flag is written with `applyLanguage`; otherwise, when `io.hasUI` and `readLanguage(root)` is undefined, call `io.prompt("Document language (leave empty to skip)", "e.g. vi, Tiếng Việt")`, validate the answer, and write it, warning on an invalid non-empty answer. Pass the handler's `args` through in `superspec.ts`.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck`. Expected: all PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(init): set the document language with --lang or a prompt"`

## Task 7: Documentation

**Files:**
- Modify: `docs/domain-model.md`, `docs/architecture.md`, `docs/usage-guide.md`, `README.md`, `README.vi.md`, `CHANGELOG.md`

- [ ] **Step 1:** In `docs/domain-model.md` § ProjectConfig, replace "The package only sets `schema: superspec`" with a sentence stating that the package sets `schema` and, on request, `language`; `context` and `rules` remain the user's. In `docs/architecture.md`, step 4 of `/opsx-init` becomes "set `schema: superspec`, optionally set `language`, keep all other keys", add `--lang` and the prompt as a new step after the schema check, and extend the extension-table row for the `context` event with the language paragraph.
- [ ] **Step 2:** In `docs/usage-guide.md`, add a short "Working in your language" section: `/opsx-init --lang <value>`, the prompt, asking the agent to switch, which content stays English and why (requirement names are identifiers), and that existing documents are not retranslated. Add the flag to the `/opsx-init` row of the command table in `README.md` and the matching row in `README.vi.md`, leaving the command list unchanged.
- [ ] **Step 3:** Add a `CHANGELOG.md` entry under the unreleased heading, following the file's existing format.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (docs-checking tests, if any, still pass).
- [ ] **Step 5: Commit** `git commit -am "docs: document the project language setting"`

## Task 8: Final verification

- [ ] **Step 1: Run** `npm test && npm run typecheck`. Expected: all PASS, no type errors.
- [ ] **Step 2: Run** `git diff main --stat -- schema openspec/schemas` . Expected: empty (no schema change).
- [ ] **Step 3: Manual check** following `docs/e2e-checklist.md` with `language: vi` in a scratch project: the agent writes prose in Vietnamese, keeps structural tokens English, and `openspec validate <change> --strict` passes; then ask the agent to switch to English and confirm `config.yaml` changes. Record the outcome in the verify artifact, not here.
- [ ] **Step 4: Commit** any fixes: `git commit -am "fix: address verification findings"` (skip when nothing changed).
