# Superspec workflow rules

Each workflow step runs a stock OpenSpec skill under these rules. Before it runs the matching stock skill, however the skill was invoked, the agent reads that step's section, plus Shared rules, Review gate and Superpowers rule. Where the stock skill and this file differ, this file wins. The schema instructions returned by `openspec instructions` still apply; this file does not repeat them.

## Shared rules

- **Skill map.** Each section is named after its step: explore runs `openspec-explore`, new runs `openspec-new-change`, continue runs `openspec-continue-change`, ff runs `openspec-ff-change`, apply runs `openspec-apply-change`, verify runs `openspec-verify-change`, sync runs `openspec-sync-specs` and archive runs `openspec-archive-change`. Hand-offs and next steps name the stock skill id of the step.
- **Questions.** Ask the user as the routing note's Interaction channel paragraph describes (plain text with numbered options, recommended first, when it names no tool) and wait for the answer. This covers every question a stock skill asks.
- **Change selection.** Use the given or unambiguous name, or the only active change. When several changes exist and none is named or inferable, ask the user to choose, showing each candidate's name, schema and status with the most recently modified marked recommended; never guess. Announce the change used and how to override it (for example `openspec-apply-change <other>`).
- **Delegation.** Before delegating, read [subagent routing](subagent-routing.md) and follow it. Spawning, waiting and report collection follow the routing note's Subagent integration paragraph. When that paragraph says delegation is unavailable, do the work inline. Never invent subagent calls.
- **Progress.** Track progress through artifacts or tasks with the `todo` tool if available; otherwise state the checklist in your reply. `tasks.md` stays the official status.
- **Workspace mode.** When `openspec status` reports `actionContext.mode: "workspace-planning"`, verify, sync and archive are not supported here: explain it, treat linked repos as read-only context and stop before editing files. apply follows its workspace guard in the apply section.
- **Finishing.** No command invokes `finishing-a-development-branch`; merging, pushing and PR handling belong to the finalize artifact.

## explore

- Never write code. Editing a schema, a template or `config.yaml` counts as implementing: refuse it and point the user to creating a change with the `openspec-new-change` skill.
- Reading is free, but before the first write name the file and the scope and wait for a yes, unless the user asked for the capture.
- This overrides the stock explore skill's "capture the requested artifacts" behaviour: even when the user asks to capture proposal or specs into a new change, scaffold only with `openspec new change <name>` and point to `openspec-continue-change <name>`.
- When an insight needs a new change, you may run `openspec new change <name>`. Never create `openspec/changes/` by hand. Then point to `openspec-continue-change <name>`. Every artifact after the scaffold needs the gated `brainstorm`, so explore only scaffolds and hands off: do not write `brainstorm.md` or any later artifact for a new change, and do not run a review gate in explore.
- For an existing change, capture targets are `proposal.md`, `specs/<capability>/spec.md`, `design.md` and `tasks.md`. `brainstorm.md` and `plan.md` are never explore capture targets because they are written through `openspec-continue-change <name>` with its review gate.
- Hand-offs name `openspec-new-change <name>` to start a change and `openspec-continue-change <name>` to continue one, in place of every stock hand-off to another skill.
- Diagrams use ASCII characters only.
- **Recon.** Use an agent meeting the scout role only when a non-trivial repository investigation earns its overhead: bound the paths and collect the report as the Subagent integration paragraph describes. The scout is evidence-only and read-only and must never write code, schema or official artifacts. Small conceptual exploration stays inline, and scout availability alone does not trigger a call. The user conversation stays with the parent.

## new

- Run `openspec list --json` first. If a change with that name exists, do not create it: suggest `openspec-continue-change <name>` and stop.
- Never pass `--schema`, even when the user names a workflow; the project config selects `superspec`.
- Create no artifact. After showing the first artifact's instructions, stop and say: "Use the `openspec-continue-change` skill to create the next artifact, or `openspec-ff-change` to fast-forward."

## continue

- **Gate and advance.** Create exactly one artifact per gate, then run the Review gate on the file(s) written. On `approved`, or `approved_with_notes` handled per the Review gate, re-read the status and create the next ready artifact, then gate it, without a new command. Repeat until planning is complete or the next ready artifact is `apply`.
- **Only a human gate approval advances.** `changes_requested` and `dismissed` do not advance, and neither does an internal review verdict.
- **Stop before apply.** Planning is complete when `isPlanningComplete` is true (fall back to `isComplete` when it is absent). Stop when planning is complete or the next ready artifact is `apply`; never create the `apply` artifact; point to `openspec-apply-change`.
- **Partial artifacts.** A `done` glob artifact such as `specs` can still miss files the proposal calls for. Write only the missing files as that call's one artifact, then run the Review gate on them; after approval, continue.
- **Skipped artifacts.** An artifact with status `skipped` is satisfied: never create it and do not look for its files.
- **Dependencies.** Before creating an artifact, re-read every dependency file from disk, not from conversation memory.
- **Planning already complete.** Create nothing except a ready `finalize` artifact, gated like the others; otherwise point to `openspec-apply-change`.
- **Finalize.** Run the code review gate while creating `finalize`, at its step 2b, before the git-side closeout. `finalize.md` is committed and pushed when written, so a `changes_requested` on it is handled as a follow-up commit and push on the feature branch.
- **Internal check before the gate.** When the artifact just completed is `specs` (all files, or the missing files of a partial artifact), dispatch an agent meeting the spec reviewer role; when it is `plan`, an agent meeting the plan reviewer role. Give it the artifact and the existing dependency files it needs, including existing specs when only partial specs were added. For the spec review, also pass the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename; name a capability with no main spec as having no baseline. Resolve substantive findings and re-review substantive revisions before the human gate; keep existing files unless a finding needs a reviewed revision. The verdict is advisory, not a human approval, and adds no stop or second artifact. When the integration is absent, run an inline self-check of the same quality in the same order; the inline self-check compares the deltas with the same main specs. A disabled or missing role stops per the shared reference.
- **Output.** Report the artifact created and its gate outcome. When stopped before `apply`: "Planning is complete. Use the `openspec-apply-change` skill next, or tell me what to change."; when stopped at a gate: "Use the `openspec-continue-change` skill again, or tell me what to change."

## ff

- If the change already exists, tell the user and ask to confirm continuing it; then skip artifacts already `done` and never overwrite one. Never pass `--schema`.
- **Brainstorm gate.** Run the `brainstorm` artifact interactively and never fabricate the user's answers or approval. Right after `brainstorm.md` is written, run the Review gate on that one file. Create no later artifact until it is approved.
- **Unattended phase.** After that approval, create every remaining artifact in dependency order without asking for review, re-reading the status after each, until every `applyRequires` artifact (`plan`) is done. Ask only when required input is missing, that is when no reasonable default follows from the brainstorm, earlier artifacts and the repository; otherwise decide and record the assumption in the artifact. Do not ask the execution-handoff question that writing-plans asks at its end.
- **Design.** Always create `design`, even if its `instruction` calls it optional, and the final gate packet still lists it. Skip no other artifact unless `status` already reports it `skipped`.
- **Grounding.** Inspect the relevant repository code, tests and docs before drafting; tasks reference real files or tests you found, never a generic "explore the codebase" step.
- **Internal checks.** After `specs` and after `plan`, run the internal check of the continue section inside the unattended loop, before the final gate. These internal reviews add no extra human stop or approval. Optional brainstorm recon uses an agent meeting the scout role; recon never moves the user conversation into a child.
- **Planned stops.** The brainstorm gate and the final gate are the only planned stops. If no artifact is ready while `applyRequires` is unmet, show the status, stop and report why.
- **Final gate.** Once `plan` is done, run the Review gate once on the final packet: `proposal.md`, `design.md`, every `specs/<capability>/spec.md` (each by path), `tasks.md` and `plan.md`, passed as an explicit ordered list, never a folder. It does not repeat `brainstorm.md`, which was approved at its own gate. On `changes_requested`, revise, cascade per the Review gate and reopen it.
- **End.** Never create the `apply` artifact and do not start apply. The final summary lists each artifact created, each other `skipped` artifact with its reason, and the final gate outcome. Point to `openspec-apply-change` only after the final gate is approved.

## apply

- **The schema replaces the stock loop.** Read `openspec instructions apply --change <name> --json` and follow its steps (the step 0 commit, the `<change-name>` worktree, the executor, the `apply.md` receipt) in place of the stock skill's task loop. The first apply and every fix iteration before finalize implement only in the `<change-name>` worktree; post-PR mode works on the feature branch.
- **Find the worktree first.** Before any other `openspec` call, run `git worktree list --porcelain` and pick the entry whose branch line is `branch refs/heads/<change-name>`. If found, reuse it: run every `openspec` call there, skip step 0 and worktree creation, and read `apply.md` there. Re-runs never redo step 0 or recreate the branch.
- **States, in this order:**
  1. Post-PR trigger: `apply.md` and `finalize.md` both exist and the user brings PR review feedback. Go to post-PR mode, skipping the `blocked` and `all_done` stops.
  2. Fix-iteration trigger: `apply.md` exists and `verify.md` reports `FAIL`. Go to fix-iteration mode, skipping the `all_done` stop.
  3. `blocked`: change no code. Missing artifacts: point to `openspec-continue-change`. Missing tracking file: report it, offer to repair it and start no implementation. Stop.
  4. `all_done`: say the tracked tasks are complete, point to `openspec-verify-change` and then `openspec-archive-change`, and stop.
- **Workspace guard.** If status reports `actionContext.mode: "workspace-planning"` and `allowedEditRoots` is empty, explain that full workspace apply is not supported here, treat linked repos as read-only context and stop before editing files.
- **Executor.** If delegation is available through the Subagent integration paragraph, read `subagent-driven-development` and execute `plan.md` through it. Select and announce an agent for the implementer role and one for the task reviewer role per the shared reference:
  - the implementer role takes each task; after each task, one combined spec and quality review by the task reviewer role; the final whole-branch review is one more task reviewer seat over the full range; no duplicate generic reviewer beside these seats;
  - one implementation writer per worktree; use the configured models: no per-dispatch model override, and a thinking level only as the reference's Lanes section allows. This overrides any conflicting generic model-pinning advice in `subagent-driven-development`;
  - the parent keeps the `todo` progress, ticks `tasks.md`, and gives each reviewer the exact BASE..HEAD range plus the diff or file package;
  - schedule one lane per plan task as the reference's Lanes section describes. This overrides the `subagent-driven-development` rule against parallel implementation children: parallel writer lanes are allowed only in separate child worktrees, and inside one worktree its sequential rule stands. An escalated lane waits: the parent does neither merge nor tick it until the escalation is answered and the lane finishes.

  If the Subagent integration paragraph says delegation is unavailable, read `executing-plans`, tell the user that TDD and review are not enforced, follow TDD manually, and request a whole-branch review (`requesting-code-review`) over the full commit range before writing `apply.md`. If no available agent meets a role, the integration is incompatible, a child launch fails or a child fails mid-run (runtime failure), report the named cause, the run identity and any partial state, and stop the affected lane; use no generic replacement or substitute and never silently go inline. Fix-iteration and post-PR modes use the same policy and seats wherever they delegate.
- **Contracts.** Brief the executor to read the Contracts section of `plan.md` and to follow the apply instruction's per-task contract order and stop rule. A `public` contract stops the executor and goes to the user; after that decision, and for an internal contract straight away, the entry is updated in `plan.md` with the reason and recorded in `apply.md` under "Contract deviations".
- **Ticks.** Tick each task in the worktree copy at the `sourcePath` and `line` the apply instruction returns, after checking that the checkbox there still matches the task; if not, re-read the tracking file and do not tick a different task. Mark `[x]` only when the behavior is fully implemented.
- **Pause** when a task is unclear, implementation reveals a design issue (suggest artifact updates) or an error blocks you. Also pause and ask before adding scope no artifact specifies, or narrowing or deferring specified behavior. Do not guess.
- **Receipt and stop.** After the final whole-branch review, write and commit `apply.md` in the worktree, carrying over the cumulative "Contract deviations" and adding this run's entries. Then stop, report the executor and the commit range, and point to `openspec-verify-change`. Apply never opens the code review gate; the code review gate belongs to finalize.
- **Post-PR mode.** Read `receiving-code-review` and follow it. Finalize removed the worktree, so work and run `openspec` calls on the feature branch in the main checkout; a worktree found anyway stays authoritative. Fix with TDD, append a `post-PR iteration N+1` entry with the new commit range to `apply.md` (keep the "Contract deviations"), tell the user to run `openspec-verify-change`, then update `finalize.md`. Push and the reviewer comment follow the policy in `finalize.md`; a policy in the project `AGENTS.md` overrides it.
- **Fix-iteration mode.** In the worktree, read `Iteration:` in `apply.md`; if it is already 5, stop, report the remaining CRITICAL items of `verify.md` and what was tried, and wait for the user. Otherwise read `systematic-debugging`, find the root cause of each CRITICAL item (fix an artifact-level item in the artifact first), fix it with TDD scoped to those items, raise `Iteration:` by one, rewrite and commit `apply.md` (keep the "Contract deviations"), stop and point to `openspec-verify-change`.

## verify

- **Worktree.** Find the `<change-name>` worktree as apply does. Without one, run in the main checkout on the feature branch when `finalize.md` exists; otherwise ask the user where the worktree is and do not guess. Every `openspec` call and check, including the test run, uses that working directory; until finalize, never read the change from the main checkout.
- **Apply receipt.** If `apply.md` does not exist, stop and point to `openspec-apply-change`. Note its `Iteration:`, commit range and executor.
- **Progress.** Read task progress from the apply instruction (`progress`); an unavailable tracking file makes the tasks check not verified.
- **Checks.** Run the six checks of `openspec instructions verify --change <name> --json` and write `verify.md` from its template, in place of the stock skill's report. Run the project tests fresh in the worktree; never reuse earlier output or the result in `apply.md`; record the command, exit status and counts. Failing fresh tests are `FAIL`. Compare Contracts read-only; a recorded deviation is the expected state, so compare against it.
- **Delegated evidence.** When delegation is available and an agent meeting the verifier role is selected, it may collect evidence for the six checks: hand it the authoritative worktree as cwd, the change root, the context paths and the checks; it returns the Checks and Validation report. The verifier never fixes or modifies code and never writes `verify.md`; only the parent writes and commits the receipt. Accept only evidence with command, cwd, exit status, counts and file evidence collected in this invocation; reject old apply or verify results and any earlier output. The parent inspects the report and the files it cites, runs the missing checks it can, and never trusts report-only success or a successful child exit. When delegation is absent, the parent runs the same checks inline and never fabricates child evidence. When no available agent meets the role, the integration is incompatible or a launch fails, verification stops with the named cause and no generic substitute.
- **Read-only.** Do not implement or archive anything during verify. The delta-spec sync check belongs to `openspec-archive-change`; do not perform it and do not edit main specs.
- **Next step.** On `PASS` or `PASS_WITH_WARNINGS`, point to `openspec-continue-change` with the worktree as working directory to create `finalize`, then `openspec-archive-change`. On a code-fixable `FAIL`, report the CRITICAL items with the loop status (iteration N of 5) and point to `openspec-apply-change` (a fix iteration), then `openspec-verify-change`. On a `FAIL` whose fix is an artifact, say which artifact to fix, then `openspec-apply-change` and verify again.
- **Iteration cap.** Verify's iteration equals the `Iteration:` value in `apply.md`. Stop after 5 iterations: if the verify at iteration 5 still returns `FAIL`, do not loop again; report the remaining CRITICAL items and what was tried, then wait for the user. Post-PR iterations are tracked separately in `apply.md` and do not count toward the 5.

## sync

- **Where.** When a `<change-name>` worktree exists, work there; its copy of the change directory is authoritative. Edit nothing outside `openspec/specs/`, and never archive, move or delete the change.
- **Rules.** Read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints on the text you write; never copy the `rules` into any spec. If reading the instructions fails, stop and report the error without writing any spec.
- **Order.** Apply each delta in the order RENAMED, REMOVED, MODIFIED, then ADDED. A MODIFIED block replaces the whole requirement block with the delta's block (the delta carries the full text); do not merge partially.
- **Headers.** Match `### Requirement:` headers exactly, after trimming whitespace, case-sensitive. If a RENAMED `FROM`, REMOVED or MODIFIED header has no match and the entry is not already applied, do not guess: report it and ask. A REMOVED header already absent, or a RENAMED entry whose `TO` exists while `FROM` is absent, counts as already applied and is skipped silently.
- **Blocks.** A blocked capability writes nothing; capabilities already written stay written. List each blocked capability in the report so a partial sync is distinguishable from a complete one.
- **Validate.** If `openspec validate --specs` fails, fix the merge, or ask the user when the cause is in the delta.

## archive

- **Where.** Run in the main checkout, after finalize and before the PR merges.
- **Completion.** An artifact with status `skipped` counts as complete. Take task counts from `openspec list --json`; if that output is invalid or omits the change, stop with an error and do not archive. Incomplete artifacts or tasks: warn, ask the user to confirm and archive only on confirmation.
- **Delta specs.** Find the delta specs from `artifactPaths.specs.existingOutputPaths`, or by listing `specs/<capability>/spec.md` in the change directory when that entry is missing or empty; this overrides the stock rule that `existingOutputPaths` is the only source. A missing main spec is not unsynced by itself; decide by the delta operations as the sync section and the stock sync skill define.
- **Synced means.** A delta is synced when every ADDED and MODIFIED requirement exists in the main spec with the same header and the same text after normalizing whitespace, every REMOVED header is absent, and every RENAMED `TO` header exists. A second check after a sync reports "already synced" and never asks again.
- **Choices.** All synced: report "already synced" and archive without syncing or asking. Not synced and nothing blocked: offer "Sync now (recommended)", "Archive without syncing" and "Cancel". Any capability blocked: offer only "Archive without syncing" or "Cancel", never "Sync now". An answer that is none of the offered choices is asked again and never archives.
- **Sync now.** Run the sync section's rules for this change, then return here. If the sync reports a capability "Blocked: <reason>", take the blocked path for those capabilities; after "Archive without syncing", still re-compare the capabilities that were not blocked.
- **Re-compare.** After a sync, compare every delta again with its main spec, excluding capabilities the user chose to archive unsynced. Report "Synced" only if all match; if any differs, stop and do not archive.
- **Archive through the CLI.** Check `openspec archive --help` first, then run `openspec archive "<name>" --skip-specs -y` in every case: the sync above owns the spec update, `-y` avoids a hanging prompt, and `--skip-specs` keeps the CLI from syncing behind the user's back. Never pass `--no-validate`. Never move the change directory by hand with `mv`, which overrides the stock skill's move. If the archive target exists or the CLI fails, report the error and stop.
- **Summary.** The Specs line is one of "Synced to main specs", "Already synced", "No delta specs", "Sync skipped", "Sync blocked: <capabilities>, archived without syncing" or "Partially synced: <synced capabilities>; blocked: <capabilities>", followed by the warnings the user accepted.

## Review gate

A review gate asks the reviewer to decide on written work before the workflow moves on. It ends in exactly one outcome:

| Outcome | Result on the channel |
|---|---|
| `approved` | approved, with no notes |
| `approved_with_notes` | approved, with notes or comments |
| `changes_requested` | changes requested, with notes |
| `dismissed` | closed without a decision, or no answer |

Only `approved` and `approved_with_notes` let the workflow continue. The `dismissed` outcome is not an approval, so ask the user on the Interaction channel how to proceed and do not continue until they answer.

- **Open the gate** on the channel named in the routing note's Interaction channel paragraph and follow its mechanics; when it fails to open, tell the user and use the fallback it names.
- **Handle notes** for `approved_with_notes` and `changes_requested`: apply every note to the reviewed files. After `approved_with_notes`, if every note is only wording, formatting or clarification, and none changes a requirement, scope, decision, scenario or the meaning of another artifact, continue and show a short diff of what changed. Otherwise open the gate again on the changed files. When unsure, reopen. After `changes_requested`, always open the gate again.
- **Cascade a revision**: find the dependents of each revised artifact from the dependency data (`requires` and `dependencies`) in `openspec status --change "<name>" --json`, not from file times. Edit the dependents so they stay consistent (do not regenerate them from scratch) and open the next gate on only the files that changed. If `brainstorm.md` is revised after the generation of the later artifacts, say so and open the next gate on every artifact that depends on it: `brainstorm.md` plus all five later artifacts (proposal, design, specs, tasks, plan), or those of them that exist.
- **Code review gate**: while creating the `finalize` artifact, the schema asks for a code review gate after the in-worktree test run and before the feature branch is touched. It uses the same outcomes, with these differences:
  1. Open it with the Interaction channel paragraph's code review mechanics, reviewing every commit on the worktree branch since the feature branch recorded in `apply.md`; `dismissed` is not approved.
  2. On `approved`, continue finalize. On `approved_with_notes` or `changes_requested`, stop before the feature branch is checked out, merged, pushed or opened as a PR (do not run finalize step 3). Fix the code on the worktree branch following `receiving-code-review` and TDD, update `apply.md` as iteration N+1 (raise `Iteration:`, extend the commit range to the new HEAD, and note the gate outcome and the resume point in its next step), as the apply template directs, run `openspec-verify-change` again, and re-enter finalize.
  3. After `approved_with_notes`, the code review gate reopens only if a note changed behaviour or a requirement, or you are unsure; wording-only notes resume finalize after the re-verify, re-entering it at step 3 of the finalize instruction (the checkout of the feature branch), not at step 2b. After `changes_requested` the gate always reopens.
  4. Record the outcome (`approved`, `approved with notes` or `skipped` with a reason, only where the finalize instruction allows a skip), the channel used as the reviewer tier and the commit range reviewed in `finalize.md`.

## Superpowers rule

If an instruction names `superpowers:<x>`, drop the prefix and read the `SKILL.md` of skill `<x>` from the available skills list. Follow it, but write output only where the instruction says (never under `docs/superpowers/`) and ignore that skill's own closing step (invoking another skill, a next-skill handoff or an execution handoff). Its own approval gates, self-review or commit steps must not produce a second artifact, add a stop, or run past the gate of the current artifact. The review gate on `brainstorm.md` is the brainstorming skill's design-doc approval; never ask for it separately. If skill `<x>` is not available, STOP and tell the user to install Superpowers.

## Stock skills not used

OpenSpec may install `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard`; they are not part of Superspec. When the user asks for one, or a stock skill points to one, suggest the matching workflow skill instead: `openspec-new-change` or `openspec-ff-change` to start a change, `openspec-continue-change` to revise one, and `openspec-archive-change` for each change to archive.
