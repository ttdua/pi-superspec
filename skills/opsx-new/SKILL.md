---
name: opsx-new
description: Start a new OpenSpec change. Creates the scaffolded change and shows the first artifact's instructions, then stops. Use when the user wants to begin a new feature, fix, or modification.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-new-change (MIT) for pi. -->

Start a new change using the artifact-driven workflow.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Ask one open-ended question in plain text and wait:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" -> `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**

   First run `openspec list --json`. If a change with that name already exists, do NOT create it: suggest `/opsx-continue <name>` instead and STOP.
   ```bash
   openspec new change "<name>"
   ```
   Always omit `--schema`; never pass it. The project config selects `superspec`.

3. **Show the artifact status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Use the returned `planningHome`, `changeRoot`, `artifactPaths`, and `nextSteps` instead of assuming repo-local paths.

4. **Get instructions for the first artifact**
   Find the first artifact with status "ready" in the status output.
   ```bash
   openspec instructions <first-ready-artifact> --change "<name>"
   ```
   This outputs the template and context for creating the first artifact.

5. **STOP and wait for user direction**

**Output**

After completing the steps, summarize:
- Change name and location
- Schema/workflow in use and its artifact sequence
- Current status (0/N artifacts complete)
- The template for the first artifact
- Prompt: "Ready to create the first artifact? Run `/opsx-continue` (creates the next artifact), or `/opsx-ff` to fast-forward through all of them."

**Guardrails**
- Do NOT create any artifacts yet - just show the instructions
- Do NOT advance beyond showing the first artifact template
- If the name is invalid (not kebab-case), ask for a valid name: use the `ask_user_question` tool if available, otherwise plain text with numbered options (recommended first), and wait
- If a change with that name already exists, suggest `/opsx-continue` for that change instead
- Never pass `--schema`; omit it so the project config applies
