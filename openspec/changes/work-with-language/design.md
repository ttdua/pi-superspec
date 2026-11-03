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

1. **Storage**: top-level `language: <value>` in `config.yaml`, placed on the line after `schema:` when added. Value is free-form single-line text, trimmed, 1 to 64 characters, no control characters (it is injected into agent context). Written bare when it matches letters, digits, spaces, `_`, `.`, `(`, `)`, `-`; otherwise JSON-quoted. Read with the same line-based approach as `schema:` (no YAML parser). Alternatives: separate file, or inside `context:`; rejected as more state or more fragile.
2. **Init**: `/opsx-init [--lang <value>]` (also `--lang=<value>`). Flag present: write or overwrite. No flag, key absent, UI available: ask once through a new `InitIO` text prompt; an empty answer or cancel writes nothing. Otherwise: no change. A `--lang` with a missing or invalid value stops before any write with an error notice. The language step runs inside the existing config step, so it respects the existing blocked-state notice.
3. **Injection**: `createRoutingNoteMessage` takes the current language; the `context` handler reads `config.yaml` on each event. When set, the note gains a paragraph: write prose of change documents and specs in `<language>`; keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file and capability names in English; code, comments and commits are unaffected; to change the document language, update `language:` in `openspec/config.yaml`. Absent key leaves the note byte-identical to today's. The marker and dedup logic are unchanged.
4. **Docs**: update `docs/domain-model.md` (ProjectConfig) and `docs/architecture.md` (`/opsx-init` step 4, extension table) in this change.

## Risks / Trade-offs

- [Subagents may not see the routing note] -> The controller passes the language in task text; revisit if verification shows drift (open question).
- [Mixed-language specs after a switch] -> Accepted; identifiers stay English so delta matching keeps working.
- [Free-form value injected into agent context] -> Length, single-line and control-character limits.
- [Model may translate structural tokens anyway] -> Explicit English-token list in the note; `openspec validate` catches breakage.

## Migration Plan

None. Projects without `language:` behave as before. Removing the key reverts behaviour.

## Open Questions

- Whether `ctx.ui` provides a text input for the init prompt (verify in the plan; otherwise flag-only).
- Whether SDD subagent task text needs an explicit language line.
