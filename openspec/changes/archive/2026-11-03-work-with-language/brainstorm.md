## Design Summary

Let users work with change documents in their own language. A project may carry an optional top-level `language:` key in `openspec/config.yaml`. `/opsx-init` sets it from a `--lang <value>` flag, or asks once when the key is absent and a UI exists. When the key is present, the routing note injected by the `context` hook gains one conditional paragraph: write the prose of OpenSpec documents in that language, keep structural tokens in English, and when the user asks to change the document language, update `language:` in `config.yaml`. Absent key means today's behaviour.

Docs this change touches (and therefore updates in the same change, per the repo's `config.yaml` rule):
- `docs/domain-model.md` § ProjectConfig: "The package only sets `schema: superspec`" becomes "sets `schema` and, on request, `language`".
- `docs/architecture.md` § `/opsx-init` step 4 ("keep all other keys") and the extension table row for the `context` event.

## Alternatives Considered

### Alternative A: Routing note only
- **Approach**: the `context` hook reads `language:` on each event and adds a paragraph to the routing note.
- **Pros**: effective the turn after a config edit, no reload; covers brainstorming and explore (outside `openspec instructions`); touches no installed schema.
- **Cons**: pi-only; a subagent that does not see the routing note depends on the controller passing the language in its task text.
- **Why not chosen**: chosen.

### Alternative B: Routing note plus wording in schema instructions and templates
- **Approach**: each artifact instruction tells the agent to read `language:` from `config.yaml`.
- **Pros**: also works for subagents and for `openspec instructions` run outside pi.
- **Cons**: editing the bundled schema forces a version bump and changes file hashes. Schema upgrade is not shipped (`docs/architecture.md`, "Schema identity, version and upgrade"), so already-initialised projects would classify as `older`, stop activation, and need a manual reinstall.
- **Why not chosen**: the upgrade cost lands on every existing user for a marginal robustness gain.

### Alternative C: Managed marker block inside `context:`
- **Approach**: write the language instruction into the user's multi-line `context:` value so `openspec instructions` delivers it natively.
- **Pros**: independent of pi.
- **Cons**: `context:` is user-owned free-form YAML (block scalars, comments, CRLF); a byte-preserving edit is fragile. It would store the language in two places that can drift.
- **Why not chosen**: fragility and duplicated state.

## Agreed Approach

Alternative A. Storage is a top-level `language:` line in `config.yaml`; scope is OpenSpec documents only (change artifacts and main specs), not code, code comments, commit messages or chat language. Runtime change goes through the agent editing `language:` or `/opsx-init --lang <value>`; no new command.

## Key Decisions

- **Structural tokens stay English** (user-confirmed): headings, `### Requirement:` / `#### Scenario:` names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkboxes, `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`, file names, capability names. Requirement names are identifiers used by delta matching, so translating them would break MODIFIED/REMOVED/RENAMED after a language switch. Only descriptions and prose are localised.
- **Docs are not retro-translated** when the language changes; mixed-language specs are accepted.
- **Idempotent init**: ask only when `language:` is absent, no flag was given, and a UI exists. Skipping the prompt writes nothing. Re-running without a flag never removes or rewrites an existing value. With `--lang`, an existing value is overwritten.
- **No new command, no new dependency, no schema change.**
- Agent-made calls (not user-confirmed): the value is a free-form single-line string stored as the user typed it (trimmed), validated to non-empty, at most 64 characters, no control characters, because it is injected into agent context; parsed and written with the same line-based approach as `schema:` (no YAML dependency).

## Open Questions

- Does pi's `ctx.ui` offer a text-input prompt for the init question? To verify in the plan; if not, the question falls back to flag-only.
- Should a line be added to the apply skill/prompt so SDD subagents get the language in their task text? Deferred; revisit if verification shows subagents ignore it.
