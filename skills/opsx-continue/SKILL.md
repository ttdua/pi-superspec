---
name: opsx-continue
description: Continue an OpenSpec change by creating the next ready artifact, run a review gate on it, then stop. Use when the user wants to progress their change or create the next artifact.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-continue-change (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->

Continue working on a change by creating the next artifact.

**Input**: Optionally a change name. A change name that is unambiguous from the conversation counts as provided. If none is given or inferable, or it is vague or ambiguous, you MUST prompt for the available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get the available changes, sorted by most recently modified. If exactly one change exists and no name was given, use it and announce it ("Using change `<name>`"). If several changes exist, ask which one to work on. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Present the top 3-4 most recently modified changes, showing:
   - Change name
   - Schema (from the `schema` field if present)
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified`)

   Mark the most recently modified change as "(Recommended)".

   **IMPORTANT**: When several changes exist and no name is given or inferable, do NOT guess or auto-select one. Let the user choose.

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON. The response includes:
   - `schemaName`: The workflow schema in use
   - `artifacts`: Array of artifacts with status ("done", "skipped", "ready", "blocked")
   - `isPlanningComplete`: Whether all planning artifacts are complete; older CLI versions expose the same value as `isComplete`, so fall back to `isComplete` when `isPlanningComplete` is absent
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

   An artifact with status "skipped" is satisfied: it has no files, so never create it and do not look for its files.

3. **Act based on status**

   **Check `done` glob artifacts for missing files first**: a `done` artifact whose output is a glob (for example `specs`) can still be partial. For each such artifact, get its instructions, read the completed dependencies it needs, and compare the files the proposal calls for with `artifactPaths.<id>.existingOutputPaths`. If some are missing, that artifact is this call's one artifact: handle it as the partial-artifact case under "Create the artifact file" below, using the instructions you already fetched.

   **If planning is complete (`isPlanningComplete: true`, or legacy `isComplete: true`) and no `done` glob artifact is missing files**:
   - Show the final status including the schema used
   - Suggest: "All artifacts created! You can now run `/opsx-apply` or archive this change."
   - STOP

   **If the next ready artifact is `apply`** (all of the schema's `applyRequires` are done):
   - Do NOT create it. STOP and point the user to `/opsx-apply`

   **If artifacts are ready to create** (`status: "ready"`):
   - Pick the FIRST artifact with `status: "ready"`
   - Get its instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - Parse the JSON. Key fields:
     - `context`: Project background (constraints for you; do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you; do NOT include in output)
     - `template`: The structure for the output file
     - `instruction`: Schema-specific guidance. If it names `superpowers:<x>`, follow the **Superpowers artifact rule** below before writing the artifact
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context (entries with `skipped: true` have no files, so do not look for them)
   - **Create the artifact file**:
     - Read any completed dependency files for context; always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
     - Use `template` as the structure and fill in its sections
     - Apply `context` and `rules` as constraints, but do NOT copy them into the file
     - Write to `resolvedOutputPath`. If it is a glob pattern, choose the concrete file path using the schema instruction and workspace planning context
   - An artifact may span several files (for example the `specs` artifact: one spec per capability, as the schema instruction directs). Create all files for that one artifact; it still counts as one artifact
   - For a partial glob artifact (see the check above), write only the missing files as that call's one artifact, then run the Review gate on the files you wrote and STOP (never overwrite existing files)
   - Create exactly one artifact, then show what was created and what is now unlocked
   - If the artifact is `finalize`, run the code review gate during creation, at its step 2b, before the git-side closeout, using the Review gate section
   - Run the **Review gate** on the written file(s). On `approved`, or on `approved_with_notes` handled per the gate, go on to STOP. On `changes_requested`, revise and reopen the gate. On `dismissed`, ask the user in chat. For `finalize`, the written `finalize.md` is already committed and pushed, so a `changes_requested` on it is handled as a follow-up commit and push on the feature branch
   - STOP after creating that one artifact (and its gate), so the user can run the next step

   **If no artifacts are ready (all blocked)**:
   - This should not happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```
   Track progress with the `todo` tool if available; otherwise state the checklist in your reply.

**Superpowers artifact rule**

If an artifact `instruction` says to use `superpowers:<x>` (for example `superpowers:brainstorming` for the brainstorm artifact or `superpowers:writing-plans` for the plan artifact), drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill or an execution handoff). That skill's own approval gates, self-review, or commit steps must not produce a second artifact or run past the STOP after this artifact. The review gate on `brainstorm.md` is the brainstorming skill's design-doc approval; do not ask for it separately. If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Review gate**

A review gate asks the reviewer to decide on written work before the workflow moves on. It ends in exactly one outcome:

| Outcome | Plannotator result | Answer in chat |
|---|---|---|
| `approved` | `decision: approved`, no `feedback` | "Approve" |
| `approved_with_notes` | `decision: approved`, non-empty `feedback` | "Approve with notes" plus the notes |
| `changes_requested` | `decision: annotated` | "Request changes" plus the notes |
| `dismissed` | `decision: dismissed` | no answer |

Only `approved` and `approved_with_notes` let the workflow continue. The `dismissed` outcome is not an approval, so ask the user in chat how to proceed and do not continue until they answer.

- **Choose the reviewer** each time a gate opens, in this order:
  1. The `plannotator` tool, when it is in your available tools. Call it with the gate enabled on the target files, end your turn, and continue when its decision message arrives. That message is the tier's result.
  2. The Plannotator CLI, when `command -v plannotator` succeeds. Run it in the background as described under "Run the CLI" and read the result file.
  3. The `ask_user_question` tool, when available. Offer the three options "Approve", "Approve with notes" and "Request changes", with notes as free text.
  4. Otherwise plain text: three numbered options (recommended first), then wait for the answer.
- **When a tier fails to open** (the CLI exits with code 2, or exits non-zero and leaves no result file; the tool returns an error; or you cannot run a background command), tell the user and fall to the next tier. A failed tier falls to the next tier without a retry loop.
- **Run the CLI**: `plannotator annotate <file>... --gate --json --result-file <scratch>/review-<n>.json`, passing every reviewed file as an explicit path in artifact order (never a folder). The result file must be a fresh path for every gate: a path that does not exist yet, in the session scratch directory or in a new `mktemp -d` directory, and outside the change directory. Do not use `--require-approval`. Wait for the process to finish, then read the result file.
- **Classify the result** of a CLI tier from the `decision` field (`approved`, `annotated`, `dismissed`) and `feedback`, never from message text or the exit code (except a tier failure, as defined for a tier that fails to open). An unknown `decision` is `dismissed`, and so is a result file that is missing or unreadable after a zero exit. For the `plannotator` tool tier, the decision message is the result, since that tier has no JSON: an approval without notes is `approved`; an approval with notes or comments is `approved_with_notes`; annotations or requested changes are `changes_requested`; a review closed without a decision is `dismissed`. When that message is ambiguous, ask the user in chat which outcome they meant.
- **Handle notes** for `approved_with_notes` and `changes_requested`: apply every note to the reviewed files. After `approved_with_notes`, if every note is only wording, formatting or clarification, and none changes a requirement, scope, decision, scenario or the meaning of another artifact, continue and show a short diff of what changed. Otherwise open the gate again on the changed files. When unsure, reopen. After `changes_requested`, always open the gate again.
- **Cascade a revision**: find the dependents of each revised artifact from the dependency data (`requires` and `dependencies`) in `openspec status --change "<name>" --json`, not from file times. Edit the dependents so they stay consistent (do not regenerate them from scratch) and open the next gate on only the files that changed. If `brainstorm.md` is revised after the generation of the later artifacts, say so and open the next gate on every artifact that depends on it: `brainstorm.md` plus all five later artifacts (proposal, design, specs, tasks, plan), or those of them that exist.
- **Code review gate**: while creating the `finalize` artifact, the schema asks for a code review gate after the in-worktree test run and before the feature branch is touched. It uses the same outcomes and tier order, with these differences:
  1. Tier 1 calls the `plannotator` tool with the `review` action on the worktree, with the base set to the feature branch recorded in `apply.md` and the gate enabled. That action sets only the base, not the diff mode, so ask the reviewer to confirm that the compare mode shows the full branch diff (every commit on the worktree branch since that feature branch); if it does not, fall to Tier 2.
  2. Tier 2 runs `plannotator review --base <feature branch> --diff-type merge-base --gate --json <worktree>` in the background; `--diff-type merge-base` shows every commit on the worktree branch since the feature branch, whatever the saved default diff mode is. This command has no `--result-file`, so redirect its stdout to a fresh scratch file (same rules as for the result file of "Run the CLI") and read that JSON. Decide approve-or-not from `decision` only: `annotated` is `changes_requested`, and `dismissed` or an unknown value is `dismissed`. When `decision` is `approved`, read `message`: a bare approval reads "Code review completed — no changes requested." and is `approved`; a message that carries reviewer notes beyond that (for example an "Approved with Notes" heading) is `approved_with_notes`; when unclear, ask the user. This JSON has no `feedback` field, so use `message` as the reviewer's notes to apply.
  3. Tiers 3 and 4 show `git diff --stat` and the commit range against the feature branch recorded in `apply.md`, tell the user the diff must be read in their own tool, and ask for the three options.
  4. On `approved`, continue finalize. On `approved_with_notes` or `changes_requested`, stop before the feature branch is checked out, merged, pushed or opened as a PR (do not run finalize step 3). Fix the code on the worktree branch following `receiving-code-review` and TDD, update `apply.md` as iteration N+1 (raise `Iteration:`, extend the commit range to the new HEAD, and note the gate outcome and the resume point in its next step), as the apply template directs, run `/opsx-verify` again, and re-enter finalize.
  5. After `approved_with_notes`, the code review gate reopens only if a note changed behaviour or a requirement, or you are unsure; wording-only notes resume finalize after the re-verify, re-entering it at step 3 of the finalize instruction (the checkout of the feature branch), not at step 2b. After `changes_requested` the gate always reopens.
  6. Record the outcome (`approved`, `approved with notes` or `skipped` with a reason, only where the finalize instruction allows a skip), the reviewer tier and the commit range reviewed in `finalize.md`.

**Output**

After each invocation, show:
- Which artifact was created
- The review gate outcome for it
- Schema workflow in use
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Run `/opsx-continue` again, or tell me what to change."

**Artifact Creation Guidelines**

The artifact types depend on the schema. Use the `instruction` field from the instructions output to decide what to create. Do not assume specific artifact names; use the schema's sequence.

**Guardrails**
- Create exactly one artifact per invocation
- Approval does not create the next artifact; the next artifact needs the next `/opsx-continue`
- Always read dependency artifacts before creating a new one, and re-read them from disk rather than from conversation memory
- Never skip artifacts or create them out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before reporting progress
- `context` and `rules` are constraints for YOU, not content for the file; never copy `<context>`, `<rules>`, or `<project_context>` blocks into the artifact
