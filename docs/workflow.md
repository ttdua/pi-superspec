# Workflow

The unified pi-superspec workflow: ten steps per change, one change directory
`openspec/changes/<name>/`. OpenSpec owns *what* changes; Superpowers owns *how* it
is built. Everything not stated here keeps upstream Superspec v4 behaviour.

## Artifact DAG

```text
brainstorm ─┬─→ proposal ─→ specs ─→ tasks ─→ plan ─→ apply ─→ verify ─→ finalize   (then /opsx-archive)
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
| 5 | tasks | `tasks.md` | OpenSpec | Coarse, human-scannable checklist tracked by apply, verify and archive. |
| 6 | plan | `plan.md` | Superpowers `writing-plans` (redirected) | Opens with `## Contracts`, then 2–5 minute TDD micro-steps, exact files, test commands, commit points. |
| 7 | apply | code + `apply.md` | Superpowers `using-git-worktrees` + `subagent-driven-development` (fallback `executing-plans`) | Isolation, fresh subagent per task, TDD, per-task and whole-branch review, ledger for recovery. |
| 8 | verify | `verify.md` | OpenSpec verify + Superpowers `verification-before-completion`; `systematic-debugging` on FAIL | Spec-level correctness backed by fresh evidence. |
| 9 | finalize | `finalize.md` | Superspec v4 git-side closeout; `finishing-a-development-branch` as escape hatch | Deterministic merge back to the feature branch, push, PR offer, reviewer comment. |
| 10 | archive | change moved to `archive/` | OpenSpec `/opsx-archive` | Sync deltas into living specs; runs before the PR merges so the PR holds the full history. |

After a PR is open, review feedback is handled with Superpowers
`receiving-code-review` on the feature branch in the main checkout (TDD per fix);
then update `apply.md` as post-PR iteration N+1 (raise `Iteration:`, extend the
commit range to the new HEAD), re-run verify, update `finalize.md`, and push / upsert the reviewer
comment under the same policy as finalize.

## Step rules

- **brainstorm** holds the *why*: intent, goals / non-goals / anti-goals, approaches
  considered and the one chosen, open questions. Technical decisions go to
  `design.md`. The two must not repeat each other.
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
  - `/opsx-verify` (and its `openspec` calls) runs with the worktree as working
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
closed or dismissed review is not an approval: the agent asks in chat how to proceed.

- `/opsx-continue` creates one artifact, runs a review gate on it, then stops.
- `/opsx-ff` runs a gate on `brainstorm.md`, creates proposal, design, specs, tasks and
  plan unattended, then runs one final gate over those five files. `brainstorm.md` is not
  repeated in the final gate.
- finalize runs a code review gate (step 2b) after the in-worktree test run and before
  the feature branch is checked out, merged, pushed or opened as a PR. Notes or requested
  changes stop finalize: fix on the worktree branch, update `apply.md` as iteration N+1
  (raise `Iteration:`, extend the commit range), run `/opsx-verify` again and re-enter
  finalize. The escape hatch runs the same gate before merging locally or opening a PR;
  `skipped` is recorded only for keep-as-is, discard, or a gate you waive in chat.
- Reviewer, chosen each time a gate opens, in this order:
  1. the `plannotator` agent tool;
  2. the Plannotator CLI, run in the background, with its JSON result read from a file;
  3. `ask_user_question`;
  4. plain text with numbered options.

  A tier that fails to open falls to the next one.
- Wording-only notes after `approved with notes` are applied and the work continues;
  anything that changes a requirement, scope, decision or scenario reopens the gate. A
  revision cascades to dependent artifacts, and the next gate opens on the changed files.

## Conflicts resolved

| # | Conflict | Resolution |
|---|---|---|
| 1 | `brainstorming` writes to `docs/superpowers/specs/` and ends with "invoke writing-plans only". | Write into the change dir; on approval return to the OpenSpec flow (next: proposal). |
| 2 | `writing-plans` writes to `docs/superpowers/plans/` and ends with an execution handoff. | Write `plan.md`; skip the handoff; `/opsx-apply` decides the executor. |
| 3 | SDD and `executing-plans` end by invoking `finishing-a-development-branch` — merge/PR before verify. | Apply stops after the final review and writes `apply.md`. |
| 4 | Two checklists plus the SDD ledger. | `tasks.md` authoritative; plan tasks carry its IDs; ledger is recovery only. |
| 5 | Upstream verify's five checks differ from `openspec-verify-change`; its sync check belongs to archive. | One verify list (above); sync moved to archive. |
| 6 | Finalize guesses the feature branch from `git log`. | `apply.md` records branch facts; finalize reads them. |
| 7 | OpenSpec-generated skills name Claude tools (`AskUserQuestion`, `Task`). | Package skills use pi tools with fallbacks ([architecture.md](architecture.md#pi-tool-mapping)). |
| 8 | Upstream says `executing-plans` lacks TDD/review; Superpowers 7 requires TDD there. | `executing-plans` is the fallback without `pi-subagents`; it must still request a whole-branch review before `apply.md`. |
| 9 | `/opsx-ff` runs unattended but brainstorming is interactive. | ff gates `brainstorm.md`, runs proposal, design, specs, tasks and plan unattended, then runs one final review gate over those five, stopping before apply. |
| 10 | The Superpowers bootstrap pushes brainstorming before any creative work, writing outside OpenSpec. | Routing note by kind of work (below). |

## Routing note (activated projects)

Injected through the `context` event, after the Superpowers bootstrap message when
present, otherwise at the head after compaction summaries (Superpowers no longer injects
its bootstrap from the second agent run). If Superpowers is not installed, `session_start`
warns once per session start (including reload) with `pi install git:github.com/obra/superpowers`:

- Work that adds or changes behaviour → propose creating a change with `/opsx-new`
  before brainstorming.
- Small work that changes no spec (bug fix restoring specified behaviour, typo,
  refactor) → do it directly with TDD, no change directory.
- Never write design docs or plans to `docs/superpowers/`.

## Commands

| Command | Behaviour |
|---|---|
| `/opsx-init` | Always available. Set up the project; an existing non-identical schema is left unchanged with a warning (automatic upgrade and repair are planned, not shipped). |
| `/opsx-explore [topic]` | Free-form thinking, no code. |
| `/opsx-new <name>` | Create a change with the `superspec` schema. |
| `/opsx-continue [name]` | Create the next ready artifact, run a review gate on it, then stop. **Default path.** |
| `/opsx-ff <name or description>` | Brainstorm interactively and gate `brainstorm.md`, generate proposal → plan unattended, then run one final gate; stop before apply. |
| `/opsx-apply [name]` | Run the schema's apply block. |
| `/opsx-verify [name]` | Produce `verify.md`. |
| `/opsx-sync [name]` | Sync delta specs into living specs without archiving. |
| `/opsx-archive [name]` | Sync if needed, then archive. |

`finalize` is not a command: create it with `/opsx-continue` after verify passes.

Not shipped: `opsx-propose` (skips brainstorm and plan) and `opsx-bulk-archive`.
