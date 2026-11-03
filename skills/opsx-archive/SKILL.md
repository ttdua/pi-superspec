---
name: opsx-archive
description: Archive a completed change after checking completion and whether its delta specs are already synced into the living specs. Use when implementation is finalized and the change should be archived.
---

<!-- Adapted from OpenSpec 1.4.1 openspec-archive-change (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->

Archive a completed change. Before archiving, run the delta-sync check and offer to sync when the living specs are behind.

This skill runs in the main checkout, after the branch is finalized and before the PR merges. It is self-contained.

**Input**: Optionally a change name. If omitted, infer it from conversation context only when it is unambiguous.

**Steps**

1. **Select the change**

   - Use the given name, or infer it from conversation context.
   - If several active changes exist, never guess: run `openspec list --json` and ask the user to pick, showing only active (not archived) changes and their schema. Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options (recommended first) and wait.

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-archive <other>`).

2. **Check artifact completion**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse `schemaName`, `planningHome`, `changeRoot`, `artifactPaths`, `actionContext` and the `artifacts` list.

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace archive is not supported here and STOP. Do not move workspace changes or edit linked repos.

   An artifact with status `skipped` counts as complete. If any other artifact is not `done`, warn with the list of incomplete artifacts and ask the user to confirm before continuing (ask as in step 1). Continue only on confirmation; otherwise STOP without archiving.

3. **Check task completion**

   Run `openspec list --json` and find this change's entry (if it is not listed, stop and report); take `completedTasks` and `totalTasks` from `openspec list --json`; if that output is invalid, stop with an error and do not archive. If `completedTasks` is less than `totalTasks`, warn with the number of open tasks and ask the user to confirm before continuing. Continue only on confirmation; otherwise STOP without archiving. If `totalTasks` is 0 (no tasks), skip this check.

   Warnings never block silently: inform, ask, and respect the answer.

4. **Delta-sync check**

   Use `artifactPaths.specs.existingOutputPaths`, or list `specs/<capability>/spec.md` under the change directory. If there are no delta specs, skip to step 5.

   For each delta, compare it with `openspec/specs/<capability>/spec.md` (a missing main spec is handled below). A delta is **synced** when:
   - every ADDED and MODIFIED requirement exists in the main spec with the same `### Requirement:` header and the same text, compared after normalizing whitespace (ignore trailing whitespace and blank-line differences);
   - every REMOVED header is absent from the main spec;
   - every RENAMED `TO` header exists in the main spec.

   A missing main spec is not unsynced by itself; decide by the delta operations as `opsx-sync` defines. If the delta has only ADDED requirements, the capability is not synced yet (sync creates the spec). If it has MODIFIED or RENAMED operations, or only REMOVED ones, sync would block that capability.

   Treat entries that are already applied as synced, so the check is idempotent: after a sync, a second check reports "already synced" and never asks again.

   Classify the result, checking in this order:

   - **All synced**: report "already synced" and go straight to step 5 without syncing.
   - **Sync blocked** (checked before "Not synced"): if the sync is blocked for any capability, either predicted from the delta operations above or reported "Blocked: <reason>" by `opsx-sync`, report the blocked capabilities and offer only "Archive without syncing" or "Cancel" (ask as in step 1); never offer "Sync now" for a blocked capability. If the answer is none of the offered choices, ask again and do not archive. On "Archive without syncing", continue and note the blocked capabilities in the summary. On "Cancel", STOP. Other capabilities that are not synced are not synced either on this path.
   - **Not synced** (no capability blocked): report the differences per capability (what would be added, modified, removed, renamed), then ask the user how to proceed with options "Sync now (recommended)", "Archive without syncing", "Cancel" (ask as in step 1, recommended first). If the answer is none of the offered choices, ask again and do not archive. On "Archive without syncing", continue and note it in the summary. On "Cancel", STOP. On "Sync now", read `skills/opsx-sync/SKILL.md` (or run `/skill:opsx-sync`) and follow its merge and validate steps for this change, but do not stop at its report: return here and continue with the post-sync steps below.

   **After "Sync now"**, in order:
   1. If the sync report lists any capability as "Blocked: <reason>" (a fallback when the block was not predicted), take the "Sync blocked" path above for those capabilities: offer only "Archive without syncing" or "Cancel".
   2. Compare every delta again with its main spec. Report "Synced" only if all match; if any differs, stop and do not archive. Capabilities reported Blocked are excluded from this re-compare, because the user already chose to archive without syncing them.

   This check lives here, not in `/opsx-verify`.

5. **Archive**

   Check the installed CLI first:

   ```bash
   openspec archive --help
   ```

   Then archive:

   By default the CLI also updates main specs. This skill owns the spec update (through the `opsx-sync` logic in step 4); the CLI is only used to move the change to the archive. So always pass `--skip-specs`, in every case: after "Sync now", when all deltas are already synced, when there are no delta specs, and after "Archive without syncing" (so the CLI does not sync behind the user's back):

   ```bash
   openspec archive "<name>" --skip-specs -y
   ```

   Always pass `-y` (`--yes`): the user already confirmed in the earlier steps, and the shell is non-interactive so the CLI prompt would hang. If the archive target already exists or the CLI fails, report the error and STOP; do not move directories by hand.

6. **Summarise**

   Report the change name, the schema, the archive location (under `planningHome.changesDir`, normally `archive/YYYY-MM-DD-<name>/`), whether specs were synced, and any warnings the user accepted.

**Output**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** <archive path>
**Specs:** Synced to main specs (or "Already synced", "No delta specs", "Sync skipped", "Sync blocked: <capabilities>, archived without syncing", or for a partial sync "Partially synced: <synced capabilities>; blocked: <capabilities>")

Warnings accepted: <incomplete artifacts / open tasks, or "none">
```

**Guardrails**
- Never guess the change when several exist; ask
- Warn on incomplete artifacts and open tasks, ask to confirm, archive only on confirmation
- Report "Synced" only after the post-sync re-compare matches every delta; if any differs, stop without archiving
- Take task counts from `openspec list --json`; stop with an error if it is invalid
- Run the delta-sync check whenever delta specs exist; a second check after a sync must report "already synced"
- Offer "Sync now" first, except when a capability is blocked (then only "Archive without syncing" or "Cancel"); when everything is synced, archive without syncing
- Archive with `openspec archive "<name>" --skip-specs`; the skill owns the spec update, the CLI only moves the change; never pass `--no-validate`; never move the change directory by hand
- Run in the main checkout, after finalize and before the PR merges
