## ADDED Requirements

### Requirement: Plan contracts section
The `plan` instruction and `templates/plan.md` SHALL require a `## Contracts` section placed before the first task. Each entry MUST give a name, whether it is `new` or `modified`, the exact shape (type, schema, signature, CLI arguments, config key or file format) and a `public` flag. A change that declares nothing MUST write `None` followed by a reason, so that an absent section is never read as "no contracts". Per-task `Interfaces` blocks SHALL refer to entries by name instead of restating their shape. The wording MUST be language-neutral.

#### Scenario: Template has the section
- **WHEN** `templates/plan.md` is read
- **THEN** it contains a `## Contracts` heading before `## Task 1` with fields for name, `new` or `modified`, shape and `public`

#### Scenario: Instruction requires the section
- **WHEN** the `plan` instruction is read
- **THEN** it requires the Contracts section, allows `None` only with a reason, and tells per-task `Interfaces` blocks to refer to contract names

#### Scenario: Language-neutral wording
- **WHEN** the Contracts text in the plan instruction and template is read
- **THEN** it names types, schemas, signatures, CLI arguments, config and file formats and does not assume TypeScript

## MODIFIED Requirements

### Requirement: Design stub
The `design` instruction SHALL tell the author to write a two-line `design.md` beginning `No design needed:` with the reason when the change has no non-trivial technical decision. The `design` instruction and `templates/design.md` SHALL also tell the author to record the decision and reason for any `public` contract and to leave its full shape to `plan.md`.

#### Scenario: Stub instruction
- **WHEN** the `design` instruction is read
- **THEN** it contains the `No design needed:` stub text

#### Scenario: Contract hint
- **WHEN** the `design` instruction and `templates/design.md` are read
- **THEN** each says that a `public` contract's decision and reason belong in the design and its shape belongs in `plan.md`

### Requirement: Apply block
The `apply` block SHALL require `plan` and track `tasks.md`. Step 0 SHALL commit the change directory on the feature branch and create a worktree whose branch is `<change-name>`. It SHALL declare the worktree copy of the change directory authoritative from then until finalize. It MUST end after the final whole-branch review by writing `apply.md`, and MUST NOT invoke `finishing-a-development-branch`. The `executing-plans` fallback SHALL still request a whole-branch review before `apply.md`. The block SHALL direct the executor to follow the plan's Contracts per task: declarations or stubs that match the Contracts first, then the typecheck when the language has one, then the failing test, then the implementation. When the work needs a contract shape that differs from the plan, the executor MUST stop: a `public` contract goes to the user for a decision; an internal contract is updated in `plan.md` with the reason and recorded in `apply.md` under "Contract deviations".

#### Scenario: Apply block returned
- **WHEN** `openspec instructions apply --change x --json` runs in a temp project
- **THEN** the result contains the apply instruction text

#### Scenario: Apply stops before finishing
- **WHEN** the apply instruction is read
- **THEN** it states that apply stops after the final review and does not invoke `finishing-a-development-branch`

#### Scenario: Worktree branch and authority
- **WHEN** the apply instruction is read
- **THEN** it names the worktree branch `<change-name>` and states the worktree copy is authoritative until finalize

#### Scenario: Per-task contract order
- **WHEN** the apply instruction is read
- **THEN** it orders each task as declarations matching Contracts, typecheck where available, failing test, implementation, and does not make types-first a project-wide phase

#### Scenario: Public contract change
- **WHEN** the apply instruction is read
- **THEN** it tells the executor to stop and ask the user before changing a `public` contract

#### Scenario: Internal contract change
- **WHEN** the apply instruction is read
- **THEN** it tells the executor to update `plan.md` with the reason and record the change in `apply.md` under "Contract deviations"

### Requirement: Apply receipt branch facts
The `apply.md` template SHALL record the worktree path, worktree branch, feature branch, base branch, commit range, iteration, executor and tasks done of total. It SHALL also have a "Contract deviations" section that lists each contract changed during apply with its reason, or `none`.

#### Scenario: Template fields
- **WHEN** `templates/apply.md` is read
- **THEN** it has a field for each of those facts

#### Scenario: Deviations section
- **WHEN** `templates/apply.md` is read
- **THEN** it has a "Contract deviations" section that allows `none`

### Requirement: Single verify check list
The `verify` instruction and template SHALL use one check list: `openspec validate <change>` passes; tasks ticked or reasoned; requirement evidence; scenario-to-test mapping with a fresh test run; design and contract coherence (warning only), which compares the `design.md` decisions and the `plan.md` Contracts, including the recorded deviations, with the code; clean working tree with commit range. Outcomes SHALL be `PASS`, `PASS_WITH_WARNINGS` or `FAIL`, and the loop SHALL stop after 5 iterations. The delta spec sync check MUST NOT be part of verify and SHALL be deferred to archive. A contract that cannot be compared with the code MUST be recorded as not verified.

#### Scenario: Six checks
- **WHEN** the verify instruction and template are read
- **THEN** each lists the six checks and neither lists a delta spec sync check

#### Scenario: Contract coherence in check 5
- **WHEN** the verify instruction and template are read
- **THEN** check 5 names both `design.md` decisions and `plan.md` Contracts, and states that a mismatch is a warning

#### Scenario: Uncomparable contract
- **WHEN** a Contracts entry cannot be compared with the code
- **THEN** the verify text directs the author to record it as not verified with a reason

#### Scenario: Sync deferred
- **WHEN** the verify or finalize text mentions delta spec sync
- **THEN** it states that `/opsx-archive` performs it
