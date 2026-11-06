## Design Summary

**Intent.** Let `/opsx-init` upgrade a project's installed schema after a package
update, without the user deleting `openspec/schemas/superspec/` by hand, while
never silently overwriting a schema the user edited (issue #15).

**Today.** `classifySchema` returns `absent`, `identical`, `foreign`, `older`,
`newer` or `edited`; `installSchema` writes only for `absent`, and every other
non-identical state blocks activation (`schema-install` requirement "Existing
schema directory", `init-command` requirement "Stop on unmanaged schema"). The
lock file `.pi-superspec.json` records the installed version and per-file sha256
but is never read (`docs/domain-model.md` SchemaLock, `docs/glossary.md` Lock
file). After the v6 -> v7 bump, every project with v6 installed is `older` and
must be reinstalled by hand (`docs/usage-guide.md` "Existing schemas").

**Implements.** `docs/architecture.md` "Schema identity, version and upgrade",
planned rows "older, files match lock hashes" and "older, files edited by the
user", which name this change (`schema-auto-upgrade`).

**Behaviour agreed with the user**

| Project schema | Without `--force` | With `--force` |
|---|---|---|
| absent | install, write lock (unchanged) | same |
| identical to bundled | nothing, activate (unchanged) | same, no backup |
| older, files unchanged since install (match the lock) | UI: ask to confirm, then replace, rewrite lock, validate, reload; no backup. No UI: print the steps, write nothing | back up, replace |
| older, files changed since install, or no usable lock | refuse, say `--force` exists | back up, replace |
| same version, content differs (`edited`) | refuse: treated as the user's own edits | back up, replace |
| newer | refuse: the package is outdated | back up, replace (a downgrade, said so) |
| foreign (no marker) | refuse | back up, replace |

- **Session start.** In an activated project whose schema is `older` or
  `edited`, show a one-line notice pointing to `/opsx-init`. Never write files
  at session start.
- **Backups** go outside the project, in a durable per-user directory
  (`~/.pi/superspec-backups/...`), never in `openspec/schemas/` and never in the
  OS temp directory. The backup path is printed.
- **Same version means same content.** A repository test pins a checksum of the
  bundled schema tree per schema `version`, so a schema content change without a
  version bump fails CI. This keeps "same version, different content" meaning
  "edited by the user".

**Why.** Upgrading after a package update is the normal path, not a conflict.
The lock already says what was installed, so "unchanged since install" is
provable and safe to replace; anything else needs the user's explicit
`--force`, with a backup they can still find days later.

**Goals**

- An unchanged older schema upgrades from `/opsx-init` with one confirmation.
- A schema with local edits is never overwritten without `--force`, and
  `--force` always backs up first.
- The user learns at session start that an upgrade is available.
- A maintainer cannot ship schema content changes under an unchanged version.

**Non-goals**

- Automatic upgrade at session start (the planned guards in
  `docs/architecture.md`: main checkout, trusted project, `hasUI`).
- Merging user edits into the new schema, or showing a diff.
- A restore command for backups; the path is printed and copying back is manual.
- Migrating in-flight changes between schema versions.
- Editing `openspec/schemas/superspec/` of this repository.

**Anti-goals**

- Silently overwriting a schema the user edited (`docs/architecture.md`
  Anti-goals).
- Writing backups anywhere OpenSpec resolves schemas from.
- Writing files from a non-interactive run without an explicit flag.

**Documented decisions this change alters (stated explicitly)**

- `schema-install` "Existing schema directory": "MUST NOT back up, overwrite or
  delete files there" becomes: overwrite after confirmation for an unchanged
  older schema, and after backup with `--force`.
- `init-command` "Stop on unmanaged schema": a confirmed upgrade or `--force`
  continues to validation and reload instead of stopping.
- `init-command` "Generate option" scenario "Other arguments" and the usage guide
  text "`--lang vi --force` sets the language to `vi --force`": `--force` becomes
  a standalone token like `--generate`.
- `usage-guide` "Usage guide schema states and troubleshooting": "automatic
  upgrade, `--force` and backup are not yet shipped" is replaced by the shipped
  behaviour.
- `docs/architecture.md`: backup location `openspec/schemas/superspec.bak-<timestamp>/`
  is replaced by a directory outside the project (OpenSpec 1.16 lists a
  `superspec.bak-*` directory under `openspec/schemas/` as another valid schema;
  checked with `openspec schema which --all`); the planned automatic upgrade on
  session start is replaced by a notice only; the planned foreign "migration
  after backup" becomes `--force`.

## Alternatives Considered

### Alternative A: Compare the installed tree with the bundled tree only
- **Approach**: keep classification as today and replace any `older` schema
  after confirmation, without reading the lock.
- **Pros**: smallest change; no lock parsing.
- **Cons**: an older schema with user edits is overwritten after a single
  confirmation the user may click through; no way to tell edits apart.
- **Why not chosen**: breaks the anti-goal of never overwriting user edits.

### Alternative B: Lock-based upgrade in `/opsx-init`, notice at session start (chosen)
- **Approach**: classify `older` by comparing the installed tree with the lock;
  replace an unchanged one after confirmation; everything else needs `--force`
  with an out-of-project backup; session start only notifies.
- **Pros**: uses data already written; edits are never lost; the user stays in
  control of when files change; no worktree or trust guards needed.
- **Cons**: one extra command run after a package update; a new CLI flag.
- **Why not chosen**: chosen.

### Alternative C: Automatic upgrade at session start
- **Approach**: the planned design in `docs/architecture.md`: replace an
  unchanged older schema on session start when the project is the main checkout,
  trusted and interactive.
- **Pros**: zero user action after a package update.
- **Cons**: files change without a command the user ran; needs main-checkout and
  trust detection; changes show up as unexplained diffs in git.
- **Why not chosen**: the user chose an explicit `/opsx-init` run plus a notice.

## Agreed Approach

Alternative B. The lock proves whether the installed files are unchanged since
install, so an unchanged older schema can be replaced after one confirmation,
and any other existing schema is replaced only with `--force` after a durable
backup outside the project. Session start tells the user an upgrade is
available. A checksum-per-version test keeps "same version" meaning "same
content", so `edited` stays an honest signal of user edits.

## Key Decisions

1. Upgrade runs only from `/opsx-init`; session start only notifies, for
   `older` and `edited`, and writes nothing.
2. An unchanged older schema (installed files equal the lock exactly) is
   replaced after confirmation, with no backup: its content is a released
   bundled schema and is normally committed.
3. Without a UI, an unchanged older schema is not replaced: `/opsx-init` prints
   the steps and writes nothing.
4. `--force` is a standalone token like `--generate`, combinable with `--lang`
   and `--generate`; with it, any existing non-identical schema is backed up and
   replaced without a confirmation, because the flag is the confirmation.
5. Backups live in a durable per-user directory outside the project
   (`~/.pi/superspec-backups/<project>/<version>-<timestamp>/`), and the path is
   printed.
6. Same version with different content is always `edited` (the user's own
   change); there is no separate "stale" state.
7. A repository test pins a checksum of `schema/superspec/` per schema version.
8. A missing, unreadable or mismatching lock counts as "changed since install".
9. After an upgrade, the run continues like a fresh install (legacy cleanup,
   language, validation, reload) and the report tells the user to commit
   `openspec/schemas/superspec/`.

## Open Questions

None.
