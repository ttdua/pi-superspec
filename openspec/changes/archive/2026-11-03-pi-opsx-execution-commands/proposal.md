## Why

After `pi-opsx-planning-commands` a project can run explore, new, continue and ff up to `plan.md`, but apply, verify, sync and archive have no pi command. The OpenSpec-generated skills for those steps name Claude-only tools (`Task`, `AskUserQuestion`, `TodoWrite`) that pi lacks. Users need to take one change from plan to archive inside pi (docs/workflow.md, Conflicts #7 and #8).

## What Changes

- Add four commands, each a thin prompt in `prompts/` that reads a skill in `skills/` and passes `$@`: `opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive`. Skills are adapted from the OpenSpec 1.4.1 generated skills, with credit.
- `opsx-apply` and `opsx-verify` wrap the schema's `apply:` block and `verify` artifact instruction (read through `openspec instructions`) and add only the pi layer. Apply uses the `pi-subagents` `subagent` tool via `subagent-driven-development` when present, else `executing-plans` plus a whole-branch review. Verify runs with the worktree as working directory.
- `opsx-apply` also carries the post-PR feedback loop: `receiving-code-review` on the feature branch, then an iteration N+1 entry in `apply.md`, re-run verify, update `finalize.md`.
- `opsx-archive` performs the delta-sync check (moved out of verify) and syncs if needed; `opsx-sync` syncs delta specs without archiving.
- `opsx-propose` and `opsx-bulk-archive` are not shipped.
- Extend the content test to cover the new skills and prompts.

**Planning commands visibility**
- From: activation proves four planning commands are discoverable.
- To: activation also proves the four execution commands are discoverable.
- Reason: the command set grows.
- Impact: non-breaking; the requirement text and its test change.

## Capabilities

### New Capabilities
- `execution-commands`: the `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive` command and skill pairs, executor selection with and without `pi-subagents`, worktree-based verify, the post-PR loop, the archive delta-sync check, and the absence of Claude tool names.

### Modified Capabilities
- `package-activation`: requirement "Planning commands are visible only when activated" widens to the full command set (planning plus execution), still visible only in an activated project.

## Impact

- New: `skills/opsx-{apply,verify,sync,archive}/SKILL.md`, `prompts/opsx-{apply,verify,sync,archive}.md`, a content test under `tests/`.
- Changed: delta spec for `package-activation`; possibly `tests/planning-commands.test.ts` command list.
- No change to the bundled schema, `package.json` or extension code. No new dependencies; `pi-subagents`, `rpiv-*` stay optional.
- Out of scope: auto-upgrade, the routing note, README, `opsx-propose`, `opsx-bulk-archive`.
- Manual in-pi end-to-end runs (with and without `pi-subagents`) are recorded as manual, non-blocking checklist items.
