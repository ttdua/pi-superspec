---
name: opsx-sync
description: Merge a change's delta specs into the living specs under openspec/specs without archiving the change. Use when the main specs should be updated before archive, or to preview what archive would sync.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-sync-specs (MIT) for pi. -->

Sync delta specs from a change into the living specs.

OpenSpec has no sync CLI, so this is an **agent-driven** operation: you read the delta specs and edit the main specs yourself, following the merge rules below. This skill is self-contained.

**Input**: Optionally a change name. If omitted, infer it from conversation context.

**Steps**

1. **Select the change**

   - Use the given name, or infer it from conversation context.
   - Auto-select if exactly one active change exists.
   - Otherwise run `openspec list --json` and ask the user to pick, showing changes that have delta specs under `specs/`. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-sync <other>`).

2. **Resolve context and working directory**

   ```bash
   openspec status --change "<name>" --json
   ```

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace spec sync is not supported here and STOP. Do not edit linked repos.

   If a worktree exists for the change (`git worktree list --porcelain`, entry with `branch refs/heads/<change-name>`), work there and treat its copy of the change directory as authoritative. Otherwise work in the current checkout.

3. **Find the delta specs**

   Use `artifactPaths.specs.existingOutputPaths` from the status JSON, or list `specs/<capability>/spec.md` under the change directory. If there are no delta specs, tell the user and STOP.

   A delta spec contains these sections:
   - `## RENAMED Requirements` with `FROM:` / `TO:` lines
   - `## REMOVED Requirements`
   - `## MODIFIED Requirements`
   - `## ADDED Requirements`

4. **Merge each delta into its main spec**

   For each `specs/<capability>/spec.md` in the change, read the delta and read `openspec/specs/<capability>/spec.md` (it may not exist yet). Apply the sections in this order: RENAMED, REMOVED, MODIFIED, then ADDED.

   - **RENAMED**: find the `FROM` requirement header in the main spec and replace it with the `TO` header. Keep the body.
   - **REMOVED**: delete the whole requirement block (header, text, scenarios) from the main spec.
   - **MODIFIED**: find the requirement in the main spec and replace the whole block with the delta's block. The delta carries the full replacement text, including all scenarios to keep; do not merge partially.
   - **ADDED**: append the requirement block to the `## Requirements` section. If a requirement with that header already exists, treat it as MODIFIED.

   Header matching is exact: compare the `### Requirement: <name>` header after trimming whitespace, case-sensitive. If a RENAMED `FROM`, REMOVED, or MODIFIED header has no match in the main spec (and the entry is not already applied as described below), do not guess: report it and ask the user how to proceed (use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait).

   **New capability** (no main spec yet): create `openspec/specs/<capability>/spec.md` by copying the delta as the main spec: a `# <capability>` title, a `## Purpose` section with a one-line Purpose (mark it TBD if unknown), and a `## Requirements` header followed by the ADDED requirements.

   Preserve everything in the main spec that the delta does not mention. The operation must be idempotent: running it twice gives the same result. Entries already applied need no ask: a REMOVED header already absent from the main spec, and a RENAMED entry whose `TO` header exists while `FROM` is absent, count as already applied (skip them silently).

5. **Validate**

   ```bash
   openspec validate --specs
   ```

   Or, for one capability, `openspec validate <capability> --type spec`. Report the result. If validation fails, show the errors and fix the merge, or ask the user when the cause is in the delta itself.

6. **Report**

   Do NOT archive the change. It stays active; the main specs are updated only.

**Output**

```
## Specs Synced: <change-name>

**<capability-1>**:
- Renamed: "Old" -> "New"
- Removed: "Deprecated"
- Modified: "Existing"
- Added: "New Feature"

**<capability-2>**:
- Created new spec file
- Added: "Another Feature"

Validation: <result of openspec validate>
The change remains active. Run `/opsx-archive` when ready.
```

**Guardrails**
- Read both the delta and the main spec before editing
- Apply operations in the order RENAMED, REMOVED, MODIFIED, ADDED
- Header match is exact; never guess a match
- MODIFIED replaces the full requirement block; the delta must carry the full text
- Preserve main spec content the delta does not mention
- Do NOT archive the change and do not move or delete the change directory; point to `/opsx-archive`
- Do not edit anything outside `openspec/specs/`
