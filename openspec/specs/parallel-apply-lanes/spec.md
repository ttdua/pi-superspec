# parallel-apply-lanes Specification

## Purpose

Define how apply schedules unblocked task groups into parallel writer lanes, each in its own worktree, merges them after review, handles merge conflicts, derives effort from task difficulty and records lanes in `apply.md`.

## Requirements

### Requirement: Ready tasks from dependencies
During apply the scheduling unit SHALL be the plan task, which is one `tasks.md` group; one lane runs one whole group, its checkboxes in order. The parent SHALL treat a plan task as ready when every task named in its `Blocked by` is merged into the `<change-name>` branch. A plan without dependency metadata SHALL be read as each task blocked by the previous one. Ready tasks whose declared files overlap MUST NOT run at the same time.

#### Scenario: Independent tasks ready together
- **WHEN** Task 2 and Task 3 are both `Blocked by: none` and declare disjoint files
- **THEN** both are ready at the start of apply

#### Scenario: Blocked task waits
- **WHEN** Task 4 is `Blocked by: Task 2` and Task 2 is not yet merged
- **THEN** Task 4 is not started

#### Scenario: One lane per group
- **WHEN** Task 2 implements group 2 with checkboxes 2.1, 2.2 and 2.3
- **THEN** one implementer runs all three in order in the same lane, and they are not dispatched as separate lanes

#### Scenario: Legacy plan
- **WHEN** `plan.md` has no `Blocked by` lines
- **THEN** tasks run one after another in plan order

#### Scenario: Overlapping files
- **WHEN** two ready tasks both declare `extensions/routing-note.ts`
- **THEN** they run one after another, not at the same time

### Requirement: Writer lanes run in their own worktrees
Each writer lane that runs while another writer lane is active SHALL get its own child worktree on branch `<change-name>--task-<N>`, cut from the current `<change-name>` HEAD. It SHALL be created through the same worktree mechanism apply already uses. At most three writer lanes SHALL run at once unless the project's instructions set a lower limit. Read-only and review lanes MAY run in parallel without a child worktree. Each worktree SHALL keep exactly one writer.

#### Scenario: Two parallel writers
- **WHEN** two ready tasks are dispatched as writer lanes at the same time
- **THEN** each implementer works in its own child worktree and branch, and no two writers share a worktree

#### Scenario: Lane cap
- **WHEN** five tasks are ready and no lower project limit exists
- **THEN** at most three writer lanes run at once and the rest wait

### Requirement: Merge after review
The parent SHALL merge a lane into `<change-name>` only after the task review of that lane's range passes. It SHALL merge with a merge commit, in task-ID order among the lanes that are done, and SHALL then remove the lane worktree. The final whole-branch review SHALL cover the full `<change-name>` range, merges included.

#### Scenario: Review gates the merge
- **WHEN** a lane's task review requests changes
- **THEN** the lane is not merged until a re-review passes

#### Scenario: Final review covers merges
- **WHEN** all lanes are merged
- **THEN** the final whole-branch review runs over the full `<change-name>` range including the merge commits

### Requirement: Merge conflict handling
On a merge conflict the parent SHALL abort the merge, discard the lane, and run the task again alone on the new HEAD. A second conflict for the same task SHALL stop apply and ask the user.

#### Scenario: Conflict re-run
- **WHEN** merging a reviewed lane conflicts with `<change-name>`
- **THEN** the parent aborts the merge and re-runs that task alone on the new HEAD

#### Scenario: Second conflict
- **WHEN** the re-run of the same task conflicts again
- **THEN** apply stops and asks the user how to proceed

### Requirement: Effort follows difficulty
When dispatching the implementer and the task reviewer for a plan task, the parent SHALL choose the child's thinking level from the task's `Difficulty`: `Easy` is `low`, `Normal` is `medium`, `Hard` is `high` and `Very Hard` is `xhigh`. It SHALL pass that level only through the mechanism the Subagent integration paragraph names, and MUST pass none when the paragraph says the plugin takes no per-call thinking. It MUST NOT set a model. When an agent definition locks thinking, the lock SHALL win.

#### Scenario: Hard task
- **WHEN** a `Hard` task is dispatched on an adapter that accepts a thinking level
- **THEN** the implementer and its task reviewer are dispatched with thinking `high` and no model

#### Scenario: Adapter without per-call thinking
- **WHEN** the Subagent integration paragraph says no thinking level is passed
- **THEN** the parent dispatches without a thinking level

### Requirement: Lanes recorded in apply.md
`apply.md` SHALL keep one commit range over `<change-name>` and SHALL add a `## Lanes` section listing, per task, its ID, lane branch or `sequential`, lane commit range, task review verdict and merge commit. Finalize and the code review gate SHALL keep reading the single commit range.

#### Scenario: Lanes table
- **WHEN** apply ran two tasks in parallel lanes
- **THEN** `apply.md` lists both lane branches, their ranges, verdicts and merge commits, and its commit range covers the merges
