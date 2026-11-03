## 1. Config language helpers

- [x] 1.1 Add `mergeLanguage(text, value)` and `applyLanguage(root, value)` to `extensions/init/config.ts`: replace a top-level `language:` line, else insert after `schema:`, bare or JSON-quoted per the quoting rule, preserving BOM, CRLF and all other bytes (specs `config-merge`: Set language key, Preserve other content)
- [x] 1.2 Add `validateLanguage(value)` (trim, 1 to 64 characters, no control characters) and `readLanguage(root)` (bare or double-quoted value, invalid or missing yields undefined) (specs `document-language`: Language setting; `config-merge`: Read language key)
- [x] 1.3 Unit tests in `tests/init/config.test.ts` for every scenario of the two config-merge requirements above and the Language setting scenarios

## 2. Routing note

- [x] 2.1 Make `createRoutingNoteMessage` accept an optional language and append the document-language paragraph only when one is given; keep the marker at the start and the note identical when absent (spec `routing-note`: Document language paragraph)
- [x] 2.2 In `extensions/superspec.ts`, read the language from `config.yaml` on each `context` event and pass it through
- [x] 2.3 Tests in `tests/routing-note.test.ts` and `tests/extension.test.ts`: language set, absent, changed between events, marker preserved, no `tool_call` handler added

## 3. Init flag and prompt

- [x] 3.1 Add `parseInitArgs(args)` for `--lang <value>` and `--lang=<value>`, returning an error for a missing or invalid value; pass the parsed language into `runInit` and stop before any write on error (spec `init-command`: Language option)
- [x] 3.2 Verify whether pi `ctx.ui` provides a text input; add `prompt(title, placeholder)` to `InitIO` and wire it in `extensions/superspec.ts`. If no text input exists, drop the prompt and record flag-only in the design (spec `init-command`: Language prompt; design open question)
- [x] 3.3 In `runInit`, apply the language in the config step: flag writes or overwrites; otherwise ask only when the key is absent, a UI exists and the command is not blocked; skip, cancel or invalid answer writes nothing; never touch an existing value without a flag (specs `init-command`: Language prompt, Idempotency)
- [x] 3.4 Tests in `tests/init/init.test.ts` and `tests/init/integration.test.ts` for each Language option, Language prompt and Idempotency scenario, including a real `openspec schema validate superspec` run on a project with `language:` set

## 4. Documentation

- [x] 4.1 Update `docs/domain-model.md` ProjectConfig and `docs/architecture.md` (`/opsx-init` step 4 and the extension table row for the `context` event) to describe the optional `language` key
- [x] 4.2 Describe `/opsx-init --lang`, the prompt and changing the language during work in `docs/usage-guide.md`, and add the flag to the README command table row for `/opsx-init`
- [x] 4.3 Add a CHANGELOG entry for the new flag and config key

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run typecheck`
- [ ] 5.2 Walk the manual check in `docs/e2e-checklist.md` with `language: vi`: confirm the agent writes prose in Vietnamese, keeps structural tokens in English, and that `openspec validate` passes on the resulting change

## 6. Default language (iteration 2)

- [x] 6.1 Add `DEFAULT_LANGUAGE = "en"` to `extensions/init/config.ts` and make `setLanguage` in `extensions/init/init.ts` fall back to it: prompt skipped, cancelled, empty or invalid, and no UI, when there is no valid `language:` and no flag; an invalid existing line is replaced; a valid existing value is never touched; blocked runs still write nothing (specs `init-command`: Language prompt, Default language, Idempotency; `document-language`: Default language)
- [x] 6.2 Update the tests in `tests/init/init.test.ts` and `tests/init/integration.test.ts` for the new behavior, including a second run that changes no file and the prompt placeholder offering `en`
- [x] 6.3 Update `docs/usage-guide.md`, `docs/architecture.md`, `README.md` if it mentions the prompt, and `CHANGELOG.md` to state that the default is `en`
- [x] 6.4 Re-run `npm test`, `npm run typecheck` and `openspec validate --all --strict`
- [x] 6.5 Add `resolveLanguage(root)` (valid `language:` value, else `en`) to `extensions/init/config.ts` and use it in the `context` handler in `extensions/superspec.ts`, so the routing note always carries the language paragraph (the language argument of `routingNote` became required in 6.8) (specs `routing-note`: Document language paragraph; `document-language`: Language setting, Default language)
- [x] 6.6 Update the tests in `tests/init/config.test.ts`, `tests/routing-note.test.ts` and `tests/extension.test.ts` for the effective language: missing key, missing file, invalid value and unreadable config all give `en`; an existing project with no key now gets the `en` paragraph
- [x] 6.7 Update `docs/usage-guide.md`, `docs/architecture.md` (also step 4 wording: `language` is set, not "optionally set") and `CHANGELOG.md` to state that a missing `language:` means `en`; split the long CHANGELOG sentence; then re-run 6.4
- [x] 6.8 Make the language a required string in `routingNote(language: string)` and `createRoutingNoteMessage(language: string)` in `extensions/routing-note.ts` (no `undefined` branch, no optional parameter), update the tests that called them without a language, and keep `ROUTING_NOTE` as the base text and duplicate-check anchor; then re-run 6.4 (specs `routing-note`: Document language paragraph)
