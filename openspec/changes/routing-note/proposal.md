## Why

The Superpowers bootstrap tells the agent to brainstorm before any creative work and to write specs and plans under `docs/superpowers/`, which bypasses OpenSpec (Conflict #10 in `docs/workflow.md`). Activated projects need a routing note that sends behaviour changes to `/opsx-new` and small fixes to direct TDD. Superpowers is also a hard dependency of the workflow, so a missing install should be flagged at runtime, not only at `/opsx-init`.

## What Changes

- Add a `context` event handler that injects the routing note in activated projects only: after the Superpowers bootstrap message when present, otherwise at the head of the messages after any `compactionSummary`. The note has its own marker and is never inserted twice.
- The note tells the agent: behaviour change → propose `/opsx-new` before brainstorming; small fix that changes no spec → direct TDD; never write to `docs/superpowers/`.
- Add a `session_start` check in activated projects: when the `skill:brainstorming` command is not discoverable, warn once with `pi install git:github.com/obra/superpowers`.
- Extract the Superpowers-detection check shared with `/opsx-init`.
- Update `docs/architecture.md` and `docs/workflow.md` for the head fallback and the runtime warning.
- Out of scope: blocking tool calls or any enforcement.

## Capabilities

### New Capabilities
- `routing-note`: injection of the routing note through the `context` event (activation gating, placement relative to the Superpowers bootstrap, idempotency, note content) and the runtime warning when Superpowers is missing.

### Modified Capabilities

## Impact

- Code: new `extensions/routing-note.ts`; `extensions/superspec.ts` registers the `context` and `session_start` handlers; `extensions/init/preflight.ts` or `init.ts` reuses the shared detection helper (behaviour unchanged).
- Tests: new unit tests for placement, gating and the warning.
- Docs: `docs/architecture.md`, `docs/workflow.md`.
- No new dependencies, no schema or public command changes.
