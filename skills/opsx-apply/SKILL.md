---
name: opsx-apply
description: Implement an OpenSpec change in an isolated worktree using the Superpowers executor, then write the apply.md receipt. Also handles PR review feedback after a PR is open. Use when the user wants to start or continue implementation.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-apply-change (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->

Implement the tasks of an OpenSpec change. The CLI returns the apply instruction at runtime; this skill wraps it and adds the executor choice, the receipt, and the post-PR loop.

**Input**: Optionally a change name. If omitted, infer it from conversation context. If vague or ambiguous you MUST ask which change.

**Steps**

1. **Select the change**

   - Use the given name, or infer it from conversation context.
   - Auto-select if only one active change exists.
   - If ambiguous, run `openspec list --json` and ask the user to pick. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-apply <other>`).

2. **Locate an existing worktree**

   A re-run (verify FAIL loop, post-PR) may start from the main checkout. Before any other `openspec` call, look for the worktree:
   ```bash
   git worktree list --porcelain
   ```
   Pick the entry whose `branch` line is `branch refs/heads/<change-name>` and take its `worktree` path. If found, reuse it: run every `openspec` call below with that worktree as working directory, skip step 0 and worktree creation, and read `apply.md` there (iteration increments from its `Iteration:` value). Being already inside it is fine. If none matches, this is a first run (or a finalized change, see **Post-PR mode**): continue in the current checkout.

3. **Check status and get apply instructions**
   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```
   From status, read `schemaName`, `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`. The apply instructions return `contextFiles`, progress, the task list, a `state`, and the instruction text.

   **Handle states** (check in this order):
   - **Post-PR trigger:** `apply.md` and `finalize.md` both exist and the user is addressing PR review feedback. Skip the `blocked` / `all_done` stops and go to **Post-PR mode** (a finalized change normally reports `all_done`).
   - **Fix-iteration trigger:** `apply.md` exists and `verify.md` reports `FAIL`. Skip the `all_done` stop (a code-fixable FAIL usually has every box ticked) and go to **Fix-iteration mode**.
   - `state: "blocked"`: show the message and handle it by cause, with no code changes. If artifacts are missing, point to `/opsx-continue`. If the tracking file is missing, report it, offer to repair it, and start no implementation. Do not assume another artifact is ready. Then STOP.
   - `state: "all_done"` (no trigger above): report that the tracked tasks are complete, suggest `/opsx-verify` and then `/opsx-archive`, and STOP.
   - Otherwise proceed.

   **Workspace guard:** If status reports `actionContext.mode: "workspace-planning"` and `allowedEditRoots` is empty, explain that full workspace apply is not supported here, treat linked repos as read-only context, and STOP before editing files.

4. **Read context and follow the apply instruction**

   Read every file path listed under `contextFiles`. Then follow the instruction returned by `openspec instructions apply` for the setup: step 0 commit, the worktree on branch `<change-name>`, the executor, and the `apply.md` receipt (when step 2 found a worktree, skip step 0 and worktree creation). Do not copy the schema's step text into your own plan; the CLI output is the source of truth. Show progress as "N/M tasks complete" and the remaining tasks. Track tasks with the `todo` tool if available; otherwise state the checklist in your reply.

   If `instruction` names `superpowers:<x>`, follow the **Superpowers rule** below.

5. **Choose the executor**

   - If the `subagent` tool from `pi-subagents` exists in this session, use the subagent executor (schema step 2a): read the `subagent-driven-development` skill and execute `plan.md` through it.
   - If it does not exist, use the inline executor (schema step 2b): read the `executing-plans` skill, tell the user that TDD and review are not enforced for you, follow TDD manually, and request a whole-branch review (`requesting-code-review`) over the full commit range before writing `apply.md`.
   - Never invent subagent calls.
   - Whichever executor runs, brief it to read the Contracts section of `plan.md` and to follow the apply instruction's per-task contract order and stop rule. A contract change stops the executor: a `public` contract goes to the user for a decision; an internal one is recorded in `plan.md` and in `apply.md` under "Contract deviations".

   **Change-directory authority:** step 0 commits the change directory on the feature branch and creates the worktree on branch `<change-name>`. From then until finalize the worktree copy of the change directory is authoritative: `tasks.md` ticks, `apply.md`, and `verify.md` are written and committed there, and every `openspec` call runs with the worktree as working directory.

   Record the executor actually used in `apply.md`. The tracking file is authoritative for progress: tick each task in the worktree copy as it completes, at the `sourcePath` and `line` the apply instruction returns, after checking that the checkbox there still matches the task. If it does not, re-read the tracking file and do not tick a different task. Mark a task `[x]` only when its behavior is fully implemented; if only part is done, leave it unticked.

   **Pause if:** a task is unclear (ask), implementation reveals a design issue (suggest updating artifacts), or an error or blocker occurs (report and wait). Also pause and ask when a task adds scope no artifact specifies (add it to the artifacts, or leave it out), or would narrow or defer specified behavior. Do not guess.

6. **Write the receipt and STOP**

   After the final whole-branch review, write `apply.md` as the schema's receipt directs (worktree path, branch facts, commit range, iteration, executor, tasks X of Y) and commit it in the worktree. Carry the "Contract deviations" list over from the existing `apply.md` (it is cumulative; do not reset it) and add this run's entries. Then STOP. Do NOT invoke `finishing-a-development-branch`; finishing belongs to the later finalize step. Tell the user to run `/opsx-verify`.

7. **Post-PR mode**

   Entered from the post-PR trigger in step 3, when a PR is open and the user brings review feedback.
   - Read the `receiving-code-review` skill and follow it.
   - Which copy is current: finalize removes the worktree, so the change directory (including `apply.md`, `verify.md`, `finalize.md`) now lives on the feature branch in the main checkout; work and run `openspec` calls there. If step 2 found a worktree anyway, it is still authoritative; use it instead.
   - Fix on the feature branch, using TDD for each fix.
   - Append a `post-PR iteration N+1` entry with the new commit range to `apply.md`. Keep the existing "Contract deviations" and add any new ones.
   - Tell the user to run `/opsx-verify`, then update `finalize.md`.
   - Push and reviewer-comment follow the policy in `finalize.md`; a policy in the project `AGENTS.md` overrides it.

8. **Fix-iteration mode**

   Entered from the fix-iteration trigger in step 3, in the worktree from step 2.
   - Read `Iteration:` in `apply.md`. If it is already 5, do not continue: report the remaining CRITICAL items from `verify.md` and what was tried, then wait for the user.
   - Read the `systematic-debugging` skill and find the root cause of each CRITICAL item in `verify.md`. For artifact-level items (spec, design, or tasks are wrong), fix the artifact first.
   - Fix the cause with TDD, keeping changes scoped to the CRITICAL items.
   - Raise `Iteration:` by one, rewrite `apply.md` (new commit range, executor, tasks X of Y), keeping the existing "Contract deviations" and adding new ones, and commit it in the worktree.
   - STOP. Do NOT invoke `finishing-a-development-branch`. Tell the user to run `/opsx-verify`.

**Superpowers rule**

If an instruction says to use `superpowers:<x>`, drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the apply instruction says (never under `docs/superpowers/`) and ignore that skill's own closing handoff (invoking another skill or a next-step handoff). If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Output**

On completion:
- Change name, schema, and "N/M tasks complete"
- Executor used and the commit range
- "Run `/opsx-verify` to verify the change."

On pause: describe the issue, offer options (use `ask_user_question` if available; otherwise numbered options), and wait.

**Guardrails**
- A `blocked` change gets no code changes; an `all_done` change gets none either, except in Fix-iteration mode (apply.md exists and verify.md reports `FAIL`) or Post-PR mode
- Re-runs reuse the existing `<change-name>` worktree; never redo step 0 or recreate the branch
- Stop at 5 fix iterations and report to the user
- Always read the `contextFiles` before starting
- Keep changes minimal and scoped to each task; update the task checkbox right after finishing it
- Pause on errors, blockers, or unclear requirements; do not guess
- Pause and ask before adding scope the change does not specify, or narrowing or deferring behavior it does
- Never invoke `finishing-a-development-branch`
- Use `contextFiles` from the CLI output; do not assume file names
- If implementation reveals issues, suggest artifact updates rather than working around them
