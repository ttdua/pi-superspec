# opsx-init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register `/opsx-init`, which turns an empty git repo into a valid, activated superspec project and is a no-op on re-run.

**Architecture:** One module per step under `extensions/init/` (preflight, config, schema-install, legacy) plus an orchestrator `init.ts`. External effects (exec, confirm, notify, reload) come through an `InitIO` interface; `extensions/superspec.ts` adapts pi's command context to it. Unit tests use a fake `InitIO`; one integration test runs the orchestrator against a real `openspec` in a temp git repo.

**Tech Stack:** TypeScript (ESM, `.ts` import specifiers), Node `fs`/`crypto`/`child_process`, vitest. No new dependencies.

**Spec:** `openspec/changes/opsx-init/{brainstorm,design,proposal}.md` and `specs/{init-command,config-merge,schema-install,legacy-cleanup}/spec.md`; task IDs from `tasks.md`.

## Global Constraints

- `openspec` ≥ 1.4 required; install line is `brew install openspec`.
- No new runtime dependency; `config.yaml` edited by line, never parsed.
- Lock file: `openspec/schemas/superspec/.pi-superspec.json` = `{ "schemaVersion", "packageVersion", "files": { "<rel path>": "<sha256 hex>" } }`, keys sorted, trailing newline, lock itself excluded from `files`.
- Never write into `openspec/schemas/superspec/` when it exists and is not identical to the bundled copy; no backup, no `--force`.
- Legacy deletion only after `confirm`; never when `hasUI` is false; only paths matching `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`.
- Do not edit `openspec/schemas/superspec/` (upstream v4) or anything under `docs/`.
- All code, comments and commit messages in English. Tabs for indentation, double quotes (match existing files).

## Review Focus

- `config.yaml` with CRLF line endings: only the `schema:` line changes, other bytes (including `\r`) intact. Test in Task 2.
- `config.yaml` containing `schema: superspec # note` or `schema: "superspec"`: treated as set only for the exact plain form; other forms are replaced by the plain line. Test in Task 2.
- Empty `config.yaml` (0 bytes): becomes `schema: superspec\n`. Test in Task 2.
- cwd nested inside a project (`openspec/` in an ancestor): init targets the ancestor root, not cwd. Test in Task 5.
- Legacy path that is a directory (`.pi/skills/openspec-explore/`): listed and removed recursively after confirm. Test in Task 4.

---

## Task 1: Pi API and shared types

**Files:**
- Create: `extensions/init/io.ts`, `tests/helpers/io.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ExecResult { code: number; stdout: string; stderr: string }
  export interface InitIO {
  	cwd: string;
  	hasUI: boolean;
  	exec(command: string, args: string[], cwd?: string): Promise<ExecResult>;
  	confirm(title: string, message: string): Promise<boolean>;
  	notify(message: string, level?: "info" | "warning" | "error"): void;
  	reload(): Promise<void>;
  	superpowersAvailable(): boolean;
  }
  ```
  `tests/helpers/io.ts` exports `fakeIO(overrides?: Partial<InitIO>): InitIO & { notes: string[]; reloads: number }` (records `notify` messages and `reload` calls; defaults: `hasUI: true`, `confirm` → true, `exec` → code 0, `superpowersAvailable` → true).

- [x] **1.1 Pi API findings (verified against `@earendil-works/pi-coding-agent` 1.5 types):** `pi.registerCommand(name, { description, handler: (args, ctx) => Promise<void> })`; `pi.exec(command, args, { cwd }) → { stdout, stderr, code, killed, truncated }`; `ctx.ui.confirm(title, message) → Promise<boolean>`; `ctx.ui.notify(message, "info"|"warning"|"error")`; `ctx.hasUI`; `ctx.cwd`; `ctx.reload()` (command context only); `pi.getCommands()` returns `{ name }` entries, skill commands are named `skill:<name>`.
- [ ] **1.2:** Create `extensions/init/io.ts` with the interface above and `tests/helpers/io.ts` with `fakeIO`.
- [ ] **1.3:** `npm run typecheck` → passes.
- [ ] **1.4: Commit** `feat(init): add InitIO interface and test fake`.

## Task 2: Preflight and config merge

**Files:**
- Create: `extensions/init/preflight.ts`, `extensions/init/config.ts`, `tests/init/preflight.test.ts`, `tests/init/config.test.ts`

**Interfaces:**
- Consumes: `InitIO`, `fakeIO`.
- Produces:
  ```ts
  export const INSTALL_LINE = "brew install openspec";
  export function parseOpenspecVersion(stdout: string): { major: number; minor: number } | undefined;
  export async function checkOpenspec(io: InitIO): Promise<{ ok: true } | { ok: false; message: string }>;
  export async function collectWarnings(io: InitIO): Promise<string[]>;   // git + Superpowers
  export function mergeConfig(text: string | undefined): string;          // pure
  export function applyConfig(root: string): "written" | "unchanged";     // reads/writes openspec/config.yaml
  ```

- [ ] **2.1: Failing tests, `tests/init/preflight.test.ts`:** `checkOpenspec` returns ok for `1.4.1` and `2.0.0`; `{ ok:false }` with message containing `INSTALL_LINE` for `1.3.9`, for unparsable output, and when `exec` returns code 127; `collectWarnings` returns one entry mentioning "git" when `exec("git", ["rev-parse","--is-inside-work-tree"])` returns code 128, one mentioning "Superpowers" when `superpowersAvailable()` is false, and `[]` otherwise.
- [ ] **2.2: Failing tests, `tests/init/config.test.ts`** (`mergeConfig`): `"schema: spec-driven\n"` → `"schema: superspec\n"`; `"context: |\n  x\n"` → `"schema: superspec\ncontext: |\n  x\n"`; `undefined` → `"schema: superspec\n"`; `""` → `"schema: superspec\n"`; keys, comments and blank lines around an existing `schema:` line unchanged; indented `  schema: foo` under another key untouched (and `schema: superspec` still prepended); CRLF input (`"schema: a\r\nb: 1\r\n"`) → `"schema: superspec\r\nb: 1\r\n"` (replacement keeps the line's original ending); `schema: "superspec"` and `schema: superspec # c` → plain `schema: superspec`. `applyConfig`: returns `"unchanged"` and does not touch mtime when already `schema: superspec`; creates the file when missing (`"written"`).
- [ ] **2.3: Run** `npx vitest run tests/init` → FAIL (modules missing).
- [ ] **2.4: Implement** `preflight.ts` (`exec("openspec", ["--version"])`; version regex `/(\d+)\.(\d+)/`) and `config.ts` (match first line by `/^schema:.*$/m` at column 0, preserve its trailing `\r` if present).
- [ ] **2.5: Run** `npx vitest run tests/init` → PASS.
- [ ] **2.6: Commit** `feat(init): add openspec preflight and config.yaml merge`.

## Task 3: Schema install and lock

**Files:**
- Create: `extensions/init/schema-install.ts`, `tests/init/schema-install.test.ts`

**Interfaces:**
- Consumes: `SCHEMA_DIR` from `tests/helpers/project.ts` for the bundled path in tests; `isActivated` from `extensions/activation.ts` is not used here.
- Produces:
  ```ts
  export const LOCK_NAME = ".pi-superspec.json";
  export interface SchemaLock { schemaVersion: number; packageVersion: string; files: Record<string, string> }
  export type SchemaState = "absent" | "identical" | "foreign" | "edited" | "older" | "newer";
  export function hashTree(dir: string): Record<string, string>;                    // sorted rel path → sha256, excludes LOCK_NAME
  export function buildLock(bundledDir: string, packageVersion: string): SchemaLock;
  export function serializeLock(lock: SchemaLock): string;                         // JSON, 2-space indent, trailing "\n"
  export function classifySchema(projectSchemaDir: string, bundledDir: string): SchemaState;
  export function installSchema(root: string, packageRoot: string): SchemaState;   // installs only when "absent"; returns the state found
  ```

- [ ] **3.1: Failing tests (lock):** after `installSchema` into an empty temp dir, `LOCK_NAME` parses; `files` keys equal the bundled file list (recursive, forward slashes) without the lock; every hash equals sha256 of the installed file; `schemaVersion` is `5`; `packageVersion` equals `package.json` version; two installs into separate temp dirs give byte-identical locks.
- [ ] **3.2: Failing tests (classify):** `"absent"` for missing dir; `"identical"` for a fresh copy (with or without lock); `"foreign"` when `schema.yaml` has no `x-pi-superspec:` line (use `tests/fixtures/unmarked`'s schema); `"older"` / `"newer"` when marker `version:` is 4 / 6; `"edited"` when versions equal but one file's content differs or a bundled file is missing. `installSchema` on any state other than `"absent"` leaves the directory byte-identical.
- [ ] **3.3: Run** `npx vitest run tests/init/schema-install.test.ts` → FAIL.
- [ ] **3.4: Implement** `schema-install.ts`. Marker version: regex `/^x-pi-superspec:\s*\n\s+version:\s*(\d+)/m` on `schema.yaml`; bundled version from the bundled file the same way; `packageVersion` read from `<packageRoot>/package.json`.
- [ ] **3.5: Run** the same command → PASS.
- [ ] **3.6: Commit** `feat(init): add schema install, lock file and state classification`.

## Task 4: Legacy cleanup

**Files:**
- Create: `extensions/init/legacy.ts`, `tests/init/legacy.test.ts`

**Interfaces:**
- Consumes: `InitIO`, `fakeIO`.
- Produces:
  ```ts
  export function findLegacy(root: string): string[];   // root-relative, sorted
  export async function cleanLegacy(io: InitIO, root: string): Promise<{ found: string[]; deleted: string[] }>;
  ```

- [ ] **4.1: Failing tests:** `findLegacy` is `[]` with no `.pi/`; matches `.pi/prompts/opsx-new.md` and `.pi/skills/openspec-explore` (a directory) but not `.pi/prompts/custom.md`, `.pi/prompts/opsx-new.txt` or `.pi/skills/other`. `cleanLegacy`: confirm → true deletes exactly the matches (directory removed recursively) and leaves `custom.md`; confirm → false deletes nothing; `hasUI: false` deletes nothing, never calls `confirm`, and `notify`s the paths; no matches → `confirm` never called and no notification.
- [ ] **4.2: Run** `npx vitest run tests/init/legacy.test.ts` → FAIL.
- [ ] **4.3: Implement** `legacy.ts`; confirm message lists every path, one per line.
- [ ] **4.4: Run** → PASS.
- [ ] **4.5: Commit** `feat(init): add legacy file detection and confirmed cleanup`.

## Task 5: Orchestrator and command

**Files:**
- Create: `extensions/init/init.ts`, `tests/init/init.test.ts`
- Modify: `extensions/superspec.ts`, `tests/extension.test.ts`

**Interfaces:**
- Consumes: everything above; `findProjectRoot` from `extensions/activation.ts`.
- Produces:
  ```ts
  export type InitOutcome = "activated" | "blocked" | "preflight-failed" | "validation-failed";
  export async function runInit(io: InitIO, packageRoot: string): Promise<InitOutcome>;
  ```
  Order: preflight (stop → `"preflight-failed"`, nothing written) → warnings via `notify(..., "warning")` → root = `findProjectRoot(io.cwd) ?? io.cwd` → `exec("openspec", ["init","--tools","none"], root)` only if `root/openspec` is missing → `applyConfig` → `installSchema` (state not `absent`/`identical` → notify state, still run `cleanLegacy`, return `"blocked"`) → `cleanLegacy` → `exec("openspec", ["schema","validate","superspec"], root)` (non-zero → notify output as error, return `"validation-failed"`, no reload) → `io.reload()`, notify `Next: /opsx-new <name>`, return `"activated"`.

- [ ] **5.1: Failing tests, `tests/init/init.test.ts`** with `fakeIO` and a recording `exec`: preflight failure returns `"preflight-failed"` and writes nothing; `openspec init --tools none` is exec'd only when `openspec/` is missing (verify with and without); validation exit code 1 → `"validation-failed"`, `reloads === 0`; success → `"activated"`, `reloads === 1`, a note containing `/opsx-new`; foreign schema dir (copy `tests/fixtures/unmarked`) → `"blocked"`, no validate exec, no reload, dir unchanged; cwd nested below a root with `openspec/` → config and schema land in the ancestor root.
- [ ] **5.2: Failing test, `tests/extension.test.ts`:** extending the fake pi object with `registerCommand`, loading the extension registers a command named `opsx-init` with a handler, in a directory with no `openspec/` (the command registration is independent of activation).
- [ ] **5.3: Run** `npx vitest run tests/init/init.test.ts tests/extension.test.ts` → FAIL.
- [ ] **5.4: Implement** `init.ts`. In `superspec.ts` add `pi.registerCommand("opsx-init", { description: "Set up this repository for the Superspec workflow", handler: async (_args, ctx) => { … } })` building an `InitIO` from `ctx` and `pi`: `exec` → `pi.exec(command, args, { cwd })`, `confirm` → `ctx.ui.confirm`, `notify` → `ctx.ui.notify`, `reload` → `ctx.reload`, `superpowersAvailable` → `pi.getCommands().some(c => c.name === "skill:brainstorming")`. Existing tests' fake pi must still work: add `registerCommand` to the fake in `tests/extension.test.ts`.
- [ ] **5.5: Run** `npx vitest run` → PASS.
- [ ] **5.6: Commit** `feat(init): add runInit orchestrator and register /opsx-init`.

## Task 6: Integration and verification

**Files:**
- Create: `tests/init/integration.test.ts`

**Interfaces:**
- Consumes: `runInit`, `fakeIO`, `hasOpenspec` from `tests/helpers/project.ts`.

- [ ] **6.1: Integration test** (`describe.skipIf(!hasOpenspec())`): create an empty temp dir, `git init`; `io` = `fakeIO` whose `exec` spawns the real command via `spawnSync` in the given cwd; `runInit(io, packageRoot)` → `"activated"`; `isActivated(root)` true; `openspec schema validate superspec` exits 0; snapshot every file's bytes, run `runInit` again → `"activated"` and snapshot identical. Second test: pre-create `openspec/config.yaml` with `context: |\n  keep me\n` and a comment before running; after init `context` block and comment are present and `schema: superspec` is set.
- [ ] **6.2: Run** `npx vitest run tests/init/integration.test.ts` → PASS.
- [ ] **6.3: Run** `npm test` and `npm run typecheck` → both pass.
- [ ] **6.4: Manual:** in a fresh empty git repo run `pi -e <worktree>/extensions/superspec.ts`, execute `/opsx-init`, confirm the project is activated and `opsx-placeholder` appears after the reload; run `/opsx-init` again and check `git status` shows no further changes. Record the result in `apply.md`.
- [ ] **6.5: Commit** `test(init): add end-to-end integration tests`.
