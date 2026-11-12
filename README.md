# pi-superspec

English | [Tiếng Việt](README.vi.md)

## What it is

pi-superspec is a pi package that brings the Superspec workflow to pi: spec-driven changes managed by OpenSpec, with Superpowers skills doing the brainstorming, planning, implementation and review. It ships a bundled `superspec` OpenSpec schema, the `/opsx-init` and `/opsx-generate-specs` commands, and the workflow rules (`workflow.md`) that adapt OpenSpec's own stock skills to Superspec. You run the workflow steps with those stock skills (`/skill:openspec-new-change` and so on) or by asking the agent.

Only `/opsx-init` exists in a fresh repository. Once a project is initialised, `/opsx-generate-specs` appears automatically.

## Prerequisites

You install the dependencies yourself; the package does not install them.

- OpenSpec 2.0 or newer ([Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)), with a custom profile that selects eight workflows. Run `openspec config profile` and select `explore`, `new`, `continue`, `ff`, `apply`, `verify`, `sync` and `archive`. Each workflow step runs the stock OpenSpec skill of the same workflow from `.agents/skills/` (for example `openspec-ff-change` for ff). `openspec update` follows the profile and removes workflows it does not select, so keep all eight selected.
- The stock skills `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard` are not part of this workflow. They are not removed; use the matching workflow skill instead, such as `openspec-ff-change` for ff or `openspec-new-change` to start a change.
- [Superpowers](https://github.com/obra/superpowers) for pi.
- A `coding-standards` skill that you write or install yourself, under `~/.agents/skills/` or the project's `.agents/skills/`. The bundled implementer and reviewers apply it. Without it they fall back to project conventions and the workflow does not stop; pi shows a warning at session start.
- pi, the coding agent this package extends.
- Git is not required to run `/opsx-init` (outside a git repository it only warns), but the later workflow uses git: `openspec-apply-change` creates a worktree and branch, and finalize closes out the branch.
- Finalize uses the GitHub CLI (`gh`) to detect, create and comment on PRs. It is optional: without it, finalize treats the branch as having no PR and records the reviewer comment as skipped or failed; the merge and push are not rolled back.
- Before `openspec-apply-change`, be on a feature branch that is not your integration branch (`main` or `master`). On the integration branch apply proceeds with a warning, and finalize's git-side closeout does not produce a usable PR, so you fall back to the manual `finishing-a-development-branch` escape hatch.
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
| `@tintinweb/pi-subagents` (recommended) | an `Agent` tool, so `openspec-apply-change` runs tasks with subagent-driven development, in parallel lanes where tasks are independent; the bundled agents are supplied to it (see [Optional subagent integration](#optional-subagent-integration)) | Superpowers `executing-plans` in the current session |
| `pi-subagents` | a `subagent` tool, with the same workflow support; the bundled agents are supplied to it | Superpowers `executing-plans` in the current session |
| `@gotgenes/pi-subagents` | a `subagent` tool; it receives no bundled agents and uses only its own agents | Superpowers `executing-plans` in the current session |
| `rpiv-ask-user-question` | an `ask_user_question` tool for choosing between options | a plain question with numbered options |
| `rpiv-todo` | a `todo` tool for tracking progress | a checklist stated in the agent's reply |
| Plannotator (Inbox tool `plannotator_inbox`, `plannotator` tool or CLI) | review gates and questions through the Plannotator Inbox or a review UI; the extension picks the first available channel (see [usage guide](docs/usage-guide.md); it also explains how to turn on the Inbox tool) | `ask_user_question`, then plain text with numbered options |

Install them with `pi install` using each package's own instructions. Then install this package:

```sh
pi install https://github.com/ttdua/pi-superspec
```

## Optional subagent integration

The package bundles six agent definitions in `agents/`, declared for `@tintinweb/pi-subagents` and `pi-subagents` through the `pi-subagents.agents` and `pi.subagents.agents` manifest keys. `@gotgenes/pi-subagents` is also supported, but it supplies no bundled agents and the workflow uses only its own agents. The integration is optional: the extension detects which plugin is active and tells the agent how to delegate; without a subagent plugin every workflow keeps its inline path.

Workflows ask for roles, not agent names. The bundled candidates are `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer` and `superspec.verifier`. They coexist with generic agent identities and are never copies of them.

- **Visibility versus routing.** Once the package is installed, the six roles are visible package-wide to the plugins that read the manifest. Workflows only route to them while a Superspec stage is active (for example `openspec-apply-change`, `openspec-verify-change`, `/opsx-generate-specs`); visibility alone delegates nothing.
- **Configuration ownership.** You own agent overrides (user or project agent files) and the models they use, taken from your pi and pi-subagents settings. The package sets no per-call model, writes no settings and generates no agent copies.
- **After a package update.** Reload or restart pi so the new definitions are discovered. No schema reinstall is needed: agents are not part of the copied schema, and `/opsx-init` is not rerun.
- **Absent versus incompatible.** Only when the Subagent integration paragraph reports that delegation is unavailable does the stage announce the inline fallback once and continue inline. If only an activation helper is present, the stage activates it and re-evaluates on the next turn. If the integration is present but incompatible, or a role is disabled, missing or fails to launch, the stage reports it and stops. It never silently falls back to a generic agent, the CLI or inline work.
- **Removal.** Removing the package removes the six roles from discovery. There are no copies in your user or project directories to clean up.
- **Tested builds.** `pi-subagents` 0.84.0 at commit `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c` was smoke-tested; `@tintinweb/pi-subagents` and `@gotgenes/pi-subagents` were inspected only (see [docs/architecture.md](docs/architecture.md#subagent-compatibility)). These are reference builds, not a proven minimum version. Runtime smoke procedures are in [docs/e2e-checklist.md](docs/e2e-checklist.md); no run result is recorded here.
- **Shell allowlists.** Where a role limits shell commands to an allowlist, that is a guardrail on what the agent is told and permitted to run, not a sandbox. Do not rely on it to contain untrusted code.

## Quick start

Run these in your repository, in order. Each workflow step is a stock OpenSpec skill: run it with `/skill:<id>` or ask the agent in plain words ("start a change called add-user-auth"). The planning skills stop for your review before the next step.

1. `/opsx-init`: installs the bundled schema into `openspec/schemas/superspec/`, sets `schema: superspec` in `openspec/config.yaml`, validates it and reloads pi by itself. It needs OpenSpec 2.0 or newer. If the eight stock skills are missing from `.agents/skills/`, it checks the OpenSpec profile, stops with the exact commands when workflows are not selected, and otherwise runs `openspec init --tools pi` to install them; commit `.agents/skills/` afterwards. It only warns if the directory is not a git repository or Superpowers is missing.
2. `openspec-new-change` (`/skill:openspec-new-change <name>`): creates the change and shows the first artifact instructions. It creates no artifact.
3. `openspec-continue-change`: creates the next artifact, runs a review gate on it and, once the gate is approved, goes on to the next artifact in the same run. It stops before `apply` and points you to `openspec-apply-change`; `changes requested` revises the artifact and reopens its gate (nothing later is created until it is approved), and `dismissed` stops and asks you on the Interaction channel how to proceed. (`openspec-ff-change` creates them all in one go; it gates `brainstorm.md`, runs the rest unattended, then runs one final review gate.)
4. Create and switch to a feature branch (for example `feat/<name>`) if you are not on one yet. Commit the `/opsx-init` output (`openspec/config.yaml`, `openspec/schemas/superspec/` and `.agents/skills/`) on it, because apply commits only the change directory and the worktree is created from the feature branch. Push the branch once with `git push -u origin feat/<name>`, because finalize runs a plain `git pull` on it and that fails on a branch with no upstream. Then run `openspec-apply-change`. It creates a worktree on a branch named after the change, implements the tasks and writes `apply.md`.
5. `openspec-verify-change`: it finds the worktree itself (`git worktree list`), so it works from either checkout; the path is printed by apply and recorded in `apply.md`. It writes `verify.md` with `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. On `FAIL`, run `openspec-apply-change` again for a fix iteration.
6. Finalize: not a skill of its own. After a passing verify, start (or restart) pi with the worktree path as its working directory, then run `openspec-continue-change` to create the `finalize` artifact. The continue skill does not look for the worktree: from the main checkout it reads the main checkout's copy of the change, which has no `apply.md`, so it would point you back to `openspec-apply-change`. The git-side closeout merges the worktree branch back into the feature branch, removes the worktree (when it sits under `.worktrees/`, `worktrees/` or `~/.config/superpowers/worktrees/`) and pushes the feature branch.
7. `openspec-archive-change`: reopen pi in the main checkout (not the worktree, which finalize may have removed), after finalize and before the PR (if any) merges. The change directory lives on the feature branch after finalize; see the guide for the exact sequence.

The full walkthrough is in [docs/usage-guide.md](docs/usage-guide.md).

## Commands

The package ships two commands:

| Command | What it does |
|---|---|
| `/opsx-init` | Sets up the repository for the Superspec workflow. Always available. Optional `--lang <language>` sets the language of OpenSpec documents (default `en`). Optional `--generate` only prints a hint to run `/opsx-generate-specs` next; it does no agent work. Optional `--force` replaces an existing schema that `/opsx-init` would otherwise leave unchanged, after backing it up. |
| `/opsx-generate-specs` | For an existing codebase: maps the code into capabilities, asks you to confirm them once, then drafts a delta spec for each in a `bootstrap-specs` change. Stops before `openspec-ff-change bootstrap-specs`. |

`/opsx-generate-specs` exists only in an initialised project. The workflow steps are OpenSpec's stock skills in `.agents/skills/`, not package commands. Run each with `/skill:<id>` or ask the agent; before running one, the agent reads the step's section of `openspec/schemas/superspec/workflow.md`, which wins where it differs from the stock skill.

| Step | Stock skill | Run it with | What it does |
|---|---|---|---|
| explore | `openspec-explore` | `/skill:openspec-explore [topic]` | Explores ideas and clarifies requirements before or during a change. Writes no application code. |
| new | `openspec-new-change` | `/skill:openspec-new-change <name>` | Starts a change and shows the first artifact instructions. |
| continue | `openspec-continue-change` | `/skill:openspec-continue-change [name]` | Creates the next artifact, runs a review gate on it and, once approved, continues to the next. Stops before apply. |
| ff | `openspec-ff-change` | `/skill:openspec-ff-change <name>` | Brainstorms interactively and gates `brainstorm.md`, creates every artifact needed to implement, then runs one final review gate. Stops before apply. |
| apply | `openspec-apply-change` | `/skill:openspec-apply-change [name]` | Implements the change in a worktree and writes `apply.md`. |
| verify | `openspec-verify-change` | `/skill:openspec-verify-change [name]` | Verifies the applied change and writes `verify.md`. |
| sync | `openspec-sync-specs` | `/skill:openspec-sync-specs [name]` | Merges delta specs into `openspec/specs/` without archiving. |
| archive | `openspec-archive-change` | `/skill:openspec-archive-change [name]` | Syncs if needed, then archives a completed change. |

pi registers a `/skill:<id>` command for each skill only while its `enableSkillCommands` setting is on (the default); otherwise ask the agent to run the step. Earlier package versions shipped an `/opsx-<step>` command per step; those commands are removed. The commands `opsx-propose` and `opsx-bulk-archive` are not shipped, and the four unused stock skills listed under Prerequisites are not part of the workflow.

Two things upgrade separately: `openspec update` upgrades the stock skills; a package update followed by `/opsx-init` upgrades the schema and `workflow.md`.

If `openspec/schemas/superspec/` already exists and differs from the bundled schema, `/opsx-init` behaves as follows. If it is older and unchanged since install (the lock file `.pi-superspec.json` matches the files), `/opsx-init` asks you to confirm and then replaces it with the bundled one; commit `openspec/schemas/superspec/` afterwards. Without an interactive UI it only reports what to do. A schema with local edits, a newer schema or a foreign schema is left unchanged with a warning, and is replaced only with `/opsx-init --force`, which first copies the existing directory to `~/.pi/superspec-backups/`. At session start, an outdated or edited schema shows a one-line notice; nothing is written until you run `/opsx-init`.

## Uninstall

Removing the package removes `/opsx-init`, `/opsx-generate-specs` and the `opsx-generate-specs` skill. Your `openspec/` directory stays a valid OpenSpec project, with its changes, archive and specs. These files remain, and you may delete them:

- `openspec/schemas/superspec/` (the copied schema) and its lock file `openspec/schemas/superspec/.pi-superspec.json`.
- the stock OpenSpec skills in `.agents/skills/`; they belong to OpenSpec and stay until you remove them (or `openspec update` does, after a profile change).
- the line `schema: superspec` in `openspec/config.yaml`.

The package writes nothing under `.pi/`. Reinstalling it re-activates the project, because the schema marker is still present.

## Credits and license

- [Superspec](https://github.com/danielhanold/superspec) by Daniel Hanold, which this package adapts for pi.
- [JiangWay `sdd-plus-superpowers`](https://github.com/JiangWay/OpenSpec/tree/main/schemas/sdd-plus-superpowers), the origin of Superspec.
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) by Fission AI.

MIT licensed. See [LICENSE](LICENSE).
