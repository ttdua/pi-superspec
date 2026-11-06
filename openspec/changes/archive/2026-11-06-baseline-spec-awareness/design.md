## Context

Workflow rules in this package live as text: artifact instructions in `schema/superspec/schema.yaml`, skill text in `skills/opsx-*/SKILL.md`, agent definitions in `agents/*.md`, and the routing note in `extensions/routing-note.ts`. Tests assert that text (`tests/schema.test.ts` reads instructions through `openspec instructions <id> --json`; the others read files or constants). The living specs are already read by `opsx-sync`, `opsx-archive` and verify check 3; this change adds reads at planning time only.

## Goals / Non-Goals

**Goals:**
- Place each baseline rule in the one artifact or component that makes the decision, so it is seen at the moment it applies.
- Keep every rule assertable by the existing text-based tests.

**Non-Goals:**
- No parser or command that compares deltas with main specs.
- No change to sync, archive, verify, design, tasks or plan instructions.

## Decisions

1. **Rules go into artifact instructions, not templates.** Templates are copied into artifacts and their comments can end up in user files; instructions are agent-only. The specs rule goes into the `specs` instruction's existing "Modified capabilities" line and delta-operation list; the brainstorm rule goes into the brainstorm instruction next to the output redirection; the proposal rule extends the existing "Check `openspec/specs/`" bullet. Alternative (a new shared "baseline" section in the schema) rejected: OpenSpec delivers instructions per artifact, so a shared section would not reach the agent.
2. **Brainstorm reads only touched capabilities.** "Plausibly touches" is judged from the capability names and Purpose lines (`openspec list --specs` or the spec headers), then the full spec is read for the ones that match. This bounds the cost on projects with many specs.
3. **Dropped scenarios are allowed but must be visible.** A `MODIFIED` block may drop a scenario only when the change means it; the specs instruction requires naming the dropped scenario in the requirement's text or in the proposal's What Changes. Alternative (forbid dropping, require REMOVED) rejected: OpenSpec has no scenario-level REMOVED operation.
4. **Reviewer gets the baseline through the handoff, and its definition says how to use it.** `opsx-continue` and `opsx-ff` add "the main spec `openspec/specs/<capability>/spec.md` of every modified capability" to the inputs they pass; `agents/spec-reviewer.md` adds the comparison to its Purpose and tells it to record a missing baseline under Limitations. The shared `skills/references/subagent-routing.md` is unchanged because it is role-neutral.
5. **Routing note keeps four paths.** The first path gains a clause: confirm the behaviour in the living spec (`openspec/specs/`) before treating the work as a fix; if it is not specified, the work is a spec change. The existing "No forced change" test still holds because `/opsx-new` lines are unchanged.
6. **Schema version bumps to 7.** The instruction text changes, so a project with the v6 copy installed must be classified `older` by `/opsx-init`, not `edited` (which would read as a local edit). No artifact ID changes, so no migration step is needed; `bundled-schema` "Schema identity" is modified to `version: 7`. Revised after the code review (originally "stays 6"). The repository's own `openspec/schemas/superspec/` copy is not edited (project rule), so this repo's next change still runs the old text until the copy is reinstalled outside this change.

## Risks / Trade-offs

- [Rules are text, so an agent can still skip them] → Spec reviewer checks the same rules against the baseline before the human gate; archive's sync check remains the last safety net.
- [Brainstorm reads more files] → Limited to capabilities the change plausibly touches (Decision 2).
- [Instruction tests become brittle on wording] → Tests assert short key phrases and order, as existing schema tests do.
