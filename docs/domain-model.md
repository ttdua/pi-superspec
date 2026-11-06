# Domain model

The entities pi-superspec reads, writes or reasons about, and how they relate.
Terms are defined in [glossary.md](glossary.md).

```text
Package ──bundles──▶ BundledSchema ──copied by /opsx-init──▶ ProjectSchema ◀──describes── SchemaLock
   │                                                              │
   └──activates──▶ Project ──contains──▶ ProjectConfig            │ governs
                      │                                           ▼
                      └──contains──▶ Change ──has──▶ Artifact* ──(DAG)
                                        │
                                        ├──apply creates──▶ Worktree (branch <change-name>)
                                        └──finalize merges into──▶ FeatureBranch
```

## Package

The installed pi package. Owns the extension, the bundled schema, the pi skills
and prompts, and the six namespaced `superspec.*` package agents (declared by
`pi-subagents.agents`, discovered package-wide, never copied into user or project
agent directories). Has a `packageVersion`.

## BundledSchema

The `superspec` schema shipped inside the package (`schema/superspec/`).

| Field | Meaning |
|---|---|
| `name` | Always `superspec`. |
| `version` | Positive integer, starts at 5. |
| `x-pi-superspec.version` | Marker; equals `version`. Absent on schemas the package did not write. |
| `artifacts`, `apply` | The workflow ([workflow.md](workflow.md)). |
| `templates/*.md` | One template per artifact. |

## ProjectSchema

The copy at `openspec/schemas/superspec/` inside a project. Has the same fields as
BundledSchema. States relative to the bundled one, as classified by the code:
*absent* (not installed), *identical*, *foreign* (no marker with a version), *older*,
*newer*, *edited* (same version, files differ) and *upgradable* (older and pristine,
see SchemaLock). *older* means older with local edits. Only *absent* is installed
over without a question; *upgradable* is replaced after confirmation; the other
states block `/opsx-init` unless `--force` is given, which replaces them after a
backup. *identical* continues.

## SchemaLock

`openspec/schemas/superspec/.pi-superspec.json`, written on a fresh install
and rewritten on every replacement. It is read for the pristine check.

| Field | Meaning |
|---|---|
| `schemaVersion` | Version installed. |
| `packageVersion` | Package version that installed it. |
| `files` | Map of relative path → sha256 at install time. A schema is *pristine* when its files are exactly these, with equal hashes. *Edited* (same version) is decided by hashing against the bundled schema, not the lock. |

## Project

A repository (or the nearest ancestor of `cwd` containing `openspec/`).

| Property | Meaning |
|---|---|
| `root` | Directory containing `openspec/`. |
| `activated` | ProjectSchema exists and carries the marker. |
| `isMainCheckout` | Not planned (not modelled in code; upgrade runs only from `/opsx-init`): `git rev-parse --git-dir` equals `--git-common-dir`. |
| `trusted` | Not planned (not modelled in code): pi project trust granted. |

## ProjectConfig

`openspec/config.yaml`. The package sets `schema: superspec` and, on request, `language` (see
`/opsx-init --lang`); `context` and per-artifact `rules` belong to the user and are
preserved. `language` is an optional top-level string of 1 to 64 characters with no
control characters. When set, the routing note (which also offers four work paths and
carries the Interaction channel paragraph) tells agents to write the prose of
OpenSpec documents in that language.

## Change

One unit of work at `openspec/changes/<name>/`, created by `/opsx-new` or
`/opsx-ff`. After archive it moves to `openspec/changes/archive/YYYY-MM-DD-<name>/`.

| Property | Meaning |
|---|---|
| `name` | kebab-case; also the worktree branch name. |
| `schema` | `superspec`. |
| `authoritativeCopy` | Main checkout until apply step 0; worktree from apply until finalize merges; main checkout again afterwards. |

## Artifact

A file the DAG tracks. `done` when its file exists.

| ID | File | Requires | Notes |
|---|---|---|---|
| `brainstorm` | `brainstorm.md` | — | The *why*. |
| `proposal` | `proposal.md` | brainstorm | Capabilities list = contract with specs. |
| `design` | `design.md` | brainstorm | Optional; stub when not needed. |
| `specs` | `specs/<capability>/spec.md` | proposal | One per capability; delta sections. |
| `tasks` | `tasks.md` | specs | `- [ ] X.Y` checkboxes; authoritative status. |
| `plan` | `plan.md` | tasks | Micro-steps; scenario → test list; tasks.md IDs. |
| `apply` | `apply.md` | plan | Receipt; see ApplyReceipt. |
| `verify` | `verify.md` | apply | Overwritten each run; carries the iteration. |
| `finalize` | `finalize.md` | verify | Git closeout receipt. |

`plan.md` has a required `## Contracts` section before the tasks (name,
new / modified, exact shape, public flag), the reviewed source of truth for
contract shapes.

## ApplyReceipt (`apply.md`)

| Field | Meaning |
|---|---|
| `iteration` | 1, then +1 per re-apply or post-PR fix round. |
| `worktreePath`, `worktreeBranch` | Where apply ran (`<change-name>`). |
| `featureBranch` | Branch apply started from; finalize merges into it. |
| `baseBranch` | Integration branch, typically `main`. |
| `commitRange` | Commits produced this iteration. |
| `executor` | `subagent-driven-development` or `executing-plans`. |
| `tasksDone` / `tasksTotal` | From `tasks.md`. |
| `contractDeviations` | Cumulative `## Contract deviations` list: contract name, what changed and why; `none` when empty. |

## VerifyReport (`verify.md`)

Outcome `PASS` | `PASS_WITH_WARNINGS` | `FAIL`, the six checks with evidence (check 5 is design and contract coherence:
`design.md` decisions, `plan.md` Contracts and recorded deviations against the
code), and the `iteration` copied from `apply.md`. FAIL items are classified
*code-fixable* or
*artifact-level*.

## FinalizeReceipt (`finalize.md`)

Outcome (`pr-updated`, `merge-locally`, `pr-created`, `kept-as-is`, `discarded`),
feature and base branch, PR URL, worktree cleanup status, test status at finish, PR
comment status.

## Worktree

Git worktree created during apply, branch `<change-name>`. Removed by finalize only
when it lives under `.worktrees/`, `worktrees/` or `~/.config/superpowers/worktrees/`;
otherwise it is harness-owned and preserved.

## WorkKind (routing)

| Kind | Route |
|---|---|
| `behaviour-change` | New change via `/opsx-new`. |
| `small-fix` | Direct TDD, no change directory. |
