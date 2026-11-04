## Why

Specs describe behaviour, so an AI executor invents the shapes it needs: type names, signatures, config keys, file formats. In the archived `opsx-init` change, `InitIO` is described differently in `design.md`, in `plan.md` and in the shipped `io.ts`, and nobody decided the drift. Today `Interfaces` blocks in plans exist only because `writing-plans` asks for them; the bundled templates never mention them and nothing compares them with the code. Pinning contracts in the reviewed plan, and stopping when code needs a different shape, catches wrong turns before they spread.

## What Changes

**Plan contracts**
- From: `plan.md` has tasks and a scenario-to-test list; shapes appear only in per-task `Interfaces` blocks when the skill adds them.
- To: `plan.md` has a required `## Contracts` section before the tasks: name, `new` or `modified`, exact shape, `public` flag, or an explicit `None`. Per-task `Interfaces` blocks refer to those names.
- Reason: one reviewed source of truth, visible at the existing plan gate.
- Impact: non-breaking; every plan gains one section.

**Design hint**
- From: the design template says nothing about contracts.
- To: one hint line: record the decision and reason for a `public` contract; the shape stays in the plan.
- Reason: avoids two copies that drift.
- Impact: non-breaking; design stays optional.

**Apply**
- From: the executor follows plan micro-tasks in TDD order.
- To: per task, declarations matching Contracts first, then typecheck where the language has one, then the failing test, then the implementation. A needed contract change stops the executor: a `public` contract goes to the user; an internal one is updated in `plan.md` with the reason and logged in `apply.md` under "Contract deviations".
- Reason: this rule, not the template, prevents silent drift.
- Impact: non-breaking; `apply.md` gains a section.

**Verify**
- From: check 5 compares `design.md` decisions with the code (warning only).
- To: check 5 also compares `plan.md` Contracts and the recorded deviations with the code. Mismatch is a warning; an uncomparable item is `not verified`.
- Reason: gives the pinned contracts a consumer without adding a seventh check.
- Impact: non-breaking.

The bundled schema stays at v6 and is edited in place (nothing is released). Docs that describe these steps are updated in this change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `bundled-schema`: plan template and instruction gain the Contracts section; the design stub gains the hint; the apply block and the apply receipt gain the per-task order, the stop rule and "Contract deviations"; the single verify check list widens check 5.
- `execution-commands`: `opsx-apply` and `opsx-verify` skills follow the new apply rule and the widened check 5.

## Impact

- `schema/superspec/schema.yaml` and templates `plan.md`, `design.md`, `apply.md`; `skills/opsx-apply/SKILL.md` and `skills/opsx-verify/SKILL.md`.
- Tests that read these files: `tests/schema.test.ts` and the execution-command skill tests.
- Docs: `docs/workflow.md` (steps table, step rules), `docs/domain-model.md` (`ApplyReceipt`, plan content), `docs/glossary.md` if needed.
- No code under `extensions/`, no new dependency, no schema version bump. `openspec/schemas/superspec/` (upstream v4) is not touched.
