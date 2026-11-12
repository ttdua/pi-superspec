# Subagent routing

Shared delegation policy for Superspec skills that hand bounded work to child agents. Skills read this before delegating and keep their stage-specific steps next to the relevant step. This reference describes delegation by function: spawn a role, collect its report, wait, answer an escalation. The mechanics for the detected integration live in the Subagent integration paragraph of the routing note; this reference points to it and does not repeat it. This reference is not a skill or slash command; it does not register agents, write settings, install packages, or touch schema or templates.

## Roles

Each role is a set of requirements, not an agent name. Any available agent whose tools and skills evidently meet a role may take it (see Selection).

| Role | Access | Required tools | Skills | Report |
| --- | --- | --- | --- | --- |
| Scout | read-only | read, grep, find, ls, bash (inspection only) | none | Summary, Evidence, Findings, Limitations, Candidate behaviors, Start here |
| Spec reviewer | read-only | read, grep, find, ls | none | Summary, Evidence, Findings, Limitations, Verdict |
| Plan reviewer | read-only | read, grep, find, ls | `coding-standards` (optional) | Summary, Evidence, Findings, Limitations, Verdict |
| Implementer | writer | read, grep, find, ls, bash, edit, write | test-driven-development, verification-before-completion, systematic-debugging; `coding-standards` (optional) | Summary, Evidence, Findings, Limitations, Changes, Validation, Contract deviations |
| Task reviewer | read-only | read, grep, find, ls | `coding-standards` (optional) | Summary, Evidence, Findings, Limitations, Verdict |
| Verifier | read-only | read, grep, find, ls, bash (inspection only) | verification-before-completion | Summary, Evidence, Findings, Limitations, Checks, Validation |

## Availability

Resolve availability at use time through the Subagent integration paragraph, and preflight only the roles the current stage requires.

1. **Lazy activation.** If the Subagent integration paragraph says delegation needs an activation step, perform it, then re-evaluate on the next model turn. Do not assume the delegation tools exist in the same turn.
2. **Available.** Use the paragraph's mechanism to list the available agents and inspect their tools and skills before dispatch. Role skills are required or optional. `coding-standards` (implementer, task reviewer, plan reviewer) is the only optional role skill; every other role skill is required. Treat it as missing when the listing reports it unavailable for the chosen agent or `skill:coding-standards` is not discoverable. Then announce once per stage that the coding standard is unavailable and agents fall back to project conventions, and dispatch as usual: a missing optional skill does not stop the stage, and the parent writes no settings. A missing required skill is a role no agent meets (see Selection).
3. **Unavailable.** If the paragraph says delegation is unavailable, announce the inline fallback once and follow the existing inline path. Gates, ordering, and evidence rules are unchanged. Do not invent or fabricate child calls.
4. **Unsupported or disabled.** Integration that is present but incompatible, or a role no agent meets, is distinct from unavailable integration. See Selection and Failures; it never selects the inline fallback.

Tool availability alone does not authorize delegation beyond the requested workflow or applicable user/project instructions.

## Selection

Pick, per role, one agent whose tools and skills evidently meet the role's requirements. Evidence is the listing detail or the agent file frontmatter. Bundled agents get no precedence over other qualifying agents. Announce once per stage which agent is chosen for each role.

A read-only role only takes an agent whose known tool set contains no edit or write tool; an unknown tool set does not qualify. When no agent qualifies (agents disabled, tool set unknown or too broad, or required skills or tools unavailable), report the role and the missing requirement, then stop the affected delegated stage. Make no change to operator settings and no bypass through a generic agent, an alternate CLI, or silent inline recovery. The parent never chooses a package update or an explicitly chosen inline route silently; the user decides.

## Handoff

Child context is fresh, so the brief must be recoverable without parent history. Include:

- goal
- authoritative cwd and change root
- resolved input paths (artifacts, task files)
- task or criterion IDs
- refs or diff package for review work
- constraints
- allowed edits (none for read-only roles)
- acceptance criteria
- validation commands
- stop conditions
- report contract (the role's required sections)
- report destination: where the child returns or saves its report, from the Subagent integration paragraph
- escalation: the channel from the Subagent integration paragraph, or "none"

Omit any model setting on every dispatch; user and project configuration choose models. A thinking level, derived only from task difficulty as Lanes defines, is the sole per-dispatch setting allowed.

Spawn, thinking, and report collection follow the Subagent integration paragraph; do not invent mechanics it does not describe. Collect each report through that mechanism and keep it as a run-managed or explicit scratch artifact. When the integration returns the report inline instead of writing a file, the parent writes it to a scratch file itself before checking its evidence. A path in prose does not bind a report destination.

A child that escalated is waiting for an answer, not complete. Answer it through the paragraph's answer mechanism, or ask the user when the decision is theirs; do not record the child as complete. Until the child finishes, the parent does not merge or tick its work.

## Lanes

Apply schedules by plan task. A plan task is one group of the tasks list; one lane runs one whole group, so the same implementer does its checkboxes in order, and they are never dispatched as separate lanes.

- **Ready.** A plan task is ready when every task named in its `Blocked by` is merged into the `<change-name>` branch. A task with `Blocked by: none` is ready at the start of apply; a task whose blockers are not yet merged waits and is not started. If the declared files of two ready tasks overlap, they do not run at the same time; run them one after another. A task with no declared file list overlaps every other task.
- **Legacy plan.** A plan without `Blocked by` metadata runs its tasks one after another in plan order. When the plan has metadata, the plan governs scheduling whatever the tasks list holds.
- **Isolation.** A writer lane that runs while another writer lane is active gets its own child worktree on branch `<change-name>--task-<N>`, cut from the current `<change-name>` HEAD and created through the worktree mechanism apply already uses. Each worktree keeps exactly one writer. Read-only and review lanes may run in parallel without a child worktree.
- **Cap.** Run at most three writer lanes at once unless project instructions set a lower limit; the remaining ready tasks wait.
- **Review and merge.** The task reviewer reviews the lane range. Merge a lane into `<change-name>` with a merge commit only after its review passes, in task-ID order among the lanes that are done, then remove the lane worktree. The final whole-branch review covers the full `<change-name>` range, merges included.
- **Escalation.** A lane whose implementer has escalated is waiting: the parent does neither merge nor tick it until the answer is given and the lane finishes.
- **Conflicts.** On a merge conflict, abort the merge, discard the lane, and run that task alone on the new HEAD. A second conflict for the same task stops apply and asks the user.
- **Receipt.** `apply.md` keeps one commit range over `<change-name>` that covers the merges, which finalize and the code review gate keep reading. It also gets a `## Lanes` section with one row per task: task ID, lane branch or `sequential`, lane commit range, task review verdict and merge commit.
- **Thinking.** For the implementer and the task reviewer of a plan task, derive the thinking level from the task's `Difficulty` and pass it only through the mechanism the Subagent integration paragraph names. Set no model (see Handoff). An agent definition that locks thinking wins. If the paragraph says no thinking level is accepted, pass none.

| Difficulty | Thinking |
| --- | --- |
| Easy | low |
| Normal | medium |
| Hard | high |
| Very Hard | xhigh |

## Authority

The parent owns official artifact writes, task checkbox updates, receipt outcomes, human gates, and publication decisions. Tool availability does not authorize delegation outside the requested workflow. A child may recommend; it cannot approve a gate, expand scope, push, merge, or open a pull request.

- Use fresh child context and no nested subagents. Keep one implementation writer per worktree; several writer lanes may run at once only in separate worktrees as Lanes defines. Parallelize independent reads and reviews.
- Reuse existing review seats (for example the SDD task-review seat); never double-dispatch the generic Superpowers reviewer alongside a Superspec reviewer.
- Wait for children as the Subagent integration paragraph describes. Do not poll with short checks or sleeps.
- Re-read official dependencies and inspect returned evidence (paths, diffs, command/cwd/exit/counts) before writing artifacts, ticking tasks, or recording outcomes.
- A report missing required evidence or sections is incomplete. Never infer completion from process status or a successful exit, and headings alone do not prove correctness.
- Scope or contract conflicts are escalated, not resolved silently against approved artifacts.

## Failures

- **Named cause, stop.** When a required role is disabled or missing, discovery is unsupported, or required skills or tools are unavailable (a missing optional skill is handled in Availability and does not stop the stage), report the named cause and stop the affected delegated stage. Do not rewrite settings, and do not fall back to a generic agent, an alternate CLI, or inline recovery. Offer a package update or an explicitly chosen inline route as options for the user. The parent never chooses either route silently; the user decides.
- **Launch or runtime failure.** Stop the lane. Retain and report the exact error, run identity, cwd/worktree, and any partial state. Do not retry with another mechanism or recover inline in the background.
- **Incomplete report.** Record the gap and treat the task as not complete.

## Compatibility

Smoke-tested builds per integration are recorded in [docs/architecture.md](https://github.com/ttdua/pi-superspec/blob/main/docs/architecture.md) and [docs/e2e-checklist.md](https://github.com/ttdua/pi-superspec/blob/main/docs/e2e-checklist.md). This reference does not claim that untested versions or forks are compatible. Runtime evidence recorded during testing supersedes any assumption here, and no dependency pin is added.
