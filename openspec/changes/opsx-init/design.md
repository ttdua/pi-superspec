## Context

`docs/architecture.md` defines `/opsx-init` as the single setup command. Today `extensions/superspec.ts` only handles `resources_discover`; `extensions/activation.ts` provides `findProjectRoot` and `isActivated`. The bundled schema in `schema/superspec/` already carries the `x-pi-superspec` marker (v5). The package has no runtime dependencies.

## Goals / Non-Goals

**Goals:**
- Register `/opsx-init`; run the eight documented steps; idempotent.
- On an empty temp git repo produce a valid, activated project; second run is a no-op; custom `config.yaml` keys survive.
- Structure code so `schema-auto-upgrade` reuses lock/hash/install logic.

**Non-Goals:**
- Upgrade on `session_start`, `--force` backup flow, migration of foreign schemas.
- The `opsx-*` workflow commands.
- Adding a runtime dependency.

## Decisions

### Module per step plus orchestrator
`extensions/init/` holds `preflight.ts`, `config.ts`, `schema-install.ts`, `legacy.ts`, and `init.ts` (orchestrator). The orchestrator takes an `InitIO` interface (`exec`, `confirm`, `notify`, `reload`, `cwd`); `superspec.ts` adapts pi's command `ctx` to it. Alternative considered: single file or inline handler (see `brainstorm.md`).

### Existing schema directory is never overwritten here
`schema-install.ts` classifies the project schema: *absent* → install; *identical* (every bundled file exists with identical bytes, same marker version) → no-op; *foreign*, *older*, *newer* or *edited* → report and write nothing. The classification compares against the bundled files, not the lock, so a missing lock is not repaired here. Upgrade, backup and lock repair belong to `schema-auto-upgrade`.

When the state is not *absent* or *identical*, `runInit` still runs legacy cleanup, then stops: it reports the state (including that `config.yaml` now has `schema: superspec` when it was written, and how to reinstall), runs no validation and does not reload.

### Config merge by line edit
`config.ts` replaces the first top-level `schema:` line or prepends `schema: superspec` when none exists. Content is otherwise untouched (CRLF endings and a leading BOM are preserved), so re-runs are byte-identical.

### Lock file
`.pi-superspec.json` is written with sorted keys and a trailing newline: `schemaVersion` (from the bundled `schema.yaml`), `packageVersion` (from the package's `package.json`), `files` (relative path → sha256, lock excluded).

### The result survives `ctx.reload()`
In the pi TUI, `ctx.reload()` rebuilds the chat from session entries and invalidates the command ctx, so `ctx.ui.notify` messages printed before it vanish and none may be sent after it. On success `runInit` therefore persists the warnings, the validation line and the `Next: /opsx-new <name>` hint as one session message through `InitIO.report` (backed by `pi.sendMessage({ customType: "superspec-init", content, display: true })`, no turn started), then calls `io.reload()` as its last action. The message enters the LLM context; this was accepted. Failure and blocked paths keep using `notify` and do not reload.

### Legacy cleanup is opt-in per run
List matches of `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`; delete only after confirmation; skip when non-interactive.

## Risks / Trade-offs

- [pi API details unverified] → isolated behind `InitIO`; verified at plan time against installed types.
- [Line-based config edit misses an unusual `schema:` form, e.g. quoted key] → integration and unit tests cover common forms; unsupported forms are reported rather than rewritten.
- [Real `openspec` required by the integration test] → test skips when `hasOpenspec()` is false, as existing tests do.
