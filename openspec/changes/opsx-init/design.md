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
`schema-install.ts` classifies the project schema: *absent* → install; *identical to bundled by lock hashes* → no-op; anything else → report and write nothing. Upgrade and backup belong to `schema-auto-upgrade`.

### Config merge by line edit
`config.ts` replaces the first top-level `schema:` line or prepends `schema: superspec` when none exists. Content is otherwise untouched, so re-runs are byte-identical.

### Lock file
`.pi-superspec.json` is written with sorted keys and a trailing newline: `schemaVersion` (from the bundled `schema.yaml`), `packageVersion` (from the package's `package.json`), `files` (relative path → sha256, lock excluded).

### Legacy cleanup is opt-in per run
List matches of `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`; delete only after confirmation; skip when non-interactive.

## Risks / Trade-offs

- [pi API details unverified] → isolated behind `InitIO`; verified at plan time against installed types.
- [Line-based config edit misses an unusual `schema:` form, e.g. quoted key] → integration and unit tests cover common forms; unsupported forms are reported rather than rewritten.
- [Real `openspec` required by the integration test] → test skips when `hasOpenspec()` is false, as existing tests do.
