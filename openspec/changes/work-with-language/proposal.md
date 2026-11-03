## Why

Users who think and review in a language other than English must read and write English-only change documents, which makes proposals, designs and specs harder to review. Agents already follow the routing note injected into every turn, so a per-project document language can be applied without touching the bundled schema. Projects without the setting keep today's behaviour.

## What Changes

**Project document language**
- From: `config.yaml` only carries `schema: superspec` from the package; all documents are written in English.
- To: an optional top-level `language: <value>` key; when set, agents write the prose of OpenSpec documents (change artifacts and main specs) in that language.
- Reason: let users work in their own language.
- Impact: non-breaking; no key means no change.

**Structural tokens stay English**
- Headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file and capability names. Requirement names are identifiers for delta matching, so they cannot change with the language.

**`/opsx-init`**
- Accepts `--lang <value>` (or `--lang=<value>`) to write or overwrite `language:`.
- Without the flag, asks once through a text prompt when the key is absent and a UI exists; skipping writes nothing. Re-running never removes an existing value.

**Routing note**
- When `language:` is set, the note gains a paragraph with the rule above and an instruction to update `language:` when the user asks to change the document language. No key leaves the note unchanged.

**Docs**
- Update `docs/domain-model.md` (ProjectConfig) and `docs/architecture.md` (`/opsx-init` step 4, extension table), which currently say the package only sets `schema`.

Out of scope: code, comments, commit messages, chat language, retro-translation, a new command, the bundled schema.

## Capabilities

### New Capabilities
- `document-language`: the `language:` setting, its value rules, which document content is localised versus kept English, and how the language is changed during work.

### Modified Capabilities
- `config-merge`: the merge may add, replace and read a top-level `language:` line in addition to `schema:`, still leaving every other byte unchanged.
- `init-command`: `/opsx-init` accepts `--lang`, asks for the language once when appropriate, and stays idempotent.
- `routing-note`: the note carries the document-language paragraph when `language:` is set and is unchanged otherwise.

## Impact

- Code: `extensions/init/config.ts`, `extensions/init/init.ts`, `extensions/init/io.ts`, `extensions/superspec.ts` (args parsing, `InitIO` prompt, `context` handler), `extensions/routing-note.ts`.
- Tests: `tests/init/config.test.ts`, `tests/init/init.test.ts`, `tests/routing-note.test.ts`, `tests/extension.test.ts`.
- Contract: new `/opsx-init --lang` flag and new optional `config.yaml` key (public CLI and config contract).
- Docs: `docs/domain-model.md`, `docs/architecture.md`; usage notes in `docs/usage-guide.md`.
- Dependencies: none. Bundled schema: unchanged, so no schema version bump.
