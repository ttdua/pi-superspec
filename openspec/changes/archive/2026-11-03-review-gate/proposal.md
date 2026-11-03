## Why

`/opsx-continue` stops after one artifact "so the user can review", but gives the reviewer no way to approve, annotate or reject it. `/opsx-ff` generates five artifacts unattended and none is ever read before apply. The brainstorm file itself is written after the design was approved in conversation, so the file is never approved. Code goes from verify straight to merge, push and PR with no human look at the diff. This adds explicit review gates for the artifacts and for the code.

## What Changes

**Gate on `/opsx-continue`**
- From: creates one artifact, then stops with no approval mechanism.
- To: creates one artifact, runs the review gate on that file, then stops. Approval unlocks the next call.
- Reason: human-in-the-loop at every checkpoint, as Superspec v4 describes for `continue`.
- Impact: non-breaking.

**Gates on `/opsx-ff`**
- From: brainstorm interactive, then proposal → plan unattended with no review.
- To: gate on `brainstorm.md` right after it is written; then proposal, design, specs, tasks and plan are generated unattended; then one gate over those five artifacts as a single review. Changes requested at the final gate cascade to dependent artifacts.
- Reason: `ff` is the only path where generated artifacts reach apply unread.
- Impact: non-breaking; `ff` gains a final stop. Upstream Superspec `ff` has no checkpoints, so this is new behaviour of this package.

**Gate outcomes and reviewer mechanism**
- Three outcomes: Approve, Approve with notes, Request changes with notes. A dismissed review is not an approval.
- Reviewer, first available wins: Plannotator (agent tool, else background CLI with a result file), then `ask_user_question`, then plain text with numbered options.
- Notes that only reword are applied without re-review; notes that change requirements, scope, decisions or other artifacts are applied and re-reviewed.

**Code review gate in finalize**
- From: after `/opsx-verify` passes, `finalize` goes straight from the in-worktree test run to checkout, fast-forward merge, push and PR.
- To: after the in-worktree test run and before the checkout of the feature branch, the reviewer approves the code diff (Plannotator code review, else `ask_user_question` / text with a diff summary). Requested changes are fixed on the worktree branch, re-verified, and finalize is re-entered. Notes on an approval are applied before the merge (fix, re-verify, resume finalize), and the outcome is recorded in `finalize.md`.
- Reason: the diff is the one thing no gate shows before outward-facing git steps.
- Impact: non-breaking; finalize gains one stop and a `finalize.md` line.

**Brainstorm step order**
- From: design approved in conversation, then `brainstorm.md` is written.
- To: `brainstorm.md` is written, then the file is approved.
- Reason: matches the Superpowers order (approved doc before `writing-plans`).

Docs `docs/workflow.md` (Commands table, Conflicts resolved #9) and `docs/architecture.md` (pi tool mapping) are updated in this change.

## Capabilities

### New Capabilities
- `review-gate`: the gate protocol: outcomes, notes handling, the Plannotator / `ask_user_question` / text fallback order, the review packet for `ff`, and the code review variant used by `finalize`.

### Modified Capabilities
- `planning-commands`: `opsx-continue` runs the gate after its artifact; `opsx-ff` gates `brainstorm.md` and runs a final gate over the remaining artifacts (changes "Continue creates one artifact" and "Fast-forward interaction boundary").
- `bundled-schema`: the brainstorm artifact instruction writes the file first and approves the file, and the finalize instruction gains a code review step before the feature branch is touched, both in tool-neutral wording.

## Impact

- `skills/opsx-continue/SKILL.md`, `skills/opsx-ff/SKILL.md`, matching `prompts/` if wording changes.
- `schema/superspec/schema.yaml` (brainstorm and finalize instructions only), `schema/superspec/templates/finalize.md` (code review line).
- `docs/workflow.md`, `docs/architecture.md`, usage guide and README if they describe `ff` as unattended.
- Tests in `tests/schema.test.ts` that assert the brainstorm instruction text.
- No new dependencies. Plannotator and `rpiv-ask-user-question` stay optional.
