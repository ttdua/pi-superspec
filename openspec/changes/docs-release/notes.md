# Ground-truth notes (scratch; deleted in Task 7)

Facts below come only from reading `extensions/`, `skills/`, `prompts/`, `schema/superspec/schema.yaml`, `package.json`, `openspec/specs/` and `docs/`. Line references are to the worktree at the time of writing. Items marked VERIFIED were also run (OpenSpec 1.4.1 on this machine).

## Init

### Registration and availability
- `/opsx-init` is registered unconditionally (`extensions/superspec.ts:39`), description "Set up this repository for the Superspec workflow". It takes no arguments: the handler ignores `_args` (`superspec.ts:41`). There is no `--force` or any other flag.
- It needs no git repository and no clean tree. Outside a git repo it only warns (`extensions/init/preflight.ts:43`). It never runs `git status`; the only git call is `git rev-parse --is-inside-work-tree`.
- The other commands (`opsx-new` ... `opsx-verify`) exist only once the project is activated (see Activation).

### Activation
- Project root = nearest ancestor-or-self of cwd that contains an `openspec/` directory (`extensions/activation.ts:15`). If none, `/opsx-init` uses cwd itself as root (`init.ts:33`).
- Activated = `openspec/schemas/superspec/schema.yaml` matches `/^x-pi-superspec:/m` (`activation.ts:4,26`). Activation matches only that key line; classification (`schema-install.ts:15`) also needs a `version: <n>` line right after it, so a marker without a version is activated yet classed `foreign` (blocked by /opsx-init).
- On `resources_discover`, an activated project gets `skills/` and `prompts/` of the package (`superspec.ts:17-24`). Not activated: only `/opsx-init` exists. So after removing the package no `/opsx-*` command remains.

### Steps, in order (`extensions/init/init.ts:24-77`)
1. Preflight: `openspec --version`. Fails with `error` notify and stop (outcome `preflight-failed`, no files written) when:
   - command missing or non-zero exit: `openspec was not found`
   - version unparsable (`/(\d+)\.(\d+)/`): `Could not parse the openspec version`
   - major < 1 or 1.x with minor < 4: `openspec <major>.<minor> is too old`
   - Message format: `<reason>. Install or upgrade OpenSpec (>= 1.4): brew install openspec` (`preflight.ts:16-19`).
2. Warnings (notify level `warning`, do not stop; also prepended to the final report):
   - `Not inside a git repository; continuing without git.`
   - `Superpowers skills were not found; install Superpowers for the full workflow.` (Superpowers detected = a registered command named `skill:brainstorming`, `routing-note.ts:67`.)
3. If `<root>/openspec` is missing: run `openspec init --tools none` in root. On failure: error notify `openspec init --tools none failed` (+ `:\n<output>`), stop. When `openspec/` exists, `openspec init` is not run. VERIFIED: `openspec init --tools none` creates only `openspec/changes/archive/` and `openspec/specs/` (no config.yaml: "Config: skipped (non-interactive mode)").
4. Config: `applyConfig` writes `openspec/config.yaml` (`config.ts`). Empty or missing file becomes `schema: superspec\n`. An existing `schema:` line is replaced by `schema: superspec`; otherwise `schema: superspec` is prepended; all other keys are kept; BOM and CRLF preserved. Returns `written` or `unchanged`.
5. Schema install `installSchema` (`schema-install.ts:74`): classifies `openspec/schemas/superspec/` against the bundled `schema/superspec/`.
   - `absent`: copies the whole bundled tree to `openspec/schemas/superspec/` and writes the lock file `.pi-superspec.json` in that directory. Silent success.
   - `identical`: continues, nothing written.
   - any other state: STOP with outcome `blocked` (see Upgrade).
6. Legacy cleanup `cleanLegacy` (`legacy.ts`), runs in both the continue and the blocked path:
   - Looks for `.pi/prompts/opsx-*.md` (files) and `.pi/skills/openspec-*` (anything starting `openspec-`).
   - No UI (`hasUI` false): warns `Legacy openspec files found (not deleted, no interactive UI):\n<list>`.
   - UI: confirm dialog, title `Delete legacy openspec files?`, message `The following paths will be deleted:\n<list>`. Yes: `rmSync` recursive; No: keeps them. Nothing found: silent.
7. Validate: `openspec schema validate superspec` in root. On non-zero: error notify `openspec schema validate superspec failed` (+ `:\n<output>`) then `\nInstalled files were kept; the project activates on the next session start even though this session was not reloaded.` Outcome `validation-failed`, no reload.
8. Success: `io.report` posts one visible session message (custom type `superspec-init`) with lines: any warnings, then `Schema superspec is valid.`, then `Superspec is set up. Next: /opsx-new <name>`. Then `ctx.reload()` runs automatically (`init.ts:76`). Nothing else may touch io after reload.

### What the user must do afterwards
- Nothing for reload: `/opsx-init` calls `ctx.reload()` itself on success, so `/opsx-*` commands appear in the same session. The user next runs `/opsx-new <name>`.
- Manual reload or a new session is needed only after `validation-failed` (activates on next session start) or after fixing a blocked state.
- Prerequisites the user installs themselves: OpenSpec >= 1.4 (`brew install openspec`), Superpowers (`pi install git:github.com/obra/superpowers`, from `SUPERPOWERS_MISSING_WARNING`, `routing-note.ts:71`). Not installed by the package.
- Idempotent: a second run on an initialised project finds `identical`, writes nothing, reloads again (spec `openspec/specs/init-command/spec.md`, "Idempotency").
- Git is not needed for `/opsx-init`, but the later workflow uses git (branch/worktree in `opsx-apply`, finalize). An empty repo with no commit is untested by this package; do not claim it works.

### Other runtime behaviour (activated project)
- `session_start`: only when activated AND `ctx.hasUI` and Superpowers missing: notify (warning) `pi-superspec needs Superpowers, which is not installed. Install it with: pi install git:github.com/obra/superpowers` (`superspec.ts:33-37`). Fires on every session start including reload.
- `context` event: inserts the routing note (user message starting `pi-superspec routing note`) once; after the message containing `superpowers:using-superpowers bootstrap for pi` if present, else at head after any `compactionSummary` messages; skipped if already present (`routing-note.ts`). Text: behaviour-changing work MUST first be proposed with `/opsx-new`, before brainstorming; small work that changes no spec is done directly with TDD and no change directory; do NOT write design docs or plans to `docs/superpowers/`.
- Optional pi packages named in skills (fallbacks exist): `ask_user_question` tool (UNVERIFIED: the package name `rpiv-ask-user-question` (and `rpiv-todo`) appears only in docs/architecture.md:124-126, nowhere in code or skills, do not quote as fact; the skill text says only "the `ask_user_question` tool if available"), `todo` tool, `subagent` tool from `pi-subagents` (named in `skills/opsx-apply/SKILL.md`).

## Upgrade

THE SHIPPED CODE HAS NO UPGRADE MECHANISM. Do not document automatic upgrade, `--force`, backups, migration offers or write guards as features.

### What exists
- Lock file name: `.pi-superspec.json`, located in `openspec/schemas/superspec/` (`schema-install.ts:5,82`). Content: `{ "schemaVersion": n, "packageVersion": "...", "files": { "<rel path>": "<sha256>" } }`, 2-space JSON plus newline. It is written on a fresh install only, and is NOT read anywhere (classification hashes the project dir against the bundled dir, ignoring the lock; the lock is excluded from hashing, `schema-install.ts:27`).
- Schema marker: `x-pi-superspec:\n  version: 5` in `schema/superspec/schema.yaml` lines 7-8 (schema `version: 5`).
- Classification `classifySchema` has six states, checked in this order (`schema-install.ts:59-72`):
  1. directory missing: `absent` (fresh install)
  2. `schema.yaml` lacks the `x-pi-superspec` marker with `version:`: `foreign`
  3. marker version < bundled: `older`
  4. marker version > bundled: `newer`
  5. same version but any bundled file's sha256 differs or is missing: `edited`
  6. same version, all bundled files match: `identical` (extra user files are ignored)
  The plan said "five upgrade cases"; the code has six schema states: absent (install), identical (no-op), and four blocked states `foreign` / `older` / `newer` / `edited`. Note an older schema is `older` even if edited.
- For every state other than absent/identical, `/opsx-init` writes nothing in `openspec/schemas/superspec/`, notifies at level `warning`, runs legacy cleanup, returns `blocked` without validating or reloading (`init.ts:47-59`). Exact message:
  ```
  Existing schema at openspec/schemas/superspec is <state>; it was left unchanged. Activation stopped.
  Note: openspec/config.yaml now has `schema: superspec`.          (only if config.yaml was just changed)
  Upgrading or repairing an existing schema is handled by the schema-auto-upgrade change. To reinstall now, back up any local edits, remove openspec/schemas/superspec/, and run /opsx-init again.
  ```
  The `Note:` line exists because config is applied before the schema is classified, so a blocked run may already have switched `config.yaml`.
- Manual upgrade/repair path that exists today: back up local edits, delete `openspec/schemas/superspec/`, run `/opsx-init`.
- Activation still follows the marker: `older`, `newer` and `edited` schemas carry the marker so the project is activated; `foreign` (no marker, e.g. upstream Superspec v4) is not activated.

### What does NOT exist (grep for force/backup/trusted/isProjectTrusted/git-common-dir/bak finds nothing in `extensions/`)
- No `--force` flag; no argument parsing at all.
- No backup path (`openspec/schemas/superspec.bak-<timestamp>/` is only in docs/architecture.md:106).
- No automatic upgrade on `session_start`; no version compare at session start.
- No write guards for main checkout (`git-dir` vs `git-common-dir`), `ctx.isProjectTrusted()`. `ctx.hasUI` is used only for (a) the legacy-delete confirm and (b) the Superpowers warning at session start.
- No migration offer for a no-marker schema; no "package is outdated" warning for `newer`.
- The init message itself names the unshipped work as the `schema-auto-upgrade` change; no such change directory exists (`openspec/changes/` has only `archive/` and `docs-release/`).
- Consequence for tasks: `docs-release/plan.md` lines 26-28 and 128 and `specs/usage-guide/spec.md` lines 29 and 37 require the guide to describe automatic upgrade, trusted/main-checkout guards and `/opsx-init --force`. These cannot be made true without code (design.md Non-Goals: record as a finding instead). The guide must describe only the blocked-state behaviour above, and README/guide must not mention `--force`.

## Uninstall

After the package is removed (`pi remove ...`), commands and skills vanish because they come only from `resources_discover` of the package, plus `/opsx-init` which is registered by the extension. Files the package or `/opsx-init` put in a project and that stay:
- `openspec/` (created by `openspec init --tools none` if it did not exist: `openspec/changes/archive/`, `openspec/specs/`), plus all changes, archived changes and living specs the user made.
- `openspec/config.yaml`, with the line `schema: superspec` (other keys untouched).
- `openspec/schemas/superspec/` : `schema.yaml` (with the `x-pi-superspec` marker), `templates/*.md` (9 files: apply, brainstorm, design, finalize, plan, proposal, spec, tasks, verify), `LICENSE`.
- `openspec/schemas/superspec/.pi-superspec.json` (the lock file; the brief's `.pi-superspec.json`).
- Anything the user created: change directories, and e.g. `.superpowers/` ledgers, worktrees and feature branches made by `/opsx-apply` (git state, outside `openspec/`).
Not left behind: any `.pi/` file (the package writes none; it only offers to delete legacy `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`, and only with confirmation). Because the schema stays and `config.yaml` names it, the plain `openspec` CLI keeps working with `schema: superspec` (UNVERIFIED: that OpenSpec ignores the unknown `x-pi-superspec` key is only a claim in docs/architecture.md:97-98; not tested here, do not quote as fact). Re-installing the package re-activates the project automatically since the marker is still present.
Manual full removal (not automated by the package): delete `openspec/schemas/superspec/` and revert the `schema:` line in `openspec/config.yaml`.

## Commands

All commands are pi prompts in `prompts/opsx-*.md` that tell the agent to "Read the SKILL.md at the path listed for skill `opsx-<name>` in the available skills list, and follow it exactly. User input: $@". Arguments are therefore free text passed through `$@`; there are no flags. Only `/opsx-init` is code. All eight below exist only in an activated project. Not shipped: `opsx-propose`, `opsx-bulk-archive` (no prompt or skill).

| Command | Description (prompt front-matter) | Argument | Stops before / behaviour |
|---|---|---|---|
| `/opsx-init` | Set up this repository for the Superspec workflow | none | See Init. Always available. |
| `/opsx-explore` | Explore ideas and clarify requirements before or during an OpenSpec change | optional topic | Thinking mode only; never writes application code; may create OpenSpec artifacts if asked (`SKILL.md` lines 10, 274-276). |
| `/opsx-new` | Start a new OpenSpec change and show the first artifact instructions | kebab-case name or a description; if empty, asks "What change do you want to work on? Describe what you want to build or fix." | `openspec new change "<name>"` (never `--schema`), then `openspec status`, then `openspec instructions <first-ready>`; STOPS, creates no artifact. If the name exists, suggests `/opsx-continue <name>` and stops. Ends with prompt to run `/opsx-continue` or `/opsx-ff`. |
| `/opsx-continue` | Continue an OpenSpec change by creating the next artifact | optional change name; if several changes and none inferable, asks which (never guesses) | Creates exactly ONE ready artifact, then STOPS for review. Never creates `apply`: if the next ready artifact is `apply`, stops and points to `/opsx-apply`. If all complete: "All artifacts created! You can now run `/opsx-apply` or archive this change." Also used after verify PASS to create `finalize`. |
| `/opsx-ff` | Fast-forward a change: brainstorm interactively, then create all artifacts needed for implementation | name or description (asks if missing) | Creates the change if needed (asks to confirm continuing an existing one). `brainstorm` is interactive and needs the user's approval; then all remaining artifacts in dependency order, unattended, until every `applyRequires` artifact is done (`plan` is last). STOPS before apply: never creates `apply`, never implements. Does not ask the execution-handoff question. Ends: "All artifacts created!" / "Run `/opsx-apply` to start implementing." Stops if no artifact is ready but `applyRequires` unmet. |
| `/opsx-apply` | Implement a change: worktree, executor, tasks, then apply.md | optional change name; auto-selects when only one active change | Runs the schema apply block (step 0 commit, worktree on branch `<change-name>`, executor, `apply.md`). Executor: `subagent` tool from `pi-subagents` present gives `subagent-driven-development`; otherwise `executing-plans` (tells user TDD/review are not enforced, follows TDD manually, requests whole-branch review via `requesting-code-review`). STOPS after the final whole-branch review and `apply.md`; never invokes `finishing-a-development-branch`; tells user to run `/opsx-verify`. States: `blocked` (missing artifacts) suggests `/opsx-continue` and makes no code change; `all_done` suggests `/opsx-verify` then `/opsx-archive`. Also handles Fix-iteration mode (apply.md exists and verify.md is FAIL; stops at iteration 5) and Post-PR mode (apply.md + finalize.md exist and user brings review feedback; uses `receiving-code-review`). |
| `/opsx-verify` | Verify an applied change and write verify.md | optional change name | Requires `apply.md` (else STOP, run `/opsx-apply`). Runs in the worktree. Six checks from `openspec instructions verify`, plus a fresh project test run. Writes and commits `verify.md` with exactly one of `PASS`, `PASS_WITH_WARNINGS`, `FAIL`. On PASS*: next is `/opsx-continue` (creates `finalize`, with the worktree as working directory) then `/opsx-archive`. On FAIL: `/opsx-apply` for a fix iteration; stops after 5 iterations. Does not do the delta-sync check or edit main specs. |
| `/opsx-sync` | Sync delta specs into living specs without archiving | optional change name | Agent-driven merge (RENAMED, REMOVED, MODIFIED, ADDED) into `openspec/specs/`, then `openspec validate --specs`. Does NOT archive; edits nothing outside `openspec/specs/`. Stops if no delta specs. |
| `/opsx-archive` | Sync if needed, then archive a completed change | optional change name | Runs in the main checkout, after finalize and before the PR merges. Warns on incomplete artifacts and open `- [ ]` tasks and asks to confirm. Delta-sync check; offers "Sync now (recommended)", "Archive without syncing", "Cancel". Archives with `openspec archive "<name>" --skip-specs -y`. Stops on CLI failure; never moves directories by hand. |

Notes:
- `/opsx-finalize` does not exist: `finalize` is an artifact created with `/opsx-continue` after verify (verify skill step 7). Its content is in `schema/superspec/schema.yaml`.
- Skill names on pi are bare (`brainstorming`, not `superpowers:brainstorming`); skills drop the `superpowers:` prefix and STOP with "install Superpowers" when the named skill is missing (continue/ff/apply/verify "Superpowers rule").
- The 10-step list in docs/workflow.md matches the artifact flow: brainstorm, proposal, design (optional), specs, tasks, plan, apply, verify, finalize, archive.

## Doc drift

Confirmed mismatches between `docs/*.md` and the shipped code only. Format: file:line, what the doc says, what the code does.

### docs/architecture.md
1. :18-19 Goal 4 says projects with an older schema copy "are upgraded automatically and safely". Code: no upgrade; any non-identical existing schema blocks (`init.ts:47-59`).
2. :44 says `extensions/superspec.ts` does "/opsx-init, activation, auto-upgrade, routing note". Code: no auto-upgrade; the logic is also in `extensions/activation.ts`, `routing-note.ts`, `extensions/init/*`.
3. :57 Extension row says it "checks and upgrades the project schema on `session_start`". Code: `session_start` only warns when Superpowers is missing (`superspec.ts:33-37`).
4. :70-71 runtime flow says `session_start` compares schema version with bundled and applies upgrade rules. Code: not implemented.
5. :81 says `/opsx-init` re-running "repairs or upgrades". Code: re-running is idempotent but never repairs or upgrades; older/edited/newer/foreign stop with the blocked notice.
6. :88 init step 5 says "fresh install or upgrade rules". Code: fresh install only.
7. :103-108 upgrade table: "older, files match lock hashes" replace and rewrite lock (:105); `/opsx-init --force` backup to `openspec/schemas/superspec.bak-<timestamp>/` then replace (:106); "newer": warn package outdated (:107); "no marker": migration offer after backup (:108). Code: none of these exist; every non-identical state only gets the blocked warning; the lock is never read.
8. :110-114 automatic upgrade write guards (main checkout via git-dir vs git-common-dir, `ctx.isProjectTrusted()`, `ctx.hasUI`). Code: no upgrade, no such guards; `isProjectTrusted` is never called. `hasUI` is used only for the legacy-delete confirm and the Superpowers warning.
9. :141 lists `ctx.isProjectTrusted()` among the pi APIs used. Code never calls it.
10. :152-154 Testing bullet claims unit tests for "the five upgrade cases" and "upgrade write guards". Code and tests: six classification states, no upgrade, no guards tested.

### docs/workflow.md
11. :114 `/opsx-init` "Set up, repair or upgrade the project". Code: set up only.
12. :115-123 command table lacks argument detail: `/opsx-ff` takes a name or a description (asks if missing) but the table shows `/opsx-ff <name>`; `/opsx-explore` takes an optional topic but the table shows none. Finalize is created with `/opsx-continue` (verify skill step 7) and is not a command; consider a note.

### docs/domain-model.md
13. :36-38 ProjectSchema states "same, older-pristine, older-edited, newer, foreign". Code states: `absent`, `identical`, `foreign`, `older`, `newer`, `edited`; no older-pristine/older-edited split, and `older` wins over `edited` (`schema-install.ts:59-72`).
14. SchemaLock section ("written with every install or upgrade"; "Any mismatch means *edited*"): the lock is written on fresh install only, and "edited" is decided by hashing the project dir against the bundled dir, not against the lock.
15. Project table rows `isMainCheckout` (:59) and `trusted` (:60): not modelled or used in code.

### docs/glossary.md
16. "Lock file" entry says it is "used to detect user edits". Code: never read (see 14).

### Confirmed correct (no action)
- architecture.md: schema `version: 5`; lock path `openspec/schemas/superspec/.pi-superspec.json` and shape; init steps 1-4, 6-8; routing note insertion point; non-goals about installing OpenSpec/Superpowers.
- workflow.md: routing note and `session_start` warning (hasUI-gated) match the code; other command rows match the prompts.
- domain-model.md: Project `activated`.
