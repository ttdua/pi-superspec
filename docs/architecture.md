# Architecture

pi-superspec is a [pi](https://pi.dev) package that brings the
[Superspec](https://github.com/danielhanold/superspec) workflow to pi. It combines
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (what changes: proposal, delta
specs, tasks, verify, archive) with [Superpowers](https://github.com/obra/superpowers)
(how it gets built: brainstorming, TDD plans, worktrees, subagent execution, review).

See [workflow.md](workflow.md) for the process itself, [domain-model.md](domain-model.md)
for the entities, and [glossary.md](glossary.md) for terms. For day-to-day use see
[docs/usage-guide.md](usage-guide.md); the manual release check is
[docs/e2e-checklist.md](e2e-checklist.md).

## Goals

1. One command, `/opsx-init`, sets up a repository.
2. Workflow commands load only in projects initialised by the package. They run
   OpenSpec's own stock skills, which the package never forks.
3. Removing the package removes every `/opsx-*` command and the `opsx-generate-specs`
   skill; `openspec/` stays a valid OpenSpec project, and the stock skills stay in
   `.agents/skills/` (they belong to OpenSpec).
4. The bundled schema is versioned (marker and lock file record the version).
   `/opsx-init` upgrades a project's older, unchanged copy after confirmation and
   replaces any other copy only with `--force` and a backup (see
   [Schema identity, version and upgrade](#schema-identity-version-and-upgrade)).
5. One unified workflow where every OpenSpec/Superpowers conflict has an explicit
   resolution.

## Non-goals

- Installing OpenSpec or Superpowers. Users run `brew install openspec` and
  `pi install git:github.com/obra/superpowers` themselves.
- Forking OpenSpec (its stock skills are used as installed, with `workflow.md` layered on top) or modifying Superpowers skills.
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
├── package.json            # keywords: pi-package; pi.extensions only; pi-subagents.agents and pi.subagents.agents; `files` lists the published entries
├── package-lock.json       # repository only
├── tsconfig.json           # repository only
├── vitest.config.ts        # repository only
├── .gitignore              # repository only
├── .claude/                # repository only: OpenSpec-generated Claude Code commands/ and skills/
│                           #   used to develop this repository
├── extensions/             # published
│   ├── superspec.ts        # entry: /opsx-init registration, resources_discover, session_start warning, context hook
│   ├── activation.ts       # project root discovery, marker detection
│   ├── routing-note.ts     # routing note and Superpowers detection
│   ├── interaction-channel.ts  # channel detection and the Interaction channel paragraph
│   └── init/               # /opsx-init steps: init.ts, preflight.ts, config.ts,
│                           #   schema-install.ts, stock-skills.ts, io.ts
├── agents/                 # published; six plugin-neutral superspec.<role> specialist agents (discovered by plugins that read the package manifest)
├── schema/superspec/       # published; bundled OpenSpec schema: schema.yaml + templates/ + workflow.md + subagent-routing.md + LICENSE
├── skills/                 # published; the opsx-generate-specs skill only
│   └── opsx-generate-specs/  # SKILL.md: draft specs for an existing codebase
├── prompts/                # published; opsx-*.md commands (loaded dynamically); each names its stock skill
│   └── opsx-generate-specs.md  # short delegation to the skill
├── tests/                  # repository only; vitest suites, fixtures/, helpers/, init/
├── docs/                   # repository only; architecture.md, workflow.md, domain-model.md, glossary.md,
│                           #   usage-guide.md, e2e-checklist.md
├── openspec/               # repository only; this repository's own OpenSpec project (specs, changes, schemas)
├── README.md
├── README.vi.md            # Vietnamese README
├── LICENSE
├── CHANGELOG.md
└── CONTRIBUTING.md
```

Published package: `package.json` `files` ships only `extensions`, `skills`, `prompts`,
`schema` and `agents` (npm adds `package.json`, README and LICENSE itself); every other entry
is repository-only. The tree omits untracked or generated entries (`.git`,
`node_modules`, `.superpowers`).

`schema/superspec/` is the product schema. Do not confuse it with
`openspec/schemas/superspec/` in this repository, which is upstream Superspec v4 used
only to develop pi-superspec itself and is never edited by a change.

| Component | Responsibility |
|---|---|
| Extension | Registers `/opsx-init`; decides activation on `resources_discover`; warns once per session start (including reload) when Superpowers is not installed; probes once per session start whether the `plannotator` CLI exists; injects the routing note via the `context` event, always with a document language paragraph naming the `language` from `openspec/config.yaml` (read on every turn), or `en` when none is valid, and an Interaction channel paragraph for the channel detected from the active tools and the probe result. At `session_start` it only reads the project schema and may show a one-line notice; it never writes (see below). |
| Bundled schema | The whole workflow: artifact DAG, templates, artifact instructions, the `apply` block. Copied into each project. |
| Package agents | Six specialist definitions (`superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, `superspec.verifier`), bundled candidates for the scout, spec reviewer, plan reviewer, implementer, task reviewer and verifier roles (no precedence over other qualifying agents), declared by top-level `pi-subagents.agents: ["./agents"]` and by `pi.subagents.agents`. A compatible plugin discovers them package-wide, independent of activation; they are not loaded through `resources_discover` and are never copied into user or project agent directories. Models and thinking levels stay in user/project configuration. The parent session owns dispatch, official artifact writes, task ticks, receipts and publication. The implementer, task reviewer and plan reviewer select a user-provided `coding-standards` skill; it is optional (missing: warning, fallback to project conventions). |
| Prompts + workflow rules | Eight prompts, one per stock OpenSpec skill (`openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs`, `openspec-archive-change`) installed in `.agents/skills/` by `openspec init --tools pi`. Each prompt tells the agent to run its stock skill under the matching section of `openspec/schemas/superspec/workflow.md`, which wins where it differs. Prompts are not declared in the package manifest; they are returned only for activated projects. The routing note adds a stock skills paragraph, and `session_start` warns once when a required stock skill is missing. |
| `opsx-generate-specs` skill + prompt | Drafts specs for an existing codebase: maps the code, asks one confirmation, then gathers evidence per capability with evidence-only scouts (the scout role; one map scout before confirmation on configured models, then one per confirmed capability; sequentially inline when the integration is absent). The parent alone writes the delta specs in a `bootstrap-specs` change, has them reviewed by the spec reviewer role and strict-validates them, and stops before `/opsx-ff bootstrap-specs`. The prompt only delegates to the skill. It is discovered like any other prompt, so it exists only after activation. |

## Runtime flow

```text
pi start / reload
  └─ resources_discover(cwd)
       ├─ find project root (walk up to first dir containing openspec/)
       ├─ openspec/schemas/superspec/schema.yaml has x-pi-superspec marker?
       │    yes → return skillPaths + promptPaths  (project is "activated")
       │          (this includes opsx-generate-specs: right after /opsx-init it appears only
       │           once the reload has run this discovery, not before)
       │    no  → return nothing (only /opsx-init exists)
session_start (activated project)
  └─ warn once per session start, including reload (interactive only), if Superpowers is missing:
     `pi install git:github.com/obra/superpowers`
  └─ probe once: `command -v plannotator` (cached for the session; a probe not finished yet
     counts as unavailable for that turn)
     (read-only schema notice with a UI when the schema is outdated or edited; nothing is written)
context (activated project)
  └─ (always adds a document language paragraph: `language:` from openspec/config.yaml, or `en`
      when it is missing, invalid or unreadable; read each turn, so a change takes effect without reload)
  └─ (also adds the Interaction channel paragraph: `getActiveTools()` on every event plus the cached
      CLI probe pick the first available of inbox, plannotator-tool, plannotator-cli, ask-tool, plain;
      only active tools count, so a tool turned on or off changes the channel on the next turn)
  └─ append routing note after the Superpowers bootstrap message; when that message is
     absent (e.g. from the second agent run), at the head after compaction summaries
```

## `/opsx-init`

Always available, idempotent: re-running on an initialised project changes nothing
unless you pass `--lang`, answer the language prompt, or `language:` is missing or invalid (it is then set to `en`).
It upgrades or replaces an existing schema only as the decision table below says; `--force` replaces after a backup.

1. Require `openspec --version` ≥ 2.0; otherwise print the install line and stop.
2. Warn (do not stop) when not in a git repo or when Superpowers skills are not
   discoverable.
3. Check the stock skills. If `.agents/skills/openspec-<id>/SKILL.md` exists for all eight
   required ids, continue. Otherwise read `openspec config list --json`; unless the profile is
   `custom` and selects all eight workflows (explore, new, continue, ff, apply, verify, sync,
   archive), report what is missing, print `openspec config profile` and "run `/opsx-init`
   again", and stop before writing anything. `/opsx-init` never changes the global OpenSpec
   configuration.
3b. If `openspec/` is missing, or stock skills are missing, run `openspec init --tools pi`. It
   leaves an existing `config.yaml` and schema untouched. A failure prints its output and stops.
4. Write or update `openspec/config.yaml`: set `schema: superspec`, set `language` (step 7), keep all other keys.
5. Install the schema on a fresh project (`absent`). An identical schema is left as is;
   any other existing state follows the decision table below (upgrade after confirmation, or block and mention `--force`, which replaces after a backup).
6. (No legacy cleanup: OpenSpec 2.0 removes its own old files, so the package no longer asks.)
7. Set the document language (a project blocked on an existing
   schema writes no language and is not asked). With `--lang <value>` (or `--lang=<value>`), write or
   overwrite `language:` directly after `schema:`. The value is everything after the
   flag, quotes stripped, 1 to 64 characters, no control characters; an invalid or
   missing value stops with an error before any file is written; an argument that does not
   start with `--lang` is rejected as unknown, and text after `--lang` is part of the value.
   Without the flag, when `language:` is missing or invalid, the default is `en`. With a UI,
   ask once per run, offering `en`; an empty answer, cancel or invalid answer (the latter with a
   warning) writes `language: en`. Without a UI, `en` is written directly and nothing is asked.
   An invalid existing `language:` line is replaced by `language: en`. A valid existing value is
   never changed without the flag.
8. Run `openspec schema validate superspec` and report.
9. `ctx.reload()` so the commands appear; print the next step (`/opsx-new <name>`). When stock skills
   were installed the report says to commit `.agents/skills/`, and it reminds you to keep the eight
   workflows in the OpenSpec profile because `openspec update` removes deselected ones.

A project counts as initialised when its schema is identical and the eight stock skills are present.

`--generate` (a standalone token, combinable with `--lang`) only adds one line to the printed
output, pointing to `/opsx-generate-specs`. It does no agent work: init is TypeScript and cannot
dispatch subagents, so the scanning and drafting live in the `opsx-generate-specs` skill, which
the user runs in the session.

## Schema identity, version and upgrade

- Schema name: `superspec`. `version:` is the bundled schema version (started at 5, continuing upstream v4; see `schema/superspec/schema.yaml`).
- Marker block `x-pi-superspec: { version: <n> }` identifies the package's schema.
  OpenSpec strips unknown top-level keys, so validation still passes (not verified
  against an OpenSpec release).
- Lock file `openspec/schemas/superspec/.pi-superspec.json`:
  `{ "schemaVersion": n, "packageVersion": "…", "files": { "<rel path>": "<sha256>" } }`.

Classification (`extensions/init/schema-install.ts`), checked in this order:
`absent` (install), `foreign` (no marker with a version), then by marker version:
lower is `upgradable` when the schema is pristine and `older` otherwise, higher is
`newer`; at the same version `edited` (any bundled file differs or is missing) or
`identical`. *Pristine* means the lock file is valid, its version equals the marker
version, and the files in the directory (at any depth, any extra file such as
`.DS_Store` included) are exactly the lock's files with equal sha256. The lock is
written on every install and replacement and read only for this check.

Decision table (`extensions/init/init.ts`):

| Project state | Without `--force` | With `--force` |
|---|---|---|
| absent | install schema and lock | install schema and lock |
| identical | continue | continue, no backup |
| upgradable | with UI: confirm, then replace (no backup); declined or no UI: block and print the steps | replace after backup |
| older, edited | block, mention `--force` | replace after backup |
| newer, foreign | block, mention `--force` (newer also says to update the package) | replace after backup |

A replaced schema continues like a fresh install (legacy cleanup, language, validation,
report, reload). The report names the transition (`upgraded`, `downgraded`, `replaced`)
and the backup path. A blocked run writes nothing under the schema directory.

Backups go to `~/.pi/superspec-backups/<folder>-<8 hex of sha256(realpath root)>/<label>-<UTC timestamp>/`
(`<label>` is `v<marker version>` or `foreign`), never into the project: OpenSpec lists
every directory under `openspec/schemas/` as a schema, so a backup there would appear as
a second schema. The location is user data, not agent configuration, so
`PI_CODING_AGENT_DIR` does not move it. An existing backup directory is never
overwritten; the backup fails instead.

Session start only reads: for an activated project with a UI, an `upgradable`, `older`
or `edited` schema produces a one-line notice (`extensions/schema-notice.ts`); an error
there is swallowed. Upgrade runs only from `/opsx-init`. Writing at session start, and
guards such as main checkout, project trust or `ctx.hasUI` for such writes, are not
planned.

Rule for maintainers: a new schema version may add artifacts or change instructions
but must not rename or remove an artifact ID an in-flight change may already have,
unless the release notes include a migration step. Any change under `schema/superspec/`
must bump the version (marker and `version:`) and record the new tree digest in
`tests/fixtures/schema-checksums.json`; `tests/schema-version-pin.test.ts` fails
otherwise.

## pi tool mapping

| Action | With optional package | Fallback |
|---|---|---|
| Ask the user to choose | tool `ask_user_question` (package `rpiv-ask-user-question`, name not verified) | plain question, numbered options |
| Review written work (review gate) | tool `plannotator_inbox` (Plannotator Inbox, enabled in Plannotator's config), then tool `plannotator` | The first available channel is detected by the extension and injected as the Interaction channel paragraph: `inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain` |
| Dispatch a subagent | The Subagent integration paragraph (detected): the extension reads the active tools and injects the spawn, list, thinking, report and escalation mechanics of the detected plugin (`tintinweb`, `pi-subagents`, `gotgenes`), or the activation step (`pi-subagents-helper`), or the inline path (`none`) | Superpowers `executing-plans` in-session |
| Choose an agent for a role | Role requirements in `schema/superspec/subagent-routing.md`; the bundled `superspec.*` agents are candidates, with no precedence over other qualifying agents | Announced inline path only when the integration is absent; a role no agent meets stops the stage |
| Track todos | tool `todo` (package `rpiv-todo`, name not verified) | state the checklist in the agent's reply (`tasks.md` stays the official status) |
| Load a skill | read its `SKILL.md` from `.agents/skills/` (for example `.agents/skills/openspec-apply-change/SKILL.md`), or `/skill:<name>` | Missing stock skill: the prompt stops and names the skill |

Plugin-specific tool names live only in `extensions/subagent-integration.ts`, which
supplies them through the Subagent integration paragraph; skills and prompts name roles,
and the schema contains no plugin-specific tool names.

### Subagent compatibility

The workflow rules and prompts name roles only. Plugin mechanics (spawn call, listing, thinking, report
collection, escalation) come from the Subagent integration paragraph that the extension
injects each turn; detection is a pure function of the active tools (see
`extensions/subagent-integration.ts`). The bundled agents are plugin-neutral: they use the
`superspec.<role>` identity, built-in tools only, and their frontmatter works with both discovering
plugins. The escalation channel is not in the agent: the parent supplies it in the handoff. Availability, handoff, lanes, authority and failure rules are in
`schema/superspec/subagent-routing.md`.

| Plugin | Reference build | Status |
|---|---|---|
| `pi-subagents` | 0.84.0 at `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c` | smoke-tested for the cases listed in [e2e-checklist.md](e2e-checklist.md) |
| `@tintinweb/pi-subagents` | `50460b5df6934c4237983a504808a04ee0f8a0a0` | inspected, not smoke-tested |
| `@gotgenes/pi-subagents` | 25.0.5 at `52854c12d590142e61a4f6a6947be9084035300d` | inspected, not smoke-tested; supplies no bundled agents, so only its own agents are used |

These builds are references, not a proven minimum; other versions and forks are untested.
Runtime smoke evidence supersedes these assumptions, and no dependency pin is added.

## Constraints

- **OpenSpec ≥ 2.0.** Tested OpenSpec version: 2.0.0. Schemas resolve from project → `$XDG_DATA_HOME/openspec/schemas`
  → built-ins; there is no extra search path, so the schema is copied into the
  project. `version` must be a positive integer. `config.yaml` `context` and per-artifact
  `rules` are injected into `openspec instructions`; project customisation belongs
  there.
- **Local project root.** `workflow.md` commands assume a local project root; store selection (`--store`) is left to the stock skills.
- **pi ≥ 1.4** package API: `extensions`, `resources_discover` (gets `cwd`, returns
  `skillPaths` / `promptPaths`), `registerCommand`, `ctx.reload()`, `context` event,
  `ctx.hasUI`. Prompt arguments arrive as `$@`. Host
  packages go in `peerDependencies` with `"*"`.
- **Superpowers ≥ 7.0** behaviour is assumed: SDD ledger under `.superpowers/sdd/`;
  `finishing-a-development-branch` has three options; `executing-plans` itself
  requires TDD and verification-before-completion. On pi, skill names are bare
  (`brainstorming`, not `superpowers:brainstorming`) and there is no `Skill` tool.
- **License:** MIT. Credit Superspec (Daniel Hanold), its origin
  (JiangWay `sdd-plus-superpowers`) and OpenSpec, whose stock skills the commands run.

## Testing

- Unit (extension): project-root discovery, marker detection, version compare, hash
  check, the seven classification states (`absent`, `identical`, `foreign`, `older`,
  `upgradable`, `newer`, `edited`), pristine detection from the lock, backup paths,
  the init decision table, the session notice, `config.yaml` merge keeping other keys.
- Integration (temp git repo): init logic → `openspec schema validate superspec`;
  `openspec status --change x --json` shows the DAG in [workflow.md](workflow.md);
  `openspec instructions apply` returns the apply block.
- Manual end-to-end in pi: follow [e2e-checklist.md](e2e-checklist.md) (one small change
  through all ten steps, with `@tintinweb/pi-subagents`, with `pi-subagents` and without a subagent plugin).
