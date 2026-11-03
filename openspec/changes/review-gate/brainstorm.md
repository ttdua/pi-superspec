## Design Summary

Add a human **review gate** to the planning commands. Today `/opsx-continue` stops
after one artifact "so the user can review" but offers no mechanism to approve, and
`/opsx-ff` only has the interactive brainstorm conversation, then runs unattended with
no review of what it generated. This change gives both commands an explicit,
three-outcome approval step.

Documented behaviour this touches: `docs/workflow.md` (Commands table, Conflicts
resolved #9 "ff runs brainstorm interactively, then the rest unattended") and
`docs/architecture.md` (pi tool mapping). Conflict #9 is altered: ff still runs
unattended after brainstorm, but now ends with one review gate. Both docs are updated
in this change.

Findings that shaped the design (investigated, not assumed):

- Upstream OpenSpec 1.16 has no `brainstorm` artifact and its `ff` has no approval
  gate at all.
- Upstream Superspec v4 documents `/opsx:continue` as "stop at each artifact, review
  it", and `/opsx:ff` as "no checkpoints". The gate on `ff` is therefore new
  behaviour of this package, not inherited.
- The Superpowers `brainstorming` skill orders its steps as: write the design doc,
  get that doc approved, then invoke `writing-plans`. The current schema instruction
  approves the design in conversation and only then writes `brainstorm.md`, so the
  file itself is never approved.

Behaviour:

- **Gate outcomes** (the reviewer picks one):
  - *Approve* — continue.
  - *Approve with notes* — continue; notes that are only wording or clarification
    are applied without re-review; notes that change a requirement, scope or
    decision, or that make another artifact inconsistent, are applied and the
    affected artifacts are re-reviewed. When unsure, re-review.
  - *Request changes with notes* — revise the artifact(s) from the notes and reopen
    the gate.
  - A dismissed/closed review is not an approval; the agent asks in chat.
- **`/opsx-continue`**: create exactly one artifact, run the gate on that file, then
  stop. Approval unlocks the next `/opsx-continue`.
- **`/opsx-ff`**: gate on `brainstorm.md` right after it is written (the user is
  already present), then generate `proposal → design → specs → tasks → plan`
  unattended, then one gate over those five artifacts as a single review.
- **Reviewer mechanism**, first available wins: Plannotator (agent tool if
  registered, otherwise the CLI run in the background with a result file), then
  `ask_user_question`, then plain text with numbered options.
- **Brainstorm order fix**: the brainstorm artifact instruction is reworded so the
  file is written first and the file is what gets approved. This also corrects
  `/opsx-continue`.
- **Code review gate** (added after the document gates were drafted): after
  `/opsx-verify` passes and before anything touches the feature branch, a reviewer
  approves the code diff. It lives inside `finalize`, after the in-worktree test run
  and before the checkout / fast-forward merge / push / PR steps. It reuses the same
  four outcomes. Reviewer tiers: Plannotator code review (agent tool, else CLI),
  then `ask_user_question` / plain text, which can only show a diff summary and ask
  for the decision. Requested changes are fixed on the worktree branch, re-verified,
  and finalize is re-entered.

## Alternatives Considered

### Alternative A: Gate `brainstorm.md` separately in ff, then one gate for the rest
- **Approach**: Approve the brainstorm file while the user is present; the final
  packet covers proposal, design, specs, tasks, plan.
- **Pros**: Catches drift at the root of the DAG when it is cheapest; matches the
  Superpowers order (approved doc before `writing-plans`); no new interruption since
  brainstorm is interactive anyway.
- **Cons**: Two Plannotator sessions in one `ff` run.
- **Why not chosen**: This is the chosen approach.

### Alternative B: Single final gate that includes `brainstorm.md`
- **Approach**: One review of every artifact after the unattended run.
- **Pros**: Exactly one review per `ff`.
- **Cons**: A wrong brainstorm is found after five dependent artifacts exist, so the
  fix means regenerating them; the file is never approved before `plan.md` is
  written, contrary to the Superpowers step order.
- **Why not chosen**: Pays for a gate at the most expensive place for the root
  artifact.

### Alternative C: No final gate, keep Superspec's "ff has no checkpoints"
- **Approach**: Only add the brainstorm file approval; leave the rest of `ff`
  unattended and unreviewed.
- **Pros**: Preserves upstream `ff` semantics exactly.
- **Cons**: The generated proposal, specs, tasks and plan are accepted without any
  human read before apply.
- **Why not chosen**: The requester wants every generated artifact reviewed once
  before apply.

### Alternative D (rejected for packaging): Folder as the review target
- **Approach**: `plannotator annotate <change-dir>/`.
- **Pros**: One command, no file list.
- **Cons**: A folder opens a file picker with no single decision for the set.
- **Why not chosen**: Several explicit file paths open as one review with one
  decision, which is what a gate needs.

### Alternative E: Where the code review gate sits
- **Approach**: (a) end of `opsx-verify`; (b) start of `finalize`; (c) a new schema
  artifact between verify and finalize.
- **Pros**: (a) runs earliest. (b) sits directly before the outward-facing steps and
  changes only the finalize instruction. (c) is the most explicit.
- **Cons**: (a) makes verify a human-gated step and splits the review from finalize.
  (c) changes the DAG, `applyRequires` and the documented ten steps.
- **Why not chosen**: (b) was chosen; (a) and (c) cost more than they add.

## Agreed Approach

Alternative A, with the three-outcome gate and the four-step reviewer fallback above.
`/opsx-new` is unchanged because it creates no artifact.

## Key Decisions

- `/opsx-continue` stays "one artifact per call"; the gate runs inside the call, after
  the artifact is written. It does not loop on its own.
- Gate outcomes map to Plannotator's result as: `approved` without feedback =
  Approve; `approved` with feedback = Approve with notes; `annotated` = Request
  changes; `dismissed` = not an approval.
- `ff` review packet is an explicit ordered file list (including every
  `specs/<capability>/spec.md`), never a folder.
- Notes classification defaults to re-review when in doubt.
- Cascade rule for ff: a change to an artifact marks its dependents (per the schema
  DAG) as needing update; they are regenerated or edited and only the changed files
  are reopened in the next gate.
- Plannotator-specific commands and tool names live in the package skills and prompts,
  never in the schema (existing rule, `docs/architecture.md` pi tool mapping). Only the
  brainstorm instruction's step order changes in the schema, in tool-neutral words.
- The code review gate is part of this change (same outcomes and tiers), placed at
  the start of `finalize` after the in-worktree test run. Plannotator's code review
  result is `{decision, message}`; the skill classifies by `decision` only, and notes
  on an approval of the code are applied before the merge: fixed on the worktree
  branch, re-verified, then finalize resumes. The diff base is the feature branch
  recorded in `apply.md`.
- Do not cite any user's private instruction files as the basis for the gate; the
  basis is the investigation above.

## Open Questions

- Does the pi agent need `PLANNOTATOR_AGENT_TOOL` to see the `plannotator` tool? It is
  off by default on pi, so the CLI-in-background path must work on its own. How the
  skill waits for a background CLI on pi (and whether pi can run it detached) is
  unverified.
- How to detect the Plannotator CLI (`command -v plannotator`) versus the agent tool
  in a way that is reliable inside the skill text.
- Whether the result file should live in a scratch directory or under the change
  directory (it must not be committed).
- Staleness detection for the cascade: by DAG alone, or also by file modification
  time.
