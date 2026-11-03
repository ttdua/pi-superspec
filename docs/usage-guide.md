# Usage guide

This guide walks one change from a clean repository to an archived change. For the install steps and a short overview see the [README](../README.md). For the rules behind each step, and for how Superpowers conflicts are resolved, see [workflow.md](workflow.md).

Commands are typed into pi. Arguments are free text; there are no flags.

## Before you start

- Install OpenSpec 1.16 or newer and the Superpowers package for pi, then install pi-superspec itself (see the [README](../README.md#install)).
- Only `/opsx-init` exists in a fresh repository. Run it once per repository:

  ```text
  /opsx-init
  ```

  It checks `openspec --version`, runs `openspec init --tools none` when `openspec/` does not exist, sets `schema: superspec` in `openspec/config.yaml`, installs the bundled schema into `openspec/schemas/superspec/` (with the lock file `.pi-superspec.json`), validates it with `openspec schema validate superspec`, and then reloads pi by itself. On success you see `Schema superspec is valid.` and `Superspec is set up. Next: /opsx-new <name>`. The other `/opsx-*` commands now appear in the same session.
- `/opsx-init` does not need git. Outside a git repository it only warns (`Not inside a git repository; continuing without git.`). The rest of the workflow does use git, so work in a repository with an `origin` remote you can push to.
- Finalize uses the GitHub CLI (`gh`) to detect, create and comment on PRs. It is optional: when `gh pr view` finds nothing (or `gh` is missing) finalize treats it as no PR and records `PR comment status: skipped (no PR)`; if posting the reviewer comment fails (for example `gh` missing) it records `PR comment status: failed: <reason>` and does not roll back the merge or push.
- pi itself is the agent that runs these commands; install it first (see the [README](../README.md#prerequisites)).
- Before `/opsx-apply`, commit the `/opsx-init` output (`openspec/config.yaml` and `openspec/schemas/superspec/`, including `.pi-superspec.json`) on your feature branch. Apply's pre-flight commits only `openspec/changes/<name>/`, and the worktree is created from the feature branch, so uncommitted init files would be missing from the worktree where verify and finalize run.
- Before `/opsx-apply`, create and switch to a feature branch (for example `feat/<name>`) and push it once with `git push -u origin feat/<name>`. Finalize runs a plain `git pull` on the feature branch (the schema has no guard around it), and git refuses to pull a branch that has no upstream. Do not work on `main` or `master`:
  - On the integration branch, apply proceeds with a warning. Artifact commits land on that branch and finalize's git-side closeout does not produce a usable PR, so you fall back to the manual escape hatch (see [finalize](#9-finalize)).
  - On a detached HEAD, apply proceeds with a warning and the worktree is still created, but finalize's git-side closeout is skipped, so you use the escape hatch.

Which directory pi runs in matters. pi finds the project root from the directory it was started in (the nearest parent that contains `openspec/`), so:

- Steps 1 to 7 run in the main checkout.
- `/opsx-apply` prints the worktree path and records it in `apply.md`.
- `/opsx-verify` finds the worktree itself with `git worktree list`, so it works from the worktree or the main checkout.
- `/opsx-continue` has no worktree discovery. For finalize, start (or restart) pi with the worktree path as its working directory. From the main checkout it reads the main checkout's copy of the change, which has no `apply.md`, so `apply` looks like the next ready artifact and the agent points you back to `/opsx-apply`; `/opsx-apply` then finds the worktree and can report all tasks done and suggest `/opsx-verify` then `/opsx-archive`, which would skip finalize.
- Finalize removes the worktree when it sits under `.worktrees/`, `worktrees/` or `~/.config/superpowers/worktrees/`. A pi session whose working directory was that worktree must be reopened in the main checkout before `/opsx-archive`.

Throughout this guide, `<name>` is the change name (kebab-case) and `openspec/changes/<name>/` is the change directory.

## Step by step

The ten steps match [workflow.md](workflow.md). The artifact steps (1 to 6) each end with a review gate on the new artifact and then a stop; you then run `/opsx-continue` again. Read the new file, edit it or ask for changes, then continue.

Start the change once:

```text
/opsx-new add-user-auth
```

`/opsx-new` runs `openspec new change`, checks status and shows the instructions for the first artifact. It creates no artifact itself. The CLI may print `Creating change '<name>' with schema 'spec-driven'...`, but the change uses `superspec` from `openspec/config.yaml`; the next line reads `Schema: superspec` and `openspec status` reports `schemaName: superspec`. If you give no name it asks what you want to build. If the change already exists it suggests `/opsx-continue <name>` and stops.

### 1. Brainstorm

- You type: `/opsx-continue`, then answer the questions. Brainstorming is interactive: one question at a time, two or three approaches, then a review gate on the written design.
- The agent produces: the agreed design (goals, non-goals, approaches considered, the chosen one, open questions), using the Superpowers `brainstorming` skill redirected into the change.
- Output: `openspec/changes/<name>/brainstorm.md`. Technical decisions belong in `design.md`, not here.
- Stop: a review gate opens on `brainstorm.md`. That gate is your approval of the design; there is no separate approval step. Continue once it is approved.

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

- You type: `/opsx-verify`. It finds the worktree itself, so it works from the worktree or the main checkout. It needs `apply.md`; without it the command stops and tells you to run `/opsx-apply`.
- The agent produces: six checks (structural validation, task completion, requirement evidence, scenario coverage with a fresh run of the project test command, design coherence, clean tree), and an outcome under Overall Decision.
- Output: `openspec/changes/<name>/verify.md` in the worktree, with exactly one of `PASS`, `PASS_WITH_WARNINGS` or `FAIL`. It is overwritten on each run.
- On `PASS` or `PASS_WITH_WARNINGS`: warnings are recorded but do not block. Go on to finalize.
- On `FAIL`: run `/opsx-apply` again for a fix iteration (it finds the failing `verify.md`, fixes the cause, raises `Iteration:` by one and rewrites `apply.md`), then run `/opsx-verify` again. For artifact-level failures such as spec drift, the offending artifact is fixed first. After 5 iterations apply stops and reports the remaining critical items to you.
- Verify does not check whether delta specs are synced; that check belongs to archive.

### 9. Finalize

- You type: `/opsx-continue`, in a pi session started with the worktree path as its working directory (see Before you start). Finalize is not a command: it is the `finalize` artifact, created by `/opsx-continue` after a passing verify.
- The agent produces the git-side closeout. First it finds the worktree for branch `<name>` with `git worktree list --porcelain` (asking you if none matches) and reads the branch facts from `apply.md`. If `apply.md` or a field is missing, it asks you; it does not infer branches from git history. Then:
  1. Runs the project tests in the worktree; it stops on failure.
  1b. Runs the code review gate (step 2b of the schema): the worktree diff against the feature branch is reviewed before the feature branch is touched. On notes or requested changes it stops; fix the code on the worktree branch, update `apply.md` as iteration N+1 (raise `Iteration:`, extend the commit range), run `/opsx-verify` again and re-enter finalize.
  2. Switches to the feature branch in the main checkout and runs `git pull`.
  3. Merges the worktree branch back into the feature branch with `git merge --ff-only`. If that cannot fast-forward, it stops; reconcile by hand (rebase the worktree branch onto the feature branch) and re-enter finalize.
  4. Re-runs the tests on the merged result.
  5. Removes the worktree only when it sits under `.worktrees/` or `worktrees/` in the main checkout, or under `~/.config/superpowers/worktrees/`. Any other worktree is left in place and recorded as `preserved (harness-owned)`.
  6. Deletes the local worktree branch (`git branch -d <name>`).
  7. Writes `finalize.md`, commits it on the feature branch, and pushes the feature branch with `git push origin <feature-branch>`.
  8. If no PR exists and the session is interactive, offers to open one with a suggested conventional-commit title. If a PR exists, it posts or edits (in place) a code-reviewer orientation comment on it. The comment is non-blocking: a failure is recorded in `finalize.md` and nothing is rolled back.
- Output: `openspec/changes/<name>/finalize.md`. It records the outcome (`pr-updated` for the canonical path), the cleanup state, the PR URL and the PR comment status.
- A policy in the project's `AGENTS.md` about merge strategy, PR requirements or push rules overrides any of these steps; the agent follows it and records the deviation in `finalize.md`.
- Escape hatch: if a prerequisite is not met (you are on the integration branch or a detached HEAD, or there is no feature branch), or your workflow differs (solo and local-only, keep the worktree, discard the work), the agent invokes Superpowers `finishing-a-development-branch` and you pick the matching option. Whether anything is pushed depends on the option you pick: Option 2 (push and create PR) pushes; merge locally, keep as-is and discard do not. Before merge locally or Option 2 runs, the code review gate runs as in step 1b, against the branch that option merges into or opens the PR against; `Code review: skipped (<reason>)` is recorded only for keep as-is, discard, or when you waive the gate in chat. You then hand-write `finalize.md` from the schema template and commit it; the reviewer-comment step still runs and skips itself when no PR exists.

### 10. Archive

- You type: `/opsx-archive` (optionally with the change name), in a pi session reopened in the main checkout (not the worktree, which finalize may have removed), after finalize and before the PR (if any) merges.
- The agent does: warns about incomplete artifacts and open `- [ ]` tasks and asks you to confirm; runs the delta-sync check and, if the living specs are behind, offers "Sync now (recommended)", "Archive without syncing" or "Cancel"; when a sync is blocked only "Archive without syncing" or "Cancel" are offered, and after a sync it re-compares every delta before archiving; when a sync is blocked only "Archive without syncing" or "Cancel" are offered, and after a sync it re-compares every delta before archiving; then archives with `openspec archive "<name>" --skip-specs -y`. If the CLI fails, it reports the error and stops; it never moves directories by hand.
- Output: the change directory moves to `openspec/changes/archive/YYYY-MM-DD-<name>/`, and `openspec/specs/` is updated if you chose to sync.
- `/opsx-archive` never commits. It only moves the change directory and, if you chose to sync, edits `openspec/specs/`. After it finishes, commit the archive move and the spec sync yourself on the feature branch (stage and commit them), then push.
- Where: after finalize the main checkout is already on the feature branch, so "archive on the feature branch" and "archive in the main checkout" are the same place.
- For the `pr-updated` and `pr-created` outcomes, the finalize receipt template says to run `/opsx-archive` on the feature branch, push the archive commits to update the PR, then merge the PR; that single merge lands the implementation and the archive together. For the `merge-locally` outcome (escape hatch), the template says: "Run `/opsx-archive` on main to move the change directory into the archive; it syncs delta specs when needed." See `schema/superspec/templates/finalize.md`.

To sync delta specs into `openspec/specs/` without archiving, use `/opsx-sync [name]`.

### After the PR is open

Review feedback is handled with `/opsx-apply` on the feature branch in the main checkout (finalize removed the worktree, so the change directory now lives there). With `apply.md` and `finalize.md` present and review feedback from you, apply goes into post-PR mode: it uses Superpowers `receiving-code-review`, fixes each item with TDD, and appends a `post-PR iteration N+1` entry with the new commit range to `apply.md`. Then run `/opsx-verify`, update `finalize.md`, and push; the push and reviewer comment follow the policy in `finalize.md`.

## Working in your language

Set the language once and agents write the prose of your OpenSpec documents (change artifacts and main specs) in it:

```text
/opsx-init --lang vi
```

`--lang <value>` (or `--lang=<value>`) writes or overwrites `language:` in `openspec/config.yaml`, directly after `schema:`. Everything after `--lang` is taken as the value (so `--lang vi --force` sets the language to `vi --force`), quotes around it are stripped, and it must be 1 to 64 characters with no control characters. An invalid or missing value stops with an error before any file is written, and arguments that do not start with `--lang` are rejected as unknown.

Without the flag the default language is `en`. When `language:` is missing or invalid and pi has a UI, `/opsx-init` asks once per run and offers `en`; an empty answer, cancel or invalid answer (the latter with a warning) writes `language: en`. Without a UI it does not ask and writes `language: en` directly. An invalid existing `language:` line is replaced by `language: en`, and an existing valid value is never changed without the flag. A project blocked on an existing schema writes no language and does not ask.

To switch later, ask the agent to change the document language; it updates `language:` in `openspec/config.yaml`. The setting is read on every turn, so no reload is needed.

A project whose `openspec/config.yaml` has no `language:` (or no `config.yaml`, or an invalid or unreadable value) is treated as `en`: agents are still told to write document prose in `en`.

Structural tokens stay in English: headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkboxes, delta operation headers, and file and capability names. Requirement names are identifiers that delta specs match exactly, so translating them would break the match. Code, code comments and commit messages are not affected. Existing documents are not retranslated.

## Fast-forward with /opsx-ff

`/opsx-ff <name>` (or a description of what you want; it asks if you give neither) builds all the planning artifacts in one go.

```text
/opsx-ff add-user-auth
```

- It creates the change if needed. If a change with that name already exists, it asks you to confirm continuing it and skips artifacts that are already done; it never overwrites.
- Brainstorm runs interactively: you answer its questions, and the review gate on `brainstorm.md` is your approval of the design before it moves on. It does not invent your answers or your approval.
- Once `brainstorm.md` passes its own review gate, it creates the remaining artifacts in dependency order without stopping for review: proposal, design, specs, tasks and plan. When `plan` is done it runs one final review gate over those five files (`brainstorm.md` is not repeated).
- It stops before apply. It never creates `apply.md`, never implements tasks and writes no product code. Its last message is "All artifacts created!" followed by "Run `/opsx-apply` to start implementing."
- Next: review the artifacts, then run `/opsx-apply`, and continue from [step 7](#7-apply).

What ff does not do:

- It does not ask the execution-handoff question; `/opsx-apply` chooses the executor.
- In the unattended phase it asks only when a required input cannot be inferred from the brainstorm, earlier artifacts and the repo. Otherwise it makes the call and records the assumption in the artifact. If no artifact is ready but the plan is not complete, it shows the status and stops.
- It does not give you a review stop between artifacts, only the brainstorm gate and the final gate. If you want to review each artifact, use `/opsx-continue`, which gates each artifact it creates.
- It does not create a feature branch for you; do that before `/opsx-apply`.

## Existing codebase: bootstrap specs

For a project that already has code but no specs, draft a first set from the code:

```text
/opsx-init --generate
/opsx-generate-specs
/opsx-ff bootstrap-specs
/opsx-apply
/opsx-verify
/opsx-continue   # creates finalize, see step 9
/opsx-archive
```

- `/opsx-init --generate` initialises the project as usual and then only prints the next step. It does no agent work.
- `/opsx-generate-specs` maps the code into at most 12 capability candidates, drops any whose name already exists in `openspec/specs/`, and asks one confirmation question: keep, drop or rename candidates. No scout runs before you answer, and cancelling creates nothing.
- Scouts, one per confirmed capability, use `pi-subagents` when the session has the `subagent` tool, in parallel where it allows. Without it they run one after another in the current session, which is slower and fills context.
- The drafts are written to `openspec/changes/bootstrap-specs/` (`specs/<capability>/spec.md`, plus `brainstorm.md`, `proposal.md` and a `design.md` stub). The command stops there and does not write `tasks.md` or `plan.md`.
- Every requirement has an `Evidence:` line. `Confidence: inferred` means only the code backs the requirement: no test or document states that behaviour. Treat it as a guess about intent. The review gate in `/opsx-ff bootstrap-specs` is where you confirm each one or remove it.
- Existing specs are never overwritten: `openspec/specs/` is not touched, and the delta specs are merged only by `/opsx-archive` (or `/opsx-sync`).
- Then run `/opsx-ff bootstrap-specs` and continue from [step 7](#7-apply).

## Executors

`/opsx-apply` picks the executor for the plan:

- With `pi-subagents` installed (the session has the `subagent` tool): subagent-driven development. A fresh subagent runs each task with TDD, a reviewer checks each task, and a final review covers the whole implementation before `apply.md` is written.
- Without it: Superpowers `executing-plans`, in the current session. The agent tells you that TDD and review are not enforced for it, follows TDD manually, and still requests a whole-branch review over the full commit range with `requesting-code-review` before writing `apply.md`. It never invents subagent calls.

Either way, `apply.md` records the executor actually used.

Two other optional pi packages change how the agent asks and tracks, and both have a fallback:

- An optional package that provides the `ask_user_question` tool (see the [README](../README.md#install) for the packages). Without the tool, the agent asks a plain question with numbered options (recommended first) and waits.
- An optional package that provides the `todo` tool. Without the tool, the agent states the checklist in its reply.

## Existing schemas

`/opsx-init` compares `openspec/schemas/superspec/` with the bundled schema:

| State | What `/opsx-init` does |
|---|---|
| fresh install (directory missing) | Copies the bundled schema to `openspec/schemas/superspec/` and writes the lock file `.pi-superspec.json`. |
| identical | Leaves everything as it is. Running `/opsx-init` again is safe. |
| any other state: foreign, older, newer, edited | Warns and writes nothing under `openspec/schemas/superspec/`. It does not validate or reload. |

In the last row, `foreign` is a schema without the `x-pi-superspec` marker and version (for example upstream Superspec v4); `older` and `newer` carry a marker version lower or higher than the bundled one; `edited` has the same version but differs from the bundled files.

The warning reads: `Existing schema at openspec/schemas/superspec is <state>; it was left unchanged. Activation stopped.` If `openspec/config.yaml` was just changed to `schema: superspec`, a `Note:` line says so, because config is updated before the schema is checked.

Automatic upgrade, `--force` and backup are not yet shipped. `/opsx-init` takes only the optional `--lang` argument. To reinstall now, back up any local edits, remove `openspec/schemas/superspec/`, and run `/opsx-init` again. Upgrading from v5 to v6: schema version 6 ships with this release, so a project with v5 installed is classified `older`, `/opsx-init` warns, and the schema must be reinstalled by hand as described here.

## Troubleshooting

**The `opsx-*` commands do not appear (only `/opsx-init` does).**
The project is not activated. A project is activated when `openspec/schemas/superspec/schema.yaml` contains the `x-pi-superspec` marker. Run `/opsx-init`, which installs the schema and reloads pi. If it ended with a validation error, the installed files are kept and the project activates on the next session start, so reload pi or start a new session. If it stopped on an existing schema, see [Existing schemas](#existing-schemas). A `foreign` schema without the marker does not activate the project. Also check that pi's current directory is inside the project: the root is the nearest parent directory that contains `openspec/`.

**`openspec was not found`, `Could not parse the openspec version`, or `openspec <major>.<minor> is too old`.**
`/opsx-init` stops and writes nothing. The message ends with `Install or upgrade OpenSpec (>= 1.16): brew install openspec`. Install or upgrade OpenSpec to 1.16 or newer (the npm package of OpenSpec 1.16 needs Node 22.12 or newer; the Homebrew formula installs its own Node), make sure `openspec --version` works in the shell pi uses, and run `/opsx-init` again.

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
