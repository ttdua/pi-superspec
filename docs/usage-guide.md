# Usage guide

This guide walks one change from a clean repository to an archived change. For the install steps and a short overview see the [README](../README.md). For the rules behind each step, and for how Superpowers conflicts are resolved, see [workflow.md](workflow.md).

Commands are typed into pi. Arguments are free text; there are no flags.

## Before you start

- Install OpenSpec 1.4 or newer and the Superpowers package for pi, then install pi-superspec itself (see the [README](../README.md#install)).
- Only `/opsx-init` exists in a fresh repository. Run it once per repository:

  ```text
  /opsx-init
  ```

  It checks `openspec --version`, runs `openspec init --tools none` when `openspec/` does not exist, sets `schema: superspec` in `openspec/config.yaml`, installs the bundled schema into `openspec/schemas/superspec/` (with the lock file `.pi-superspec.json`), validates it with `openspec schema validate superspec`, and then reloads pi by itself. On success you see `Schema superspec is valid.` and `Superspec is set up. Next: /opsx-new <name>`. The other `/opsx-*` commands now appear in the same session.
- `/opsx-init` does not need git. Outside a git repository it only warns (`Not inside a git repository; continuing without git.`). The rest of the workflow does use git, so work in a repository with an `origin` remote you can push to.
- Before `/opsx-apply`, create and switch to a feature branch (for example `feat/<name>`). Do not work on `main` or `master`:
  - On the integration branch, apply proceeds with a warning. Artifact commits land on that branch and finalize's git-side closeout does not produce a usable PR, so you fall back to the manual escape hatch (see [finalize](#9-finalize)).
  - On a detached HEAD, apply proceeds with a warning and the worktree is still created, but finalize's git-side closeout is skipped, so you use the escape hatch.

Throughout this guide, `<name>` is the change name (kebab-case) and `openspec/changes/<name>/` is the change directory.

## Step by step

The ten steps match [workflow.md](workflow.md). The artifact steps (1 to 6) each end with the agent stopping for your review; you then run `/opsx-continue` again. Read the new file, edit it or ask for changes, then continue.

Start the change once:

```text
/opsx-new add-user-auth
```

`/opsx-new` runs `openspec new change`, checks status and shows the instructions for the first artifact. It creates no artifact itself. If you give no name it asks what you want to build. If the change already exists it suggests `/opsx-continue <name>` and stops.

### 1. Brainstorm

- You type: `/opsx-continue`, then answer the questions. Brainstorming is interactive: one question at a time, two or three approaches, and your approval of the design.
- The agent produces: the agreed design (goals, non-goals, approaches considered, the chosen one, open questions), using the Superpowers `brainstorming` skill redirected into the change.
- Output: `openspec/changes/<name>/brainstorm.md`. Technical decisions belong in `design.md`, not here.
- Stop: review `brainstorm.md` before continuing.

For free-form thinking before a change exists, use `/opsx-explore [topic]`. It never writes application code.

### 2. Proposal

- You type: `/opsx-continue`.
- The agent produces: the change boundary and its Capabilities list, which is the contract with the specs.
- Output: `openspec/changes/<name>/proposal.md`.
- Stop: check that the Capabilities list is right; the next steps create one spec per capability.

### 3. Design (optional)

- You type: `/opsx-continue`.
- The agent produces: the technical decisions, risks and migration. When there is no non-trivial technical decision it writes a two-line `design.md` that says `No design needed: <reason>`, so the artifact graph still completes.
- Output: `openspec/changes/<name>/design.md`.
- Stop: review it. No later artifact requires it, but it is cheap and later steps read it.

### 4. Specs

- You type: `/opsx-continue`.
- The agent produces: delta specs with SHALL/MUST requirements and `#### Scenario:` blocks, one per capability named in the proposal.
- Output: `openspec/changes/<name>/specs/<capability>/spec.md`.
- Stop: review the requirements and scenarios; the plan and verify steps check against them.

### 5. Tasks

- You type: `/opsx-continue`.
- The agent produces: a coarse checklist of tasks that apply, verify and archive track.
- Output: `openspec/changes/<name>/tasks.md`.
- Stop: review the checklist.

### 6. Plan

- You type: `/opsx-continue`.
- The agent produces: 2 to 5 minute TDD micro-steps with exact files, test commands and commit points, using the Superpowers `writing-plans` skill redirected into the change. Every plan task names the `tasks.md` ID it implements, and the plan lists the test that covers each scenario. The skill's execution handoff is skipped; `/opsx-apply` chooses the executor.
- Output: `openspec/changes/<name>/plan.md`.
- Stop: review the plan. This is the last artifact before code. When `apply` becomes the next ready artifact, `/opsx-continue` does not create it; it points you to `/opsx-apply`.

Commit the artifacts on your feature branch if you like. If you do not, `/opsx-apply` commits the change directory for you (see step 7).

### 7. Apply

- You type: `/opsx-apply` (optionally with the change name; it auto-selects when only one change is active).
- The agent does, in order:
  1. Pre-flight (step 0): if `openspec/changes/<name>/` has uncommitted changes, it stages and commits only that directory (`docs(openspec): scaffold <name> change`). It records the branch you are on as the feature branch and the integration branch as the base branch.
  2. Creates a worktree on a new branch named `<name>`, from the feature branch.
  3. Runs the executor (see [Executors](#executors)), ticking `tasks.md` boxes as tasks pass review.
  4. After the final whole-branch review, writes and commits `apply.md` in the worktree.
- Output: the implementation in the worktree and `apply.md` (worktree path, worktree branch, feature branch, base branch, commit range, iteration, executor, tasks X of Y) in `openspec/changes/<name>/` inside the worktree.
- Stop: apply stops after the final review. It never merges, pushes or runs `finishing-a-development-branch`. It tells you to run `/opsx-verify`.
- Working directory: from here until finalize, the worktree copy of the change directory is authoritative. `tasks.md` ticks, `apply.md` and `verify.md` are written and committed there.
- If `/opsx-apply` reports that artifacts are missing, run `/opsx-continue` first; it makes no code changes in that state.

### 8. Verify

- You type: `/opsx-verify`, with the worktree as the working directory. It needs `apply.md`; without it the command stops and tells you to run `/opsx-apply`.
- The agent produces: six checks (structural validation, task completion, requirement evidence, scenario coverage with a fresh run of the project test command, design coherence, clean tree), and an outcome under Overall Decision.
- Output: `openspec/changes/<name>/verify.md` in the worktree, with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. It is overwritten on each run.
- On `PASS` or `PASS_WITH_WARNINGS`: warnings are recorded but do not block. Go on to finalize.
- On `FAIL`: run `/opsx-apply` again for a fix iteration (it finds the failing `verify.md`, fixes the cause, raises `Iteration:` by one and rewrites `apply.md`), then run `/opsx-verify` again. For artifact-level failures such as spec drift, the offending artifact is fixed first. After 5 iterations apply stops and reports the remaining critical items to you.
- Verify does not check whether delta specs are synced; that check belongs to archive.

### 9. Finalize

- You type: `/opsx-continue`, with the worktree as the working directory. Finalize is not a command: it is the `finalize` artifact, created by `/opsx-continue` after a passing verify.
- The agent produces the git-side closeout. First it finds the worktree for branch `<name>` with `git worktree list --porcelain` (asking you if none matches) and reads the branch facts from `apply.md`. If `apply.md` or a field is missing, it asks you; it does not infer branches from git history. Then:
  1. Runs the project tests in the worktree; it stops on failure.
  2. Switches to the feature branch in the main checkout and runs `git pull`.
  3. Merges the worktree branch back into the feature branch with `git merge --ff-only`. If that cannot fast-forward, it stops; reconcile by hand (rebase the worktree branch onto the feature branch) and re-enter finalize.
  4. Re-runs the tests on the merged result.
  5. Removes the worktree only when it sits under `.worktrees/` or `worktrees/` in the main checkout, or under `~/.config/superpowers/worktrees/`. Any other worktree is left in place and recorded as `preserved (harness-owned)`.
  6. Deletes the local worktree branch (`git branch -d <name>`).
  7. Writes `finalize.md`, commits it on the feature branch, and pushes the feature branch with `git push origin <feature-branch>`.
  8. If no PR exists and the session is interactive, offers to open one with a suggested conventional-commit title. If a PR exists, it posts or edits (in place) a code-reviewer orientation comment on it. The comment is non-blocking: a failure is recorded in `finalize.md` and nothing is rolled back.
- Output: `openspec/changes/<name>/finalize.md`. It records the outcome (`pr-updated` for the canonical path), the cleanup state, the PR URL and the PR comment status.
- A policy in the project's `AGENTS.md` about merge strategy, PR requirements or push rules overrides any of these steps; the agent follows it and records the deviation in `finalize.md`.
- Escape hatch: if a prerequisite is not met (you are on the integration branch or a detached HEAD, or there is no feature branch), or your workflow differs (solo and local-only, keep the worktree, discard the work), the agent invokes Superpowers `finishing-a-development-branch` and you pick the matching option. The escape hatch does no push of its own. You then hand-write `finalize.md` from the schema template and commit it; the reviewer-comment step still runs and skips itself when no PR exists.

### 10. Archive

- You type: `/opsx-archive` (optionally with the change name), in the main checkout, not the worktree, after finalize and before the PR merges.
- The agent does: warns about incomplete artifacts and open `- [ ]` tasks and asks you to confirm; runs the delta-sync check and, if the living specs are behind, offers "Sync now (recommended)", "Archive without syncing" or "Cancel"; then archives with `openspec archive "<name>" --skip-specs -y`. If the CLI fails, it reports the error and stops; it never moves directories by hand.
- Output: the change directory moves to `openspec/changes/archive/YYYY-MM-DD-<name>/`, and `openspec/specs/` is updated if you chose to sync.
- After archive: the `pr-updated` note in the finalize receipt template says to run `/opsx-archive` on the feature branch, push the archive commits to update the PR, then merge the PR. That single merge lands the implementation and the archive together.

To sync delta specs into `openspec/specs/` without archiving, use `/opsx-sync [name]`.

### After the PR is open

Review feedback is handled with `/opsx-apply` on the feature branch in the main checkout (finalize removed the worktree, so the change directory now lives there). With `apply.md` and `finalize.md` present and review feedback from you, apply goes into post-PR mode: it uses Superpowers `receiving-code-review`, fixes each item with TDD, and appends a `post-PR iteration N+1` entry with the new commit range to `apply.md`. Then run `/opsx-verify`, update `finalize.md`, and push; the push and reviewer comment follow the policy in `finalize.md`.

## Fast-forward with /opsx-ff

`/opsx-ff <name>` (or a description of what you want; it asks if you give neither) builds all the planning artifacts in one go.

```text
/opsx-ff add-user-auth
```

- It creates the change if needed. If a change with that name already exists, it asks you to confirm continuing it and skips artifacts that are already done; it never overwrites.
- Brainstorm runs interactively: you answer its questions and approve the design before it moves on. It does not invent your answers or your approval.
- After approval it creates the remaining artifacts in dependency order without stopping for review: proposal, design, specs, tasks and plan. It stops when `plan` is done.
- It stops before apply. It never creates `apply.md`, never implements tasks and writes no product code. Its last message is "All artifacts created!" followed by "Run `/opsx-apply` to start implementing."
- Next: review the artifacts, then run `/opsx-apply`, and continue from [step 7](#7-apply).

What ff does not do:

- It does not ask the execution-handoff question; `/opsx-apply` chooses the executor.
- In the unattended phase it asks only when a required input cannot be inferred from the brainstorm, earlier artifacts and the repo. Otherwise it makes the call and records the assumption in the artifact. If no artifact is ready but the plan is not complete, it shows the status and stops.
- It does not give you a review stop between artifacts. If you want to review each artifact, use `/opsx-continue`.
- It does not create a feature branch for you; do that before `/opsx-apply`.

## Executors

`/opsx-apply` picks the executor for the plan:

- With `pi-subagents` installed (the session has the `subagent` tool): subagent-driven development. A fresh subagent runs each task with TDD, a reviewer checks each task, and a final review covers the whole implementation before `apply.md` is written.
- Without it: Superpowers `executing-plans`, in the current session. The agent tells you that TDD and review are not enforced for it, follows TDD manually, and still requests a whole-branch review over the full commit range with `requesting-code-review` before writing `apply.md`. It never invents subagent calls.

Either way, `apply.md` records the executor actually used.

Two other optional pi packages change how the agent asks and tracks, and both have a fallback:

- `rpiv-ask-user-question`: gives the agent a tool for asking you to choose between options. Without it, the agent asks a plain question with numbered options (recommended first) and waits.
- `rpiv-todo`: gives the agent a todo tool for tracking progress. Without it, the agent states the checklist in its reply.

## Existing schemas

`/opsx-init` compares `openspec/schemas/superspec/` with the bundled schema:

| State | What `/opsx-init` does |
|---|---|
| fresh install (directory missing) | Copies the bundled schema to `openspec/schemas/superspec/` and writes the lock file `.pi-superspec.json`. |
| identical | Leaves everything as it is. Running `/opsx-init` again is safe. |
| any other state: foreign, older, newer, edited | Warns and writes nothing under `openspec/schemas/superspec/`. It does not validate or reload. |

In the last row, `foreign` is a schema without the `x-pi-superspec` marker and version (for example upstream Superspec v4); `older` and `newer` carry a marker version lower or higher than the bundled one; `edited` has the same version but differs from the bundled files.

The warning reads: `Existing schema at openspec/schemas/superspec is <state>; it was left unchanged. Activation stopped.` If `openspec/config.yaml` was just changed to `schema: superspec`, a `Note:` line says so, because config is updated before the schema is checked.

Automatic upgrade, `--force` and backup are not yet shipped. `/opsx-init` takes no arguments. To reinstall now, back up any local edits, remove `openspec/schemas/superspec/`, and run `/opsx-init` again.

## Troubleshooting

**The `opsx-*` commands do not appear (only `/opsx-init` does).**
The project is not activated. A project is activated when `openspec/schemas/superspec/schema.yaml` contains the `x-pi-superspec` marker. Run `/opsx-init`, which installs the schema and reloads pi. If it ended with a validation error, the installed files are kept and the project activates on the next session start, so reload pi or start a new session. If it stopped on an existing schema, see [Existing schemas](#existing-schemas). A `foreign` schema without the marker does not activate the project. Also check that pi's current directory is inside the project: the root is the nearest parent directory that contains `openspec/`.

**`openspec was not found`, `Could not parse the openspec version`, or `openspec <major>.<minor> is too old`.**
`/opsx-init` stops and writes nothing. The message ends with `Install or upgrade OpenSpec (>= 1.4): brew install openspec`. Install or upgrade OpenSpec to 1.4 or newer, make sure `openspec --version` works in the shell pi uses, and run `/opsx-init` again.

**Superpowers not found.**
`/opsx-init` warns `Superpowers skills were not found; install Superpowers for the full workflow.` In an activated project, each session start (including reload) also shows `pi-superspec needs Superpowers, which is not installed. Install it with: pi install git:github.com/obra/superpowers`. Run that command and reload pi. Without Superpowers the skills stop and tell you to install it.

**`Not inside a git repository; continuing without git.`**
Only a warning for `/opsx-init`. Before you reach `/opsx-apply`, initialise git and create a feature branch with an `origin` remote, because apply and finalize rely on branches and worktrees.

**`openspec init --tools none failed` or `openspec schema validate superspec failed`.**
The output of the failed command is appended to the message. Fix the cause and run `/opsx-init` again. After a validation failure the installed files are kept.

**Legacy `.pi` files.**
If `.pi/prompts/opsx-*.md` or `.pi/skills/openspec-*` exist, `/opsx-init` asks `Delete legacy openspec files?` and deletes them only if you confirm. Without an interactive UI it lists them and deletes nothing.

**`/opsx-apply` says the change is blocked.**
Required artifacts are missing. Run `/opsx-continue` until the plan exists.

**`/opsx-verify` says the change has not been applied.**
`apply.md` is missing. Run `/opsx-apply` first.
