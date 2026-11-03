## Design Summary

Existing codebases have no `openspec/specs/`, so every later change starts without a
description of current behaviour. This change adds a way to bootstrap that description
from the code.

- `/opsx-init --generate` runs the normal init, then adds one hint to its final report:
  `Next: /opsx-generate-specs`. It starts no agent work itself.
- A new command `/opsx-generate-specs` (skill `skills/opsx-generate-specs/SKILL.md` plus
  prompt `prompts/opsx-generate-specs.md`) does the work. It is available in any
  activated project, with or without the flag.
- The skill runs four stages: MAP, CONFIRM, SCOUT, then hand-off.

```text
/opsx-generate-specs
  1. MAP      one fast-model agent: tree, manifests, README, entry points
              -> capability candidates + directory boundaries
  2. CONFIRM  ask the user once: keep / drop / rename candidates, show cost estimate
  3. CHANGE   openspec new change bootstrap-specs; write brainstorm, proposal, design stub
  4. SCOUT    one fast-model agent per confirmed capability (sequential in-session
              when pi-subagents is missing) -> specs/<capability>/spec.md, all ADDED
  5. HAND-OFF tell the user to run /opsx-ff bootstrap-specs; ff skips the done artifacts,
              gates specs for review, then writes tasks and plan
```

- Specs go through a change, not straight into `openspec/specs/`, and the change walks the
  full artifact DAG (`apply`, `verify`, `finalize` still run; see Agreed Approach).
- Each requirement carries an `Evidence:` line (`path:line`, test or doc reference).
  A requirement inferred from code alone, without a test or doc backing it, also carries
  `Confidence: inferred` so the review gate can focus on it.
- Generated specs are written in the document language from `openspec/config.yaml`;
  the keywords `SHALL`, `MUST`, `WHEN` and `THEN` stay in English because OpenSpec validates them.

Implements: `docs/architecture.md` sections "`/opsx-init`" and "Components"
(extension + skills/prompts responsibilities); `docs/workflow.md` (full DAG is reused,
not altered). Docs that change in this change: `docs/architecture.md`,
`docs/usage-guide.md`, README command tables.

## Alternatives Considered

### Alternative A: Hand-off (chosen)
- **Approach**: `--generate` only changes the final `Next:` line. A separate skill runs the scouts.
- **Pros**: matches the architecture (init is deterministic TypeScript and cannot dispatch
  subagents); idempotency of `/opsx-init` is untouched; skill logic is editable prompt text
  and easy to test; the command also works on projects that were initialised earlier.
- **Cons**: two commands instead of one.
- **Why not chosen**: n/a, this is the chosen approach.

### Alternative B: init triggers the agent turn itself
- **Approach**: after `ctx.reload()`, init calls `pi.sendUserMessage` with the generate prompt.
- **Pros**: one command for the user.
- **Cons**: `reload()` invalidates the command context and the code states nothing may touch
  `io` afterwards; `pi.sendMessage` is used today only without `triggerTurn`; prompts are
  only discovered after activation, so ordering is fragile; behaviour is unverified in pi.
- **Why not chosen**: unverified API behaviour after reload and extra risk for a convenience.
  It can be added later without changing the skill.

### Alternative C: standalone command with no init flag
- **Approach**: only `/opsx-generate-specs`; `/opsx-init` is unchanged.
- **Pros**: smallest change to `init-command`.
- **Cons**: the user asked for the capability to be reachable from init; the hint is the
  cheapest way to surface it for old codebases.
- **Why not chosen**: loses discoverability at the moment the user sets up an existing project.

### Alternative D (rejected for output location): write straight into `openspec/specs/`
- **Approach**: scouts write main specs directly.
- **Pros**: fastest.
- **Cons**: skips the review gate on `specs`; unreviewed guesses become the source of truth.
- **Why not chosen**: the user chose to go through a change so the existing gates apply.

## Agreed Approach

Alternative A. `--generate` is an intent flag that adds a hint; `/opsx-generate-specs` holds
all scouting logic. The bootstrap change uses the full artifact DAG:

| Artifact | Content for the bootstrap change |
|---|---|
| brainstorm | MAP result and the capability list the user confirmed |
| proposal | why bootstrap, scope, excluded directories |
| design | `No design needed:` stub |
| specs | one delta spec per capability, all `## ADDED Requirements`, with evidence |
| tasks / plan | verification work per capability (spec matches code, evidence exists) |
| apply | worktree, executor chosen by `/opsx-apply` |
| verify | evidence paths exist; every requirement has `SHALL`/`MUST` and a scenario |
| finalize | sync and archive into `openspec/specs/` |

The scouts run during the skill (the `specs` artifact), not during `apply`, so artifact order
is preserved. The skill stops after `specs` and `design`; `/opsx-ff bootstrap-specs` (or
`/opsx-continue`) finishes `tasks` and `plan` with their review gates.

## Key Decisions

1. Trigger: hand-off, not an automatic agent turn.
2. Output: delta specs inside the change `bootstrap-specs`, never straight into `openspec/specs/`.
3. DAG: full, no schema change, so the bundled schema version stays 5.
4. No `pi-subagents`: scout the capabilities one after another in the current session.
5. One confirmation question after MAP, before any scout runs.
6. Evidence line on every requirement; `Confidence: inferred` when no test or doc backs it.
7. Never overwrite: if `openspec/specs/<capability>/` or an existing change named
   `bootstrap-specs` is present, the skill asks before continuing and never replaces existing files.
8. `--generate` is recognised as a whole-word token anywhere in the argument string and removed
   before `--lang` parsing; `--generate=<x>` and other unknown tokens remain errors.
9. Generated specs follow the configured document language; keywords stay English.

## Open Questions

- How a fast model is selected through the `subagent` tool of `pi-subagents` (parameter name
  not verified). The skill says "a fast model if the tool lets you choose one" and falls back
  to the default model.
- Size limits for very large repositories (maximum capabilities, ignored directories) are set
  as skill defaults here (cap of 12 capabilities, skip `node_modules`, `dist`, `build`,
  `vendor`, `.git`, generated files); tuning is left for later.
