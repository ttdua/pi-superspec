## Design Summary

Implements `docs/workflow.md` — Commands (`opsx-apply`, `opsx-verify`, `opsx-sync`,
`opsx-archive`), Step rules for apply / verify / finalize / archive, the post-PR
feedback loop, Conflicts resolved #7 and #8 — and `docs/architecture.md` — pi tool
mapping (subagents). Depends on `pi-opsx-planning-commands` (merged).

**Why.** After `pi-opsx-planning-commands` a project can run explore → new →
continue/ff up to `plan.md`, but the second half of the workflow (apply, verify,
sync, archive) has no pi command. The OpenSpec-generated skills for those steps name
Claude-only tools (`AskUserQuestion`, `Task`, `TodoWrite`), which pi does not have.
Users need to take one change from plan to archive entirely inside pi.

**What.** Four pi-adapted commands, each a pair like the planning commands:

- `skills/opsx-<x>/SKILL.md` — the logic, adapted from the OpenSpec 1.4.1 skills.
- `prompts/opsx-<x>.md` — a thin command that reads that `SKILL.md` and follows it,
  with user input as `$@`.

for `<x>` in `apply`, `verify`, `sync`, `archive`.

Finalize is not a command: it is the last artifact and keeps running through
`/opsx-continue`. The post-PR feedback loop is a mode of `opsx-apply`.

**Goals**
- `opsx-apply` executes the schema's `apply:` block; it picks
  `subagent-driven-development` when the `pi-subagents` `subagent` tool is present
  and `executing-plans` (with a whole-branch review) otherwise (Conflict #8).
- `opsx-verify` runs inside the worktree and produces `verify.md` per the schema's
  six checks.
- `opsx-archive` performs the delta-sync check (moved here from verify, Conflict #5)
  and syncs if needed; `opsx-sync` syncs without archiving.
- No Claude tool name remains in `skills/` or `prompts/` (Conflict #7).

**Non-goals**
- Auto-upgrade, the routing note, README (later changes).
- Changing the bundled schema, or forking Superpowers skills.
- A finalize command or a separate post-PR command.

**Anti-goals**
- Skills that duplicate the schema's apply/verify text and drift from it.
- A command that silently depends on `pi-subagents` and misbehaves without it.

## Alternatives Considered

### Alternative A: Thin wrappers over the schema, post-PR mode in apply (chosen)
- **Approach**: `opsx-apply` / `opsx-verify` read `openspec instructions apply|verify`
  and follow that text, adding only the pi layer (subagent detection, tool mapping,
  the `superpowers:<x>` rule). `opsx-sync` / `opsx-archive` are self-contained because
  the OpenSpec CLI has no sync command. Post-PR feedback is a mode of `opsx-apply`.
- **Pros**: schema stays the single source of truth; skills stay small.
- **Cons**: relies on the agent reading CLI output correctly.
- **Why not chosen**: n/a (chosen).

### Alternative B: Self-contained skills
- **Approach**: copy the apply steps and verify checks into the skills.
- **Pros**: no dependence on CLI output.
- **Cons**: text lives in two places and drifts on schema upgrades.
- **Why not chosen**: duplication; contradicts the schema-as-authority principle.

### Alternative C: A separate post-PR command
- **Approach**: ship `opsx-feedback` for the post-PR loop.
- **Pros**: single-purpose command.
- **Cons**: a fifth command outside the agreed scope; the loop writes `apply.md`, which
  already belongs to apply.
- **Why not chosen**: scope creep.

## Agreed Approach

Alternative A. Prompts stay thin (read skill, follow it, `$@`). Skill names are
`opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive`.

## Key Decisions

- Subagent detection (Conflict #8): use the `subagent` tool if present, else
  `executing-plans`; never fabricate `Task` calls.
- Post-PR loop lives in `opsx-apply` as an iteration N+1 mode.
- Manual end-to-end runs (with and without `pi-subagents`) are recorded in
  `tasks.md` as manual, non-blocking items with a reason, as in the previous change.
  They do not block verify or archive.
- Not shipped: `opsx-propose`, `opsx-bulk-archive`.
- The `package-activation` / `planning-commands` specs may need a delta if
  activation or discoverability requirements mention the command set; decided in
  `specs`.

## Open Questions

- None blocking. Calls made without the user, for review: skill names, the
  `opsx-sync`/`opsx-archive` skills being self-contained, whether a spec delta is
  needed for existing capabilities.
