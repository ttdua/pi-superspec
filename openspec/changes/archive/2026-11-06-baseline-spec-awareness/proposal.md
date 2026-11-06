## Why

Planning reads the living specs (`openspec/specs/`) too late. A `MODIFIED` delta that leaves out a scenario silently deletes it at sync, a header that does not match the main spec is found only at `/opsx-sync`, and a brainstorm can contradict a specified requirement without noticing. These errors pass every gate. Reading the baseline at decision time fixes them at the source, with instruction text only.

## What Changes

**Brainstorm instruction (bundled schema)**
- From: no mention of the living specs.
- To: read the living spec of each capability the change plausibly touches, cite the requirements involved, and state explicitly when a specified requirement is changed on purpose.
- Reason: stop silent re-decisions of settled requirements.
- Impact: non-breaking; schema text only.

**Proposal instruction (bundled schema)**
- From: check `openspec/specs/` for existing spec names.
- To: also confirm against the living spec that each listed Modified Capability has requirements that actually change.
- Reason: Modified Capabilities drive which deltas are written.
- Impact: non-breaking.

**Specs instruction (bundled schema)**
- From: use the existing folder name for a modified capability.
- To: start each `MODIFIED` block from the full current block copied from the main spec; `MODIFIED`, `REMOVED` and `RENAMED FROM` headers match the main spec header exactly; a scenario dropped from a `MODIFIED` block is named as intentional.
- Reason: prevent silent loss and late header mismatches.
- Impact: non-breaking.

**Internal spec review (`opsx-continue`, `opsx-ff`, `superspec.spec-reviewer`)**
- From: the reviewer receives the delta specs and their dependencies.
- To: the handoff also includes the main spec of every modified capability, and the reviewer checks header matches and dropped scenarios against it.
- Reason: the reviewer cannot detect loss without the baseline.
- Impact: non-breaking; advisory review only, no new stop.

**Routing note**
- From: "a fix restoring specified behaviour" goes to direct TDD work.
- To: the agent first confirms the behaviour in the living spec; unspecified behaviour is a spec change.
- Reason: ground the routing decision in the spec text.
- Impact: non-breaking; injected guidance text changes.

**Schema version**
- From: `version: 6`.
- To: `version: 7` (`x-pi-superspec.version` too).
- Reason: an installed v6 copy must read as `older`, not `edited`, so `/opsx-init` reports an upgrade instead of a local edit.
- Impact: projects reinstall the schema by hand (remove `openspec/schemas/superspec/`, rerun `/opsx-init`); no artifact ID changes.

**Docs**: `docs/workflow.md` (Step rules, Routing note) and `docs/usage-guide.md` describe the new rules and the v6 to v7 upgrade.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `bundled-schema`: adds three requirements so that the brainstorm, proposal and specs instructions each read the baseline, and modifies "Schema identity" to `version: 7`.
- `routing-note`: the routing note content requirement adds the spec check before the "fix restoring specified behaviour" path.
- `planning-commands`: adds a requirement that the internal spec review handoff includes the baseline main specs.
- `workflow-agents`: adds a requirement that the spec reviewer compares deltas with the baseline.

## Impact

- `schema/superspec/schema.yaml` (brainstorm, proposal, specs instructions); schema bumps to `version: 7` so installed v6 copies are classified `older`. `openspec/schemas/superspec/` is not edited.
- `extensions/routing-note.ts` (`ROUTING_NOTE` text).
- `skills/opsx-continue/SKILL.md`, `skills/opsx-ff/SKILL.md` (internal check handoff), `agents/spec-reviewer.md`.
- `docs/workflow.md`, `docs/usage-guide.md`, `CHANGELOG.md`.
- Tests: `tests/schema.test.ts`, `tests/routing-note.test.ts`, `tests/planning-commands.test.ts`, `tests/agents.test.ts`.
- No new dependencies, commands or public API.
