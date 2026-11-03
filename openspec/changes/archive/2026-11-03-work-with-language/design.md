## Context

pi-superspec activates a project via `/opsx-init`, which sets `schema: superspec` in `openspec/config.yaml` using a single-line, byte-preserving merge (`extensions/init/config.ts`, spec `config-merge`). A `context` event hook injects a static routing note into agent turns (`extensions/routing-note.ts`). OpenSpec 1.4.1 tolerates unknown top-level keys in `config.yaml` (checked with `language: vi`). Users want to write change documents in their own language.

## Goals / Non-Goals

**Goals**
- Optional per-project document language, set at init (flag or prompt) and changeable later.
- Agents write the prose of OpenSpec documents in that language while the documents stay valid for `openspec validate`.

**Non-Goals**
- Translating code, code comments, commit messages, or the chat language.
- Retro-translating existing documents.
- A new command, a new dependency, or any change to the bundled schema.
- Localising this package's own prompts and skills.

## Decisions

1. **Storage**: top-level `language: <value>` in `config.yaml`, placed on the line after `schema:` when added. Value is free-form single-line text, trimmed, 1 to 64 characters, no Unicode control characters (category Cc) and no U+2028 or U+2029 (it is injected into agent context). Written bare only when the first character is a letter or digit and the rest are letters, digits, spaces, `_`, `.`, `(`, `)`, `-`; otherwise JSON-quoted. A double-quoted value may be followed by a trailing comment when read. Read with the same line-based approach as `schema:` (no YAML parser). Alternatives: separate file, or inside `context:`; rejected as more state or more fragile.
2. **Init**: `/opsx-init [--lang <value>]` (also `--lang=<value>`). Flag present: write or overwrite. No flag and no valid `language:`: with a UI, ask once per run through a new `InitIO` text prompt with `en` offered as the default; an empty answer, cancel or invalid answer (the latter with a warning) falls back to `en`; without a UI `en` is written directly. So after init the project always has a `language:` (default `en`), and a valid existing value is never touched without the flag. Projects initialised before this setting keep no key and no behavior change until `/opsx-init` is run again (iteration 2 ruling, requested by the user: "without --lang the default is en"). A `--lang` with a missing or invalid value stops before any write with an error notice. The language step runs after the schema classification and legacy cleanup and before schema validation, so a run blocked by an existing schema writes no language and does not ask, even when `--lang` is given.
3. **Injection**: `createRoutingNoteMessage` takes the current language; the `context` handler reads `config.yaml` on each event. When set, the note gains a paragraph: write prose of change documents and specs in `<language>`; keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file and capability names in English; code, comments and commits are unaffected; to change the document language, update `language:` in `openspec/config.yaml`. The language used is the effective one: the valid `language:` value, or `en` when the file or key is missing or the value is invalid (iteration 2 ruling, requested by the user: "if config.yaml has no language the default is also en"). So the paragraph is always present, and an existing project without the key is told to write English documents, which matches what it did before; the paragraph also teaches the agent how to switch. Because the effective language always has a value, `routingNote(language: string)` and `createRoutingNoteMessage(language: string)` take it as a required argument (iteration 2 ruling, requested by the user: "language is now always a string"); `ROUTING_NOTE` stays as the base text and the anchor of the duplicate check. `undefined` remains only where it means "nothing could be read" (`readLanguage`, `parseLanguage`, `validateLanguage`) and for the optional `--lang` flag. The marker and dedup logic are unchanged.
4. **Docs**: update `docs/domain-model.md` (ProjectConfig) and `docs/architecture.md` (`/opsx-init` step 4, extension table) in this change.

## Risks / Trade-offs

- [Subagents may not see the routing note] -> The controller passes the language in task text; revisit if verification shows drift (open question).
- [Mixed-language specs after a switch] -> Accepted; identifiers stay English so delta matching keeps working.
- [Free-form value injected into agent context] -> Length, single-line and control-character limits.
- [Model may translate structural tokens anyway] -> Explicit English-token list in the note; `openspec validate` catches breakage.

## Migration Plan

None. Projects without `language:` are treated as `en` (documents stay English, as before) and get the English paragraph in the routing note. Removing the key reverts to that default.

## Open Questions

- Whether `ctx.ui` provides a text input for the init prompt (verify in the plan; otherwise flag-only).
- Whether SDD subagent task text needs an explicit language line.
