## Design Summary

Implements `docs/workflow.md` — Routing note, Conflict #10, and `docs/domain-model.md` — WorkKind. Depends on `package-skeleton` (activation, already archived as `package-activation`).

In an activated project the extension injects a routing note through the pi `context` event:

- Work that adds or changes behaviour → propose `/opsx-new` before brainstorming.
- Small work that changes no spec (bug fix restoring specified behaviour, typo, refactor) → direct TDD, no change directory.
- Never write design docs or plans to `docs/superpowers/`.

Placement: immediately after the Superpowers bootstrap message when one is present in `event.messages`; otherwise at the head of the list, after any leading `compactionSummary` messages (the same anchor the Superpowers extension uses). The note carries its own marker so it is never inserted twice.

Ordering was verified against the Superpowers pi extension (`.pi/extensions/superpowers.ts`, Superpowers 7.0.1):

- It injects its bootstrap on every `context` event while `injectBootstrap` is true (set on `session_start` and `session_compact`, cleared on `agent_end`), at the first index that is not a `compactionSummary`, and skips injection if a message already contains the marker `superpowers:using-superpowers bootstrap for pi`.
- So the bootstrap exists only in the first agent run after start or compaction. After that it is absent, and the note must still be present.
- Handler order depends on extension load order, so "after the bootstrap" is guaranteed by logic (find the marker, insert after that message) rather than by load order. If our handler runs first, Superpowers later inserts its bootstrap at the same anchor, ahead of our note, which is also the required order.

Missing Superpowers: at `session_start` in an activated project, if the `skill:brainstorming` command is not discoverable (`pi.getCommands()`, same check `/opsx-init` uses), warn once with `ctx.ui.notify(..., "warning")` including `pi install git:github.com/obra/superpowers`. This extends the documented scope (runtime warning, not only at init), so `docs/architecture.md` and `docs/workflow.md` are updated in this change.

## Alternatives Considered

### Alternative A: Marker-relative insertion with head fallback (chosen)
- **Approach**: Insert after the bootstrap message if present, else at the head after compaction summaries; own marker prevents duplicates; separate `session_start` warning for missing Superpowers.
- **Pros**: Note is present on every turn; independent of extension load order; touches no Superpowers internals.
- **Cons**: Needs a Superpowers-detection helper shared with `/opsx-init`.
- **Why not chosen**: n/a (chosen).

### Alternative B: Inject only when the bootstrap is present
- **Approach**: Literal reading of "after the bootstrap"; do nothing when the marker is not found.
- **Pros**: Simplest.
- **Cons**: The bootstrap disappears after `agent_end`, so the note would vanish from the second agent run on and routing would stop working in any multi-turn session.
- **Why not chosen**: Defeats the purpose of the note after the first turn.

### Alternative C: Mirror Superpowers' state flag
- **Approach**: Track `session_start` / `session_compact` / `agent_end` ourselves to guess when the bootstrap is injected.
- **Pros**: Mirrors Superpowers behaviour exactly.
- **Cons**: Duplicates internals of another package; breaks silently when it changes.
- **Why not chosen**: Fragile and no benefit over A.

## Agreed Approach

Alternative A. It satisfies "after the bootstrap" whenever a bootstrap exists and keeps the note active when it does not, without depending on load order or Superpowers internals.

## Key Decisions

- Placement is determined from `event.messages`, not from handler order.
- Fallback anchor is the first index that is not a `compactionSummary`, matching Superpowers.
- The note is a user-role text message with its own marker for idempotency; the `context` event is not persisted, so it is re-added each LLM call and never accumulates.
- Activation is evaluated per event from the session `cwd` via `findProjectRoot` + `isActivated`; unactivated projects get no change to messages.
- Missing-Superpowers warning is shown once per session, at `session_start`, only when `ctx.hasUI` and the project is activated. Detection reuses the `skill:brainstorming` command check from `/opsx-init`, extracted into a shared helper.
- Note text is a single constant so tests and docs can assert on it; it states routing guidance only, with no enforcement (no tool-call blocking).

## Open Questions

- Exact wording of the note text (finalized in the spec/plan).
- Whether `ctx.ui.notify` is available in `session_start` handlers in pi 1.5; if not, fall back to `pi.sendMessage` as `/opsx-init` does. To be confirmed while writing the plan.
