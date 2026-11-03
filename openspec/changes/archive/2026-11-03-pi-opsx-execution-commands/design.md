## Context

Pi has no `Skill`, `Task`, `AskUserQuestion` or `TodoWrite` tool. Skills are loaded by reading `SKILL.md`; prompt arguments arrive as `$@`. The optional `pi-subagents` package provides a `subagent` tool (`docs/architecture.md`, pi tool mapping). The bundled schema already holds the whole execution workflow: the top-level `apply:` block (steps 0–3), the `verify` artifact instruction (six checks) and the `finalize` instruction. The OpenSpec 1.4.1 generated skills (`openspec-apply-change`, `-verify-change`, `-sync-specs`, `-archive-change`) are the source being adapted. The planning-commands change set the file layout and prompt shape; this change reuses both.

## Goals / Non-Goals

**Goals:**
- Four skill/prompt pairs with pi tools and plain fallbacks, no Claude tool names.
- Keep the schema the single source of truth for apply and verify steps.
- Executor choice by tool presence, not by user configuration.

**Non-Goals:**
- Schema changes, auto-upgrade, routing note, README, `opsx-propose`, `opsx-bulk-archive`.
- A finalize command or a separate post-PR command.

## Decisions

### Files

```text
skills/opsx-{apply,verify,sync,archive}/SKILL.md
prompts/opsx-{apply,verify,sync,archive}.md
```

Frontmatter `name` equals the directory name; prompts carry a `description`, name their skill, pass `$@` and stay under 15 lines (same shape and test as planning commands). Each SKILL.md credits the OpenSpec 1.4.1 skill it adapts.

### Thin wrappers for apply and verify

`opsx-apply` selects the change (ask if several), runs `openspec status --json` and `openspec instructions apply --change <name> --json`, and follows the returned apply instruction. It adds only: blocked / all_done handling from the CLI state, the executor rule, and the pi tool mapping. `opsx-verify` runs `openspec instructions verify --change <name> --json` and follows it, adding the worktree working-directory rule and the `superpowers:<x>` rule. Reason over copying the steps: the text lives once, in the schema, so schema upgrades cannot drift from the skills.

### Executor selection

`opsx-apply` checks whether the `subagent` tool exists in the session. If so, it follows the schema's 2a (`subagent-driven-development`); the Superpowers pi mapping then dispatches through `subagent`. If not, it follows 2b (`executing-plans`), states that TDD and review are not transitively enforced, and requests a whole-branch review over the full commit range before writing `apply.md`. It never fabricates `Task` calls. `apply.md` records the actual executor.

### Superpowers skills

Same rule as planning commands, duplicated because skills load independently: `superpowers:<x>` means drop the prefix, read `<x>`'s `SKILL.md`, follow it, write only where the instruction says, ignore its own closing handoff (notably `finishing-a-development-branch`); if absent, STOP and tell the user to install Superpowers.

### Post-PR mode in `opsx-apply`

If `apply.md` exists and `finalize.md` records an open PR, `opsx-apply` offers the post-PR path: load `receiving-code-review`, fix on the feature branch in the main checkout with TDD, append a "post-PR iteration N+1" entry (new commit range) to `apply.md`, re-run `/opsx-verify`, update `finalize.md`, then push and upsert the reviewer comment under the finalize policy (a project `AGENTS.md` policy overrides).

### Sync and archive (self-contained)

OpenSpec has no sync command; the agent merges delta requirements into `openspec/specs/<capability>/spec.md` (ADDED, MODIFIED, REMOVED, RENAMED, in the archive apply order) and reports what changed. `opsx-sync` does that and stops. `opsx-archive`: select change, check artifact and task completion (warn, do not block), compare each delta spec with the main spec to decide whether sync is needed (the delta-sync check), offer sync if needed, then `openspec archive`. Archive runs in the main checkout after finalize and, per the workflow, before the PR merges. Both skills ask with `ask_user_question` or numbered plain-text options.

### Tool mapping

`ask_user_question` (package `rpiv-ask-user-question`), `todo` (package `rpiv-todo`), reading `SKILL.md`, each with a plain-text fallback, as in planning commands.

### Verification

Extend the vitest content test: eight new files exist with matching names; prompts delegate and pass `$@`; no `AskUserQuestion`, `TodoWrite`, `Task tool` anywhere; apply mentions `subagent`, `subagent-driven-development`, `executing-plans` and whole-branch review; verify mentions the worktree; archive mentions the delta-sync check; no `opsx-propose` or `opsx-bulk-archive` files. The manual in-pi end-to-end runs (with and without `pi-subagents`) are recorded as non-blocking manual items.

## Risks / Trade-offs

- [Skill relies on the agent reading CLI output] → quote the exact commands and states (`blocked`, `all_done`) in the skill; stop on unexpected state.
- [Tool-presence detection is a prompt instruction, not enforced] → state the fallback explicitly and require recording the executor in `apply.md`.
- [Weak model skips the Superpowers rule] → plain "STOP if skill not found".
- [Hand-merging delta specs is error-prone] → require a diff summary and `openspec validate` afterwards.
- [Manual e2e is not automated] → recorded as manual checklist items; the content test covers the static guarantees.
