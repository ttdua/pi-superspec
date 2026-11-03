## Context

`opsx-continue` ends with "STOP so the user can review" and `opsx-ff` runs unattended after brainstorm (`docs/workflow.md`, Conflicts resolved #9). Neither has a way to record a decision. Package skills and prompts may name pi tools; the schema may not (`docs/architecture.md`, pi tool mapping).

Plannotator facts this design relies on (checked against the installed CLI 0.28.x and `@plannotator/pi-extension` 0.28.47):

- `plannotator annotate <file...> --gate --json --result-file <path>` opens several explicit files as one review with one decision. A folder only opens a file picker.
- Result JSON: `decision` is `approved`, `annotated` or `dismissed`; optional `feedback`. `approved` plus `feedback` is approval with notes.
- Under `--require-approval`, exit 2 means the gate itself failed. `--result-file` needs an existing parent directory and a path that does not exist yet.
- The pi extension registers a `plannotator` agent tool only when `PLANNOTATOR_AGENT_TOOL` / `agentTool` is on; it is off by default on pi. The tool returns at once and the decision arrives later as a message.

## Goals / Non-Goals

**Goals:**
- One reusable gate procedure used by `opsx-continue` and `opsx-ff`.
- Works with Plannotator, with `ask_user_question`, or with plain text.
- Fix the brainstorm step order in the schema in tool-neutral words.

**Non-Goals:**
- No gate on `opsx-new`, `opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive`.
- No schema field for gates; gates are skill behaviour.
- No change to the artifact DAG, `applyRequires`, or the apply/verify/finalize blocks.
- No code gate during `apply` or `verify`; the code gate is a single step inside `finalize`.
- No new artifact and no DAG change for the code review.

## Decisions

**1. The gate procedure is a block of text inside each skill, kept identical by a test.** `opsx-continue` and `opsx-ff` each carry a "Review gate" section. A new helper skill was rejected because the planning-commands spec pairs every skill with a prompt and a helper would add package surface for one shared paragraph. A test asserts the two sections are byte-identical.

**2. Reviewer selection, evaluated each time a gate opens:**

```text
tool `plannotator` in the available tools      → call it, end the turn, wait for the message
else `command -v plannotator` succeeds         → run the CLI in the background (below), read the result file
else tool `ask_user_question` available        → three options, notes as free text
else                                            → plain text, three numbered options
```

If a higher tier fails to open (exit 2, tool error), fall to the next tier and say so. No retry loop on the same tier.

**3. CLI invocation:** `plannotator annotate <files in DAG order> --gate --json --result-file <scratch>/review-<n>.json`, run in the background. `<scratch>` is the session scratchpad, otherwise a fresh `mktemp -d`; never inside the change directory. `--require-approval` is not used: the skill classifies by `decision`, not by exit code, except that exit 2 selects the next tier.

**4. Normalised outcome**, whichever tier produced it:

| Outcome | Plannotator | ask / text |
|---|---|---|
| `approved` | `approved`, no feedback | "Approve" |
| `approved_with_notes` | `approved` + feedback | "Approve with notes" + text |
| `changes_requested` | `annotated` | "Request changes" + text |
| `dismissed` | `dismissed` | no answer |

`dismissed` is never treated as approval: the agent asks in chat what to do.

**5. Notes handling.** Apply the notes to the artifact. If every note is wording, formatting or clarification, and none changes a requirement, scope, decision, scenario or the meaning of another artifact, continue and print a short diff. Otherwise reopen the gate on the changed files. When unsure, reopen.

**6. `ff` sequence:**

```text
brainstorm.md ──gate──▶ proposal, design, specs, tasks, plan (unattended) ──gate──▶ done
```

The final packet is the explicit list `proposal.md design.md specs/*/spec.md tasks.md plan.md` (every spec file listed by path). `brainstorm.md` is not repeated; it was approved as a file at the first gate.

**7. Cascade on requested changes.** Dependents come from the `dependencies` / `requires` data of `openspec status --change <name> --json`, not from mtimes. When an artifact is revised, its dependents are edited to match (not regenerated from scratch) and the next gate lists only the files that changed. If a revision touches `brainstorm.md` after the unattended phase, the agent says so and reopens the gate with all five artifacts, since all depend on it.

**8. Schema change.** The `brainstorm` instruction says: write the design to `brainstorm.md` first; the reviewer approves the file; only then return to the OpenSpec flow. It does not name any tool. The gate itself stays in skills.

**9. Code review gate, inside `finalize`.** New step between the in-worktree test run (finalize step 2) and the checkout of the feature branch (step 3): at that point nothing has touched the feature branch yet. The schema finalize instruction says, in tool-neutral words, that the reviewer must approve the code changes before the feature branch is touched. The "Review gate" skill section carries the mechanism as a second kind of gate:

```text
tool `plannotator` available   → action "review", target = worktree, base = FEATURE_BRANCH from apply.md, gate on
else plannotator CLI           → plannotator review --base <FEATURE_BRANCH> --diff-type merge-base --gate --json <WORKTREE>, stdout to a scratch file
else ask_user_question / text  → show `git diff --stat` and commit range, ask the three options; the reviewer reads the diff in their own tool
```

Result handling: approve-or-not comes from `decision` only (the review JSON is `{decision, message}`). When `decision` is `approved`, `message` tells a bare approval ("Code review completed — no changes requested.") from an approval with notes, which is handled as approved with notes; when unclear, the agent asks. `--diff-type merge-base` is passed so the session shows every commit on the worktree branch since the feature branch, whatever the reviewer's saved diff mode; the agent tool's `review` action takes only a base, so the agent asks the reviewer to confirm the full branch diff or falls to the CLI tier. `approved` without notes continues. `approved` with notes and `annotated` (changes requested) both stop finalize before the feature branch is touched: the agent applies the notes on the worktree branch with `receiving-code-review` and TDD, updates `apply.md` as iteration N+1 (raises `Iteration:` and extends the commit range, as the apply template directs), runs `/opsx-verify` again, and re-enters finalize. After notes on an approval the code gate is not reopened unless a note changed behaviour or a requirement (same rule as decision 5; when unsure, reopen); after `annotated` it always reopens. The diff base is the feature branch recorded in `apply.md`, and the CLI tier redirects stdout to a scratch file because `plannotator review` has no `--result-file`. `dismissed` is not approval; ask in chat. `finalize.md` records `Code review: approved | approved with notes | skipped (reason)`, the tier, and the commit range reviewed.

**10. Docs.** `docs/workflow.md`: Commands table and Conflicts #9 now read "brainstorm gate, unattended generation, final gate". `docs/architecture.md` pi tool mapping gets a `plannotator` row with the CLI fallback.

## Risks / Trade-offs

- [Skill text drifts between `continue` and `ff`] → identical-section test.
- [Background CLI cannot be awaited on some pi setups] → tier 2 documents polling the result file; if the agent cannot run a background command it uses tier 3. Not verified on pi, covered in Open Questions.
- [Reviewer closes the tab] → `dismissed` handled explicitly, never an approval.
- [Final gate changes force rework of up to five artifacts] → mitigated by gating the root first; cascade edits dependents instead of regenerating.
- [Notes misclassified as minor] → default to reopen when unsure; the diff is always shown.
- [Text/ask tiers cannot show a diff] → they show a diff summary and say the diff must be read elsewhere; the recorded tier in `finalize.md` makes a shallow review visible.
- [Code approved with notes, then merged unchanged] → notes are applied before the merge; any code change after approval goes through re-verify, and the notes are listed in `finalize.md`.
- [Plannotator changes its JSON] → classification keys off `decision` only; unknown value is treated as `dismissed`.

## Migration Plan

Behaviour change in skills, one schema instruction wording change and docs. Existing projects keep a copy of the schema under `openspec/schemas/superspec/`; `docs/architecture.md` says an existing non-identical schema is left unchanged with a warning, so the brainstorm order fix reaches existing projects only through the planned schema upgrade. Skills work with either schema: with the old instruction the agent still gates the file after writing it. Rollback is reverting the commit. Instruction content changed after the marker version was set (the brainstorm order, finalize step 2b and the escape hatch) without bumping the marker version 5, so a project copy installed from a pre-release v5 build classifies as `edited` rather than `older`. Nothing has shipped yet (0.0.0), so this does not block.

## Open Questions

- Can pi run the Plannotator CLI detached and let the agent wait on the result file? **Still open.** Apply ran in Claude Code, so the pi path (`approved`, `annotated`, closed tab through `--result-file`) was not exercised; confirm on a real pi session. Answered in apply: `plannotator review --base main --gate --json .` with stdout redirected to a scratch file exits 0 and writes `{"decision":"approved","message":"..."}` (a `decision` and a `message`, no `feedback`), which matches the code review tier's classification.
- Whether the tier-2 check should also look at `PLANNOTATOR_AGENT_TOOL` to explain why the tool is missing.
