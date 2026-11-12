# Manual end-to-end checklist

This checklist takes one small change through all ten workflow steps (brainstorm, proposal, design, specs, tasks, plan, apply, verify, finalize, archive), three times: with `@tintinweb/pi-subagents`, with `pi-subagents` and without a subagent plugin. A maintainer runs it by hand before a release. The expected behaviour of each step is described in the [usage guide](usage-guide.md); the rules behind it are in [workflow.md](workflow.md).

Tick each box only when you observed the result named after the item's marker. If a step goes wrong, check the [troubleshooting section](usage-guide.md#troubleshooting) first and record what you saw under [Recording results](#recording-results).

## Preconditions

- [ ] OpenSpec 2.0 or newer is installed and its profile selects the eight workflows. Expected: `openspec --version` prints 2.0 or higher; `openspec config profile` has explore, new, continue, ff, apply, verify, sync and archive selected; `openspec config list --json` shows `"profile": "custom"` with those workflows.
- [ ] pi and the Superpowers package are installed (see the [README](../README.md#install)). Expected: in a pi session in any directory, the Superpowers skills (for example `brainstorming`) are available.
- [ ] The GitHub CLI is authenticated against a throwaway remote. Expected: `gh auth status` reports that you are logged in.
- [ ] A scratch git repository exists with an initial commit and an `origin` remote you can push to. Expected: `git log --oneline` shows at least one commit and `git remote -v` lists `origin`.
- [ ] The feature branch for the run is created and checked out (for example `git switch -c feat/e2e-a`). Expected: `git branch --show-current` prints the feature branch, not `main` or `master`.
- [ ] The feature branch is pushed with an upstream (`git push -u origin feat/e2e-a`), because finalize runs a plain `git pull`. Expected: `git rev-parse --abbrev-ref @{upstream}` prints `origin/feat/e2e-a`.

Use a fresh scratch repository (or a clean reset of it) for each run. Each run needs a different set of subagent plugins installed, so restart pi after changing them.

## Run A — with @tintinweb/pi-subagents

Setup: install `@tintinweb/pi-subagents` (and no other subagent plugin) and pi-superspec, then start pi in the scratch repository. The change for this run has two independent tasks (`Blocked by: none` on both), so that parallel lanes are observed.

### Init

- [ ] Before activation, type `/` in pi and look at the `opsx-*` commands. Expected: only `/opsx-init` is listed; `/opsx-new`, `/opsx-continue`, `/opsx-apply` and the others are absent.
- [ ] Run `/opsx-init`. Expected: the output ends with `Schema superspec is valid.` and `Superspec is set up. Next: /opsx-new <name>`; `openspec/config.yaml` contains `schema: superspec`; `openspec/schemas/superspec/schema.yaml` and `openspec/schemas/superspec/.pi-superspec.json` exist.
- [ ] Look at the command list again without restarting pi. Expected: `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify` and `/opsx-archive` are now listed.
- [ ] Run `/opsx-init` a second time. Expected: no error, no files under `openspec/schemas/superspec/` change (`git status` shows no new modification there), and the output again ends with `Superspec is set up. Next: /opsx-new <name>`.

### Steps one to six, step by step

- [ ] Run `/opsx-new e2e-a`. Expected: the directory `openspec/changes/e2e-a/` exists, the first artifact's instructions are shown, and no artifact file has been created yet.
- [ ] Run `/opsx-continue`, answer the brainstorm questions, then decide at the review gate on `brainstorm.md`, which is the only design approval asked (step 1, brainstorm). Expected: `openspec/changes/e2e-a/brainstorm.md` exists and a review gate opens on it. A closed review is not an approval.
- [ ] Approve each gate as it opens (approved, or approved with notes). Expected: after an approved gate the same run goes on to the next artifact and opens a gate on it, and it stops before `apply`. For `changes requested` it revises the artifact and reopens the gate; for `dismissed` it stops and asks you on the Interaction channel. Check the files as they appear:
  - step 2, proposal: `openspec/changes/e2e-a/proposal.md` exists with a Capabilities list.
  - step 3, design, optional: `openspec/changes/e2e-a/design.md` exists; for a trivial change it is a two-line file that says `No design needed: <reason>`.
  - step 4, specs: `openspec/changes/e2e-a/specs/<capability>/spec.md` exists for each capability in the proposal, with `#### Scenario:` blocks.
  - step 5, tasks: `openspec/changes/e2e-a/tasks.md` exists with a checklist of `- [ ]` tasks.
  - step 6, plan: `openspec/changes/e2e-a/plan.md` exists, each plan task names a `tasks.md` ID, and no execution-handoff question is asked.
- [ ] Run `/opsx-continue` once more. Expected: it does not create `apply.md`; it points you to `/opsx-apply`.

### Apply, verify, finalize, archive

- [ ] Commit the `/opsx-init` output on the feature branch (`git add openspec/config.yaml openspec/schemas/superspec`, then `git commit`), because apply commits only the change directory and the worktree is created from the feature branch. Expected: `git status --porcelain openspec/config.yaml openspec/schemas` prints nothing.
- [ ] Confirm you are on the feature branch, then run `/opsx-apply` (step 7, apply). Expected: `git log` shows a commit `docs(openspec): scaffold e2e-a change` if the change directory was uncommitted; `git worktree list` shows a worktree on a new branch named `e2e-a`.
- [ ] Watch the executor during apply. Expected: the agent uses the `Agent` tool for subagent-driven development (a fresh subagent per task, a reviewer per task, a final whole-implementation review), announces which agent it chose for each role, and `tasks.md` boxes in the worktree are ticked as tasks pass review.
- [ ] Watch the two independent tasks. Expected: two lane worktrees appear in `git worktree list` on branches `e2e-a--task-1` and `e2e-a--task-2` while both run; each lane is merged into `e2e-a` with a merge commit only after its task review passes, and the lane worktrees are removed afterwards.
- [ ] Read the apply result in the worktree. Expected: `openspec/changes/e2e-a/apply.md` exists in the worktree and is committed, lists the worktree path, branches, commit range and `Iteration: 1`, and records subagent-driven development as the executor, and has a `## Lanes` table with one row per task (task ID, lane branch, lane commit range, review verdict, merge commit); the agent tells you to run `/opsx-verify`.
- [ ] Run `/opsx-verify` (step 8, verify); it finds the worktree itself, so either checkout works. Expected: `openspec/changes/e2e-a/verify.md` exists in the worktree with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL` under Overall Decision; on `FAIL`, rerun `/opsx-apply` then `/opsx-verify` until it is not `FAIL`.
- [ ] Start (or restart) pi with the worktree path as its working directory (the path is printed by `/opsx-apply` and recorded in `apply.md`), then run `/opsx-continue` (step 9, finalize). Expected: the project's tests run in the worktree first (or a "no tests" result is recorded); then, before the feature branch is touched, the code review gate (step 2b) opens on the full worktree branch diff against the feature branch; on approved with notes or changes requested, it stops before the feature branch is checked out, merged or pushed. Once the gate is approved: the worktree branch is merged into the feature branch with `--ff-only`, the worktree is removed or recorded as `preserved (harness-owned)`, and `openspec/changes/e2e-a/finalize.md` exists on the feature branch with an outcome and a `PR comment status` line.
- [ ] Check the remote after finalize. Expected: `git log origin/<feature-branch> --oneline` shows the `finalize.md` commit, because finalize pushed the feature branch.
- [ ] Reopen pi in the main checkout on the feature branch (finalize may have removed the worktree your session was in), then run `/opsx-archive` (step 10, archive) and confirm the prompts. Expected: the directory `openspec/changes/archive/YYYY-MM-DD-e2e-a/` exists, `openspec/changes/e2e-a/` is gone, and nothing was committed by the command (the move shows in `git status`).

### Fast-forward variant

- [ ] On the feature branch, run `/opsx-ff e2e-a-ff`, answer the brainstorm questions, then decide at the review gate on `brainstorm.md`, which is the only design approval asked. Expected: a review gate runs on `brainstorm.md` first; once it is approved the agent creates `proposal.md`, `design.md`, `specs/`, `tasks.md` and `plan.md` under `openspec/changes/e2e-a-ff/` without stopping between them, then runs one final review gate over those five (not repeating `brainstorm.md`). After that gate is approved it ends with `All artifacts created!` and `Run /opsx-apply to start implementing.`
- [ ] Check the change directory after `/opsx-ff` finished. Expected: `openspec/changes/e2e-a-ff/apply.md` does not exist and no product code was written (`git status` shows only files under `openspec/changes/e2e-a-ff/`).

### Extra checks

- [ ] In the same session, ask the agent to quote the first message that starts with `pi-superspec routing note`. Expected: the note is present once and names four paths: no spec change is done directly with TDD and no change directory, a spec change with clear requirements uses `/opsx-ff`, a spec change that needs careful step-by-step review uses `/opsx-new` then `/opsx-continue`, and questions are answered directly. It also says that design docs and plans are not written to `docs/superpowers/`.
- [ ] Edit `openspec/schemas/superspec/schema.yaml` in a scratch copy of the repository (for example change a description), then run `/opsx-init`. Expected: a warning reads `Existing schema at openspec/schemas/superspec is edited; it was left unchanged. Activation stopped.` and no file under `openspec/schemas/superspec/` is modified by the command.
- [ ] Check what the blocked run did not do. Expected: the output does not say `Schema superspec is valid.`, pi is not reloaded, and the edited `schema.yaml` still has your edit.
- [ ] Run `/opsx-init --force` in the same scratch copy. Expected: the output contains `Schema superspec replaced from v<n> to v<n>.` (the verb is `replaced` or `upgraded` as the versions imply), `Backup of the previous schema: ~/.pi/superspec-backups/<folder>-<hash>/v<n>-<timestamp>` and `Commit openspec/schemas/superspec/.`, and pi reloads.
- [ ] Check the backup. Expected: the directory named in the output exists and holds the edited `schema.yaml` with your edit, `openspec/schemas/superspec/schema.yaml` no longer has it, and no `superspec.bak-*` or other extra directory appears under `openspec/schemas/` (`ls openspec/schemas/` lists only `superspec`).
- [ ] Upgrade flow, in a second scratch copy with a freshly installed schema: set `version:` under `x-pi-superspec` in `openspec/schemas/superspec/schema.yaml` to 6 and `schemaVersion` in `.pi-superspec.json` to 6, and update the lock hash of `schema.yaml` (or reinstall an older package version). Start a new pi session. Expected: a notice reads `Schema superspec v6 is older than the bundled v<n>. Run /opsx-init to upgrade.` and nothing under `openspec/schemas/superspec/` changed.
- [ ] In that session run `/opsx-init`. Expected: a confirm dialog `Upgrade schema superspec?`; after you confirm, the output contains `Schema superspec upgraded from v6 to v<n>.` and `Commit openspec/schemas/superspec/.`, has no backup line, and pi reloads. Check that the marker version and the lock `schemaVersion` are the bundled version and that the files match `schema/superspec/` (see [Existing schemas](usage-guide.md#existing-schemas)).
- [ ] Remove the project schema directory in the same scratch copy (`openspec/schemas/superspec/`) and run `/opsx-init` to restore a fresh install. Expected: the command ends with `Superspec is set up. Next: /opsx-new <name>` and the schema directory is back with its lock file.
- [ ] Open a new pi session in a directory with no `openspec/` folder above it. Expected: only `/opsx-init` is listed among the `opsx-*` commands.
- [ ] Remove pi-superspec (the package) and start a new pi session in the scratch repository (see the [README](../README.md#uninstall)). Expected: no `/opsx-*` command is listed, `openspec/` still holds the changes, archive and specs, and `openspec/schemas/superspec/`, `openspec/schemas/superspec/.pi-superspec.json` and the stock skills in `.agents/skills/` still exist.

### Shipped layout and OpenSpec 2.0

- [ ] `/opsx-ff e2e-a-ff` stops at two planned points only. Expected: it stops at the `brainstorm.md` gate and at the final gate over proposal, design, specs, tasks and plan, and nothing else; it never starts apply.
- [ ] `/opsx-apply` follows `openspec/schemas/superspec/workflow.md` rather than the stock apply loop. Expected: it creates a worktree on a branch named `<change-name>`, runs the executor chosen for the plugin set, and opens no code review gate (that gate belongs to finalize).
- [ ] Delete `.agents/skills/openspec-apply-change/` in a scratch copy and start a session. Expected: pi warns once that `openspec-apply-change` is missing from `.agents/skills/`; `/opsx-apply` stops and names the missing skill instead of improvising.
- [ ] Deselect a workflow with `openspec config profile` in a scratch copy, then run `/opsx-init` after removing its stock skill. Expected: the output names the missing workflow, prints `openspec config profile` and `/opsx-init`, and writes no file.
- [ ] Manual legacy check: in a 1.x-initialised project (initialised with OpenSpec 1.x via `openspec init --tools pi`) that also holds `.pi/prompts/mine.md`, upgrade OpenSpec to 2.0 and run `/opsx-init`. Expected: `.pi/prompts/opsx-*.md` are removed by OpenSpec, `.pi/prompts/mine.md` still exists, and `/opsx-init` asks no legacy-cleanup question.

## Run B — with pi-subagents

Setup: remove `@tintinweb/pi-subagents`, install `pi-subagents`, reinstall pi-superspec (Run A ends by removing it), restart pi, and use a fresh scratch repository with a new feature branch (for example `feat/e2e-b`) pushed with `git push -u origin feat/e2e-b`. Walk through the same steps as Run A, using the change name `e2e-b`; only the differences are listed here.

- [ ] Run `/opsx-init`. Expected: the output ends with `Superspec is set up. Next: /opsx-new <name>` and `openspec/schemas/superspec/.pi-superspec.json` exists.
- [ ] Run `/opsx-new e2e-b` and `/opsx-continue` through the first six steps (brainstorm, proposal, design, specs, tasks, plan), approving each gate. Expected: `brainstorm.md`, `proposal.md`, `design.md`, `specs/`, `tasks.md` and `plan.md` exist under `openspec/changes/e2e-b/`, and the workflow stops before `apply`.
- [ ] Run `/opsx-apply`. Expected: the agent uses the `subagent` tool, announces the agent chosen for each role, passes no thinking level and no model, and `openspec/changes/e2e-b/apply.md` records subagent-driven development and a `## Lanes` table.
- [ ] Run `/opsx-verify` (step 8, verify), then `/opsx-continue` (step 9, finalize) from the worktree and `/opsx-archive` (step 10, archive) as in Run A. Expected: `verify.md` has one outcome, the code review gate opens before the merge, `finalize.md` exists on the feature branch, and `openspec/changes/archive/YYYY-MM-DD-e2e-b/` exists.

## Run C — without a subagent plugin

Setup: remove every subagent plugin, reinstall pi-superspec, restart pi, and use a fresh scratch repository with a new feature branch (for example `feat/e2e-c`) pushed with `git push -u origin feat/e2e-c`.

### Init

- [ ] Run `/opsx-init` in the fresh repository. Expected: the output ends with `Superspec is set up. Next: /opsx-new <name>`, `openspec/schemas/superspec/.pi-superspec.json` exists, and the `/opsx-*` commands are listed.

### Steps one to six, step by step

- [ ] Run `/opsx-new e2e-c`. Expected: the directory `openspec/changes/e2e-c/` exists and no artifact file has been created yet.
- [ ] Run `/opsx-continue`, answer the brainstorm questions, then decide at the review gate on `brainstorm.md`, which is the only design approval asked (step 1, brainstorm). Expected: `openspec/changes/e2e-c/brainstorm.md` exists and a review gate runs on it.
- [ ] Approve each gate as it opens. Expected: after an approved gate the same run goes on to the next artifact and gates it, and stops before `apply`; for `changes requested` it revises the artifact and reopens the gate, and for `dismissed` it stops and asks you on the Interaction channel. Check the files as they appear:
  - step 2, proposal: `openspec/changes/e2e-c/proposal.md` exists with a Capabilities list.
  - step 3, design, optional: `openspec/changes/e2e-c/design.md` exists; for a trivial change it is a two-line file that says `No design needed: <reason>`.
  - step 4, specs: `openspec/changes/e2e-c/specs/<capability>/spec.md` exists for each capability, with `#### Scenario:` blocks.
  - step 5, tasks: `openspec/changes/e2e-c/tasks.md` exists with a checklist of tasks.
  - step 6, plan: `openspec/changes/e2e-c/plan.md` exists and every plan task names a `tasks.md` ID.

### Apply, verify, finalize, archive

- [ ] Commit the `/opsx-init` output on the feature branch (`git add openspec/config.yaml openspec/schemas/superspec`, then `git commit`), because apply commits only the change directory and the worktree is created from the feature branch. Expected: `git status --porcelain openspec/config.yaml openspec/schemas` prints nothing.
- [ ] Confirm you are on the feature branch, then run `/opsx-apply` (step 7, apply). Expected: a worktree on a new branch named `e2e-c` appears in `git worktree list`.
- [ ] Watch the executor during apply. Expected: the agent says it uses Superpowers `executing-plans` in the current session, tells you that TDD and review are not enforced for it, makes no subagent calls, runs the tasks one after another with no lane worktrees, and ticks `tasks.md` boxes in the worktree.
- [ ] Watch the end of apply. Expected: before `apply.md` is written the agent requests a whole-branch review over the full commit range (`requesting-code-review`), and then `openspec/changes/e2e-c/apply.md` exists in the worktree and records `executing-plans` as the executor.
- [ ] Run `/opsx-verify` (step 8, verify); it finds the worktree itself, so either checkout works. Expected: `openspec/changes/e2e-c/verify.md` exists in the worktree with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL`; on `FAIL`, rerun `/opsx-apply` then `/opsx-verify`.
- [ ] Start (or restart) pi with the worktree path as its working directory (the path is printed by `/opsx-apply` and recorded in `apply.md`), then run `/opsx-continue` (step 9, finalize). Expected: after the in-worktree test run, the code review gate (step 2b) opens on the worktree branch diff against the feature branch; once it is approved, the worktree branch is merged into the feature branch with `--ff-only`, `openspec/changes/e2e-c/finalize.md` exists on the feature branch, and the feature branch is pushed to `origin`.
- [ ] Reopen pi in the main checkout on the feature branch (finalize may have removed the worktree your session was in), then run `/opsx-archive` (step 10, archive) and confirm the prompts. Expected: the directory `openspec/changes/archive/YYYY-MM-DD-e2e-c/` exists and `openspec/changes/e2e-c/` is gone.

### Fast-forward variant

- [ ] On the feature branch, run `/opsx-ff e2e-c-ff`, answer the brainstorm questions, then decide at the review gate on `brainstorm.md`, which is the only design approval asked. Expected: after the `brainstorm.md` gate is approved, `proposal.md`, `design.md`, `specs/`, `tasks.md` and `plan.md` exist under `openspec/changes/e2e-c-ff/`, one final review gate runs over those five, and once it is approved the command ends with `All artifacts created!` and `Run /opsx-apply to start implementing.`
- [ ] Check the change directory after `/opsx-ff` finished. Expected: `openspec/changes/e2e-c-ff/apply.md` does not exist and no product code was written.

## Runtime smoke: Superspec package agents

These procedures check the optional `pi-subagents` integration (six bundled `superspec.*` agents) in a real pi session. They describe what to do and what to observe; they record no results. Unit tests and prompt-string tests do not replace them. Run them only in disposable fixture projects outside this repository, and configure the candidate package through the fixture's local project package settings, never by editing global settings. Use `pi-subagents` and Superpowers as installed; do not install packages mid-run. If setup, auth, a required skill or an optional package is unavailable, stop and record a blocker instead of substituting another tool.

Never synthesize a human approval. A required human gate that cannot be answered is a blocker.

### Common setup

- Two disposable git projects: a marked one (initialised with `/opsx-init`, so `openspec/schemas/superspec/.pi-superspec.json` exists) and an unmarked one.
- Candidate package configured via each fixture's project-local package settings. Expected: the `subagent` tool's detail for a `superspec.*` agent reports the candidate worktree/package source, not an older globally installed copy.
- Read the installed `pi-subagents` management help before using list, inspect or disable calls; do not guess action shapes.
- Before each case, snapshot (hash or copy) user and project settings, the user and project agent directories, and any canary files the case names.

### Evidence fields

Record these for every case, in the run-managed or scratch report (not a checked-in file, and not a root `context.md` or `progress.md`):

- Run id (or transcript id) and date.
- Command or UI/tool flow used, exactly.
- Working directory (cwd) of the parent and of each child.
- Output: tool detail, returned artifact references, report paths.
- Canary snapshots: before and after hashes or diffs.
- Versions and source commits of pi, Superpowers, `pi-subagents` and the candidate package.
- Result: pass, fail or not run.
- Blocker: what prevented the case, or `none`.

### Cases

- [ ] **SM-01 Discovery and no copies.** In the unmarked and the marked fixture, list agents. Expected: all six canonical agents (`superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, `superspec.verifier`) are listed with the candidate package as source; generic agent identities still coexist; in the unmarked fixture the workflow commands other than `/opsx-init` remain hidden. After discovery, and again after removing the package, the settings and agent-directory snapshots show no Superspec-generated copies or settings.
- [ ] **SM-02 Configuration and models.** Add a disposable project agent override and model setting using models that are configured in the fixture. Expected: inspect shows the effective canonical role and model; a launch with no per-call model uses the configured one; user versus project precedence matches the `pi-subagents` documentation; disabling a role works through the documented mechanism without modifying global settings.
- [ ] **SM-03 Availability routing.** (a) With only the activation helper visible, a stage activates the tool, then resolves roles on the next turn. (b) In a fixture with no subagent plugin and no activation helper, a stage announces the inline fallback once and follows the inline path with no child calls. Expected: gates and ordering are unchanged in both.
- [ ] **SM-04 Failure without bypass.** Separately: a disabled or missing role, a missing required skill or tool, and a controlled failing launch. Expected: each is reported and the stage stops; no generic-agent, CLI or inline bypass occurs; child failure and partial state are retained in the report.
- [ ] **SM-05 Role contracts.** Run read-only scout and reviewer calls against scratch canary files. Expected: product, spec and canary bytes are unchanged afterwards. Launch all six roles once. Expected: each has its documented tools, skills, fresh context and report sections; reports land at the explicitly bound `output` paths; returned artifact references are inspectable; no root `progress.md` or `context.md` appears and no nested subagent call is made.
- [ ] **SM-06 Apply workflow.** Run `/opsx-apply` on a disposable small change. Expected: an agent that meets the implementer role runs each task in the authoritative cwd, one combined task reviewer per task, one final whole-branch review; one writer per worktree, with parallel lanes only for tasks whose `Blocked by` allows it; no duplicate generic reviewer; no push, merge or PR unless the workflow itself authorizes it; the parent, not a child, ticks tasks and writes the receipt.
- [ ] **SM-07 Incomplete report.** Make a child return a report missing required evidence or sections (for example an instruction-limited scratch task). Expected: the parent treats it as incomplete and does not accept the task as done; a successful process exit does not change that.
- [ ] **SM-08 Verify.** Run `/opsx-verify` three ways: tests passing, a deliberately failing scratch test, and an unavailable check. Expected: fresh tests run in this invocation; the failing test gives `FAIL`; the unavailable check is reported as not verified, never as pass; only the parent writes `verify.md`; no fixes are made by the verifier.
- [ ] **SM-09 Generate specs.** Run `/opsx-generate-specs` on a scratch codebase. Expected: a map stage returns a bounded candidate list, you confirm or trim it, capability scouts run only for the confirmed list, and the parent alone writes the delta files. Cancel at the list: no change directory and no capability scouts. Interrupt and resume: existing spec bytes are preserved. Every requirement carries evidence naming source, test or doc locations; source-only requirements are labelled inferred; the language setting is honoured; `openspec validate <change> --strict` passes.
- [ ] **SM-10 Planning commands.** Run `/opsx-continue` and `/opsx-ff` with the integration available. Expected: the internal spec and plan reviews add no human stop beyond the existing gates (one per `/opsx-continue` artifact; for `/opsx-ff`, the `brainstorm.md` gate and the final gate). A small `/opsx-explore` question stays inline; a repository-scale one may use scouts that only gather evidence and write nothing official.

## Smoke: @gotgenes/pi-subagents

`@gotgenes/pi-subagents` 25.0.5 was inspected, not smoke-tested, and supplies no bundled agents. Run this procedure in a disposable marked fixture with only `@gotgenes/pi-subagents` and pi-superspec installed. Record results as in [Recording results](#recording-results).

- [ ] Start a session and start a stage that delegates (for example `/opsx-generate-specs`). Expected: the Subagent integration paragraph read by the agent starts with `Subagent integration: gotgenes.` (detected by the tool's schema, not its name), and no `superspec.*` agent is listed.
- [ ] Watch how the agent picks agents. Expected: it lists the registered agent types, announces once per stage which one it chose for each role, and chooses only agents whose tools and skills meet the role; a read-only role never gets an agent with edit or write tools.
- [ ] Make a child ask a question (for example a scratch task whose handoff tells it to escalate a decision). Expected: the child calls `ask_parent` and ends its turn; the parent treats it as pending, not complete, and answers with `subagent({ resume, prompt })`; the child then finishes and its report is accepted only after the parent checks the evidence.
- [ ] Remove the agent types needed for one role. Expected: the stage reports the role and the missing requirement and stops, with no generic-agent, CLI or inline bypass.

## Recording results

Copy this table into your release notes or issue and fill one row per run.

| Date | pi-superspec version | OpenSpec version | Run | Pass or fail | Notes |
|---|---|---|---|---|---|
|  |  |  | A (with @tintinweb/pi-subagents) |  |  |
|  |  |  | B (with pi-subagents) |  |  |
|  |  |  | C (without a subagent plugin) |  |  |
|  |  |  | G (@gotgenes/pi-subagents smoke) |  |  |
|  |  |  | SM-01 to SM-10 (runtime smoke, one row each) |  |  |

### Known limitations of the initial agent-integration smoke

The first runtime smoke of the bundled agents (Pi 1.5.0, `pi-subagents` 0.84.0 at `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`, Superpowers 7.0.2 at `22f0b463e7a5e579904dd6211a520321035526f7`) passed SM-01, SM-02, SM-04, SM-06, SM-07 and SM-08, with these accepted gaps:

- **SM-03 (a) helper-only:** partial. The Pi CLI cannot start a session that exposes only `subagents_enable`; the enable-then-next-turn path was observed in an interactive parent session only.
- **SM-05:** only `superspec.scout` and `superspec.spec-reviewer` were launched; the other four roles were exercised through SM-06 and SM-08 rather than a standalone launch.
- **SM-08:** the unavailable-check path (reported as not verified) was not exercised separately.
- **SM-09 and SM-10:** not run, because they need interactive human gates. Generate-specs and continue/ff routing are covered by contract tests only.
- `pi-subagents` adds ambient tools to children beyond the frontmatter `tools` list; read-only roles still lack edit and write tools. This is not a sandbox.

Treat the Superspec agent integration as verified only for the cases that passed. Run the open cases before claiming full integration coverage.
