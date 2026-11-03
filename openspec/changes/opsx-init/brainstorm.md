## Design Summary

Implements `docs/architecture.md` § `/opsx-init` (steps 1–8) and § Schema identity (lock file written on install), plus `docs/domain-model.md` § SchemaLock and § ProjectConfig. Depends on the archived `package-skeleton` (extension, activation) and `superspec-schema-v5` (bundled schema).

`/opsx-init` is registered unconditionally and is idempotent. It turns an empty git repository into an activated project and re-running it changes nothing. It runs the documented eight steps in order:

1. Preflight: `openspec --version` ≥ 1.4, otherwise print the install line and stop.
2. Warn, never stop, when not in a git repo or when Superpowers skills are not discoverable.
3. Run `openspec init --tools none` only when `openspec/` is missing.
4. Merge `openspec/config.yaml`: set top-level `schema: superspec`, keep every other key and comment.
5. Install the bundled schema to `openspec/schemas/superspec/` and write `.pi-superspec.json` (`schemaVersion`, `packageVersion`, per-file sha256).
6. Detect legacy `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`, list them, and ask before deleting.
7. Run `openspec schema validate superspec` and report.
8. `ctx.reload()` and print the next step (`/opsx-new <name>`).

Code is split into one module per step plus an orchestrator. External effects (exec, ask, notify, reload) come in through a small injected interface, so each step is unit-testable and the integration test drives the orchestrator on a real temp git repo with a real `openspec`.

Out of scope: upgrade on `session_start`, the `--force` backup flow (change `schema-auto-upgrade`), and the `opsx-*` workflow commands.

## Alternatives Considered

### Alternative A: One module per step plus orchestrator
- **Approach**: `extensions/init/{preflight,config,schema-install,legacy}.ts` plus `init.ts`; deps injected through an interface; `superspec.ts` only registers the command and adapts `ctx` to the interface.
- **Pros**: each step unit-testable; lock/hash/install logic reusable by `schema-auto-upgrade`; small files.
- **Cons**: more files and one interface to maintain.
- **Why not chosen**: this is the chosen approach.

### Alternative B: Single `init.ts` with injected deps
- **Approach**: all eight steps in one file behind the same interface.
- **Pros**: fewer files.
- **Cons**: roughly 300 lines; `schema-auto-upgrade` would have to extract lock/hash code later.
- **Why not chosen**: pushes a refactor onto the next change for no gain now.

### Alternative C: Inline in the `superspec.ts` handler
- **Approach**: use pi's `ctx` directly, no seam.
- **Pros**: least code up front.
- **Cons**: integration test must fake pi's `ctx`; nothing reusable; handler grows large.
- **Why not chosen**: fails the "integration test on an empty temp git repo" goal without heavy mocking.

## Agreed Approach

Alternative A. It keeps each documented step independently testable, gives `schema-auto-upgrade` a ready lock/hash/install module, and keeps `superspec.ts` a thin adapter.

## Key Decisions

- **Existing schema directory.** Install only when `openspec/schemas/superspec/` is absent or byte-identical (by lock hash) to the bundled copy (no-op). For older-pristine, older-edited, newer, or foreign (no marker, e.g. upstream v4) states, report the state, write nothing, and point to `schema-auto-upgrade`. This honours the anti-goal "silently overwriting a schema the user edited". Decided with the user.
- **Config merge.** Edit the top-level `schema:` line in place, or prepend it when absent. No YAML library, no new dependency, all other keys and comments preserved byte for byte. Decided with the user.
- **Code layout.** Alternative A. Decided with the user.
- **Lock file contents.** `{ schemaVersion, packageVersion, files }` as in `docs/architecture.md`; `files` maps each relative path under the schema dir (excluding the lock itself) to its sha256. Keys sorted so the output is deterministic and re-runs are byte-identical. (Assistant's call.)
- **Legacy cleanup.** Deletion happens only after an explicit confirmation listing every path. Declining leaves them and the command still succeeds. In non-interactive sessions nothing is deleted. (Assistant's call.)
- **Validate failure.** A failing `openspec schema validate superspec` is reported with its output and skips `ctx.reload()` and the next-step line. Files already written stay. (Assistant's call.)
- **Package version source.** Read `version` from the package's own `package.json`. (Assistant's call.)

## Open Questions

- Exact pi API shape for `registerCommand`, confirmation UI, notify, and `ctx.reload()` is verified against the installed `@earendil-works/pi-coding-agent` types at plan time; `node_modules` is not installed in this worktree yet. The injected interface isolates any difference.
- Whether Superpowers is "discoverable" is detected through the pi API at plan time; if no reliable signal exists, the warning is skipped rather than guessed.
