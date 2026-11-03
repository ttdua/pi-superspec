## Context

The seven `skills/opsx-*` skills were adapted from the OpenSpec 1.4.1 workflow templates. Each skill is a markdown file the agent follows; the prompts in `prompts/` are stubs that point to the skill. The bundled schema `schema/superspec/schema.yaml` (version 5) holds the verify checks and the apply block that the skills wrap through `openspec instructions`. `brainstorm.md` records the diff review against 1.16.0 and the decisions this design builds on, so they are not repeated here.

Constraints: the review gate, one-artifact-per-run, worktree authority, `ask_user_question`, document language and the `/opsx-x` command names are intentional pi/superspec behavior and stay. Auto-upgrade of an installed schema is not shipped (`docs/architecture.md`, "Schema identity, version and upgrade"), so any schema change reaches existing projects only by reinstall.

## Goals / Non-Goals

**Goals:**
- Require OpenSpec >= 1.16 and use its CLI output (`sourcePath`/`line`, `isPlanningComplete`, `list --json` counts, `instructions specs` rules).
- Fix the verify false FAIL on REMOVED/RENAMED requirements and the sync/archive gaps.
- Make `openspec validate --all --strict` pass on 1.16 with no behavior change in the specs that only get reworded.

**Non-Goals:**
- Store selection, project-root guards, `optionalWorkflow`, `/opsx:propose` handoffs, the upstream `mv` archive, "Ready for archive" strings.
- Schema auto-upgrade, `--force`, backups, or any change to artifact IDs.
- Letting `explore` run the review gate or write a brainstorm.

## Decisions

1. **Floor at 1.16 with no fallbacks.** Skills read the new fields directly. Alternative: keep 1.4 and write "if the CLI returns it" branches; rejected because every branch would be untestable against the CLI we claim to support.
2. **Bump the schema to v6.** Check wording lives in `schema.yaml`, so changed text must be a new version; an in-place v5 edit would make installed v5 projects look `edited`. Existing v5 projects get the existing `older` warning and reinstall instructions. No artifact ID changes, so no migration step (maintainer rule in `docs/architecture.md`). Cost: `schema-install.test.ts` uses version 6 as its "newer" case and moves to 7.
3. **Verify evidence by operation.** Check 3 and 4 in the schema distinguish ADDED/MODIFIED, REMOVED and RENAMED. The long git-history recovery text from upstream is reduced to "read the baseline from the main spec, fall back to git, else not verified".
4. **Skipped is not passed.** The skill and template record "not verified"; outcome vocabulary stays PASS / PASS_WITH_WARNINGS / FAIL, and a skipped check caps the outcome at PASS_WITH_WARNINGS. Upstream's "Ready for archive" strings are not used.
5. **Sync owns its rules.** `rules` come from the user's `config.yaml` per artifact and `/opsx-init` preserves them, so sync reads `openspec instructions specs --json` itself. Archive does not pass a snapshot, which keeps sync callable alone.
6. **Archive verifies after sync.** The sync step stays a skill read (`opsx-sync`), and archive then re-runs its own delta comparison. Archiving still goes through `openspec archive "<name>" --skip-specs -y`, which still validates the change deltas; upstream's `mv` is not adopted.
7. **ff keeps a fixed artifact set.** The `plan` dependency closure (tasks, specs, proposal, brainstorm) does not include `design`, so building the set from `requires` would drop it. `design` is created by ff and exempt from any "skip if optional" rule.
8. **Explore hand-off stays narrow.** Every artifact downstream needs `brainstorm`, which is gated, so explore only scaffolds with `openspec new change` and points to `/opsx-continue <name>`.
9. **Behavior-preserving splits for strict validation.** Over-long requirements keep their header and a short normative sentence; the rest moves into scenarios, so archive replaces the whole requirement without losing a rule. Two Purpose placeholders are edited directly in the main specs (a delta `## Purpose` is read only when a capability is created).
10. **Provenance.** Each skill header changes to `Adapted from OpenSpec 1.4.1, synced with 1.16.0 (MIT) for pi.` and a short comment lists what was intentionally not adopted.

## Risks / Trade-offs

- [Users on OpenSpec 1.4 to 1.15 are blocked by preflight] → the preflight message names the install line; release notes call it out. Node >= 22.12 applies to the npm package only.
- [Existing v5 projects warn after the bump] → same path as any version change today (reinstall); documented in the usage guide.
- [Skill text drifts from upstream again] → provenance headers record the synced version and the skipped items, so the next sync starts from a known baseline.
- [Moving rules from requirement bodies into scenarios weakens prominence] → the core normative sentence stays in each body, and strict validation is checked in the verify step.
- [Skill markdown has no executable behavior] → tests assert the key instructions and removed hazards as strings, the same way the existing skill tests do.
