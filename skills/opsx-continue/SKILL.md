---
name: opsx-continue
description: Continue an OpenSpec change by creating the next ready artifact, then stop for review. Use when the user wants to progress their change or create the next artifact.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-continue-change (MIT) for pi. -->

Continue working on a change by creating the next artifact.

**Input**: Optionally a change name. If omitted, infer it from conversation context only when it is unambiguous. If vague or ambiguous, you MUST prompt for the available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get the available changes, sorted by most recently modified. If several changes exist, ask which one to work on. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Present the top 3-4 most recently modified changes, showing:
   - Change name
   - Schema (from the `schema` field if present)
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified`)

   Mark the most recently modified change as "(Recommended)".

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON. The response includes:
   - `schemaName`: The workflow schema in use
   - `artifacts`: Array of artifacts with status ("done", "ready", "blocked")
   - `isComplete`: Whether all artifacts are complete
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

3. **Act based on status**

   **If all artifacts are complete (`isComplete: true`)**:
   - Show the final status including the schema used
   - Suggest: "All artifacts created! You can now run `/opsx-apply` or archive this change."
   - STOP

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
     - `instruction`: Schema-specific guidance
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - **Create the artifact file**:
     - Read any completed dependency files for context
     - Use `template` as the structure and fill in its sections
     - Apply `context` and `rules` as constraints, but do NOT copy them into the file
     - Write to `resolvedOutputPath`. If it is a glob pattern, choose the concrete file path using the schema instruction and workspace planning context
   - Create exactly one artifact, then show what was created and what is now unlocked
   - STOP after creating that one artifact so the user can review it

   **If no artifacts are ready (all blocked)**:
   - This should not happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```
   Track progress with the `todo` tool if available; otherwise state the checklist in your reply.

**Superpowers artifact rule**

If an artifact `instruction` says to use `superpowers:<x>` (for example `superpowers:brainstorming` for the brainstorm artifact or `superpowers:writing-plans` for the plan artifact), drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill or an execution handoff). If skill `<x>` is not available, STOP and tell the user to install Superpowers.

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow in use
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Run `/opsx-continue` again, or tell me what to change."

**Artifact Creation Guidelines**

The artifact types depend on the schema. Use the `instruction` field from the instructions output to decide what to create. Do not assume specific artifact names; use the schema's sequence.

**Guardrails**
- Create exactly one artifact per invocation
- Always read dependency artifacts before creating a new one
- Never skip artifacts or create them out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before reporting progress
- `context` and `rules` are constraints for YOU, not content for the file; never copy `<context>`, `<rules>`, or `<project_context>` blocks into the artifact
