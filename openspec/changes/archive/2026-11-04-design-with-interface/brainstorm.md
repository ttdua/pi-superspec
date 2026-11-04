## Design Summary

**Why.** An AI executor that is handed only behaviour (specs) and task text invents the shapes it needs: type names, signatures, config keys, file formats. When those shapes cross a module boundary, or reach a user, a wrong guess is expensive and is found late. Evidence in this repo: `InitIO` of the archived `opsx-init` change is described three different ways. `design.md` lists `exec, confirm, notify, reload, cwd` and later mentions `report`. `plan.md` Task 1 adds `hasUI` and `superpowersAvailable` and has no `report`. The shipped `extensions/init/io.ts` also has `prompt`, which no earlier artifact names. Nobody decided that drift; it just happened.

**What exists today.** `superpowers:writing-plans` already asks for a per-task `Interfaces: Consumes / Produces` block (10 of 11 archived plans have one), but the bundled `plan.md` template and the schema's plan instruction never mention it, so the habit depends on the skill version. Nothing checks later whether the shipped shapes match what the plan said.

**The change.** Make the plan the single, reviewed source of truth for contract shapes, and bind apply and verify to it:

- **plan**: a required `## Contracts` section before the tasks. Each entry has a name, `new` or `modified`, the exact shape (type, signature, JSON schema, CLI args, config key, file format) and a `public` flag. The section is mandatory; when there is nothing to declare it says `None`, so "no contracts" is distinguishable from "forgot". Per-task `Interfaces` blocks reference these names instead of restating them.
- **design** (optional artifact): a one-line hint only. A decision about a public contract (and why) is recorded there; the shape stays in the plan.
- **specs**: unchanged. Specs state behaviour, not shapes.
- **apply**: per task, declarations or stubs matching Contracts first, then the typecheck where the language has one, then the failing test, then the implementation. A needed contract change stops the executor: a `public` contract goes to the user; an internal one is updated in `plan.md` with the reason and logged in `apply.md` under "Contract deviations".
- **verify**: check 5 ("`design.md` decisions match the code", warning only) is widened to "`design.md` decisions and `plan.md` Contracts match the code". The count stays six checks, so docs and skills that say "six checks" do not churn. A mismatch is a warning; a check that could not be run is `not verified`, as the schema already requires.
- **review gate**: no mechanism change. The Contracts section sits in `plan.md`, which the existing plan gate already shows the reviewer; that gate is the human checkpoint before any code is written.

**Version.** The bundled schema stays at v6 and is edited in place, because nothing has been released yet.

## Alternatives Considered

### Alternative A: Contracts in design and plan, types-first phase (the original proposal)
- **Approach**: `design.md` lists every new or changed type and interface; `plan.md` repeats them per task; apply writes all types before any code.
- **Pros**: Contracts appear early, at the design stage; the rule is easy to state.
- **Cons**: `design.md` is optional and `tasks` does not require it, so changes without a design get no contracts. Two copies drift (the `InitIO` case). A global types-first phase conflicts with the red-first order that `subagent-driven-development` brings through TDD.
- **Why not chosen**: The plan always exists, is gated just before code, and drifts least. One source of truth beats two copies.

### Alternative B: Plan as the source of truth with stop-and-ask and verify (chosen)
- **Approach**: As in Design Summary.
- **Pros**: Works with or without a design. Reuses the existing plan gate as the human check. Types-first is applied per task, so it fits TDD. The stop-and-ask rule, not the template, is what prevents silent drift.
- **Cons**: Adds a section and an apply rule. Verify's conformance check is read-and-compare by an agent, not an automated parser. A wrongly frozen contract needs a deviation step to change.
- **Why not chosen**: Chosen.

### Alternative C: Template only, no enforcement
- **Approach**: Add `Interfaces` to the plan template and stop there.
- **Pros**: Smallest change; no new rules in apply or verify.
- **Cons**: More prose that nothing reads. The executor can still change a shape silently, which is the failure this change exists to prevent.
- **Why not chosen**: Without a stop rule at apply and a check at verify the field has no effect.

## Agreed Approach

Alternative B. The user agreed after a layered review, with two refinements made afterwards: the schema version is not bumped (unreleased), and the verify conformance check extends the existing check 5 instead of adding a seventh check.

Docs this change implements or amends (per the project rule that a changed documented decision is updated in the same change):

- `docs/workflow.md` "Steps" table (plan row), "Step rules" (plan, apply.md contents, verify check 5).
- `docs/domain-model.md` `ApplyReceipt` (adds contract deviations) and `Artifact` (plan content).
- `docs/glossary.md` if "Contracts" needs a definition.

## Key Decisions

- The plan is the only place with full contract shapes; design records only the decision and reason for a `public` contract.
- `## Contracts` is mandatory in `plan.md`; "none" must be written explicitly.
- Contracts wording is language-neutral ("type, schema, signature, CLI args, config, file format"), because target projects need not be TypeScript.
- Types-first is a per-task order (stub, typecheck where available, failing test, implementation), never a project-wide phase.
- A contract change during apply stops the executor: ask the user for a `public` contract; for an internal one, update `plan.md` with the reason and record it in `apply.md`.
- Verify keeps six checks; conformance is a warning, never a FAIL, and "not verified" follows the existing rule.
- The bundled schema stays at v6, edited in place.
- Work touches `schema/superspec/` (`schema.yaml`, templates `plan.md`, `design.md`, `apply.md`), the `opsx-apply` and `opsx-verify` skills, `tests/schema.test.ts` and its skill tests, and the docs above. It does not touch `openspec/schemas/superspec/`.

## Open Questions

- How much can the conformance check verify without a per-language parser? Working assumption: the agent reads Contracts and compares them with the exports and files it finds; it records `not verified` for anything it cannot compare.
- Should `opsx-ff`, which writes the plan unattended, need any extra handling? Working assumption: no, because its final gate already covers `plan.md`.
- Exact wording of `apply.md`'s "Contract deviations" section (a table versus a list) is left to the design or the plan.
