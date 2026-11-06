## Design Summary

**Intent.** The planning workflow should read the current living specs
(`openspec/specs/`, the "baseline") at the points where it makes decisions,
not only at the end (`/opsx-archive` sync) and in one verify check (REMOVED
evidence). Today the baseline is consulted too late:

- `proposal` looks at `openspec/specs/` only to find capability names for
  "Modified Capabilities".
- `specs` reuses the folder name but is never told to read the current
  requirement before writing a `MODIFIED` block. A `MODIFIED` block must carry
  the full replacement text, so a scenario left out is silently deleted at sync.
  A `MODIFIED`, `REMOVED` or `RENAMED` header that does not match the main spec
  exactly is only discovered at `/opsx-sync`, after implementation.
- `brainstorm` is never told to check the living specs. `openspec/config.yaml`
  forbids re-deciding what `docs/` settles, but there is no equivalent rule for
  specs, so a brainstorm can quietly contradict a specified requirement.
- `superspec.spec-reviewer` reviews delta specs against the proposal, but its
  handoff does not include the main specs being modified, so it cannot spot a
  dropped scenario.
- The routing note sends "a fix restoring specified behaviour" to direct TDD
  work, but does not tell the agent to read the spec to confirm the behaviour
  really is specified.

**Why.** A lost requirement or an unnoticed contradiction is the most
expensive kind of planning error: it passes every gate, is implemented, and
surfaces (if at all) at archive time, when the delta is merged into the
living specs. Reading the baseline at decision time is cheap and fixes it at
the source. The user asked for the most efficient option that achieves this.

**Goals**

- brainstorm names the existing requirements the change touches and does not
  re-decide them silently; a deliberate change of a specified requirement is
  stated explicitly.
- Every `MODIFIED` delta starts from the full current requirement block copied
  from the main spec, so nothing is lost unless removed on purpose.
- `MODIFIED`, `REMOVED` and `RENAMED FROM` headers match the main spec exactly
  before the human gate, not at sync.
- The internal spec review compares deltas with their baseline.
- The routing decision for "fix restoring specified behaviour" is grounded in
  the spec text.

**Non-goals**

- A programmatic delta checker (extension command or test helper).
- Changing `/opsx-sync`, `/opsx-archive` or verify behaviour; they already read
  the baseline.
- Editing `openspec/schemas/superspec/` (this repository's own installed schema
  copy); only the bundled `schema/superspec/` changes.
- Generating or backfilling specs for capabilities that have none.

**Anti-goals**

- Forcing brainstorm to read all 19 living specs on every change: it reads only
  the capabilities the change plausibly touches.
- Adding a new human stop or approval; existing gates stay as they are.
- Naming review or ask tools in schema text (harness-neutral rule stays).

**Constraints**

- Schema text stays harness-neutral and tool-neutral; tests assert schema and
  skill text, as for earlier changes.
- The package is unreleased (`CHANGELOG.md` "Unreleased"), so the schema keeps
  `version: 6`; no artifact ID changes.
- Docs (`docs/workflow.md` Step rules and Routing note, `docs/usage-guide.md`)
  are the source of truth and are updated in the same change.

## Alternatives Considered

### Alternative A: Guard the specs step only
- **Approach**: add one rule to the `specs` instruction: before writing a
  `MODIFIED`, `REMOVED` or `RENAMED` entry, read the main spec block and match
  its header exactly.
- **Pros**: smallest diff; fixes the silent-loss case directly.
- **Cons**: brainstorm can still contradict specified behaviour; the reviewer
  still lacks the baseline; routing stays ungrounded.
- **Why not chosen**: covers one of the four failure points; the others cost
  only a few lines each.

### Alternative B: Read the baseline at each decision point
- **Approach**: instruction-only changes in the bundled schema (brainstorm,
  proposal, specs), the `opsx-continue` / `opsx-ff` internal review handoff and
  the `spec-reviewer` agent, and the routing note.
- **Pros**: covers the whole path from routing to the human gate; no new tool
  or public surface; matches how every earlier workflow rule was added (text in
  schema and skills, asserted by tests).
- **Cons**: relies on the agent following text, not on a hard check.
- **Why not chosen**: chosen.

### Alternative C: Programmatic baseline checker
- **Approach**: an extension command (or helper used by the skills) that parses
  delta specs and main specs and reports dropped scenarios and unmatched
  headers.
- **Pros**: deterministic; catches mistakes the agent misses.
- **Cons**: new public command and parser to maintain; partly duplicates the
  header matching that `/opsx-sync` and `/opsx-archive` already do in skill
  text; much larger change.
- **Why not chosen**: cost is out of proportion until text rules prove
  insufficient; can be added later on top of B.

## Agreed Approach

Alternative B (the agent's recommendation; the user delegated the choice:
"propose the optimal, efficient option"). The baseline is read at each
decision point:

1. **brainstorm**: for each capability the change plausibly touches, read its
   living spec and cite the requirements involved; do not re-decide a
   specified requirement silently; a deliberate change is stated as such.
2. **proposal**: "Modified Capabilities" lists only capabilities whose existing
   requirements actually change, confirmed against the living spec.
3. **specs**: for every `MODIFIED` entry, start from the full current block
   copied from the main spec and then edit it; `MODIFIED`, `REMOVED` and
   `RENAMED FROM` headers match the main spec header exactly; a `MODIFIED`
   that drops a scenario must be intentional and visible (a removed scenario is
   named in the requirement text or the proposal).
4. **internal spec review**: the `spec-reviewer` handoff includes the main
   spec of every modified capability, and the reviewer checks headers and
   dropped scenarios against it.
5. **routing note**: before choosing "fix restoring specified behaviour", the
   agent confirms the behaviour in the living spec; if it is not specified,
   the fix is a spec change.

## Key Decisions

- Instruction-only change; no new command, tool or parser (agent's call,
  delegated by the user).
- Schema stays at `version: 6` because the package is unreleased (agent's
  call).
- `openspec/schemas/superspec/` in this repository is not edited (project
  rule).
- Docs are updated in the same change.

## Open Questions

- None blocking. The exact wording of each rule is left to the design and
  specs artifacts.
