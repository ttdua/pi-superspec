# Architecture

pi-superspec is a [pi](https://pi.dev) package that brings the
[Superspec](https://github.com/danielhanold/superspec) workflow to pi. It combines
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (what changes: proposal, delta
specs, tasks, verify, archive) with [Superpowers](https://github.com/obra/superpowers)
(how it gets built: brainstorming, TDD plans, worktrees, subagent execution, review).

See [workflow.md](workflow.md) for the process itself, [domain-model.md](domain-model.md)
for the entities, and [glossary.md](glossary.md) for terms. For day-to-day use see
[usage-guide.md](usage-guide.md); the manual release check is
[e2e-checklist.md](e2e-checklist.md).

## Goals

1. One command, `/opsx-init`, sets up a repository.
2. Workflow commands and skills load only in projects initialised by the package.
3. Removing the package removes every command and skill; `openspec/` stays a valid
   OpenSpec project.
4. The bundled schema is versioned (marker and lock file record the version).
   Upgrading a project's older copy automatically and safely is planned, not shipped
   (see [Schema identity, version and upgrade](#schema-identity-version-and-upgrade)).
   This change deliberately corrects this goal, which earlier claimed the upgrade.
5. One unified workflow where every OpenSpec/Superpowers conflict has an explicit
   resolution.

## Non-goals

- Installing OpenSpec or Superpowers. Users run `brew install openspec` and
  `pi install git:github.com/obra/superpowers` themselves.
- Forking OpenSpec or modifying Superpowers skills.
- Supporting harnesses other than pi. Schema text is harness-neutral so it does not
  break elsewhere, but only pi is tested.
- Enforcing the workflow by blocking tool calls (possible later).

## Anti-goals

- Silently overwriting a schema the user edited.
- Writing files into the project's `.pi/` that the user did not ask for.
- Hard-coding team policy (push / PR, worktree location). The project's `AGENTS.md`
  and `openspec/config.yaml` (`context`, `rules`) override it.

## Components

```text
pi-superspec/
├── package.json            # keywords: pi-package; pi.extensions only
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
├── extensions/
│   ├── superspec.ts        # entry: /opsx-init registration, resources_discover, session_start warning, context hook
│   ├── activation.ts       # project root discovery, marker detection
│   ├── routing-note.ts     # routing note and Superpowers detection
│   └── init/               # /opsx-init steps: init.ts, preflight.ts, config.ts,
│                           #   schema-install.ts, legacy.ts, io.ts
├── schema/superspec/       # bundled OpenSpec schema: schema.yaml + templates/ + LICENSE
├── skills/                 # pi-adapted openspec skills (loaded dynamically)
├── prompts/                # opsx-*.md commands (loaded dynamically)
├── tests/                  # vitest suites, fixtures/, helpers/, init/
├── docs/                   # architecture.md, workflow.md, domain-model.md, glossary.md,
│                           #   docs/usage-guide.md, docs/e2e-checklist.md
├── openspec/               # this repository's own OpenSpec project (specs, changes, schemas)
├── README.md
├── README.vi.md            # Vietnamese README
├── LICENSE
├── CHANGELOG.md
└── CONTRIBUTING.md
```

`schema/superspec/` is the product schema. Do not confuse it with
`openspec/schemas/superspec/` in this repository, which is upstream Superspec v4 used
only to develop pi-superspec itself and is never edited by a change.

| Component | Responsibility |
|---|---|
| Extension | Registers `/opsx-init`; decides activation on `resources_discover`; warns once per session start (including reload) when Superpowers is not installed; injects the routing note via the `context` event. It does not check or upgrade the project schema at `session_start` (planned, see below). |
| Bundled schema | The whole workflow: artifact DAG, templates, artifact instructions, the `apply` block. Copied into each project. |
| Skills + prompts | pi versions of the OpenSpec `opsx` commands, using pi tools with plain fallbacks. Not declared in the package manifest; returned only for activated projects. |

## Runtime flow

```text
pi start / reload
  └─ resources_discover(cwd)
       ├─ find project root (walk up to first dir containing openspec/)
       ├─ openspec/schemas/superspec/schema.yaml has x-pi-superspec marker?
       │    yes → return skillPaths + promptPaths  (project is "activated")
       │    no  → return nothing (only /opsx-init exists)
session_start (activated project)
  └─ warn once per session start, including reload (interactive only), if Superpowers is missing:
     `pi install git:github.com/obra/superpowers`
     (no schema version comparison or upgrade here yet: planned, see below)
context (activated project)
  └─ append routing note after the Superpowers bootstrap message; when that message is
     absent (e.g. from the second agent run), at the head after compaction summaries
```

## `/opsx-init`

Always available, idempotent: re-running on an initialised project changes nothing.
It does not repair or upgrade an existing schema (planned, see below).

1. Require `openspec --version` ≥ 1.4; otherwise print the install line and stop.
2. Warn (do not stop) when not in a git repo or when Superpowers skills are not
   discoverable.
3. If `openspec/` is missing, run `openspec init --tools none` (no harness files).
4. Write or update `openspec/config.yaml`: set `schema: superspec`, keep all other keys.
5. Install the schema on a fresh project (`absent`). An identical schema is left as is;
   any other existing state stops with a warning and writes nothing (see below).
6. If files from `openspec init --tools pi` exist (`.pi/prompts/opsx-*.md`,
   `.pi/skills/openspec-*`), list them and **ask** before deleting them.
7. Run `openspec schema validate superspec` and report.
8. `ctx.reload()` so the commands appear; print the next step (`/opsx-new <name>`).

## Schema identity, version and upgrade

- Schema name: `superspec`. `version:` starts at **5** (continuing upstream v4).
- Marker block `x-pi-superspec: { version: <n> }` identifies the package's schema.
  OpenSpec strips unknown top-level keys, so validation still passes.
- Lock file `openspec/schemas/superspec/.pi-superspec.json`:
  `{ "schemaVersion": n, "packageVersion": "…", "files": { "<rel path>": "<sha256>" } }`.

> **Status.** Shipped: `/opsx-init` installs the schema on a fresh project (and writes
> the lock file), does nothing for an identical schema, and for any other state warns,
> leaves `openspec/schemas/superspec/` unchanged and stops activation. To reinstall
> now, back up local edits, remove `openspec/schemas/superspec/` and run `/opsx-init`
> again. Planned (change `schema-auto-upgrade`, not yet shipped): the table and the
> write guards below, including `--force`, backups, repair and migration. This change
> deliberately corrects this section, which earlier described that design as shipped.

Shipped classification (`extensions/init/schema-install.ts`), checked in this order:
`absent` (install), `foreign` (no marker with a version), `older`, `newer`, `edited`
(same version, any bundled file differs or is missing), `identical`. Only `absent` and
`identical` continue; the other four block. The lock file is written on a fresh
install but not read yet.

Planned design (not shipped):

| Project state | Action |
|---|---|
| same version | nothing |
| older, files match lock hashes | replace schema dir, rewrite lock, notify the user to commit it |
| older, files edited by the user | do not overwrite; notify; `/opsx-init --force` backs up to `openspec/schemas/superspec.bak-<timestamp>/` then replaces |
| newer than bundled | warn that the package is outdated; do nothing |
| no marker (e.g. upstream Superspec v4) | not activated; `/opsx-init` offers migration after backup |

Planned (not shipped): automatic upgrade writes files only when all hold: the project root is the main
checkout, not a linked worktree (`git rev-parse --git-dir` equals
`--git-common-dir`); the project is trusted (`ctx.isProjectTrusted()`); the session
is interactive (`ctx.hasUI`, which excludes subagent sessions). Otherwise it only
notifies.

Rule for maintainers: a new schema version may add artifacts or change instructions
but must not rename or remove an artifact ID an in-flight change may already have,
unless the release notes include a migration step.

## pi tool mapping

| Action | With optional package | Fallback |
|---|---|---|
| Ask the user to choose | tool `ask_user_question` (package `rpiv-ask-user-question`) | plain question, numbered options |
| Dispatch a subagent | `pi-subagents` `subagent` tool | Superpowers `executing-plans` in-session |
| Track todos | tool `todo` (package `rpiv-todo`) | state the checklist in the agent's reply (`tasks.md` stays the official status) |
| Load a skill | read its `SKILL.md`, or `/skill:<name>` | — |

Pi-specific tool names live only in the package's skills and prompts, never in the
schema.

## Constraints

- **OpenSpec ≥ 1.4.** Schemas resolve from project → `$XDG_DATA_HOME/openspec/schemas`
  → built-ins; there is no extra search path, so the schema is copied into the
  project. `version` must be a positive integer. `config.yaml` `context` and per-artifact
  `rules` are injected into `openspec instructions`; project customisation belongs
  there.
- **pi ≥ 1.4** package API: `extensions`, `resources_discover` (gets `cwd`, returns
  `skillPaths` / `promptPaths`), `registerCommand`, `ctx.reload()`, `context` event,
  `ctx.hasUI`. Prompt arguments arrive as `$@`. Host
  packages go in `peerDependencies` with `"*"`.
- **Superpowers ≥ 7.0** behaviour is assumed: SDD ledger under `.superpowers/sdd/`;
  `finishing-a-development-branch` has three options; `executing-plans` itself
  requires TDD and verification-before-completion. On pi, skill names are bare
  (`brainstorming`, not `superpowers:brainstorming`) and there is no `Skill` tool.
- **License:** MIT. Credit Superspec (Daniel Hanold), its origin
  (JiangWay `sdd-plus-superpowers`) and OpenSpec's generated skills.

## Testing

- Unit (extension): project-root discovery, marker detection, version compare, hash
  check, the six classification states (`absent`, `identical`, `foreign`, `older`,
  `newer`, `edited`), `config.yaml` merge keeping other keys. Upgrade and its write
  guards are not tested because they are not shipped.
- Integration (temp git repo): init logic → `openspec schema validate superspec`;
  `openspec status --change x --json` shows the DAG in [workflow.md](workflow.md);
  `openspec instructions apply` returns the apply block.
- Manual end-to-end in pi: follow [e2e-checklist.md](e2e-checklist.md) (one small change
  through all ten steps, with and without `pi-subagents`).
