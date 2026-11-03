## Design Summary

Implements `docs/workflow.md` — Commands (`opsx-explore`, `opsx-new`, `opsx-continue`,
`opsx-ff`), Conflicts resolved #7 and #9 — and `docs/architecture.md` — pi tool mapping.
Depends on `package-skeleton`, `superspec-schema-v5`, `opsx-init` (all merged).

**Why.** After `/opsx-init` a project is activated but exposes only a placeholder
command. Users need the planning half of the workflow (explore → new → continue/ff →
`plan.md`) to run inside pi without Claude-only tool names, which pi does not have.

**What.** Four pi-adapted commands, each a pair:

- `skills/opsx-<x>/SKILL.md` — the logic, adapted from the OpenSpec 1.4.1 generated
  skills (credited in each file and the README later).
- `prompts/opsx-<x>.md` — a thin command that tells the agent to read that skill's
  `SKILL.md` and follow it, with the user's input passed as `$@`.

The placeholder skill and prompt from `package-skeleton` are removed.

**Goals**
- `/opsx-new` + `/opsx-continue` in an activated temp project produce `brainstorm.md`,
  then `proposal.md`.
- `/opsx-ff` runs brainstorm interactively, then proposal → plan unattended, and
  stops at `plan.md` (before apply).
- No Claude tool name survives in `skills/` or `prompts/`.

**Non-goals**
- apply / verify / sync / archive (`pi-opsx-execution-commands`) and the routing note.
- Changing the bundled schema or Superpowers skills.

**Anti-goals**
- A command that silently depends on a Claude-only tool and misbehaves on pi.
- Forking Superpowers' `brainstorming` or `writing-plans` into this package.

## Alternatives Considered

Two independent decisions.

### Prompt vs skill responsibility

#### Alternative A: Thin prompt, logic in skill (chosen)
- **Approach**: prompt says "read the `opsx-<x>` SKILL.md and follow it; input is `$@`".
- **Pros**: logic in one place; skill still loadable via `/skill:opsx-<x>`; matches
  architecture ("skills loaded by reading SKILL.md").
- **Cons**: one extra file read per command.
- **Why not chosen**: n/a (chosen).

#### Alternative B: Self-contained prompt, skill is a copy
- **Approach**: full instructions in the prompt.
- **Pros**: no file-read step.
- **Cons**: logic in two places, drifts.
- **Why not chosen**: duplication for no real gain.

#### Alternative C: Prompts only
- **Approach**: drop `skills/`.
- **Pros**: simplest.
- **Cons**: contradicts the declared scope and architecture components.
- **Why not chosen**: out of agreed scope.

### Handling artifacts written by Superpowers skills (brainstorm, plan)

pi has no `Skill` tool (pi docs: skills are listed in the system prompt by name and
path; the model reads `SKILL.md`; `/skill:<name>` forces a load).

#### Alternative A: General rule in the skills (chosen)
- **Approach**: when an artifact `instruction` names `superpowers:<x>`, drop the
  prefix, find skill `<x>` in the available skills, read its `SKILL.md`, follow it,
  write to the change dir per the instruction, ignore the skill's own closing
  handoff. Stop and tell the user to install Superpowers if the skill is absent.
- **Pros**: schema stays harness-neutral; no fork; one rule covers brainstorm and
  plan (Conflicts #1, #2).
- **Cons**: compliance rests on instruction text, not enforcement.
- **Why not chosen**: n/a (chosen).

#### Alternative B: Trust the schema instruction alone
- **Approach**: generic skills; agent interprets "Skill tool" on its own.
- **Pros**: no pi-specific text.
- **Cons**: fragile, and ff has no marker of where interaction is allowed.
- **Why not chosen**: too much left to guesswork.

#### Alternative C: Ship a package-owned `brainstorming`
- **Approach**: bundle an adapted copy.
- **Pros**: tight control.
- **Cons**: forks Superpowers (architecture non-goal).
- **Why not chosen**: violates a non-goal.

## Agreed Approach

Thin prompt + logic-in-skill (A), and the general `superpowers:<x>` rule (A). Skill
names are `opsx-explore`, `opsx-new`, `opsx-continue`, `opsx-ff` (never `openspec-*`,
which `openspec init --tools pi` would create and which `/opsx-init` offers to remove).

## Key Decisions

Why-level decisions only; mechanics are in `design.md`.

- ff interaction boundary (Conflict #9): brainstorm is interactive; every later
  artifact is unattended; ask only when blocked by genuinely missing input.
- ff stops before apply and says to run `/opsx-apply` (shipped by the next change).
- Removing the placeholders contradicts the existing requirement "Placeholder
  commands prove activation" in `package-activation`. This change therefore carries a
  delta spec for that capability and updates `tests/extension.test.ts`. Activation
  must now be proven by the real commands being discoverable.
- Not shipped here: `opsx-propose`, `opsx-bulk-archive`.

## Open Questions

- None blocking. Calls made without the user, marked for review: skill names, the
  rule being duplicated in `opsx-continue` and `opsx-ff` rather than shared, and the
  placeholder-removal delta spec.
