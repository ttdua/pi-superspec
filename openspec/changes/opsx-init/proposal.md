## Why

The package can detect an activated project but cannot create one: nothing installs the bundled schema, sets `schema: superspec`, or records what was installed. Users would have to copy files and edit config by hand. A single idempotent `/opsx-init` command makes setup one step and gives the later `schema-auto-upgrade` change the lock file it needs to tell pristine copies from edited ones.

## What Changes

- Register `/opsx-init`, available in every project, running the eight steps in `docs/architecture.md`.
- Check `openspec` ≥ 1.4; warn (never stop) when not in a git repo or Superpowers is not discoverable.
- Run `openspec init --tools none` only when `openspec/` is missing.
- Merge `openspec/config.yaml` by editing only the top-level `schema:` line; all other keys and comments survive.
- Copy the bundled schema to `openspec/schemas/superspec/` and write `.pi-superspec.json` (`schemaVersion`, `packageVersion`, sha256 per file). If a different schema directory already exists, report its state and write nothing.
- List legacy `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*` and delete them only after confirmation.
- Run `openspec schema validate superspec`, report the result, then `ctx.reload()` and print the next step.
- Split the code into one module per step plus an orchestrator under `extensions/init/`, with external effects injected.

No change to documented decisions; `docs/` stays as is.

## Capabilities

### New Capabilities
- `init-command`: registration of `/opsx-init`, preflight and warnings, `openspec init`, orchestration order, validation, reload, idempotency.
- `config-merge`: setting `schema: superspec` in `openspec/config.yaml` while preserving everything else.
- `schema-install`: copying the bundled schema, writing the lock file, and classifying an existing schema directory.
- `legacy-cleanup`: detecting legacy `openspec init --tools pi` files and deleting them only after confirmation.

### Modified Capabilities

## Impact

- New code: `extensions/init/*.ts`; `extensions/superspec.ts` gains command registration.
- New tests: unit tests per module and an integration test on a temp git repo with a real `openspec` (skipped when absent).
- No new runtime dependency; no schema, public manifest, or `docs/` changes.
- Out of scope: `session_start` upgrade, `--force` backup flow (`schema-auto-upgrade`), the `opsx-*` commands.
