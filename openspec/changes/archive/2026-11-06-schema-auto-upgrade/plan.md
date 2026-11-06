# Schema Auto-Upgrade Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `design.md`.

**Goal:** `/opsx-init` upgrades an older schema that is unchanged since install after confirmation, replaces any other non-identical schema only with `--force` after a backup outside the project, and session start tells the user when an upgrade is available.

**Architecture:** Classification, pristine check, digest, backup naming and replacement live in `extensions/init/schema-install.ts` (pure helpers plus two writers). `extensions/init/init.ts` applies the decision table (design D4) and `extensions/init/args.ts` parses `--force`. `extensions/superspec.ts` wires the backup root and adds the session-start notice.

**Tech Stack:** TypeScript (Node `fs`, `crypto`, `os`), vitest (`bunx vitest run`), OpenSpec CLI ≥ 1.16 for the integration test.

## Global Constraints

- `schema/superspec/` keeps `version: 7`; no schema text changes. Do not edit `openspec/schemas/superspec/` (project rule).
- No new dependencies.
- Backup root: `join(os.homedir(), ".pi", "superspec-backups")`; never inside the project or `os.tmpdir()` in production wiring. Tests inject a temp `backupRoot`.
- Project root is assumed never to be a filesystem root (`findProjectRoot` needs an `openspec/` child); `backupPath` uses `"project"` if `basename(root)` is empty.
- Timestamp format: UTC `YYYYMMDDTHHMMSSmmmZ` (e.g. `20261106T101530123Z`).
- Usage string: `/opsx-init [--lang <language>] [--generate] [--force]`.
- Report verbs: `upgraded` (lower version), `downgraded` (newer), `replaced` (foreign or same version).
- Repository text in English; README.md and README.vi.md stay in sync.

## Review Focus

1. **Existing `session_start` tests use `tests/fixtures/marked` (v5, no lock).** That fixture now classifies as `older` and would add a schema notice. This breaks "does not warn when Superpowers is discoverable" (expects 0 calls) and the wiring test "swallows a rejected probe without a notification" (filters only `Superpowers`). Task 6 updates both, and the new notice tests use temp projects.
2. **A `.DS_Store` or editor backup file in the schema directory** makes the tree not pristine, so the user gets the `--force` hint instead of an upgrade. This is intended per spec. Task 2 pins it with a test, and Task 7 has the usage guide mention it.
3. **Replacement must not leave a half-written directory when the bundled copy throws mid-way.** `replaceSchema` stages the new tree in a sibling temp directory under `openspec/` and swaps it in with `renameSync`. If staging fails, the target is untouched. If the swap fails, the old directory is renamed back. Task 3 injects failures at the staging and swap points. Task 5 tests that `runInit` returns `"replace-failed"` without validating or reloading.
4. **`--lang` values containing `--force` as a word:** `--lang vi --force` must now enable force, and `--lang --force` must be a missing-value error. Task 4 tests both, and the existing expectation that `--force` is an unknown argument is replaced.
5. **Two runs in the same millisecond, or a pre-existing backup directory,** must never overwrite a backup. Task 3 tests that `replaceSchema` throws when the target backup path exists.

---

## Contracts

| Name | new / modified | Shape | public |
|---|---|---|---|
| `SchemaState` (`schema-install.ts`) | modified | `"absent" \| "identical" \| "upgradable" \| "older" \| "edited" \| "newer" \| "foreign"` | no |
| `isPristine` | new | `isPristine(dir: string): boolean` | no |
| `readLock` | new | `readLock(dir: string): SchemaLock \| undefined` — `undefined` unless JSON with numeric `schemaVersion` and `files` of string values | no |
| `markerVersion` | modified | now exported: `markerVersion(schemaDir: string): number \| undefined` | no |
| `treeDigest` | new | `treeDigest(dir: string): string` — sha256 hex of `Object.entries(hashTree(dir))` sorted by path, each line `${path}\0${sha}\n` | no |
| `backupPath` | new | `backupPath(backupRoot: string, root: string, label: string, now: Date): string` → `<backupRoot>/<basename(root)>-<sha256(realpathSync(root)).slice(0,8)>/<label>-<YYYYMMDDTHHMMSSmmmZ>` | no |
| `ReplaceResult` | new | `{ from: number \| undefined; to: number; backup?: string }` | no |
| `replaceSchema` | new | `replaceSchema(root: string, packageRoot: string, backupTo?: string, fsOps?: ReplaceFs): ReplaceResult` — throws `BackupError` (backup failed, target untouched) or `ReplaceError` (with `backup` field; target is the old tree or, only if restoring also failed, absent) | no |
| `ReplaceFs` | new | `{ cpSync: typeof fs.cpSync; renameSync: typeof fs.renameSync; rmSync: typeof fs.rmSync }` — test seam, defaults to `node:fs` | no |
| `BackupError`, `ReplaceError` | new | exported `class BackupError extends Error`; exported `class ReplaceError extends Error { backup?: string }` | no |
| `InitArgs` (`args.ts`) | modified | `{ lang?: string; generate?: true; force?: true } \| { error: string }` | no |
| `/opsx-init` arguments | modified | adds standalone `--force`; usage string as in Global Constraints | **yes** (user CLI) |
| `InitIO.backupRoot` (`io.ts`) | new | `backupRoot: string` | no |
| `schemaNotice` (`extensions/schema-notice.ts`) | new | `schemaNotice(root: string, packageRoot: string): string \| undefined` | no |
| `InitOutcome` (`init.ts`) | modified | adds `"replace-failed"` | no |
| `tests/fixtures/schema-checksums.json` | new | `{ "<version>": "<sha256 hex>" }`, keys are decimal strings | no (repository only) |
| Backup directory layout | new | path from `backupPath`; contents are a byte copy of the old `openspec/schemas/superspec/`, lock included | **yes** (user-visible files) |

---

## Task 1: Schema checksum pin — implements 1.1, 1.2

**Files:**
- Modify: `extensions/init/schema-install.ts`
- Create: `tests/fixtures/schema-checksums.json`, `tests/schema-version-pin.test.ts`, `.gitattributes`
- Test: `tests/init/schema-install.test.ts`

**Interfaces:** Produces `treeDigest`, exported `markerVersion`.

- [ ] **Step 1: Write the failing tests.** In `tests/init/schema-install.test.ts`, add a `describe("treeDigest")` with three tests:
  - `"is deterministic"`: `treeDigest(SCHEMA_DIR)` is called twice and both results are equal.
  - `"changes when a file is renamed, added or removed"`: on `copyBundled(tmp())`, each of the three mutations gives a different digest from the original.
  - `"ignores the lock file"`: after `installSchema`, `treeDigest(target(root)) === treeDigest(SCHEMA_DIR)`.
- [ ] **Step 2:** Run `bunx vitest run tests/init/schema-install.test.ts`. Expected: FAIL (`treeDigest` is not exported).
- [ ] **Step 3:** Implement `treeDigest` and export `markerVersion` in `schema-install.ts`.
- [ ] **Step 4: Write the pin test** in `tests/schema-version-pin.test.ts`. It reads `markerVersion(SCHEMA_DIR)` and the fixture JSON, and checks three things:
  - `fixture[String(v)]` is defined. Failure message: ``No checksum recorded for schema version ${v}. Add "${v}": "${digest}" to tests/fixtures/schema-checksums.json.``
  - The recorded value equals `treeDigest(SCHEMA_DIR)`. Failure message: ``schema/superspec/ changed but version is still ${v}. Bump version and x-pi-superspec.version, then record the new digest.``
  - No key is greater than `v`.
- [ ] **Step 5:** Generate the v7 digest with `bun -e 'import {treeDigest} from "./extensions/init/schema-install.ts"; console.log(treeDigest("schema/superspec"))'`, then write `{ "7": "<digest>" }` to the fixture. Add `.gitattributes` with `schema/** text eol=lf` so a Windows checkout with `autocrlf` keeps the digest stable.
- [ ] **Step 6:** Run `bunx vitest run tests/schema-version-pin.test.ts tests/init/schema-install.test.ts`. Expected: PASS. Temporarily append a byte to `schema/superspec/templates/proposal.md` and rerun. Expected: FAIL with the "Bump version" message. Then revert the byte.
- [ ] **Step 7: Commit:** `test(schema): pin bundled schema checksum per version`

---

## Task 2: Lock-based classification — implements 2.1, 2.2

**Files:**
- Modify: `extensions/init/schema-install.ts`, `tests/helpers/project.ts`
- Test: `tests/init/schema-install.test.ts`

**Interfaces:** Consumes `markerVersion`. Produces `readLock`, `isPristine`, the modified `SchemaState`, and the test helper `asV6(schemaDir: string): void` in `tests/helpers/project.ts` (also used by Tasks 3, 5 and 6).

- [ ] **Step 1: Write the failing tests.** Add `asV6(t)` to `tests/helpers/project.ts`. It rewrites the marker and `version:` to 6 and writes a lock built from `hashTree(t)` with `schemaVersion: 6`. Rename the existing local `readLock(root)` helper in `schema-install.test.ts` to `readInstalledLock` so it does not clash with the new export. Add `describe("isPristine")` with these cases:
  - `installSchema` output → `true`
  - one file changed → `false`
  - `.DS_Store` added → `false`
  - one file removed → `false`
  - lock missing → `false`
  - lock content `"{"` → `false`
  - lock with `files: { a: 1 }` → `false`
  - lock `schemaVersion` 6 while the marker is 7 → `false`

  In `classifySchema`, replace the `"older and newer by marker version"` test with three tests:
  - `asV6` gives `"upgradable"`.
  - `asV6` followed by a file edit gives `"older"`.
  - A v4 marker without a lock gives `"older"`.

  Keep `newer` (marker 8). Add `"classification writes nothing"`: `snapshot` is equal before and after for all states.
- [ ] **Step 2:** Run `bunx vitest run tests/init/schema-install.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `readLock` and `isPristine` (design D2, D2b). Add `upgradable` to `SchemaState`, and in `classifySchema` return `isPristine(dir) ? "upgradable" : "older"` for `found < bundled`.
- [ ] **Step 4:** Update the `"installSchema on existing states"` cases to expect `older` for the v4 case, and add an `upgradable` case via `asV6`. All must stay byte-identical. Drop that test's `existsSync(LOCK_NAME) === false` assertion, since the snapshot comparison already covers it and the `upgradable` case has a lock. Run the file again. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init): classify an older schema by its lock`

---

## Task 3: Backup path and replacement — implements 3.1, 3.2

**Files:**
- Modify: `extensions/init/schema-install.ts`
- Test: `tests/init/schema-install.test.ts`

**Interfaces:** Consumes `buildLock`, `serializeLock`, `markerVersion`. Produces `backupPath`, `replaceSchema`, `ReplaceResult`, `BackupError`, `ReplaceError`.

- [ ] **Step 1: Write the failing tests.**

  For `backupPath`:
  - Called with root `tmp()/app`, label `"v7"` and `new Date(Date.UTC(2026,10,6,10,15,30,123))`, the result matches `/\/app-[0-9a-f]{8}\/v7-20261106T101530123Z$/`.
  - The label `"foreign"` gives a last segment starting with `foreign-`.
  - Two `app` folders under different temp parents give different parent directories.

  For `replaceSchema`:
  - **Without a backup:** an `asV6` tree is replaced; afterwards `snapshot(target)` equals the snapshot of a fresh `installSchema` project, and the result is `{ from: 6, to: 7 }`.
  - **With a backup:** an edited tree is replaced; the backup snapshot equals the old snapshot (lock included), and `result.backup` is the backup path.
  - **Backup path already exists:** throws `BackupError`, and the target is byte-identical.
  - **Backup destination is a file, not a directory:** throws `BackupError`, and the target is byte-identical.
  - **Bundled tree missing** (`packageRoot` without `schema/superspec`): throws before any backup or write, and the target is byte-identical.
  - **Staging copy fails** (`fsOps.cpSync` throws on the staging copy, after a successful backup): throws `ReplaceError` with `backup` set, the target is byte-identical, and no staging directory is left under `openspec/`.
  - **Swap fails** (`fsOps.renameSync` throws on the new-into-place rename): throws `ReplaceError`, and the target is byte-identical because the old tree was renamed back.
- [ ] **Step 2:** Run the file. Expected: FAIL.
- [ ] **Step 3:** Implement per design D3 and D6.
  1. **Preflight.** Check that the bundled dir exists and read `package.json`, so the lock content is computed before anything is written.
  2. **Backup.** Throw `BackupError` if `existsSync(backupTo)` is true. Otherwise `mkdirSync(dirname)` then `cpSync(target, backupTo, { recursive: true, errorOnExist: true, force: false })`. On any throw, remove the partial backup and throw `BackupError`.
  3. **Stage.** Copy the bundled tree and lock into `openspec/.superspec-staging-<pid>-<ms>/`, which is outside `openspec/schemas/` so OpenSpec never lists it.
  4. **Swap.** Rename the target to `openspec/.superspec-old-<pid>-<ms>/`, rename the staging dir into place, then remove the old dir.
  5. **Failure handling.** If step 3 or 4 throws, remove the staging dir, rename the old dir back if it was moved, and throw `ReplaceError` with `backup`.

  Wire all fs calls in steps 3–4 through `fsOps` (default `node:fs`). Then update design D3 to describe this staged swap.
- [ ] **Step 4:** Run the file. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init): replace a project schema with an optional backup`

---

## Task 4: `--force` argument — implements 4.1

**Files:**
- Modify: `extensions/init/args.ts`
- Test: `tests/init/args.test.ts`

**Interfaces:** Produces the modified `InitArgs`.

- [ ] **Step 1: Write the failing tests:**
  - `parseInitArgs("--force")` returns `{ force: true }`.
  - `"--force --lang vi"` and `"--lang vi --force"` both return `{ lang: "vi", force: true }`.
  - `"--force --lang vi --generate"` returns `{ lang: "vi", generate: true, force: true }`.
  - `"--force --force"` returns an error containing `Repeated argument: --force`.
  - `"--force=yes"` and `"--force x"` return an error containing `Unknown argument`.
  - `"--lang --force"` returns an error containing `--lang`.
  - The `"--generate --generate"` error text equals `Repeated argument: --generate. Usage: /opsx-init [--lang <language>] [--generate] [--force]`.

  In the existing tests, remove `"--force"` from the loop of "rejects unknown arguments…", and in "rejects a repeated, valued or mixed-with-unknown --generate" remove `"--force --generate"` from the loop and delete the separate `unknown` assertion on it.
- [ ] **Step 2:** Run `bunx vitest run tests/init/args.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Loop the existing standalone-token logic over `["--generate", "--force"]`, run the repeat check per flag, update `USAGE`, and build the result with the optional keys present only when true.
- [ ] **Step 4:** Run the file. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(init): accept a standalone --force flag`

---

## Task 5: `/opsx-init` upgrade flow — implements 5.1, 5.2, 5.3, 5.4

**Files:**
- Modify: `extensions/init/io.ts`, `extensions/init/init.ts`, `extensions/superspec.ts` (only `createInitIO`), `tests/helpers/io.ts`
- Test: `tests/init/init.test.ts`, `tests/extension.test.ts` (`describe("createInitIO")`)

**Interfaces:**
- Consumes: `classifySchema`, `installSchema`, `replaceSchema`, `backupPath`, `BackupError`, `ReplaceError`, `markerVersion`, and `InitArgs.force`.
- Produces: `InitIO.backupRoot` and `InitOutcome` with `"replace-failed"`.

- [ ] **Step 1:** Add `backupRoot` to `InitIO`. In `fakeIO`, default it to `join(tmpdir(), "pi-superspec-bak-unused")`, a path that is never created unless a test backs up. Tests that back up pass `backupRoot: tmp()`, which is cleaned in `afterEach`. In `createInitIO`, set it to `join(homedir(), ".pi", "superspec-backups")`. Add one `createInitIO` test asserting that path.
- [ ] **Step 2: Write the failing `runInit` tests** in a new `describe("existing schema")`. Use a helper that installs v7 via `runInit` and then applies `asV6` (copy that helper from Task 2 into the test file, or move it into `tests/helpers/project.ts` and import it in both). Cover these cases:
  - **Confirmed upgrade:** `confirm` resolves to true. The run returns `"activated"`, the schema equals a fresh install, `readdirSync(io.backupRoot)` is empty, the report contains `upgraded from v6 to v7` and `Commit openspec/schemas/superspec/`, and there is 1 reload.
  - **Declined upgrade:** `confirm` resolves to false. The run returns `"blocked"`, the directory is byte-identical, there is no validate call and 0 reloads.
  - **No UI:** `hasUI: false`. `confirm` is never called, the run returns `"blocked"`, the notice contains `/opsx-init` and `--force`, and the directory is byte-identical.
  - **Blocked without `--force`:** edited, older (not pristine) and foreign each give `"blocked"`, a notice containing `--force`, and a byte-identical directory. A newer schema gives a notice containing `older than the project schema`.
  - **`--force` replaces and backs up:**
    - `--force` on an edited schema: `"activated"`, the report contains `replaced` and the backup path, and the backup holds the old files.
    - `--force` on a newer schema: the report contains `downgraded`.
    - `--force` on an older (not pristine) schema: the report contains `upgraded`.
    - `--force` on a foreign schema: the backup directory name starts with `foreign-` and the report contains `replaced`.
    - `--force` on an upgradable schema with a UI: `confirm` is not called and a backup exists.
  - **`--force` without anything to replace:**
    - `--force` on an absent schema: a fresh install, `"activated"`, and no backup.
    - `--force` on an identical schema: no backup, and the files are byte-identical.
  - **`--force` combined with other flags:** `--force --lang vi --generate` on an edited schema gives `language: vi`, and the report mentions `/opsx-generate-specs`.
  - **Second runs:**
    - after a confirmed upgrade: everything byte-identical;
    - after `--force`: no new backup and everything byte-identical.
  - **Failures:**
    - Validation fails after an upgrade: `"validation-failed"`, the files stay replaced, the error contains the backup path when one exists, and there are 0 reloads.
    - A backup failure (make `io.backupRoot` a regular file): `"replace-failed"`, the directory is byte-identical, no validate call and 0 reloads.
  - **Language:** an upgradable schema, a confirmed upgrade and `--lang vi` give `language: vi`.

  Update the existing `"blocks on a foreign schema without validating or reloading"` test. Drop its `schema-auto-upgrade` and `remove openspec/schemas/superspec/` expectations, and assert `--force` instead.
- [ ] **Step 3:** Run `bunx vitest run tests/init/init.test.ts`. Expected: the new tests fail.
- [ ] **Step 4:** Implement the D4 table in `runInit`.
  - Classify with `classifySchema` before deciding. Call `installSchema` only for `absent`, and `replaceSchema` for a replacement. When backing up, pass `backupPath(io.backupRoot, root, label, new Date())`.
  - Wrap the whole replace sequence (`backupPath`, including its `realpathSync`, and `replaceSchema`) in one `try`. Map any thrown error to an error notice and `"replace-failed"` after legacy cleanup: `BackupError`, `ReplaceError`, or anything else. Print the backup path when `ReplaceError.backup` is set.
  - Confirm-dialog title: `Upgrade schema superspec?`. Message: `Replace openspec/schemas/superspec (v<from>, unchanged since install) with the bundled v<to>? Commit the result afterwards.`
  - Blocked messages per state:
    - `upgradable` without a UI: `Schema superspec v<n> can be upgraded to v<m>. Run /opsx-init in an interactive session to confirm, or /opsx-init --force to upgrade and keep a backup.`
    - `upgradable`, declined (and this is the only case asking for confirmation): `Schema superspec v<n> was left unchanged. Run /opsx-init again and confirm to upgrade to v<m>.`
    - other states: `Existing schema at openspec/schemas/superspec is <state>; it was left unchanged. Activation stopped. Run /opsx-init --force to replace it with the bundled v<m>; the current files are backed up to ~/.pi/superspec-backups/ first.`
    - newer: also add `The installed pi-superspec package is older than the project schema; update the package instead if possible.`
  - Keep the existing config `Note:` line.
- [ ] **Step 5:** Run `bunx vitest run tests/init`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat(init): upgrade or force-replace an existing schema`

---

## Task 6: Session-start notice — implements 6.1

**Files:**
- Create: `extensions/schema-notice.ts`, `tests/schema-notice.test.ts`, `tests/schema-notice-failure.test.ts`
- Modify: `extensions/superspec.ts`
- Test: `tests/extension.test.ts` (`describe("session_start handler")`, `describe("interaction channel wiring")`)

**Interfaces:** Consumes `classifySchema`, `markerVersion`, and `packageRoot`.

- [ ] **Step 1: Write the failing tests.**
  - Make the four existing Superpowers tests filter `calls` to messages containing `Superpowers`, and keep their counts.
  - In `describe("interaction channel wiring")`, change the filter of "swallows a rejected probe without a notification" to exclude messages containing `Superpowers` or `Schema superspec`. Check the other wiring tests that read notifications the same way.
  - Add a helper `project(state)` that builds a temp project from `SCHEMA_DIR` plus the `asV6` and edit mutations.
  - Add tests that pass `[{ name: "skill:brainstorming" }]` so only the schema notice can appear:
    - upgradable: one notice containing `v6`, `v7` and `/opsx-init`, but not `--force`;
    - older with edits: one notice containing `/opsx-init --force`;
    - edited: one notice containing `/opsx-init --force`;
    - identical: 0 notices;
    - no UI with an upgradable schema: 0 notices;
    - classification throws: in a separate file `tests/schema-notice-failure.test.ts`, `vi.mock("../extensions/schema-notice.ts", () => ({ schemaNotice: () => { throw new Error("boom"); } }))`, then load the extension on the `marked` fixture with a UI. The handler resolves without throwing, there are 0 schema notices, and the plannotator probe still runs (`exec` is called).
  - `schemaNotice` unit tests in `tests/schema-notice.test.ts` for each state's text.
  - Each of these asserts that `snapshot` is unchanged.
- [ ] **Step 2:** Run `bunx vitest run tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Create `extensions/schema-notice.ts` exporting `schemaNotice(root: string, packageRoot: string): string | undefined`. It returns the design D7 text for `upgradable`, `older` and `edited`, and `undefined` otherwise. In `session_start`, after the Superpowers warning and before the probe, when `ctx.hasUI`, call it inside `try { … } catch {}` and `ctx.ui.notify(text, "info")` when it returns text.
- [ ] **Step 4:** Run `bunx vitest run tests/extension.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(activation): notify when the project schema is outdated`

---

## Task 7: Docs — implements 7.1, 7.2, 7.3, 7.4

**Files:**
- Modify: `docs/usage-guide.md`, `README.md`, `README.vi.md`, `docs/architecture.md`, `docs/domain-model.md`, `docs/glossary.md`, `docs/e2e-checklist.md`, `CHANGELOG.md`, `CONTRIBUTING.md`

**Interfaces:** None. The text follows the specs `usage-guide` and `project-readme` and the Task 5 messages.

- [ ] **Step 1: Usage guide.** Rewrite `docs/usage-guide.md` "Existing schemas":
  - a state table matching design D4;
  - "unchanged since install" explained through the lock;
  - the `.DS_Store` note;
  - the session notice;
  - the backup path pattern;
  - a restore subsection: copy the backup over `openspec/schemas/superspec/`, then commit.

  Replace the line about `--lang vi --force` and the v6 manual reinstall paragraph. Add a troubleshooting entry: "My schema was replaced and I want my edits back".
- [ ] **Step 2: READMEs.** First extend `tests/generate-specs-command.test.ts` "lists every prompt command in a table row of both READMEs…": the `/opsx-init` row of both READMEs must contain `--force`. Run it and expect FAIL. Then, in both `README.md` and `README.vi.md`, mention `--force` in the `/opsx-init` row and replace the "Upgrade tooling is not yet shipped" paragraph with the upgrade and `--force` behaviour. Rerun and expect PASS.
- [ ] **Step 3: Architecture and model docs.**
  - `docs/architecture.md`:
    - the Goals item 4 and status note;
    - the shipped classification;
    - the decision table, with the backup location changed and session start notice-only;
    - the auto-upgrade guards paragraph removed or rewritten as not planned;
    - a maintainer rule: bump the version and record the digest.
  - `docs/domain-model.md`:
    - the ProjectSchema states (add *upgradable*);
    - SchemaLock is read for the pristine check;
    - `isMainCheckout` and `trusted` rows marked not planned.
  - `docs/glossary.md`: the Lock file entry, plus new entries **Pristine** and **Backup root**.
- [ ] **Step 4: E2E checklist.** In `docs/e2e-checklist.md`, replace the manual remove-and-reinstall steps (lines ~60–62) with two flows:
  - edited, then blocked, then `--force`, then check the backup;
  - an older pristine schema (marker and lock set to 6), then the notice at session start, then `/opsx-init` confirm, then check the upgraded files.
- [ ] **Step 5: Changelog and contributing.**
  - `CHANGELOG.md`, under Unreleased: add a bullet for the upgrade, `--force`, backups, the session notice and the checksum pin. Change the v6 reinstall note to "run `/opsx-init` to upgrade".
  - `CONTRIBUTING.md`: add one line on recording the digest when bumping the schema version.
- [ ] **Step 6:** Check that no "not yet shipped" text about upgrade remains: `rg -n "not yet shipped|schema-auto-upgrade|Upgrade tooling" README*.md docs CHANGELOG.md` should print no line about upgrade.
- [ ] **Step 7: Commit:** `docs: describe schema upgrade and --force`

---

## Task 8: Verification — implements 8.1, 8.2

- [ ] **Step 1:** Run `npm test`, `npm run typecheck` and `openspec validate schema-auto-upgrade --strict`. These are the repository's own scripts; `bunx vitest run` is used for single files and does not touch `package-lock.json`. Expected: all pass, 0 errors.
- [ ] **Step 2: E2E in a scratch git repository** with pi and the local package (`pi -e <worktree>`):
  1. Run `/opsx-init`.
  2. Set `schema.yaml` `version`/marker to 6 and the lock to `schemaVersion: 6` with the recomputed `schema.yaml` hash.
  3. Restart pi. Expected: the notice mentions v6, v7 and `/opsx-init`.
  4. Run `/opsx-init` and confirm. Expected: "upgraded from v6 to v7", and the tree equals the bundled one.
  5. Edit a template and run `/opsx-init`. Expected: blocked with a `--force` hint.
  6. Run `/opsx-init --force`. Expected: the backup path is printed and holds the edit.
  7. Run `openspec schema which --all`. Expected: only `superspec` under project schemas.

  Record the results in `apply.md`.

---

## Scenario → test

**schema-install**
- Identical to bundled → `schema-install.test.ts` "identical for a fresh copy" and "leaves every non-absent state byte-identical"
- Foreign schema → `classifySchema` "foreign without marker"
- Edited schema → `classifySchema` "edited when content differs…"
- Older schema unchanged since install → `classifySchema` "asV6 is upgradable"
- Older or newer schema → `classifySchema` "asV6 + edit is older", "v4 without lock is older", "newer"
- Classification writes nothing → `classifySchema` "classification writes nothing"
- Untouched install / Changed file / Extra or missing file / No usable lock / Lock version mismatch → `describe("isPristine")` cases (Task 2)
- Replace without backup / Replace with backup / Backup fails → `describe("replaceSchema")` (Task 3)
- Replacement fails after backup → `replaceSchema` "staging copy fails" and "swap fails" (Task 3)
- Path shape / Distinct projects / Foreign label → `describe("backupPath")` (Task 3)

**schema-version-pin**
- Unchanged schema / Content changed without a version bump / New version without a record / No future versions recorded → `schema-version-pin.test.ts` (Task 1, with the manual mutation check in Step 6)
- Digest covers paths and file set / Digest is deterministic → `describe("treeDigest")` (Task 1)

**init-command**
- Foreign schema present → `init.test.ts` "blocks on a foreign schema…" (updated)
- Edited / Older with local edits / Newer schema without force → `describe("existing schema")` blocked cases
- Blocked project with a flag / Blocked project without a flag → existing language tests
- Upgraded project with a flag → "confirmed upgrade with --lang vi"
- Generate option scenarios → existing `--generate` tests, plus `args.test.ts` for Other arguments with `--force` accepted
- Confirmed upgrade / Declined upgrade / No UI / Second run after upgrade → `describe("existing schema")` (Task 5)
- Force with language and generate / Force before or after language / Language value missing before force / Repeated or valued force → `args.test.ts` (Task 4) and `init.test.ts` "--force --lang vi --generate"
- Force on an edited / newer / older with local edits / foreign / absent / upgradable / identical schema, Second run after force, Backup failure → `describe("existing schema")` force cases (Task 5)
- Validation passes / Validation fails → existing `runInit` tests
- Validation fails after replacement → "validation fails after an upgrade" (Task 5)
- Second run is a no-op / End to end on an empty repository / Existing language preserved → existing tests and `tests/init/integration.test.ts`

**package-activation**
- Upgradable schema / Older schema with local edits / Edited schema / Identical schema / No UI → `extension.test.ts` `session_start` schema-notice tests and `schema-notice.test.ts` (Task 6)
- Classification fails → `schema-notice-failure.test.ts` (Task 6)

**usage-guide**
- Commands not appearing / Existing schema is not overwritten / Upgrade after a package update / Restore from backup → manual doc review in Task 7, Step 1 (doc requirements have no automated test, consistent with earlier doc changes)

**project-readme**
- Table matches shipped prompts → existing `generate-specs-command.test.ts` README table test
- Init row mentions the flag → same test, extended with `--force` (Task 7, Step 2)
- Upgrade behaviour stated → manual check in Task 7, Step 2
