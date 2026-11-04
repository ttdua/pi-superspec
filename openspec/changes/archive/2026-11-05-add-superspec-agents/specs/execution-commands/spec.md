## MODIFIED Requirements

### Requirement: Executor depends on subagent availability
The `opsx-apply` skill SHALL use the compatible `pi-subagents` integration with Superpowers `subagent-driven-development`, resolving lazy tool activation and canonical role availability through the shared integration reference. It SHALL use `superspec.implementer` for each task and `superspec.task-reviewer` for the existing task and final whole-branch review seats, with no duplicate generic reviewer pipeline. It MUST preserve one implementation writer per worktree and configured model selection. If the optional tool and activation helper are absent it SHALL use Superpowers `executing-plans` in-session and request a whole-branch review over the full commit range before writing `apply.md`. It MUST NOT fabricate calls, bypass disabled/missing roles or failed launches, or omit the executor actually used from `apply.md`.

#### Scenario: With pi-subagents
- **WHEN** the compatible integration and required canonical roles are available
- **THEN** apply executes the plan through SDD with the namespaced implementer and existing namespaced task/final-review seats and records that executor

#### Scenario: Without pi-subagents
- **WHEN** neither the subagent tool nor its activation helper is available
- **THEN** apply uses `executing-plans`, follows TDD manually, requests a whole-branch review, and records `executing-plans` in `apply.md`

#### Scenario: Unusable delegated executor
- **WHEN** a canonical role is disabled/missing or a child launch fails
- **THEN** apply reports and stops the affected lane without dispatching a generic substitute or silently going inline

## ADDED Requirements

### Requirement: Delegated verify evidence with parent receipt
Verify SHALL use `superspec.verifier` through the shared policy to collect independent evidence for the existing six checks, or verify inline when the integration is absent. Only commands run in the authoritative worktree during this invocation SHALL count as fresh. The parent MUST inspect evidence, perform remaining available checks, apply existing outcome rules, and write/commit `verify.md`; the child MUST NOT fix code or write the receipt.

#### Scenario: Fresh delegated evidence
- **WHEN** the verifier runs project tests during this verify invocation in the authoritative worktree
- **THEN** the parent records the exact command, cwd, result and evidence in its official receipt after checking the report

#### Scenario: Failing or missing evidence
- **WHEN** tests fail or evidence for a check is unavailable
- **THEN** the parent records FAIL for failing tests or not verified for the unavailable check, never invents a passing result, and does not let the verifier fix code

#### Scenario: Inline verify fallback
- **WHEN** the optional integration is absent
- **THEN** the parent runs the same fresh checks inline and writes the existing receipt format without fabricating child evidence
