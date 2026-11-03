# pi-superspec

English | [Tiếng Việt](README.vi.md)

## What it is

pi-superspec is a pi package that brings the Superspec workflow to pi: spec-driven changes managed by OpenSpec, with Superpowers skills doing the brainstorming, planning, implementation and review. It ships a bundled `superspec` OpenSpec schema, the `/opsx-*` commands and the skills behind them.

Only `/opsx-init` exists in a fresh repository. Once a project is initialised, the other commands appear automatically.

## Prerequisites

You install the dependencies yourself; the package does not install them.

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) 1.4 or newer.
- [Superpowers](https://github.com/obra/superpowers) for pi.
- Git is not required to run `/opsx-init` (outside a git repository it only warns), but the later workflow uses git: `/opsx-apply` creates a worktree and branch, and finalize closes out the branch.
- Before `/opsx-apply`, be on a feature branch that is not your integration branch (`main` or `master`). On the integration branch `/opsx-apply` proceeds with a warning, and finalize's git-side closeout does not produce a usable PR, so you fall back to the manual `finishing-a-development-branch` escape hatch.
- Finalize pushes the feature branch with `git push origin`, so the repository needs an `origin` remote you can push to.

## Install

Install in this order. Do not skip the first two.

```sh
brew install openspec
pi install git:github.com/obra/superpowers
```

Optional pi packages, each with the fallback used when it is absent:

| Package | Adds | Fallback when absent |
|---|---|---|
| `pi-subagents` | a `subagent` tool, so `/opsx-apply` runs tasks with subagent-driven development | Superpowers `executing-plans` in the current session |
| `rpiv-ask-user-question` | an `ask_user_question` tool for choosing between options | a plain question with numbered options |
| `rpiv-todo` | a `todo` tool for tracking progress | a checklist in `tasks.md` or the SDD ledger |

Install them with `pi install` using each package's own instructions. Then install this package:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Quick start

Run these in your repository, in order. The change commands stop for your review before the next step.

1. `/opsx-init`: installs the bundled schema into `openspec/schemas/superspec/`, sets `schema: superspec` in `openspec/config.yaml`, validates it and reloads pi by itself. It runs `openspec init --tools none` if `openspec/` does not exist yet. It needs OpenSpec 1.4 or newer, and only warns if the directory is not a git repository or Superpowers is missing.
2. `/opsx-new <name>`: creates the change and shows the first artifact instructions. It creates no artifact.
3. `/opsx-continue`: creates the next artifact, one per run, then stops for review. Repeat until all artifacts up to the plan exist; when apply is the next ready artifact it stops and points you to `/opsx-apply`. (`/opsx-ff` creates them all in one go; the brainstorm step still asks for your approval.)
4. Create and switch to a feature branch (for example `feat/<name>`) if you are not on one yet, then run `/opsx-apply`. It creates a worktree on a branch named after the change, implements the tasks and writes `apply.md`.
5. `/opsx-verify`: run it with the worktree as the working directory. It writes `verify.md` with `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. On `FAIL`, run `/opsx-apply` again for a fix iteration.
6. Finalize: not a command. After a passing verify, run `/opsx-continue` with the worktree as the working directory to create the `finalize` artifact. The git-side closeout merges the worktree branch back into the feature branch, removes the worktree and pushes the feature branch.
7. `/opsx-archive`: run it in the main checkout (not the worktree), after finalize and before the PR merges. The change directory lives on the feature branch after finalize; see the guide for the exact sequence.

The full walkthrough is in [docs/usage-guide.md](docs/usage-guide.md).

## Commands

| Command | What it does |
|---|---|
| `/opsx-init` | Sets up the repository for the Superspec workflow. Always available. |
| `/opsx-explore` | Explores ideas and clarifies requirements before or during a change. Writes no application code. |
| `/opsx-new` | Starts a change and shows the first artifact instructions. |
| `/opsx-continue` | Creates the next artifact, then stops for review. |
| `/opsx-ff` | Brainstorms interactively, then creates every artifact needed to implement. Stops before apply. |
| `/opsx-apply` | Implements the change in a worktree and writes `apply.md`. |
| `/opsx-verify` | Verifies the applied change and writes `verify.md`. |
| `/opsx-sync` | Merges delta specs into `openspec/specs/` without archiving. |
| `/opsx-archive` | Syncs if needed, then archives a completed change. |

All commands except `/opsx-init` exist only in an initialised project. The commands `opsx-propose` and `opsx-bulk-archive` are not shipped.

If `openspec/schemas/superspec/` already exists and differs from the bundled schema, `/opsx-init` warns and writes nothing there. Upgrade tooling is not yet shipped.

## Uninstall

Removing the package removes every command and skill, including `/opsx-init`. Your `openspec/` directory stays a valid OpenSpec project, with its changes, archive and specs. These files remain, and you may delete them:

- `openspec/schemas/superspec/` (the copied schema) and its lock file `openspec/schemas/superspec/.pi-superspec.json`.
- the line `schema: superspec` in `openspec/config.yaml`.

The package writes nothing under `.pi/`. Reinstalling it re-activates the project, because the schema marker is still present.

## Credits and license

- [Superspec](https://github.com/danielhanold/superspec) by Daniel Hanold, which this package adapts for pi.
- JiangWay `sdd-plus-superpowers`, the origin of Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) by Fission AI.

MIT licensed. See [LICENSE](LICENSE).
