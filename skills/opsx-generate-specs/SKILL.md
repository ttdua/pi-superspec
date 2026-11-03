---
name: opsx-generate-specs
description: Draft a first set of OpenSpec specs for an existing codebase. Map the code into capabilities, confirm them with the user, scout each one into a delta spec inside the bootstrap-specs change, then hand off to /opsx-ff bootstrap-specs.
---

Generate draft specs for an existing codebase. The result is a change named `bootstrap-specs` that the user reviews and finishes with `/opsx-ff bootstrap-specs`. Nothing is written into `openspec/specs/` directly.

**Input**: Optional notes from the user (for example directories to focus on or skip).

**Asking the user**: use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

**Steps**

1. **Check the precondition**

   Run in an activated project only (the `superspec` schema is installed under `openspec/schemas/`). If it is not, tell the user to run `/opsx-init` and stop.

   List the files outside ignored directories (`openspec/`, `.git`, `node_modules`, `dist`, `build`, `vendor`, generated files). If there is no source code, say "There is no code to scan" and stop. Create no change.

2. **MAP the codebase**

   Run one agent for the map. If the `subagent` tool from `pi-subagents` exists and lets a model be chosen, use a fast model; otherwise use the default model, or do the map yourself when the tool is absent. Never invent subagent calls.

   The map reads the directory tree, package manifests, README and entry points. It skips `node_modules`, `dist`, `build`, `vendor`, `.git` and generated files. It returns at most 12 capability candidates, each with:
   - a kebab-case name of at least two words (for example `user-auth`)
   - a one-line purpose
   - the directories it covers

   No candidate covers an ignored directory. If there are more than 12 areas, keep the 12 most important and say how many were left out.

3. **Drop existing specs**

   List `openspec/specs/`. Drop every candidate whose name matches an existing directory there and tell the user which ones. Never modify or replace any file under `openspec/specs/`.

4. **CONFIRM once**

   Before any scout runs, show every remaining candidate with its purpose and a work estimate (candidate count and directories covered). Ask once whether to keep, drop or rename candidates. Run no scout before the user confirms.

   If the user cancels, stop. Create no change and run no scout. Scout only the capabilities left after the user's edits, and apply step 3 again to the edited list: drop any name that now matches a directory under `openspec/specs/` or a spec file already present in an existing `bootstrap-specs` change.

5. **Create the bootstrap change**

   Run `openspec list --json` first. If no change named `bootstrap-specs` exists, run:
   ```bash
   openspec new change "bootstrap-specs"
   ```
   Omit `--schema`. If it already exists, ask whether to continue it. If confirmed, read `openspec status --change "bootstrap-specs" --json`, skip every artifact that is `done`, and never overwrite it. The `specs` artifact is the exception: it becomes `done` once any one spec file exists, so resume per capability file. Scout only confirmed capabilities whose `specs/<capability>/spec.md` is missing, and never rewrite one that exists.

6. **Scout contract**

   Each scout writes `openspec/changes/bootstrap-specs/specs/<capability>/spec.md` containing only a `## ADDED Requirements` section. Use this block for every requirement, in this order:

   ```markdown
   ### Requirement: <name>
   The system SHALL <observable behaviour>.
   Evidence: <path[:line]>, <test or doc path>
   Confidence: inferred

   #### Scenario: <name>
   - **WHEN** <condition>
   - **THEN** <result>
   ```

   Rules:
   - The `SHALL` or `MUST` sentence is the first line of the requirement body. OpenSpec checks only that line, so `Evidence:` and `Confidence:` come after it. The `### Requirement:` header is required, or nothing is parsed.
   - Every requirement has at least one `#### Scenario:` with `WHEN` and `THEN` lines.
   - Every requirement has an `Evidence:` line naming the files (with line numbers where known), tests or documents it is drawn from.
   - Add the `Confidence: inferred` line only when code alone backs the requirement, with no test or document that states the behaviour; otherwise omit it.
   - Describe observable behaviour, not module or function structure.
   - Read tests and documentation as well as source.

7. **Language**

   Read `language:` from `openspec/config.yaml`. Write all generated prose in that language. Keep these tokens in English: `SHALL`, `MUST`, `WHEN`, `THEN`, `Evidence:`, `Confidence: inferred`, and the `### Requirement:` and `#### Scenario:` headers.

8. **SCOUT each capability**

   Run one scout per confirmed capability. Give every scout, in its brief: the capability name and directories, the full scout contract from step 6 (copy its text), the output path `openspec/changes/bootstrap-specs/specs/<capability>/spec.md`, and the document language from step 7. A subagent has no other context.
   - If the `subagent` tool from `pi-subagents` exists, dispatch the scouts as subagents, in parallel where the tool allows, on a fast model when the tool lets a model be chosen. Scouts write their own files.
   - Otherwise scout the capabilities one after another in this session, applying the same contract, path and language, and write each spec file before starting the next. This is slower and fills context; say so once. Never invent subagent calls.

   After the scouts finish, check that every expected file exists. Redo any that is missing.

9. **Write the other artifacts**

   For each of these, first run `openspec instructions <artifact> --change bootstrap-specs --json` and follow its `template`. Write into `openspec/changes/bootstrap-specs/`:
   - `brainstorm.md`: the map result and the confirmed capability list.
   - `proposal.md`: why the specs are generated, scope, excluded directories, and under `## Capabilities` a `### New Capabilities` list naming every capability.
   - `design.md`: a two-line stub whose first line begins `No design needed:`. No scout is involved.

   Both `brainstorm.md` and `proposal.md` state: "No product code changes; tasks verify each spec against the code and its evidence". Skip any of these three that is already `done`.

10. **Validate**

    ```bash
    openspec validate bootstrap-specs --strict
    ```

    If it fails, fix the files and run it again until it passes.

11. **Stop and hand off**

    Do not write tasks.md, plan.md or any later artifact. Do not start implementation. Tell the user:

    "Specs drafted for <n> capabilities. Review them, then run `/opsx-ff bootstrap-specs`."

**Guardrails**
- Never touch files under `openspec/specs/`
- Never run a scout before the user confirms
- Never overwrite an artifact that is `done`
- Never invent subagent calls when the `subagent` tool is absent
- Do not claim a requirement is certain when only code supports it; label it `Confidence: inferred`
