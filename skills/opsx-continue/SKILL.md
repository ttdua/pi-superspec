---
name: opsx-continue
description: Continue an OpenSpec change by creating the next ready artifact, run a review gate on it, and after approval continue until apply. Use when the user wants to progress their change or create the next artifact.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-continue-change (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->

Continue working on a change by creating the next artifact, gating it, and advancing after approval.

**Input**: Optionally a change name. A change name that is unambiguous from the conversation counts as provided. If none is given or inferable, or it is vague or ambiguous, you MUST prompt for the available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get the available changes, sorted by most recently modified. If exactly one change exists and no name was given, use it and announce it ("Using change `<name>`"). If several changes exist, ask which one to work on. Ask as the routing note's Interaction channel paragraph describes (plain text with numbered options, recommended first, when it names no tool) and wait.

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
   - If `finalize` is ready, create a ready `finalize` as the one artifact and gate it, as below; otherwise suggest: "All artifacts created! You can now run `/opsx-apply` or archive this change." and STOP

   **If `apply` is the next artifact to become ready** (all of the schema's `applyRequires` are done):
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
   - For a partial glob artifact (see the check above), write only the missing files as that call's one artifact, then run the Review gate on the files you wrote; after approval, continue (never overwrite existing files)
   - Create exactly one artifact per gate, then show what was created and what is now unlocked
   - If the artifact is `finalize`, run the code review gate during creation, at its step 2b, before the git-side closeout, using the Review gate section
   - **Internal check before the gate**: read [subagent routing](../references/subagent-routing.md) and follow it. When the artifact just completed is `specs` (all files, or the missing files of a partial artifact), dispatch `superspec.spec-reviewer`; when it is `plan`, dispatch `superspec.plan-reviewer`. Give it the completed artifact and the existing dependency files needed to assess it, including existing specs when only partial specs were added. Resolve substantive findings and re-review substantive revisions before the human gate; preserve existing files unless a finding requires an explicitly reviewed revision. The verdict is advisory, not a human approval, and adds no stop or second artifact, and an internal review verdict does not advance. For the spec review, also pass the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename; name a capability with no main spec as having no baseline. The inline self-check compares the deltas with the same main specs. When the integration is absent, run an inline self-check of the same quality with the same order. A disabled or missing role stops per the shared reference.
   - Run the **Review gate** on the written file(s). On `approved`, or on `approved_with_notes` handled per the gate, go back to step 2 and create the next ready artifact, then gate it. When planning is complete or the next ready artifact is `apply`, STOP and point to `/opsx-apply`. On `changes_requested`, revise and reopen the gate. On `dismissed`, ask the user on the Interaction channel. For `finalize`, the written `finalize.md` is already committed and pushed, so a `changes_requested` on it is handled as a follow-up commit and push on the feature branch
   - Repeat this loop for each next ready artifact until planning is complete or the next ready artifact is `apply`

   **If no artifacts are ready (all blocked)**:
   - This should not happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```
   Track progress with the `todo` tool if available; otherwise state the checklist in your reply.

**Superpowers artifact rule**

If an artifact `instruction` says to use `superpowers:<x>` (for example `superpowers:brainstorming` for the brainstorm artifact or `superpowers:writing-plans` for the plan artifact), drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill or an execution handoff). That skill's own approval gates, self-review, or commit steps must not produce a second artifact or run past the gate for this artifact. The review gate on `brainstorm.md` is the brainstorming skill's design-doc approval; do not ask for it separately. If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Review gate**

A review gate asks the reviewer to decide on written work before the workflow moves on. It ends in exactly one outcome:

| Outcome | Result on the channel |
|---|---|
| `approved` | approved, with no notes |
| `approved_with_notes` | approved, with notes or comments |
| `changes_requested` | changes requested, with notes |
| `dismissed` | closed without a decision, or no answer |

Only `approved` and `approved_with_notes` let the workflow continue. The `dismissed` outcome is not an approval, so ask the user on the Interaction channel how to proceed and do not continue until they answer.

- **Open the gate** on the channel named in the routing note's Interaction channel paragraph and follow its mechanics; when it fails to open, tell the user and use the fallback it names.
- **Handle notes** for `approved_with_notes` and `changes_requested`: apply every note to the reviewed files. After `approved_with_notes`, if every note is only wording, formatting or clarification, and none changes a requirement, scope, decision, scenario or the meaning of another artifact, continue and show a short diff of what changed. Otherwise open the gate again on the changed files. When unsure, reopen. After `changes_requested`, always open the gate again.
- **Cascade a revision**: find the dependents of each revised artifact from the dependency data (`requires` and `dependencies`) in `openspec status --change "<name>" --json`, not from file times. Edit the dependents so they stay consistent (do not regenerate them from scratch) and open the next gate on only the files that changed. If `brainstorm.md` is revised after the generation of the later artifacts, say so and open the next gate on every artifact that depends on it: `brainstorm.md` plus all five later artifacts (proposal, design, specs, tasks, plan), or those of them that exist.
- **Code review gate**: while creating the `finalize` artifact, the schema asks for a code review gate after the in-worktree test run and before the feature branch is touched. It uses the same outcomes, with these differences:
  1. Open it with the Interaction channel paragraph's code review mechanics, reviewing every commit on the worktree branch since the feature branch recorded in `apply.md`; `dismissed` is not approved.
  2. On `approved`, continue finalize. On `approved_with_notes` or `changes_requested`, stop before the feature branch is checked out, merged, pushed or opened as a PR (do not run finalize step 3). Fix the code on the worktree branch following `receiving-code-review` and TDD, update `apply.md` as iteration N+1 (raise `Iteration:`, extend the commit range to the new HEAD, and note the gate outcome and the resume point in its next step), as the apply template directs, run `/opsx-verify` again, and re-enter finalize.
  3. After `approved_with_notes`, the code review gate reopens only if a note changed behaviour or a requirement, or you are unsure; wording-only notes resume finalize after the re-verify, re-entering it at step 3 of the finalize instruction (the checkout of the feature branch), not at step 2b. After `changes_requested` the gate always reopens.
  4. Record the outcome (`approved`, `approved with notes` or `skipped` with a reason, only where the finalize instruction allows a skip), the channel used as the reviewer tier and the commit range reviewed in `finalize.md`.

**Output**

After each invocation, show:
- Which artifact was created
- The review gate outcome for it
- Schema workflow in use
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: when stopped before `apply`, "Planning is complete. Run `/opsx-apply`, or tell me what to change."; when stopped at a gate, "Run `/opsx-continue` again, or tell me what to change."

**Artifact Creation Guidelines**

The artifact types depend on the schema. Use the `instruction` field from the instructions output to decide what to create. Do not assume specific artifact names; use the schema's sequence.

**Guardrails**
- Create exactly one artifact per gate
- Only a human gate approval advances; `changes_requested` and `dismissed` do not advance, and neither does an internal review verdict
- STOP when planning is complete or the next ready artifact is `apply`. Do NOT create an `apply` artifact; point to `/opsx-apply`
- Always read dependency artifacts before creating a new one, and re-read them from disk rather than from conversation memory
- Never skip artifacts or create them out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before reporting progress
- `context` and `rules` are constraints for YOU, not content for the file; never copy `<context>`, `<rules>`, or `<project_context>` blocks into the artifact
