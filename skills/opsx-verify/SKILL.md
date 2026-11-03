---
name: opsx-verify
description: Verify an applied OpenSpec change in its worktree against the change artifacts, run the project tests fresh, and write the verify.md receipt with a PASS, PASS_WITH_WARNINGS or FAIL outcome. Use after /opsx-apply and before finalize and archive.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-verify-change (MIT) for pi. -->

Verify that an implementation matches the change artifacts. The CLI returns the verify instruction (the six checks) at runtime; this skill wraps it and adds the worktree, the fresh test run, the `verify.md` receipt, and the fix loop.

**Input**: Optionally a change name. If omitted, infer it from conversation context. If vague or ambiguous you MUST ask which change.

**Steps**

1. **Select the change**

   - Use the given name, or infer it from conversation context.
   - Auto-select if only one active change exists.
   - If ambiguous, run `openspec list --json` and ask the user to pick. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-verify <other>`).

2. **Locate the worktree**

   Apply created a worktree on branch `<change-name>`. Find it:
   ```bash
   git worktree list --porcelain
   ```
   Pick the entry whose `branch` line is `branch refs/heads/<change-name>` and take its `worktree` path. If no entry matches, ask the user where the worktree is (use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait). Do not guess.

   **Worktree authority:** until finalize, the worktree copy of the change directory is authoritative (`tasks.md` ticks, `apply.md`, `verify.md`). Every `openspec` call and every check below, including the test run, uses the worktree as working directory. Never read the change from the main checkout.

3. **Require the apply receipt**

   Check that `apply.md` exists in the worktree copy of the change directory. If it does not, STOP: tell the user that the change has not been applied and to run `/opsx-apply` first. Do not verify without it. Read `apply.md` and note its `Iteration:` value, the commit range, and the executor.

4. **Check status and get the verify instruction**
   ```bash
   openspec status --change "<name>" --json
   openspec instructions verify --change "<name>" --json
   ```
   Run both from the worktree. From status, read `schemaName`, `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`. If status reports `actionContext.mode: "workspace-planning"`, explain that full workspace verification is not supported here and STOP; do not edit linked repos. The verify instructions return `contextFiles` and the instruction text.

5. **Read context and follow the verify instruction**

   Read every file path listed under `contextFiles`. Then follow the instruction returned by `openspec instructions verify`: run its six checks against the implementation in the worktree. Do not copy the schema's check text into your own plan; the CLI output is the source of truth. Use `contextFiles` from the output; do not assume file names.

   If `instruction` names `superpowers:<x>`, follow the **Superpowers rule** below.

   Beyond the instruction, always do both of these:
   - **Fresh test run:** run the project's test command in the worktree now, as a new run. Do not reuse earlier output or the result stated in `apply.md`. Record the exact command, exit status, and pass/fail counts.
   - **Evidence:** read the `verification-before-completion` skill and follow it. Every claim in `verify.md` (check passed, tests green, task done) must rest on command output or file evidence you collected in this run.

   The check for unsynced delta specs is not part of verify; it belongs to `/opsx-archive`. Do not perform it here and do not edit main specs.

6. **Write `verify.md` and decide the outcome**

   Write `verify.md` in the worktree copy of the change directory, as the schema's receipt directs, and commit it in the worktree. It must include:
   - `Iteration:` copied from `apply.md`
   - The outcome: exactly one of `PASS`, `PASS_WITH_WARNINGS`, `FAIL`
   - Result of each of the six checks, with file or line evidence
   - The fresh test command and its recorded result
   - Issues grouped CRITICAL / WARNING / SUGGESTION, each with a specific recommendation

   Outcomes:
   - `PASS`: all checks pass, fresh tests green, no issues.
   - `PASS_WITH_WARNINGS`: no CRITICAL issues, fresh tests green, warnings or suggestions remain.
   - `FAIL`: any CRITICAL issue (incomplete task, missing requirement, failing fresh tests, and so on).

   When uncertain, prefer SUGGESTION over WARNING and WARNING over CRITICAL, but never report `PASS` with failing tests.

7. **Handle the outcome**

   - `PASS` or `PASS_WITH_WARNINGS`: report and suggest the next step (finalize, then `/opsx-archive`). STOP.
   - `FAIL` with items that code can fix: read the `systematic-debugging` skill, find the root cause of each CRITICAL item, then re-apply by following `/opsx-apply` in the same worktree. That run records iteration N+1 in `apply.md`. Then verify again from step 3 and write a new `verify.md`.
   - Stop after 5 iterations: if the fifth verify still returns `FAIL`, do not loop again. Report the remaining CRITICAL items and what was tried, then wait for the user.
   - `FAIL` where the fix is not code (spec, design, or task artifacts are wrong): report it, suggest updating the artifacts, and STOP.

**Superpowers rule**

If an instruction says to use `superpowers:<x>`, drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the verify instruction says (never under `docs/superpowers/`) and ignore that skill's own closing handoff (invoking another skill or a next-step handoff). If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Output**

On completion:
- Change name, schema, and the outcome (`PASS`, `PASS_WITH_WARNINGS` or `FAIL`)
- Summary scorecard of the six checks and the fresh test result
- Issues by priority with file references (`file.ts:123`)
- Next step: finalize and `/opsx-archive` on pass; on `FAIL`, the fix loop status (iteration N of 5)

On pause: describe the issue, offer options (use `ask_user_question` if available; otherwise numbered options), and wait.

**Guardrails**
- Run every `openspec` call and check in the worktree
- Never verify without `apply.md`; point to `/opsx-apply`
- Always run the project tests fresh; never trust recorded results
- Every issue gets a specific, actionable recommendation, not vague advice
- Do not perform the delta-spec sync check; it belongs to `/opsx-archive`
- Do not fix code before reading `systematic-debugging`; stop after 5 iterations
- Do not invoke `finishing-a-development-branch`
