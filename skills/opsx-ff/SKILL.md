---
name: opsx-ff
description: Fast-forward an OpenSpec change. Run the brainstorm artifact interactively and gate it, then create all remaining artifacts needed for implementation unattended, then gate the final packet. Use when the user wants a complete plan quickly.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-ff-change (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->

Fast-forward through artifact creation: brainstorm the design with the user, then generate everything needed to start implementation in one go.

**Input**: A change name (kebab-case) OR a description of what the user wants to build.

**Steps**

1. **If no clear input is provided, ask what they want to build**

   Ask one open-ended question in plain text and wait: "What change do you want to work on? Describe what you want to build or fix."

   From the description, derive a kebab-case name (e.g., "add user authentication" -> `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change if it does not exist**

   Run `openspec list --json` to check. If no change with that name exists:
   ```bash
   openspec new change "<name>"
   ```
   Omit `--schema`; use the project's default schema.

   If a change with that name already exists, tell the user and ask them to confirm continuing it. If confirmed, skip artifacts already `done`. Never overwrite existing artifacts.

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["plan"]`)
   - `artifacts`: list of all artifacts with their status and dependencies
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

4. **Create artifacts in sequence until apply-ready**

   Track progress through the artifacts with the `todo` tool if available; otherwise state the checklist in your reply.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first). For each artifact with `status: "ready"`:
   - Get instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - The instructions JSON includes:
     - `context`: Project background (constraints for you; do NOT include in output)
     - `rules`: Artifact-specific rules (constraints for you; do NOT include in output)
     - `template`: The structure to use for the output file
     - `instruction`: Schema-specific guidance for this artifact type
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - If `instruction` names `superpowers:<x>`, follow the **Superpowers artifact rule** below.
   - Read any completed dependency files for context
   - Inspect the relevant repository code, tests and docs before drafting (read-only, proportional to the change; reuse findings for later artifacts). Ground the artifacts in what you find: tasks reference real files or tests you found, never a generic "explore the codebase" step.
   - Use `template` as the structure and write to `resolvedOutputPath`. If it is a glob pattern, choose the concrete file paths using the schema instruction and workspace planning context.
   - An artifact may span several files (for example the `specs` artifact: one spec per capability, as the schema instruction directs). Create all of them for that artifact.
   - Apply `context` and `rules` as constraints, but do NOT copy them into the file
   - **Internal check**: read [subagent routing](../references/subagent-routing.md) and follow it. After `specs` is complete, run `superspec.spec-reviewer`; after `plan` is complete, run `superspec.plan-reviewer`, each with the artifact plus the dependency files it needs. Resolve substantive findings and re-review substantive revisions inside the unattended loop, before the final gate; these internal reviews add no extra human stop or approval and are advisory. When the integration is absent, do an inline self-check instead. Optional brainstorm recon with `superspec.scout`: recon never moves the user conversation into a child; the parent keeps the interactive brainstorm.
   - Verify the file(s) exist, then show brief progress: "Created <artifact-id>"

   **Interaction boundary**
   - The `brainstorm` artifact runs interactively: the user answers your questions, and the review gate on `brainstorm.md` is their approval of the design before you move on.
   - Review gate on `brainstorm.md`: right after `brainstorm.md` is written, run the **Review gate** on that one file. It is approved as a file at its own gate before the unattended phase. Do not generate later artifacts until the gate outcome is `approved` (or `approved_with_notes` handled per the gate).
   - After that gate is approved, create every remaining artifact in dependency order without stopping to ask for review. Continue until every artifact ID in `applyRequires` has `status: "done"` (re-run `openspec status --change "<name>" --json` after each artifact). The `plan` artifact is the last one required.
   - In this unattended phase, required input is missing only if no reasonable default can be inferred from the brainstorm, earlier artifacts and the repo. Otherwise do not ask: make the decision and record any assumption in the artifact. If it is missing, ask as the routing note's Interaction channel paragraph describes (plain text with numbered options, recommended first, when it names no tool) and wait. Do NOT ask the execution-handoff question that the writing-plans skill normally asks at its end.
   - Create all ready artifacts in dependency order. Always create `design`, even if its `instruction` calls it optional, and the final gate packet still lists it; `design` is written before the loop stops, and the loop stops only once `plan` is done. Otherwise skip no other artifact unless `status` already reports it `skipped` (then its files must not exist; never create it). Do not repeat in `design` what the `brainstorm` artifact already says, as its instruction directs.
   - If no artifact is ready but `applyRequires` is not satisfied, show the status, STOP, and report why.
   - The brainstorm gate and the final gate are the only planned stops; the unattended phase asks only when required input is missing.
   - Final gate: once `plan` is done, run the **Review gate** once on the final packet. The packet is exactly `proposal.md`, `design.md`, every `specs/<capability>/spec.md` (each by path), `tasks.md` and `plan.md`, passed as an explicit ordered list, never a folder. It does not repeat `brainstorm.md`, which was approved at its own gate. On `changes_requested`, revise, cascade per the gate and reopen it. If `brainstorm.md` is revised after the unattended phase, the next gate opens on `brainstorm.md` plus all five artifacts (proposal, design, specs, tasks, plan).

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Superpowers artifact rule**

If an artifact `instruction` says to use `superpowers:<x>` (for example `superpowers:brainstorming` for the brainstorm artifact or `superpowers:writing-plans` for the plan artifact), drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill, a next-skill handoff, or an execution handoff). Apart from the interaction the brainstorm artifact requires, that skill's own approval gates, self-review, or commit steps must not cause a stop. The only permitted stops are the review gate on `brainstorm.md` and the final review gate. The review gate on `brainstorm.md` is the brainstorming skill's design-doc approval; do not ask for it separately. If skill `<x>` is not available, STOP and tell the user to install Superpowers.

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

After completing all artifacts and running the final gate, summarize:
- Change name and location
- List of artifacts created with brief descriptions, and list each other `skipped` artifact with its reason in the final summary
- What is ready: "All artifacts created!"
- The final review gate outcome
- Give the pointer only after the final gate is approved; do not point to `/opsx-apply` before then. Prompt: "Run `/opsx-apply` to start implementing."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain; follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for the output file and fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file. Never copy `<context>`, `<rules>`, or `<project_context>` blocks into an artifact.

**Guardrails**
- Create ALL artifacts needed for implementation (the schema's `apply.requires`)
- Never create the `apply` artifact; stop once every `applyRequires` artifact is done
- Do NOT start apply: never implement tasks or write product code; stop after the final gate and point to `/opsx-apply`
- Always read dependency artifacts before creating a new one
- Run the `brainstorm` artifact interactively; do not fabricate the user's answers or approval
- Verify each artifact file exists after writing before proceeding to the next
