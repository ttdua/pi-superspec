# Manual end-to-end checklist

This checklist takes one small change through all ten workflow steps (brainstorm, proposal, design, specs, tasks, plan, apply, verify, finalize, archive), once with `pi-subagents` installed and once without it. A maintainer runs it by hand before a release. The expected behaviour of each step is described in the [usage guide](usage-guide.md); the rules behind it are in [workflow.md](workflow.md).

Tick each box only when you observed the result named after the item's marker. If a step goes wrong, check the [troubleshooting section](usage-guide.md#troubleshooting) first and record what you saw under [Recording results](#recording-results).

## Preconditions

- [ ] OpenSpec 1.4 or newer is installed. Expected: `openspec --version` prints a version of 1.4 or higher.
- [ ] pi and the Superpowers package are installed (see the [README](../README.md#install)). Expected: in a pi session in any directory, the Superpowers skills (for example `brainstorming`) are available.
- [ ] The GitHub CLI is authenticated against a throwaway remote. Expected: `gh auth status` reports that you are logged in.
- [ ] A scratch git repository exists with an initial commit and an `origin` remote you can push to. Expected: `git log --oneline` shows at least one commit and `git remote -v` lists `origin`.
- [ ] The feature branch for the run is created and checked out (for example `git switch -c feat/e2e-a`). Expected: `git branch --show-current` prints the feature branch, not `main` or `master`.

Use a fresh scratch repository (or a clean reset of it) for each run. Run A needs `pi-subagents` installed, Run B needs it removed, so restart pi after changing that package.

## Run A — with pi-subagents

Setup: install `pi-subagents` and pi-superspec, then start pi in the scratch repository.

### Init

- [ ] Before activation, type `/` in pi and look at the `opsx-*` commands. Expected: only `/opsx-init` is listed; `/opsx-new`, `/opsx-continue`, `/opsx-apply` and the others are absent.
- [ ] Run `/opsx-init`. Expected: the output ends with `Schema superspec is valid.` and `Superspec is set up. Next: /opsx-new <name>`; `openspec/config.yaml` contains `schema: superspec`; `openspec/schemas/superspec/schema.yaml` and `openspec/schemas/superspec/.pi-superspec.json` exist.
- [ ] Look at the command list again without restarting pi. Expected: `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify` and `/opsx-archive` are now listed.
- [ ] Run `/opsx-init` a second time. Expected: no error, no files under `openspec/schemas/superspec/` change (`git status` shows no new modification there), and the output again ends with `Superspec is set up. Next: /opsx-new <name>`.

### Steps one to six, step by step

- [ ] Run `/opsx-new e2e-a`. Expected: the directory `openspec/changes/e2e-a/` exists, the first artifact's instructions are shown, and no artifact file has been created yet.
- [ ] Run `/opsx-continue`, answer the brainstorm questions and approve the design (step 1, brainstorm). Expected: `openspec/changes/e2e-a/brainstorm.md` exists and the agent stops for your review.
- [ ] Run `/opsx-continue` (step 2, proposal). Expected: `openspec/changes/e2e-a/proposal.md` exists with a Capabilities list, and the agent stops for review.
- [ ] Run `/opsx-continue` (step 3, design, optional). Expected: `openspec/changes/e2e-a/design.md` exists; for a trivial change it is a two-line file that says `No design needed: <reason>`.
- [ ] Run `/opsx-continue` (step 4, specs). Expected: `openspec/changes/e2e-a/specs/<capability>/spec.md` exists for each capability in the proposal, with `#### Scenario:` blocks.
- [ ] Run `/opsx-continue` (step 5, tasks). Expected: `openspec/changes/e2e-a/tasks.md` exists with a checklist of `- [ ]` tasks.
- [ ] Run `/opsx-continue` (step 6, plan). Expected: `openspec/changes/e2e-a/plan.md` exists, each plan task names a `tasks.md` ID, and no execution-handoff question is asked.
- [ ] Run `/opsx-continue` once more. Expected: it does not create `apply.md`; it points you to `/opsx-apply`.

### Apply, verify, finalize, archive

- [ ] Confirm you are on the feature branch, then run `/opsx-apply` (step 7, apply). Expected: a commit `docs(openspec): scaffold e2e-a change` exists if the change directory was uncommitted; `git worktree list` shows a worktree on a new branch named `e2e-a`.
- [ ] Watch the executor during apply. Expected: the agent uses the `subagent` tool for subagent-driven development (a fresh subagent per task, a reviewer per task, a final whole-implementation review), and `tasks.md` boxes in the worktree are ticked as tasks pass review.
- [ ] Read the apply result in the worktree. Expected: `openspec/changes/e2e-a/apply.md` exists in the worktree and is committed, lists the worktree path, branches, commit range and `Iteration: 1`, and records subagent-driven development as the executor; the agent tells you to run `/opsx-verify`.
- [ ] With the worktree as the working directory, run `/opsx-verify` (step 8, verify). Expected: `openspec/changes/e2e-a/verify.md` exists in the worktree with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL` under Overall Decision; on `FAIL`, rerun `/opsx-apply` then `/opsx-verify` until it is not `FAIL`.
- [ ] With the worktree as the working directory, run `/opsx-continue` (step 9, finalize). Expected: tests run, the worktree branch is merged into the feature branch with `--ff-only`, the worktree is removed or recorded as `preserved (harness-owned)`, and `openspec/changes/e2e-a/finalize.md` exists on the feature branch with an outcome and a `PR comment status` line.
- [ ] Check the remote after finalize. Expected: `git log origin/<feature-branch> --oneline` shows the `finalize.md` commit, because finalize pushed the feature branch.
- [ ] Back in the main checkout on the feature branch, run `/opsx-archive` (step 10, archive) and confirm the prompts. Expected: the directory `openspec/changes/archive/YYYY-MM-DD-e2e-a/` exists, `openspec/changes/e2e-a/` is gone, and nothing was committed by the command (the move shows in `git status`).

### Fast-forward variant

- [ ] On the feature branch, run `/opsx-ff e2e-a-ff`, answer the brainstorm questions and approve the design. Expected: after approval it creates `proposal.md`, `design.md`, `specs/`, `tasks.md` and `plan.md` under `openspec/changes/e2e-a-ff/` without stopping between them, and ends with `All artifacts created!` and `Run /opsx-apply to start implementing.`
- [ ] Check the change directory after `/opsx-ff` finished. Expected: `openspec/changes/e2e-a-ff/apply.md` does not exist and no product code was written (`git status` shows only files under `openspec/changes/e2e-a-ff/`).

### Extra checks

- [ ] In the same session, ask the agent to quote the first message that starts with `pi-superspec routing note`. Expected: the note is present once and says that behaviour-changing work is first proposed with `/opsx-new`, that small work changing no spec is done directly with TDD, and that design docs and plans are not written to `docs/superpowers/`.
- [ ] Edit `openspec/schemas/superspec/schema.yaml` in a scratch copy of the repository (for example change a description), then run `/opsx-init`. Expected: a warning reads `Existing schema at openspec/schemas/superspec is edited; it was left unchanged. Activation stopped.` and no file under `openspec/schemas/superspec/` is modified by the command.
- [ ] Check what the blocked run did not do. Expected: the output does not say `Schema superspec is valid.`, pi is not reloaded, and the edited `schema.yaml` still has your edit.
- [ ] Remove the bundled schema directory in the same scratch copy (`openspec/schemas/superspec/`) and run `/opsx-init` to restore it. Expected: the command ends with `Superspec is set up. Next: /opsx-new <name>` and the schema directory is back (see [Existing schemas](usage-guide.md#existing-schemas)).
- [ ] Open a new pi session in a directory with no `openspec/` folder above it. Expected: only `/opsx-init` is listed among the `opsx-*` commands.
- [ ] Remove pi-superspec (the package) and start a new pi session in the scratch repository (see the [README](../README.md#uninstall)). Expected: no `/opsx-*` command is listed, `openspec/` still holds the changes, archive and specs, and `openspec/schemas/superspec/` and `openspec/schemas/superspec/.pi-superspec.json` still exist.

## Run B — without pi-subagents

Setup: remove `pi-subagents`, keep pi-superspec installed, restart pi, and use a fresh scratch repository with a new feature branch (for example `feat/e2e-b`). Run `/opsx-init` as in Run A first.

### Init

- [ ] Run `/opsx-init` in the fresh repository. Expected: the output ends with `Superspec is set up. Next: /opsx-new <name>`, `openspec/schemas/superspec/.pi-superspec.json` exists, and the `/opsx-*` commands are listed.
- [ ] Check that the session has no `subagent` tool. Expected: asking the agent to list its tools shows no `subagent` tool.

### Steps one to six, step by step

- [ ] Run `/opsx-new e2e-b`. Expected: the directory `openspec/changes/e2e-b/` exists and no artifact file has been created yet.
- [ ] Run `/opsx-continue`, answer the brainstorm questions and approve the design (step 1, brainstorm). Expected: `openspec/changes/e2e-b/brainstorm.md` exists and the agent stops for review.
- [ ] Run `/opsx-continue` (step 2, proposal). Expected: `openspec/changes/e2e-b/proposal.md` exists with a Capabilities list.
- [ ] Run `/opsx-continue` (step 3, design, optional). Expected: `openspec/changes/e2e-b/design.md` exists, either with decisions or the two-line `No design needed: <reason>`.
- [ ] Run `/opsx-continue` (step 4, specs). Expected: `openspec/changes/e2e-b/specs/<capability>/spec.md` exists for each capability, with `#### Scenario:` blocks.
- [ ] Run `/opsx-continue` (step 5, tasks). Expected: `openspec/changes/e2e-b/tasks.md` exists with a checklist of tasks.
- [ ] Run `/opsx-continue` (step 6, plan). Expected: `openspec/changes/e2e-b/plan.md` exists and every plan task names a `tasks.md` ID.

### Apply, verify, finalize, archive

- [ ] Confirm you are on the feature branch, then run `/opsx-apply` (step 7, apply). Expected: a worktree on a new branch named `e2e-b` appears in `git worktree list`.
- [ ] Watch the executor during apply. Expected: the agent uses Superpowers `executing-plans` in the current session, tells you that TDD and review are not enforced for it, never calls a `subagent` tool, and ticks `tasks.md` boxes in the worktree.
- [ ] Watch the end of apply. Expected: before `apply.md` is written the agent requests a whole-branch review over the full commit range (`requesting-code-review`), and then `openspec/changes/e2e-b/apply.md` exists in the worktree and records `executing-plans` as the executor.
- [ ] With the worktree as the working directory, run `/opsx-verify` (step 8, verify). Expected: `openspec/changes/e2e-b/verify.md` exists in the worktree with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL`; on `FAIL`, rerun `/opsx-apply` then `/opsx-verify`.
- [ ] With the worktree as the working directory, run `/opsx-continue` (step 9, finalize). Expected: the worktree branch is merged into the feature branch with `--ff-only`, `openspec/changes/e2e-b/finalize.md` exists on the feature branch, and the feature branch is pushed to `origin`.
- [ ] Back in the main checkout on the feature branch, run `/opsx-archive` (step 10, archive) and confirm the prompts. Expected: the directory `openspec/changes/archive/YYYY-MM-DD-e2e-b/` exists and `openspec/changes/e2e-b/` is gone.

### Fast-forward variant

- [ ] On the feature branch, run `/opsx-ff e2e-b-ff`, answer the brainstorm questions and approve the design. Expected: `proposal.md`, `design.md`, `specs/`, `tasks.md` and `plan.md` exist under `openspec/changes/e2e-b-ff/` and the command ends with `All artifacts created!` and `Run /opsx-apply to start implementing.`
- [ ] Check the change directory after `/opsx-ff` finished. Expected: `openspec/changes/e2e-b-ff/apply.md` does not exist and no product code was written.

## Recording results

Copy this table into your release notes or issue and fill one row per run.

| Date | pi-superspec version | OpenSpec version | Run | Pass or fail | Notes |
|---|---|---|---|---|---|
|  |  |  | A (with pi-subagents) |  |  |
|  |  |  | B (without pi-subagents) |  |  |
