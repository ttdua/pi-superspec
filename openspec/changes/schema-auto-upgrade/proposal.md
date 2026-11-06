## Why

After a package update, `/opsx-init` treats a project's older installed schema as a conflict: it warns, writes nothing and stops activation, so users must delete `openspec/schemas/superspec/` by hand (issue #15). The lock file `.pi-superspec.json` already records what was installed but is never read, so `/opsx-init` cannot tell an unchanged older schema from one the user edited. The v6 to v7 bump made this the normal path for every installed project.

## What Changes

**Older schema unchanged since install**
- From: reported as `older`, nothing written, activation stops.
- To: when the installed files match the lock exactly, `/opsx-init` asks for confirmation (UI) and replaces the schema, rewrites the lock, then validates and reloads; without a UI it prints the upgrade steps and writes nothing.
- Reason: this is a routine upgrade; the lock proves there are no local edits.
- Impact: non-breaking; one confirmation after a package update.

**`--force` flag**
- From: `/opsx-init` accepts only `--lang` and `--generate`; `--lang vi --force` sets the language to `vi --force`.
- To: `--force` is a standalone token. With it, any existing schema that is not identical (older with edits or no usable lock, edited, newer, foreign) is backed up to a per-user directory outside the project and replaced, without a confirmation.
- Reason: the user needs an explicit, safe way past a blocked state.
- Impact: changes the `/opsx-init` argument syntax; a language value can no longer end in the token `--force`.

**Session start notice**
- From: nothing is said about an outdated schema until `/opsx-init` runs.
- To: in an activated project whose schema is older or edited, session start shows a notice pointing to `/opsx-init` (unchanged since install) or `/opsx-init --force` (local edits); it writes nothing.
- Reason: users learn that an upgrade is available right after a package update.
- Impact: non-breaking.

**Schema checksum per version**
- From: schema content can change without a `version` bump.
- To: a repository test pins a checksum of `schema/superspec/` per schema version and fails on a content change without a bump.
- Reason: keeps "same version, different content" meaning "edited by the user".
- Impact: maintainers update the pinned checksum with every version bump.

**Docs**
- `README.md`, `README.vi.md`, `docs/usage-guide.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/glossary.md` and `CHANGELOG.md` describe the shipped upgrade instead of "not yet shipped".

## Capabilities

### New Capabilities
- `schema-version-pin`: repository test that pins a checksum of the bundled schema tree per schema version.

### Modified Capabilities
- `schema-install`: "Existing schema directory" no longer forbids every write; adds lock-based classification of an older schema, upgrade replacement, and `--force` backup and replace.
- `init-command`: "Stop on unmanaged schema" lets a confirmed upgrade or `--force` continue to validation and reload; "Generate option" scenario "Other arguments" and "Language step order" account for the new `--force` token and the upgrade path; "Validation and activation" also runs after a replacement; "Idempotency" defines an initialised project as one whose schema is identical; adds "Schema upgrade", "Force option" and "Forced replacement".
- `package-activation`: adds a session-start notice for an upgradable, older or edited schema.
- `usage-guide`: "Usage guide schema states and troubleshooting" describes the shipped upgrade, `--force` and backups.
- `project-readme`: "README command table" requires the `/opsx-init` row to mention `--force`.

## Impact

- Code: `extensions/init/schema-install.ts` (lock reading, classification, replace and backup), `extensions/init/args.ts` (`--force`), `extensions/init/init.ts` (upgrade flow), `extensions/init/io.ts` (backup root), `extensions/superspec.ts` (session-start notice and IO wiring).
- Tests: `tests/init/schema-install.test.ts`, `tests/init/args.test.ts`, `tests/init/init.test.ts`, `tests/extension.test.ts`, a new schema checksum test.
- Files written outside the project: backups under `~/.pi/superspec-backups/` (only with `--force`).
- No new dependencies. No schema change: `schema/superspec/` stays at version 7.
