# Workflow

The unified pi-superspec workflow: ten steps per change, one change directory
`openspec/changes/<name>/`. OpenSpec owns *what* changes; Superpowers owns *how* it
is built. Everything not stated here keeps upstream Superspec v4 behaviour.

## Artifact DAG

```text
brainstorm ─┬─→ proposal ─→ specs ─→ tasks ─→ plan ─→ apply ─→ verify ─→ finalize   (then openspec-archive-change)
            └─→ design (optional; nothing requires it)
```

`design` requires `brainstorm`; no artifact requires `design`. OpenSpec has no
"optional" flag, so when there is no non-trivial technical decision the design
instruction writes a two-line `design.md` ("No design needed: <reason>") so the DAG
completes and archive does not warn.

## Steps

| # | Step | Artifact | Owner / skill | Why this owner |
|---|---|---|---|---|
| 1 | brainstorm | `brainstorm.md` | Superpowers `brainstorming` (redirected) | Structured discovery: one question at a time, 2–3 approaches, approval gate. `opsx-explore` remains for free-form thinking before a change exists. |
| 2 | proposal | `proposal.md` | OpenSpec | Change boundary; the **Capabilities** list is the contract with specs. |
| 3 | design *(optional)* | `design.md` | OpenSpec template | Technical *how* only: decisions, risks, migration. |
| 4 | specs | `specs/<capability>/spec.md` | OpenSpec | SHALL/MUST requirements, `#### Scenario:` blocks, validated delta semantics. |
| 5 | tasks | `tasks.md` | OpenSpec | Coarse, human-scannable checklist in numbered task groups (with `Blocked by`), tracked by apply, verify and archive. |
| 6 | plan | `plan.md` | Superpowers `writing-plans` (redirected) | Opens with `## Contracts`, then tasks with `Covers`, `Difficulty` and `Blocked by` and 2–5 minute TDD micro-steps, exact files, test commands, commit points. |
| 7 | apply | code + `apply.md` | Superpowers `using-git-worktrees` + `subagent-driven-development` (fallback `executing-plans`) | Isolation, fresh subagent per plan task, TDD, per-task and whole-branch review, ledger for recovery; unblocked tasks may run in parallel lanes. |
| 8 | verify | `verify.md` | OpenSpec verify + Superpowers `verification-before-completion`; `systematic-debugging` on FAIL | Spec-level correctness backed by fresh evidence. |
| 9 | finalize | `finalize.md` | Superspec v4 git-side closeout; `finishing-a-development-branch` as escape hatch | Deterministic merge back to the feature branch, push, PR offer, reviewer comment. |
| 10 | archive | change moved to `archive/` | OpenSpec `openspec-archive-change` | Sync deltas into living specs; runs before the PR merges so the PR holds the full history. |

Optional specialist seats (roles resolved through
`schema/superspec/subagent-routing.md`; the bundled `superspec.*` agents are bundled candidates
for them, with no precedence over other qualifying agents; parent keeps artifact writes and human gates):
the scout role gives evidence-only recon for explore and brainstorm;
the spec reviewer role checks completed specs and the plan reviewer role checks the
completed plan, both inside `openspec-continue-change` and `openspec-ff-change` before the existing human gate. These
internal reviews are advisory, not human approval, and add no stop: ff keeps its two planned stops
(brainstorm and final). Without the integration the parent does the same check inline.
The implementer, task reviewer and plan reviewer apply the user's `coding-standards` skill when one is installed; if it is missing they fall back to project conventions and nothing stops.

After a PR is open, review feedback is handled with Superpowers
`receiving-code-review` on the feature branch in the main checkout (TDD per fix);
then update `apply.md` as post-PR iteration N+1 (raise `Iteration:`, extend the
commit range to the new HEAD), re-run verify, update `finalize.md`, and push / upsert the reviewer
comment under the same policy as finalize.

## Step rules

- **brainstorm** holds the *why*: intent, goals / non-goals / anti-goals, approaches
  considered and the one chosen, open questions. Technical decisions go to
  `design.md`. The two must not repeat each other.
- **baseline specs**: brainstorm reads the living specs of the capabilities it touches and states any deliberate change to a specified requirement; proposal lists a Modified Capability only after checking its living spec; a `MODIFIED` delta starts from the full current block, headers match the main spec exactly, and a dropped scenario is named; the spec reviewer (or inline self-check) receives those main specs.
- **specs → tests**: `plan.md` lists, for every `#### Scenario:`, the test that
  covers it. Verify checks this list.
- **plan Contracts**: `plan.md` has a required `## Contracts` section before the tasks (name,
  new / modified, exact shape, public flag; `None – <reason>` when there are none).
  It is the reviewed source of truth for contract shapes; `design.md` records only
  the decision and reason for a public contract.
- **tasks ↔ plan**: every plan task names the `tasks.md` ID it implements
  (`Task 3 — implements 1.2`). When a plan task's review passes, the executor ticks
  that box. `tasks.md` is the official status; the SDD ledger is only for recovery.
- **plan header**: its spec reference points at the change's `specs/` and
  `design.md`, so the SDD pre-flight conflict scan treats them as the authority.
- **apply, change-directory authority**:
  - Step 0 commits the change dir on the feature branch, then creates the worktree
    with branch name **`<change-name>`**.
  - From then until finalize the **worktree copy is authoritative**: `tasks.md`
    ticks, `apply.md`, `verify.md` are written and committed there.
  - `openspec-verify-change` (and its `openspec` calls) runs with the worktree as working
    directory.
- **apply.md** records: worktree path, worktree branch, feature branch apply started
  from, base/integration branch, commit range, iteration, executor, tasks X of Y, and
  a cumulative `## Contract deviations` list (`none` when empty).
- **apply, per task**: write declarations or stubs matching the plan's Contracts,
  typecheck where the project has one, write the failing test, then implement. If a
  contract has to change, it is never changed silently: for a `public` contract the
  executor stops and asks the user, and after the decision it updates `plan.md` with
  the reason and records the deviation in `apply.md`; for an internal one it does the
  same straight away and continues. Until the receipt is written, the change is noted
  in the `plan.md` entry.
- **apply stops after the final whole-branch review**, writes `apply.md`, and does
  **not** invoke `finishing-a-development-branch`.
- **verify** is one check list:
  1. `openspec validate <change>` passes.
  2. All `tasks.md` boxes ticked, or each open box has a recorded reason.
  3. Every requirement has implementation evidence (file/line).
  4. Every scenario maps to a test and the project test command was run fresh in
     this step, with the result recorded.
  5. Design and contract coherence: `design.md` decisions, `plan.md` Contracts and
     the recorded Contract deviations match the code (warning only; entries that
     cannot be compared are `not verified`, and so is a `plan.md` with no Contracts
     section).
  6. Working tree clean; commit range recorded.

  Outcome `PASS` / `PASS_WITH_WARNINGS` / `FAIL`. Code-fixable FAIL → load
  `systematic-debugging`, re-apply (iteration N+1). Stop after 5 iterations and
  report. The "delta spec sync" check belongs to archive, not verify.
- **finalize** locates the worktree with `git worktree list --porcelain` filtered on
  `branch refs/heads/<change-name>` (asks the user if not found), reads branch facts
  from its `apply.md`, then runs the Superspec v4 closeout: ff-merge into the feature
  branch, re-test, remove the worktree, write and commit `finalize.md`, push, offer a
  PR, upsert the reviewer comment. Before the feature branch is touched, a **code
  review gate** (step 2b) reviews the worktree diff against the feature branch. A
  policy in the project's `AGENTS.md` overrides any of these steps.

## Review gates

A review gate asks the reviewer to decide on written work before the workflow moves on.
It ends in one outcome: `approved`, `approved with notes` or `changes requested`. A
closed or dismissed review is not an approval: the agent asks on the Interaction channel how to proceed.

- `openspec-continue-change` creates one artifact, runs a review gate on it and, once the gate is
  approved, goes on to the next artifact in the same run. It stops before `apply` and
  points you to `openspec-apply-change`. A gate that ends in `changes requested` makes it revise
  the artifact and reopen the gate, and no later artifact is created until it is
  approved; `dismissed` stops it and the agent asks on the Interaction channel how to
  proceed.
- `openspec-ff-change` runs a gate on `brainstorm.md`, creates proposal, design, specs, tasks and
  plan unattended, then runs one final gate over those five files. `brainstorm.md` is not
  repeated in the final gate.
- finalize runs a code review gate (step 2b) after the in-worktree test run and before
  the feature branch is checked out, merged, pushed or opened as a PR. Notes or requested
  changes stop finalize: fix on the worktree branch, update `apply.md` as iteration N+1
  (raise `Iteration:`, extend the commit range), run `openspec-verify-change` again and re-enter
  finalize. The escape hatch runs the same gate before merging locally or opening a PR;
  `skipped` is recorded only for keep-as-is, discard, or a gate you waive in chat.
- Interaction channel, detected by the extension and injected as an "Interaction channel"
  paragraph on every turn (skills no longer name review or ask tools). The first available
  channel is used, in this order:
  1. `inbox`: the `plannotator_inbox` tool; the gate is a message with a question and the
     files attached, and the agent ends its turn until you answer;
  2. `plannotator-tool`: the `plannotator` agent tool;
  3. `plannotator-cli`: the Plannotator CLI in the background (found by a probe at session
     start), with its JSON result read from a file;
  4. `ask-tool`: `ask_user_question`;
  5. `plain`: plain text with numbered options.

  `finalize.md` records the channel name (`inbox`, `plannotator-tool`, ...) in its
  "Reviewer tier" field.

  Only active tools count. A channel that fails to open falls to the next one; the same
  channel carries the gate, the questions and the code review.
- Wording-only notes after `approved with notes` are applied and the work continues;
  anything that changes a requirement, scope, decision or scenario reopens the gate. A
  revision cascades to dependent artifacts, and the next gate opens on the changed files.

## Conflicts resolved

| # | Conflict | Resolution |
|---|---|---|
| 1 | `brainstorming` writes to `docs/superpowers/specs/` and ends with "invoke writing-plans only". | Write into the change dir; on approval return to the OpenSpec flow (next: proposal). |
| 2 | `writing-plans` writes to `docs/superpowers/plans/` and ends with an execution handoff. | Write `plan.md`; skip the handoff; `openspec-apply-change` decides the executor. |
| 3 | SDD and `executing-plans` end by invoking `finishing-a-development-branch` — merge/PR before verify. | Apply stops after the final review and writes `apply.md`. |
| 4 | Two checklists plus the SDD ledger. | `tasks.md` authoritative; plan tasks carry its IDs; ledger is recovery only. |
| 5 | Upstream verify's five checks differ from `openspec-verify-change`; its sync check belongs to archive. | One verify list (above); sync moved to archive. |
| 6 | Finalize guesses the feature branch from `git log`. | `apply.md` records branch facts; finalize reads them. |
| 7 | Stock OpenSpec skills name Claude tools (`AskUserQuestion`, `Task`). | The skills are not forked: `workflow.md` states the pi tool mapping and fallbacks ([architecture.md](architecture.md#pi-tool-mapping)), and the schema instructions and routing note say it overrides the running skill. |
| 8 | Upstream says `executing-plans` lacks TDD/review; Superpowers 7 requires TDD there. | `executing-plans` is the fallback without a subagent plugin; it must still request a whole-branch review before `apply.md`. |
| 9 | `openspec-ff-change` runs unattended but brainstorming is interactive. | ff gates `brainstorm.md`, runs proposal, design, specs, tasks and plan unattended, then runs one final review gate over those five, stopping before apply. |
| 10 | The Superpowers bootstrap pushes brainstorming before any creative work, writing outside OpenSpec. | Routing note: four paths by kind of work (below). |
| 11 | A stock OpenSpec skill (for example its own artifact loop, hand-off or tool names) differs from `workflow.md`. | `workflow.md` wins; the schema instructions begin with a pointer to it, and the routing note's stock skills paragraph makes the agent read its section before running any stock skill. |

## Routing note (activated projects)

Injected through the `context` event, after the Superpowers bootstrap message when
present, otherwise at the head after compaction summaries (Superpowers no longer injects
its bootstrap from the second agent run). If Superpowers is not installed, `session_start`
warns once per session start (including reload) with `pi install git:github.com/obra/superpowers`:

- No spec change (small mistake, typo, fix restoring specified behaviour, refactor; confirm the behaviour in openspec/specs/ first, unspecified behaviour is a spec change) →
  work directly with TDD, no change directory.
- Spec change with clear requirements → `openspec-ff-change`.
- Spec change that needs careful step-by-step review → `openspec-new-change`, then `openspec-continue-change`.
- Questions, research and reviews → answer directly, without proposing a change.
- The agent states the path it chose and a one-line reason before starting.
- Never write design docs or plans to `docs/superpowers/`.

The routing note also carries a stock skills paragraph: it names the eight stock skills, tells the agent to read the step's section of `workflow.md` plus Shared rules, Review gate and Superpowers rule before running any of them (however invoked), says `workflow.md` overrides a stock skill where they differ, tells the agent to name a missing skill, point to `openspec config profile` and `openspec update` (or `/opsx-init`) and stop, and names the four unused stock skills (`openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change`, `openspec-onboard`) so the agent suggests the matching workflow skill instead. At session start an activated project with a UI is warned once if a required stock skill is missing.

The same context carries the Interaction channel paragraph (see Review gates).

## Commands

The package ships two commands. The workflow steps are stock OpenSpec skills from `.agents/skills/`, run under `openspec/schemas/superspec/workflow.md` with `/skill:<id>` or by asking the agent.

| Step or command | Stock skill | Behaviour |
|---|---|---|
| `/opsx-init` | — | Always available. Set up the project and install the stock skills; an outdated pristine schema is upgraded after confirmation, any other non-identical schema is blocked unless you pass `--force`, which replaces it after a backup. |
| `/opsx-generate-specs` | — | Activated projects only. Draft delta specs for an existing codebase in `bootstrap-specs`, then hand off to `openspec-ff-change`. |
| explore `[topic]` | `openspec-explore` | Free-form thinking, no code. |
| new `<name>` | `openspec-new-change` | Create a change with the `superspec` schema. |
| continue `[name]` | `openspec-continue-change` | Create the next ready artifact, run a review gate on it and, once approved, continue to the next; stops before `apply`. **Default path for changes needing close review.** |
| ff `<name or description>` | `openspec-ff-change` | Brainstorm interactively and gate `brainstorm.md`, generate proposal → plan unattended, then run one final gate; stop before apply. |
| apply `[name]` | `openspec-apply-change` | Run the schema's apply block. |
| verify `[name]` | `openspec-verify-change` | Produce `verify.md`. |
| sync `[name]` | `openspec-sync-specs` | Sync delta specs into living specs without archiving. |
| archive `[name]` | `openspec-archive-change` | Sync if needed, then archive. |

`finalize` is not a step of its own: create it with `openspec-continue-change` after verify passes.

Not shipped: the earlier `/opsx-<step>` commands, `opsx-propose` (skips brainstorm and plan) and `opsx-bulk-archive`. The stock skills `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard` stay installed but are not part of the workflow.
