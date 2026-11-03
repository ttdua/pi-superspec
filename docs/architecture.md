# Architecture

pi-superspec is a [pi](https://pi.dev) package that brings the
[Superspec](https://github.com/danielhanold/superspec) workflow to pi. It combines
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (what changes: proposal, delta
specs, tasks, verify, archive) with [Superpowers](https://github.com/obra/superpowers)
(how it gets built: brainstorming, TDD plans, worktrees, subagent execution, review).

See [workflow.md](workflow.md) for the process itself, [domain-model.md](domain-model.md)
for the entities, and [glossary.md](glossary.md) for terms.

## Goals

1. One command, `/opsx-init`, sets up a repository.
2. Workflow commands and skills load only in projects initialised by the package.
3. Removing the package removes every command and skill; `openspec/` stays a valid
   OpenSpec project.
4. The bundled schema is versioned; projects with an older copy are upgraded
   automatically and safely.
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
├── extensions/superspec.ts # /opsx-init, activation, auto-upgrade, routing note
├── schema/superspec/       # bundled OpenSpec schema: schema.yaml + templates/
├── skills/                 # pi-adapted openspec skills (loaded dynamically)
├── prompts/                # opsx-*.md commands (loaded dynamically)
└── README.md
```

`schema/superspec/` is the product schema. Do not confuse it with
`openspec/schemas/superspec/` in this repository, which is upstream Superspec v4 used
only to develop pi-superspec itself and is never edited by a change.

| Component | Responsibility |
|---|---|
| Extension | Registers `/opsx-init`; decides activation on `resources_discover`; checks and upgrades the project schema on `session_start`; injects the routing note via the `context` event. |
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
  └─ compare project schema version with bundled → upgrade rules (below)
context (activated project)
  └─ append routing note after the Superpowers bootstrap message
```

## `/opsx-init`

Always available, idempotent (re-running repairs or upgrades).

1. Require `openspec --version` ≥ 1.4; otherwise print the install line and stop.
2. Warn (do not stop) when not in a git repo or when Superpowers skills are not
   discoverable.
3. If `openspec/` is missing, run `openspec init --tools none` (no harness files).
4. Write or update `openspec/config.yaml`: set `schema: superspec`, keep all other keys.
5. Install the schema (fresh install or upgrade rules below).
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

| Project state | Action |
|---|---|
| same version | nothing |
| older, files match lock hashes | replace schema dir, rewrite lock, notify the user to commit it |
| older, files edited by the user | do not overwrite; notify; `/opsx-init --force` backs up to `openspec/schemas/superspec.bak-<timestamp>/` then replaces |
| newer than bundled | warn that the package is outdated; do nothing |
| no marker (e.g. upstream Superspec v4) | not activated; `/opsx-init` offers migration after backup |

Automatic upgrade writes files only when all hold: the project root is the main
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
| Ask the user to choose | `rpiv-ask-user-question` tool | plain question, numbered options |
| Dispatch a subagent | `pi-subagents` `subagent` tool | Superpowers `executing-plans` in-session |
| Track todos | `rpiv-todo` tool | checklist in `tasks.md` / SDD ledger |
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
  `ctx.isProjectTrusted()`, `ctx.hasUI`. Prompt arguments arrive as `$@`. Host
  packages go in `peerDependencies` with `"*"`.
- **Superpowers ≥ 7.0** behaviour is assumed: SDD ledger under `.superpowers/sdd/`;
  `finishing-a-development-branch` has three options; `executing-plans` itself
  requires TDD and verification-before-completion. On pi, skill names are bare
  (`brainstorming`, not `superpowers:brainstorming`) and there is no `Skill` tool.
- **License:** MIT. Credit Superspec (Daniel Hanold), its origin
  (JiangWay `sdd-plus-superpowers`) and OpenSpec's generated skills.

## Testing

- Unit (extension): project-root discovery, marker detection, version compare, hash
  check, the five upgrade cases, `config.yaml` merge keeping other keys, upgrade write
  guards.
- Integration (temp git repo): init logic → `openspec schema validate superspec`;
  `openspec status --change x --json` shows the DAG in [workflow.md](workflow.md);
  `openspec instructions apply` returns the apply block.
- Manual end-to-end in pi: one small change through all ten steps, with and without
  `pi-subagents`.
