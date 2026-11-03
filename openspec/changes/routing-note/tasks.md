## 1. Routing note module

- [ ] 1.1 Confirm in `@earendil-works/pi-coding-agent` types the `context` and `session_start` handler signatures (event and `ctx`: `cwd`, `hasUI`, `ui.notify`) and message shapes; if `ui.notify` is unusable at `session_start`, use `pi.sendMessage` as `/opsx-init` does
- [ ] 1.2 Add `extensions/routing-note.ts` with the note text and marker constants, the Superpowers bootstrap marker constant, and a pure `insertRoutingNote(messages)` implementing placement and idempotency
- [ ] 1.3 Add `hasSuperpowers(pi)` helper (checks the `skill:brainstorming` command) and the install-warning text in the same module

## 2. Wiring

- [ ] 2.1 Register the `context` handler in `extensions/superspec.ts`, gated by `findProjectRoot` + `isActivated` on the session cwd
- [ ] 2.2 Register the `session_start` handler that warns once when Superpowers is missing (activated project, `ctx.hasUI`)
- [ ] 2.3 Make `/opsx-init` (`superpowersAvailable`) reuse the shared helper without changing its behaviour

## 3. Tests

- [ ] 3.1 Unit tests for `insertRoutingNote`: bootstrap present, absent, after leading `compactionSummary`, handler-order independence, no duplicate insertion
- [ ] 3.2 Extension tests: note injected only in marked fixture, unchanged in unmarked and outside a project; note text mentions `/opsx-new`, direct TDD and `docs/superpowers/`; no `tool_call` handler registered
- [ ] 3.3 Extension tests for the warning: shown once with the install command when missing; not shown when installed, unactivated, or without UI
- [ ] 3.4 Run `npm test` and `npm run typecheck`

## 4. Docs and manual check

- [ ] 4.1 Update `docs/architecture.md` (Components, Runtime flow) and `docs/workflow.md` (Routing note) for the head fallback and the runtime warning
- [ ] 4.2 Manual check in pi with Superpowers installed: asking for a new feature leads to `/opsx-new`, not a `docs/superpowers/specs` file; also check without Superpowers that the warning appears
