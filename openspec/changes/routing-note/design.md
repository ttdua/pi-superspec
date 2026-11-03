## Context

`docs/workflow.md` (Routing note, Conflict #10) and `docs/architecture.md` (Runtime flow) already settle that activated projects get a routing note via the `context` event, after the Superpowers bootstrap. The extension currently registers only `resources_discover` and `/opsx-init`. The Superpowers pi extension injects its bootstrap in its own `context` handler, only until the first `agent_end` after `session_start` / `session_compact`, at the first index that is not a `compactionSummary`, guarded by the marker `superpowers:using-superpowers bootstrap for pi`.

## Goals / Non-Goals

**Goals:**
- In activated projects, every LLM call sees the routing note, placed after the bootstrap message when present, else at the head after compaction summaries.
- Unactivated projects and non-project directories are untouched.
- Warn once per session when Superpowers is not installed, with the install command.

**Non-Goals:**
- Blocking tool calls or any enforcement.
- Modifying Superpowers skills or its extension.
- Persisting the note into the session.

## Decisions

- **Marker-relative insertion** (see brainstorm, Alternative A): find the message containing the Superpowers bootstrap marker and insert after it; otherwise insert at the first non-`compactionSummary` index. Independent of extension load order.
- **Idempotency**: the note contains its own marker; if a message already contains it, return nothing.
- **New module** `extensions/routing-note.ts` exporting the note text, the insertion function (pure, tested on message arrays) and the Superpowers-detection helper; `superspec.ts` wires the `context` and `session_start` handlers. `/opsx-init` reuses the detection helper.
- **Warning**: at `session_start`, activated project and `ctx.hasUI` only, notify at warning level: Superpowers not found, run `pi install git:github.com/obra/superpowers`. Once per session.
- **Docs**: update `docs/architecture.md` (Components and Runtime flow) and `docs/workflow.md` (Routing note) to mention head fallback and the runtime warning.

## Risks / Trade-offs

- Superpowers may change its marker string; then the note falls back to the head position, which is still correct for turns after the first and only slightly different on the first turn. Mitigation: the marker is a single constant and covered by a test.
- Detecting Superpowers via `skill:brainstorming` can false-negative if skills are renamed; the consequence is a spurious warning, not a failure.
- `session_start` runs before `resources_discover` skill paths are added, so Superpowers detection relies on `skill:brainstorming` already being in `getCommands()`. This holds when Superpowers is installed as a pi package (manifest `pi.skills`), but a spurious warning is possible when Superpowers is loaded as a bare extension path or its skills are disabled. Alternative if this proves noisy: perform the check on the first `before_agent_start` instead.
- The note adds a few hundred tokens to every LLM call in activated projects.
