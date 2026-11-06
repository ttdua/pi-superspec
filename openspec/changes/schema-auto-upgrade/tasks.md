## 1. Schema checksum pin

- [x] 1.1 Add `treeDigest(dir)` to `extensions/init/schema-install.ts` (sha256 over sorted `<path>\0<sha256>\n` lines of `hashTree`), with unit tests for determinism and for rename, add and remove changing the digest (`tests/init/schema-install.test.ts`)
- [x] 1.2 Add `.gitattributes` (`schema/** text eol=lf`), `tests/fixtures/schema-checksums.json` with the digest of the current v7 tree and `tests/schema-version-pin.test.ts` that fails on a missing entry, a different digest or a recorded version above the current one, with a message naming the version bump or the new entry

## 2. Lock-based classification

- [x] 2.1 Add `readLock(dir)` and `isPristine(dir)` to `extensions/init/schema-install.ts` per the "Pristine schema" requirement (lock shape check, version match, exact file set and hashes), with tests for untouched install, changed file, extra file (`.DS_Store`), missing file, missing or malformed lock and lock version mismatch
- [x] 2.2 Extend `SchemaState` with `upgradable` and make `classifySchema` return it for a lower marker version with a pristine tree, keeping `older` for the non-pristine case; update the existing classification tests and add one asserting classification writes nothing

## 3. Schema replacement and backup

- [x] 3.1 Add `backupPath(backupRoot, root, label, now)` that builds `<folder>-<hash8>/<label>-<YYYYMMDDTHHMMSSmmmZ>` from the real root path, with tests for the path shape, the `foreign` label and two same-named projects getting different directories
- [x] 3.2 Add `replaceSchema(root, packageRoot, backup?, fsOps?)` that preflights the bundled tree, copies the old directory to a backup first (refusing an existing backup path), stages the bundled tree and a fresh lock outside `openspec/schemas/`, and swaps it in with renames, rolling back on failure; return `{ from, to, backup }`; test replace without backup equals a fresh install with a byte-identical lock, replace with backup keeps every old file including the lock, a failed backup or a missing bundled tree leaves the directory byte-identical, and staging or swap failures leave it byte-identical and report the backup path

## 4. `--force` argument

- [x] 4.1 Generalise standalone-flag handling in `extensions/init/args.ts` to `--generate` and `--force`, add `force?: true` to `InitArgs` and update the usage string; extend `tests/init/args.test.ts` for `--force` alone, before and after `--lang`, with `--generate`, repeated, valued (`--force=yes`), and `--lang --force` reporting a missing value; replace the existing `--force` "Unknown argument" expectations

## 5. `/opsx-init` upgrade flow

- [x] 5.1 Add `backupRoot` to `InitIO` (`extensions/init/io.ts`), wire it in `createInitIO` (`extensions/superspec.ts`) to `~/.pi/superspec-backups`, and give `fakeIO` (`tests/helpers/io.ts`) a temp default
- [x] 5.2 Implement the decision table (design D4) in `extensions/init/init.ts`: confirm and replace an upgradable schema with a UI, block with upgrade steps when declined or without a UI, block other states with a `--force` hint (and the "package is older" wording for newer), and with `--force` back up and replace every non-identical state; continue replaced runs through legacy cleanup, language, validation, report and reload
- [x] 5.3 Report wording: `upgraded` / `downgraded` / `replaced` with versions, the backup path, `Commit openspec/schemas/superspec/.`, and the backup path again when validation fails after a replacement
- [x] 5.4 Add `tests/init/init.test.ts` cases for every scenario of "Schema upgrade", "Forced replacement", "Force option", "Stop on unmanaged schema", the new "Validation and activation" scenario, "Language step order" after an upgrade, and second runs after upgrade and after force being byte-identical; adjust existing blocked-run assertions to the new message text

## 6. Session-start notice

- [x] 6.1 Add `schemaNotice(root, packageRoot)` in `extensions/schema-notice.ts`; in `extensions/superspec.ts` `session_start`, use it to classify the project schema when a UI is available and notify once for `upgradable` (`/opsx-init`) and for `older` or `edited` (`/opsx-init --force`), swallowing errors; add `tests/extension.test.ts`, `tests/schema-notice.test.ts` and `tests/schema-notice-failure.test.ts` cases for upgradable, older with edits, edited, identical, no UI and a throwing classification, and update the existing `marked`-fixture tests that count notifications

## 7. Docs

- [ ] 7.1 Update `docs/usage-guide.md` "Existing schemas" and troubleshooting per the modified usage-guide requirement (lock-based check, confirmation, no-UI steps, `--force` and backup path, session notice, `--lang vi --force`, restoring from a backup)
- [ ] 7.2 Update `README.md` and `README.vi.md`: `/opsx-init` row mentions `--force`, and the paragraph under the command table describes the confirmed upgrade and `--force` with backup
- [ ] 7.3 Update `docs/architecture.md` (status note, classification, decision table, backup location, no automatic upgrade at session start, version-pin rule for maintainers), `docs/domain-model.md` (ProjectSchema states, SchemaLock is read, Project properties), `docs/glossary.md` (Lock file, new terms Pristine and Backup root) and `docs/e2e-checklist.md` (upgrade and `--force` steps replace the manual reinstall)
- [ ] 7.4 Add a `CHANGELOG.md` entry under Unreleased and update the v6 reinstall note to point to the new upgrade path; mention the checksum pin in `CONTRIBUTING.md`

## 8. Verification

- [ ] 8.1 Run `npm test`, `npm run typecheck` and `openspec validate schema-auto-upgrade --strict`
- [ ] 8.2 End-to-end in a scratch repository with a real `openspec`: install, rewrite the marker to v6 and its lock to match, run `/opsx-init` (upgrade), then edit a file and run `/opsx-init --force`, checking the backup and that OpenSpec lists only `superspec` under project schemas
