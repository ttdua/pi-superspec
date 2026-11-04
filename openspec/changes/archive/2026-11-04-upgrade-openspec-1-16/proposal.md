## Why

The opsx skills were adapted from OpenSpec 1.4.1, and OpenSpec is now at 1.16.0. Since then upstream fixed bugs that also exist in our copies: a REMOVED requirement fails verify, sync writes TBD Purposes and empty requirement sections, and archive trusts a sync without checking it. 1.16 also fails `validate --strict` on six of our specs. Raising the supported floor lets us use the new CLI output and keep the skills correct.

## What Changes

**OpenSpec floor**
- From: `/opsx-init` requires OpenSpec >= 1.4.
- To: it requires >= 1.16; the install line, docs and troubleshooting follow.
- Reason: the skills use fields that older CLIs do not return (`sourcePath`/`line`, `isPlanningComplete`, `list --json` task counts).
- Impact: breaking for users on 1.4 to 1.15, who must upgrade. The npm package of 1.16 needs Node >= 22.12; `brew install openspec` is unchanged.

**Skills and schema synced with upstream, keeping pi divergences**
- `verify`: REMOVED and RENAMED requirements are checked correctly; a skipped check never scores PASS.
- `apply`: uses per-task locations, handles the blocked state, and asks before adding or narrowing scope.
- `sync`: keeps the delta Purpose, blocks unsafe cases, never leaves an empty `## Requirements`, and applies the project's `specs` rules.
- `archive`: re-checks every delta after sync, reads task counts from `openspec list --json`, and counts a skipped artifact as complete.
- `continue` / `ff`: detect half-written glob artifacts, use `isPlanningComplete`, and report skipped artifacts. `design` stays mandatory in `ff`.
- `explore`: write consent, a broader "implementing" guardrail, and a narrow hand-off that scaffolds a change and then points to `/opsx-continue`.

**Strict validation**
- Six specs fail `openspec validate --strict` on 1.16 warnings. Four requirements are split without changing behavior and two Purposes are written, so strict validation passes.

Not adopted: store selection, project-root guards, `optionalWorkflow` handoffs, upstream's `mv` archive and its "Ready for archive" strings.

## Capabilities

### New Capabilities
<!-- None. Every behavior change lands in an existing capability. -->

### Modified Capabilities
- `init-command`: preflight requires OpenSpec 1.16; the Generate option requirement is shortened without changing behavior.
- `execution-commands`: apply, verify, sync and archive requirements gain the synced behavior described above.
- `planning-commands`: explore, continue and ff requirements gain write consent, the partial-artifact check, skipped-artifact reporting and the explore hand-off.
- `bundled-schema`: the single verify check list handles REMOVED/RENAMED requirements and never scores a skipped check as passing.
- `review-gate`: three long requirements are shortened without changing behavior.
- `routing-note`: the document language requirement is shortened without changing behavior.
- `generate-specs-command`: the spec output format requirement is shortened without changing behavior.

## Impact

- Code: `extensions/init/preflight.ts` and its tests.
- Skills: `skills/opsx-{apply,verify,sync,archive,continue,ff,explore}/SKILL.md`; provenance headers updated. Prompts are stubs and do not change.
- Schema: `schema/superspec/schema.yaml` verify checks, and the bundled schema version gate if the schema text changes (see design).
- Docs: `docs/architecture.md`, `docs/e2e-checklist.md`, `docs/usage-guide.md`, README troubleshooting.
- Specs: seven delta specs, plus direct Purpose edits to `execution-commands` and `planning-commands`.
- Dependencies: none added.
