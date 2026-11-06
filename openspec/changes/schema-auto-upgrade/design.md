## Context

`extensions/init/schema-install.ts` holds the lock, hash and classification code;
`installSchema` copies the bundled tree only when the target is absent.
`extensions/init/init.ts` blocks on every other non-identical state.
`extensions/init/args.ts` parses `--lang` and a standalone `--generate`.
`extensions/superspec.ts` wires `InitIO` to pi and owns `session_start`.
Tests drive `runInit` through `tests/helpers/io.ts` (`fakeIO`) and temp projects.
The behaviour table and its rationale are in `brainstorm.md`; this document records
how it is built.

## Goals / Non-Goals

**Goals:**
- Keep classification a pure function of the project tree, its lock and the bundled tree.
- Keep every write in `schema-install.ts`; `init.ts` only decides which write to make.
- Make the backup root injectable so tests never touch the real home directory.

**Non-Goals:**
- Atomic replacement across crashes (see Risks).
- Reading `packageVersion` from the lock for any decision.

## Decisions

### D1. One new state, `upgradable`, instead of splitting `older` by a flag
`classifySchema` returns `absent | identical | upgradable | older | edited | newer | foreign`.
`upgradable` means: marker version lower than bundled and the installed tree is pristine.
`older` keeps its name and now means "lower version, not pristine". A string union stays
easy to switch on in `init.ts` and in the session notice; a separate boolean would let
callers forget to check it.

### D2. Pristine means the tree equals the lock exactly
`isPristine(dir)` reads `.pi-superspec.json`; it is pristine only when the lock parses,
its `schemaVersion` equals the marker version found in `schema.yaml`, and `hashTree(dir)`
has exactly the lock's keys with equal hashes (no missing, extra or changed file).
A missing, unreadable or malformed lock is not pristine. Alternative rejected: compare
with the bundled tree of the installed version; the package does not ship old trees.
`identical` keeps today's rule (every bundled file matches; extra files allowed), so this
change does not reclassify any project that is identical today.

### D2b. Lock shape check and file listing
The lock is accepted only when `schemaVersion` is a number and `files` is an object of
string values; `packageVersion` is ignored. `listFiles` already walks regular files only, so
symlinks and empty directories are ignored, while any extra regular file, including
`.DS_Store`, makes the tree not pristine.

### D3. Writes: `installSchema` for absent, `replaceSchema` for the rest
`replaceSchema(root, packageRoot, backupDir?)`:
1. Preflight: the bundled tree and `package.json` are read first, so nothing is written
   when the package itself is broken.
2. If a backup path is given, copy the whole target directory (lock included) there;
   on failure remove the partial backup and throw `BackupError` with the target untouched.
3. Stage the bundled tree and a fresh lock (same `buildLock`/`serializeLock` as a fresh
   install) in `openspec/.superspec-staging-*`, outside `openspec/schemas/` so OpenSpec
   never lists it.
4. Swap: rename the target aside, rename the staging dir into place, delete the old one.
   On failure in 3 or 4, remove the staging dir, rename the old one back and throw
   `ReplaceError` carrying the backup path.
It returns `{ from: number | undefined; to: number; backup?: string }` for the report.
The fs calls of steps 3 and 4 go through an optional `fsOps` seam so tests can inject
failures.
`installSchema` keeps its current contract for `absent`, so its existing tests still hold.

### D4. Decision table lives in `init.ts`
```
state         force=false                               force=true
absent        installSchema                             installSchema
identical     continue                                  continue (no backup)
upgradable    UI: confirm -> replace (no backup)        replace with backup
              declined or no UI: block, print steps
older|edited  block, mention --force                    replace with backup
newer|foreign block, mention --force                    replace with backup
```
A replaced schema continues exactly like a fresh install: legacy cleanup, language,
`openspec schema validate superspec`, report, reload. The report adds
`Schema superspec upgraded from v<from> to v<to>.` (`downgraded` for newer, `replaced` for
foreign or same version), the backup path when one was made, and
`Commit openspec/schemas/superspec/.` If validation then fails, the replaced files are kept
and the backup path is repeated in the error.
A blocked run keeps today's flow (config note, legacy cleanup, no language, no
validation, no reload) and returns `blocked`; only the message text changes.

### D5. `--force` parsing generalises the `--generate` token handling
`parseInitArgs` extracts each standalone flag in `{--generate, --force}` before parsing
`--lang`, rejecting repeats and valued forms (`--force=x`) exactly as for `--generate`.
`InitArgs` gains `force?: true`. Usage becomes
`/opsx-init [--lang <language>] [--generate] [--force]`. This is a public CLI change,
approved in the brainstorm.

### D6. Backup location and naming
`InitIO` gains `backupRoot: string`, wired in `createInitIO` to
`join(os.homedir(), ".pi", "superspec-backups")`. The backup directory is
`<backupRoot>/<basename(root)>-<first 8 hex of sha256(root)>/<label>-<timestamp>/`,
where the hash is over `realpathSync(root)`, `<label>` is `v<marker version>` or `foreign`,
and `<timestamp>` is UTC `YYYYMMDDTHHMMSSmmmZ`. If that directory already exists the backup
fails rather than overwrite it. The hash keeps two projects with the same folder name apart.
The path is outside every OpenSpec schema search location and is not purged by the OS.
Not `getAgentDir()`: backups are user data, not agent configuration, and
`PI_CODING_AGENT_DIR` overrides should not move them.

### D7. Session-start notice
The text comes from `schemaNotice(root, packageRoot)` in `extensions/schema-notice.ts`, a
separate module so a test can mock it to throw. In `session_start`, for an activated
project with `ctx.hasUI`, it classifies the project schema
against the bundled one; for `upgradable` say
`Schema superspec v<n> is older than the bundled v<m>. Run /opsx-init to upgrade.`; for
`older` say `Schema superspec v<n> is older than the bundled v<m> and has local edits. Run /opsx-init --force to replace it (a backup is kept).`;
for `edited` say `Schema superspec differs from the bundled v<m> (local edits). Run /opsx-init --force to replace it (a backup is kept).`
Other states say nothing. Classification errors are swallowed. This runs before the
plannotator probe and does not delay it beyond the synchronous hashing (a few small files).

### D8. Checksum pin as a test fixture
`tests/fixtures/schema-checksums.json` maps each schema version (string key) to a tree
digest: sha256 of the sorted `"<path>\0<sha256>\n"` lines of `hashTree(schema/superspec)`,
computed by an exported `treeDigest(dir)` in `schema-install.ts`.
`tests/schema-version-pin.test.ts` fails when the current version has no entry, its
digest differs, or a higher version is recorded, with a message telling the maintainer to
bump `version` (and the marker) or, for a deliberate bump, add the new entry. Earlier
entries stay as history. A test,
not a build step, because CI already runs `vitest`.

## Risks / Trade-offs

- [A crash (not an exception) between the two renames leaves no schema directory] →
  the window is two renames; the old tree is still in `openspec/.superspec-old-*`, the
  backup exists with `--force`, and rerunning `/opsx-init` on an absent directory installs
  fresh. Exceptions are rolled back by D3.
- [A user who edited files and also rewrote the lock to match looks pristine] → that is a
  deliberate act; accepted.
- [Backups accumulate in `~/.pi/superspec-backups/`] → only `--force` writes them, and the
  path is printed; no cleanup is added.
- [`--force` can downgrade (newer) or replace a foreign schema] → always backed up and the
  report says `replaced`, not `upgraded`.
- [Same-version user edits look like a forgotten version bump] → D8 makes a forgotten
  bump fail CI, so same-version differences reaching users are user edits.
- [Hashing on every session start] → only in activated projects with a UI, over about 15
  small files.
