## ADDED Requirements

### Requirement: Apply enforces plan contracts
The `opsx-apply` skill SHALL tell the executor to read the `## Contracts` section of `plan.md` and follow the apply instruction's per-task contract order. It MUST stop the executor when a contract shape has to change, and MUST ask the user when the contract is `public`. For an internal contract it SHALL update `plan.md` with the reason and write the change into `apply.md` under "Contract deviations", including on iteration N+1 and in the post-PR loop.

#### Scenario: Executor briefed on contracts
- **WHEN** `/opsx-apply` starts the executor
- **THEN** the briefing names the Contracts section of `plan.md` and the per-task order of declarations, typecheck, failing test and implementation

#### Scenario: Public contract needs a change
- **WHEN** the executor finds that a `public` contract must change
- **THEN** the skill stops the executor and asks the user before any code relies on the new shape

#### Scenario: Internal contract change recorded
- **WHEN** the executor changes an internal contract
- **THEN** `plan.md` is updated with the reason and `apply.md` lists the change under "Contract deviations"

### Requirement: Verify compares contracts
The `opsx-verify` skill SHALL follow check 5 of the verify instruction by comparing the `plan.md` Contracts and the "Contract deviations" in `apply.md` with the code. A mismatch SHALL be recorded as a warning and MUST NOT by itself produce `FAIL`. A contract the skill cannot compare MUST be recorded as not verified with its reason.

#### Scenario: Matching contracts
- **WHEN** every Contracts entry matches the code
- **THEN** `verify.md` records check 5 as passed with the files compared

#### Scenario: Mismatched contract
- **WHEN** a Contracts entry differs from the code and no deviation records it
- **THEN** `verify.md` records a warning naming the entry and the outcome is at most `PASS_WITH_WARNINGS`

#### Scenario: Contract cannot be compared
- **WHEN** a Contracts entry has no checkable counterpart in the code, such as a documented file format
- **THEN** `verify.md` marks it not verified with the reason
