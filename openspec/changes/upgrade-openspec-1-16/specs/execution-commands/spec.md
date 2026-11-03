## MODIFIED Requirements

### Requirement: Sync merges delta specs without archiving
The `opsx-sync` skill SHALL merge the change's delta specs into `openspec/specs/<capability>/spec.md` (applying RENAMED, REMOVED, MODIFIED, then ADDED), report what changed, and MUST NOT move the change to the archive. It SHALL read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints.

#### Scenario: Sync only
- **WHEN** `/opsx-sync` runs on a change with a delta spec
- **THEN** the main spec reflects the delta and the change directory is still active

#### Scenario: Project rules applied
- **WHEN** `openspec/config.yaml` has `rules` for the `specs` artifact
- **THEN** the skill applies them to the text it writes and does not copy them into any spec

#### Scenario: Instructions unavailable
- **WHEN** reading the specs instructions fails
- **THEN** the skill stops and reports the error without writing any spec

### Requirement: Archive performs the delta-sync check
The `opsx-archive` skill SHALL check artifact and task completion (warning, not blocking), compare each delta spec with its main spec to decide whether a sync is needed, offer the sync when needed, re-compare every delta after the sync, and archive with the OpenSpec CLI only when all deltas match or the user chose to archive without syncing.

#### Scenario: Unsynced deltas
- **WHEN** `/opsx-archive` runs and a delta spec differs from the main spec
- **THEN** the agent reports the difference and offers to sync before archiving

#### Scenario: Already synced
- **WHEN** `/opsx-archive` runs and all delta specs are already reflected in the main specs
- **THEN** the agent archives without syncing

#### Scenario: Incomplete artifacts
- **WHEN** some artifacts or tasks are incomplete at archive time
- **THEN** the agent warns, asks whether to proceed, and archives only on confirmation

#### Scenario: Sync verified before archive
- **WHEN** a sync finishes during `/opsx-archive`
- **THEN** the agent compares every delta with its main spec again, reports "Synced" only if all match, and stops without archiving if any differs

#### Scenario: Missing main spec
- **WHEN** a delta has no main spec yet
- **THEN** the agent does not treat that alone as unsynced and decides by the delta operations as the sync requirements define

#### Scenario: Task counts from the CLI
- **WHEN** the agent checks task completion
- **THEN** it takes the counts from `openspec list --json` and stops with an error if that output is invalid

#### Scenario: Skipped artifact
- **WHEN** an artifact has status `skipped`
- **THEN** it counts as complete

#### Scenario: Unclear answer
- **WHEN** the user's answer to the sync prompt is none of the offered choices
- **THEN** the agent asks again and does not archive

## ADDED Requirements

### Requirement: Sync keeps the delta Purpose
When sync creates a main spec for a new capability, it SHALL create it only from ADDED requirements, copy the delta's `## Purpose` text, and use `# <capability> Specification` as the title. It MUST NOT write delta headers into a main spec, and MUST NOT overwrite the Purpose of an existing main spec.

#### Scenario: New capability with a Purpose
- **WHEN** a delta for a capability without a main spec has a `## Purpose`
- **THEN** the new main spec carries that Purpose verbatim and no delta section header

#### Scenario: No Purpose in the delta
- **WHEN** the delta has no `## Purpose`
- **THEN** the main spec gets a `TBD` Purpose and the summary flags it

#### Scenario: Existing main spec
- **WHEN** the main spec already has a Purpose
- **THEN** sync leaves that Purpose unchanged

### Requirement: Sync blocks unsafe merges
Sync SHALL stop without writing when a delta for a missing main spec has MODIFIED or RENAMED operations or only REMOVED ones, or when applying it would leave a main spec with no requirements. A spec MAY be deleted only when `.openspec.yaml` of the change sets `retire_capabilities: true`.

#### Scenario: Modified against a missing spec
- **WHEN** a delta has MODIFIED requirements and no main spec exists
- **THEN** sync reports the capability as blocked and writes nothing

#### Scenario: Last requirement removed
- **WHEN** applying a delta would leave `## Requirements` empty
- **THEN** sync stops, writes no empty section, and reports it

#### Scenario: Retirement marker
- **WHEN** every requirement is removed and `retire_capabilities: true` is set
- **THEN** sync deletes the spec, reports its Purpose and says it can be restored with git

#### Scenario: Blocked sync at archive
- **WHEN** archive runs and a sync is blocked
- **THEN** the agent offers only "archive without syncing" or "cancel"

### Requirement: Apply uses task locations
The `opsx-apply` skill SHALL tick a task at the `sourcePath` and `line` the apply instruction returns, after confirming the checkbox at that line still matches the task. It MUST mark a task `[x]` only when its behavior is fully implemented.

#### Scenario: Located tick
- **WHEN** a task is finished
- **THEN** the skill ticks the box at the returned location

#### Scenario: Checkbox changed
- **WHEN** the line at the location no longer matches the task
- **THEN** the skill re-reads the tracking file and does not tick a different task

#### Scenario: Partial behavior
- **WHEN** only part of the specified behavior is implemented
- **THEN** the task stays unticked

### Requirement: Apply pauses on scope changes
The `opsx-apply` skill SHALL pause and ask the user before adding scope the change does not specify, or narrowing or deferring behavior it does. A blocked apply state SHALL be handled by cause: missing artifacts lead to `/opsx-continue`, and a missing tracking file is repaired before any implementation.

#### Scenario: Added scope
- **WHEN** implementing a task would add behavior no artifact specifies
- **THEN** the skill pauses and asks whether to add it to the artifacts or leave it out

#### Scenario: Deferred behavior
- **WHEN** a specified behavior would be deferred or reduced
- **THEN** the skill asks the user before continuing

#### Scenario: Tracking file missing
- **WHEN** the state is blocked because the tracking file is missing
- **THEN** the skill reports it, offers to repair it, and starts no implementation

#### Scenario: All tracked tasks done
- **WHEN** every tracked task is ticked
- **THEN** the skill says the tracked tasks are complete and points to `/opsx-verify` before `/opsx-archive`

### Requirement: Verify never implements and reports skipped checks
The `opsx-verify` skill MUST NOT implement or archive anything while verifying. A check it could not run SHALL appear in `verify.md` as not verified with its reason, and MUST NOT count toward a `PASS` outcome.

#### Scenario: Verify stays read-only
- **WHEN** `/opsx-verify` finds a failing check
- **THEN** it records the failure and follows the fix loop without archiving the change

#### Scenario: Progress from apply
- **WHEN** the tasks check runs
- **THEN** the skill reads task progress from the apply instruction and reports unavailable tracking files as not verified

#### Scenario: Skipped check
- **WHEN** a check is skipped
- **THEN** `verify.md` marks it not verified and the outcome is at most `PASS_WITH_WARNINGS`
