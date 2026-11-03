---
name: opsx-ff
description: Fast-forward an OpenSpec change. Run the brainstorm artifact interactively, then create all remaining artifacts needed for implementation without stopping. Use when the user wants a complete plan quickly.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-ff-change (MIT) for pi. -->

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
   - Use `template` as the structure and write to `resolvedOutputPath`. If it is a glob pattern, choose the concrete file paths using the schema instruction and workspace planning context.
   - An artifact may span several files (for example the `specs` artifact: one spec per capability, as the schema instruction directs). Create all of them for that artifact.
   - Apply `context` and `rules` as constraints, but do NOT copy them into the file
   - Verify the file(s) exist, then show brief progress: "Created <artifact-id>"

   **Interaction boundary**
   - The `brainstorm` artifact runs interactively: the user answers your questions and approves the design before you move on.
   - After the design is approved, create every remaining artifact in dependency order without stopping to ask for review. Continue until every artifact ID in `applyRequires` has `status: "done"` (re-run `openspec status --change "<name>" --json` after each artifact). The `plan` artifact is the last one required.
   - In this unattended phase, required input is missing only if no reasonable default can be inferred from the brainstorm, earlier artifacts and the repo. Otherwise do not ask: make the decision and record any assumption in the artifact. If it is missing, ask with the `ask_user_question` tool if available (otherwise plain text with numbered options) and wait. Do NOT ask the execution-handoff question that the writing-plans skill normally asks at its end.
   - Create all ready artifacts in dependency order, including `design` when it is ready (it is cheap and completes the graph); `design` is written before the loop stops, and the loop stops only once `plan` is done. Do not repeat in `design` what the `brainstorm` artifact already says, as its instruction directs.
   - If no artifact is ready but `applyRequires` is not satisfied, show the status, STOP, and report why.

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Superpowers artifact rule**

If an artifact `instruction` says to use `superpowers:<x>` (for example `superpowers:brainstorming` for the brainstorm artifact or `superpowers:writing-plans` for the plan artifact), drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill, a next-skill handoff, or an execution handoff). Apart from the interaction the brainstorm artifact requires, that skill's own approval gates, self-review, or commit steps must not cause a stop before the plan is written. If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What is ready: "All artifacts created!"
- Prompt: "Run `/opsx-apply` to start implementing."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain; follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for the output file and fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file. Never copy `<context>`, `<rules>`, or `<project_context>` blocks into an artifact.

**Guardrails**
- Create ALL artifacts needed for implementation (the schema's `apply.requires`)
- Never create the `apply` artifact; stop once every `applyRequires` artifact is done
- Do NOT start apply: never implement tasks or write product code; stop after the artifacts and point to `/opsx-apply`
- Always read dependency artifacts before creating a new one
- Run the `brainstorm` artifact interactively; do not fabricate the user's answers or approval
- Verify each artifact file exists after writing before proceeding to the next
