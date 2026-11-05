# pi-superspec

English | [Tiếng Việt](README.vi.md)

## What it is

pi-superspec is a pi package that brings the Superspec workflow to pi: spec-driven changes managed by OpenSpec, with Superpowers skills doing the brainstorming, planning, implementation and review. It ships a bundled `superspec` OpenSpec schema, the `/opsx-*` commands and the skills behind them.

Only `/opsx-init` exists in a fresh repository. Once a project is initialised, the other commands appear automatically.

## Prerequisites

You install the dependencies yourself; the package does not install them.

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) 1.16 or newer.
- [Superpowers](https://github.com/obra/superpowers) for pi.
- pi, the coding agent this package extends.
- Git is not required to run `/opsx-init` (outside a git repository it only warns), but the later workflow uses git: `/opsx-apply` creates a worktree and branch, and finalize closes out the branch.
- Finalize uses the GitHub CLI (`gh`) to detect, create and comment on PRs. It is optional: without it, finalize treats the branch as having no PR and records the reviewer comment as skipped or failed; the merge and push are not rolled back.
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
| `pi-subagents` | a `subagent` tool, so `/opsx-apply` runs tasks with subagent-driven development and stages can use the bundled `superspec.*` agents (see [Optional subagent integration](#optional-subagent-integration)) | Superpowers `executing-plans` in the current session |
| `rpiv-ask-user-question` | an `ask_user_question` tool for choosing between options | a plain question with numbered options |
| `rpiv-todo` | a `todo` tool for tracking progress | a checklist stated in the agent's reply |
| Plannotator (Inbox tool `plannotator_inbox`, `plannotator` tool or CLI) | review gates and questions through the Plannotator Inbox or a review UI; the extension picks the first available channel (see [usage guide](docs/usage-guide.md)) | `ask_user_question`, then plain text with numbered options |

Install them with `pi install` using each package's own instructions. Then install this package:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Optional subagent integration

The package bundles six agent definitions in `agents/`, declared for `pi-subagents` through the `pi-subagents.agents` manifest key. The integration is optional and compatible-only: without `pi-subagents` every workflow keeps its inline path.

Canonical roles: `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer` and `superspec.verifier`. They coexist with generic agent identities and are never copies of them.

- **Visibility versus routing.** Once the package is installed, the six roles are visible package-wide to `pi-subagents`. Workflows only route to them while a Superspec stage is active (for example `/opsx-apply`, `/opsx-verify`, `/opsx-generate-specs`); visibility alone delegates nothing.
- **Configuration ownership.** You own agent overrides (user or project agent files) and the models they use, taken from your pi and pi-subagents settings. The package sets no per-call model, writes no settings and generates no agent copies.
- **After a package update.** Reload or restart pi so the new definitions are discovered. No schema reinstall is needed: agents are not part of the copied schema, and `/opsx-init` is not rerun.
- **Absent versus incompatible.** If neither the `subagent` tool nor its activation helper is available, the stage announces the inline fallback once and continues inline. If the integration is present but incompatible, or a role is disabled, missing or fails to launch, the stage reports it and stops. It never silently falls back to a generic agent, the CLI or inline work.
- **Removal.** Removing the package removes the six roles from discovery. There are no copies in your user or project directories to clean up.
- **Tested builds.** The integration was inspected against `pi-subagents` 0.84.0 at commit `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`. Inspection is not a smoke test, and this is not a tested minimum version. Runtime smoke procedures are in [docs/e2e-checklist.md](docs/e2e-checklist.md); no run result is recorded here.
- **Shell allowlists.** Where a role limits shell commands to an allowlist, that is a guardrail on what the agent is told and permitted to run, not a sandbox. Do not rely on it to contain untrusted code.

## Quick start

Run these in your repository, in order. The change commands stop for your review before the next step.

1. `/opsx-init`: installs the bundled schema into `openspec/schemas/superspec/`, sets `schema: superspec` in `openspec/config.yaml`, validates it and reloads pi by itself. It runs `openspec init --tools none` if `openspec/` does not exist yet. It needs OpenSpec 1.16 or newer, and only warns if the directory is not a git repository or Superpowers is missing.
2. `/opsx-new <name>`: creates the change and shows the first artifact instructions. It creates no artifact.
3. `/opsx-continue`: creates the next artifact, one per run, runs a review gate on it and, once the gate is approved, goes on to the next artifact in the same run. It stops before `apply` and points you to `/opsx-apply`; a gate that is not approved stops it. (`/opsx-ff` creates them all in one go; it gates `brainstorm.md`, runs the rest unattended, then runs one final review gate.)
4. Create and switch to a feature branch (for example `feat/<name>`) if you are not on one yet. Commit the `/opsx-init` output (`openspec/config.yaml` and `openspec/schemas/superspec/`) on it, because `/opsx-apply` commits only the change directory and the worktree is created from the feature branch. Push the branch once with `git push -u origin feat/<name>`, because finalize runs a plain `git pull` on it and that fails on a branch with no upstream. Then run `/opsx-apply`. It creates a worktree on a branch named after the change, implements the tasks and writes `apply.md`.
5. `/opsx-verify`: it finds the worktree itself (`git worktree list`), so it works from either checkout; the path is printed by `/opsx-apply` and recorded in `apply.md`. It writes `verify.md` with `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. On `FAIL`, run `/opsx-apply` again for a fix iteration.
6. Finalize: not a command. After a passing verify, start (or restart) pi with the worktree path as its working directory, then run `/opsx-continue` to create the `finalize` artifact. `/opsx-continue` does not look for the worktree: from the main checkout it reads the main checkout's copy of the change, which has no `apply.md`, so it would point you back to `/opsx-apply`. The git-side closeout merges the worktree branch back into the feature branch, removes the worktree (when it sits under `.worktrees/`, `worktrees/` or `~/.config/superpowers/worktrees/`) and pushes the feature branch.
7. `/opsx-archive`: reopen pi in the main checkout (not the worktree, which finalize may have removed), after finalize and before the PR (if any) merges. The change directory lives on the feature branch after finalize; see the guide for the exact sequence.

The full walkthrough is in [docs/usage-guide.md](docs/usage-guide.md).

## Commands

| Command | What it does |
|---|---|
| `/opsx-init` | Sets up the repository for the Superspec workflow. Always available. Optional `--lang <language>` sets the language of OpenSpec documents (default `en`). Optional `--generate` only prints a hint to run `/opsx-generate-specs` next; it does no agent work. |
| `/opsx-explore` | Explores ideas and clarifies requirements before or during a change. Writes no application code. |
| `/opsx-new` | Starts a change and shows the first artifact instructions. |
| `/opsx-continue` | Creates the next artifact, runs a review gate on it and, once approved, continues to the next. Stops before apply. |
| `/opsx-ff` | Brainstorms interactively and gates `brainstorm.md`, creates every artifact needed to implement, then runs one final review gate. Stops before apply. |
| `/opsx-apply` | Implements the change in a worktree and writes `apply.md`. |
| `/opsx-verify` | Verifies the applied change and writes `verify.md`. |
| `/opsx-sync` | Merges delta specs into `openspec/specs/` without archiving. |
| `/opsx-archive` | Syncs if needed, then archives a completed change. |
| `/opsx-generate-specs` | For an existing codebase: maps the code into capabilities, asks you to confirm them once, then drafts a delta spec for each in a `bootstrap-specs` change. Stops before `/opsx-ff bootstrap-specs`. |

All commands except `/opsx-init` exist only in an initialised project. The commands `opsx-propose` and `opsx-bulk-archive` are not shipped.

If `openspec/schemas/superspec/` already exists and differs from the bundled schema, `/opsx-init` warns and writes nothing there. Upgrade tooling is not yet shipped.

## Uninstall

Removing the package removes every command and skill, including `/opsx-init`. Your `openspec/` directory stays a valid OpenSpec project, with its changes, archive and specs. These files remain, and you may delete them:

- `openspec/schemas/superspec/` (the copied schema) and its lock file `openspec/schemas/superspec/.pi-superspec.json`.
- the line `schema: superspec` in `openspec/config.yaml`.

The package writes nothing under `.pi/`. Reinstalling it re-activates the project, because the schema marker is still present.

## Credits and license

- [Superspec](https://github.com/danielhanold/superspec) by Daniel Hanold, which this package adapts for pi.
- [JiangWay `sdd-plus-superpowers`](https://github.com/JiangWay/OpenSpec/tree/main/schemas/sdd-plus-superpowers), the origin of Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) by Fission AI.

MIT licensed. See [LICENSE](LICENSE).
