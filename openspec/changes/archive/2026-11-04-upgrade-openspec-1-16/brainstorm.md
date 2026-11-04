## Design Summary

pi-superspec's `skills/opsx-*` are adapted from OpenSpec **1.4.1** workflow templates (see the `Adapted from OpenSpec 1.4.1` header in each). OpenSpec 1.16.0 is out. This change raises the supported floor to OpenSpec >= 1.16 and re-syncs the pi skills and the bundled schema with the upstream changes that matter to the Superspec flow, while keeping every deliberate pi/superspec divergence.

Documents this implements (and does not re-decide): `docs/architecture.md` "`/opsx-init`" step 1 (version gate, L119) and "Constraints" (L204); `docs/workflow.md` "Step rules" and "Review gates" (kept as is); `docs/e2e-checklist.md` L9 (version line).

Method: upstream 1.4.1 and 1.16.0 workflow templates were diffed as text and compared against each pi skill, `schema/superspec/schema.yaml`, and the `planning-commands`, `execution-commands` and `review-gate` specs. `openspec validate --all --strict` with 1.16.0 was also run on this repo.

Findings that drive the scope:
- 1.16 `validate --strict` fails 6 of 16 specs on warnings only: 2 placeholder Purposes (`execution-commands`, `planning-commands`) and 4 specs with requirement text over 500 characters (`generate-specs-command`, `init-command`, `review-gate`, `routing-note`). 1.4.1 passes 16/16.
- Verify check 3 in `schema.yaml` says "every requirement in the delta specs has implementation evidence". A REMOVED requirement therefore produces a false FAIL. Upstream fixed this class of bug in `verify`.
- `sync` writes a `TBD` Purpose for new capabilities and can leave an empty `## Requirements`; upstream 1.16 archive rejects both.
- `archive` marks specs "synced" without re-checking after the sync step, and counts tasks with a grep.
- `instructions apply --json` now returns per-task `sourcePath` and `line` (`commands/workflow/instructions.js`), so skills can use them with a 1.16 floor.
- `archive --skip-specs` still runs `validateChange` on the deltas and only skips the merge, so pi's `openspec archive "<name>" --skip-specs -y` keeps working.

## Alternatives Considered

### Alternative A: Raise only the version floor and fix validate warnings
- **Approach**: Change `preflight.ts`, docs and spec text to >= 1.16; clean the six strict-validate warnings; leave skills untouched.
- **Pros**: Smallest diff, almost no review surface.
- **Cons**: Leaves the REMOVED/RENAMED false-FAIL bug, the TBD Purpose and empty-Requirements sync gaps, and skills that still read like 1.4.1. The new floor would buy nothing.
- **Why not chosen**: Raising a floor without using what it provides is churn for users who must upgrade.

### Alternative B: Re-vendor every upstream 1.16 template
- **Approach**: Replace each pi skill with the upstream text, re-apply the pi adaptations on top.
- **Pros**: Maximum parity with upstream; future diffs are small.
- **Cons**: Imports store selection, project-root guards, `optionalWorkflow`, `/opsx:propose` handoffs and `mv`-based archive, none of which fit pi. It risks overwriting review-gate, worktree, document-language and `ask_user_question` behaviour, and it destroys the existing provenance of intentional divergences.
- **Why not chosen**: The divergences are the product. A blind re-vendor loses them.

### Alternative C: Selective sync with a decision per upstream change (chosen)
- **Approach**: Adopt, adapt or skip each upstream change individually, driven by the diff review. Raise the floor to 1.16 so the new CLI fields can be used without fallbacks.
- **Pros**: Fixes real bugs, keeps pi divergences, no unused churn.
- **Cons**: More review work; provenance headers must say what was synced and what was skipped.
- **Why not chosen**: n/a (chosen).

## Agreed Approach

Alternative C. One change, two parts: (1) skills, schema, preflight and docs synced with 1.16 as decided below; (2) the six strict-validate warnings cleaned so `openspec validate --all --strict` is green on 1.16.

Adopted or adapted, by area:
- **Floor**: `preflight.ts` and `init-command` spec require >= 1.16; `docs/architecture.md` L119 and L204, `docs/e2e-checklist.md` L9, `docs/usage-guide.md` and the README troubleshooting follow. Note the npm package now needs Node >= 22.12; `brew install openspec` stays the install line.
- **Schema (`verify`)**: check 3/4 treat ADDED and MODIFIED as "needs implementation evidence", REMOVED as "baseline behaviour is gone" (read the baseline from the main spec, fall back to git history), RENAMED as "behaviour kept under the new name", and skip scenarios under REMOVED. A check that was skipped never scores as PASS; at most PASS_WITH_WARNINGS.
- **apply**: use each task's `sourcePath`/`line` when ticking; handle the blocked state (missing artifact vs missing tracking file); say "tracked tasks complete" while keeping verify-then-archive order; new pause rule: ask when work adds scope or narrows specified behaviour, and tick `[x]` only when behaviour is fully implemented. The `all_done` post-PR and fix-iteration triggers stay.
- **verify**: use apply `progress` for check 2; never implement or archive during verify; skipped checks are "not verified", not passing. pi outcome vocabulary (PASS / PASS_WITH_WARNINGS / FAIL) and the 5-iteration fix loop stay.
- **sync**: new capability copies the delta's `## Purpose` (TBD only as fallback); block MODIFIED/RENAMED against a missing main spec and REMOVED-only new capabilities; never leave an empty `## Requirements` (honour `retire_capabilities: true`, trimmed); main specs never carry delta headers and use the `# <capability> Specification` title; fetch `openspec instructions specs --json` once and apply its `rules`.
- **archive**: after sync, re-compare every delta against the main specs and archive only if all match; take task counts from `openspec list --json`; a `skipped` artifact counts as complete; a missing main spec is not automatically "unsynced"; unrecognised answers re-ask. The `openspec archive --skip-specs -y` approach stays.
- **continue / ff**: partial-artifact check for glob artifacts (`specs/**`); read `isPlanningComplete` with the `isComplete` fallback and handle `skipped`; always re-read dependencies from disk; ff reads the repo before drafting and lists skipped artifacts with the reason. ff keeps the fixed packet and `design` stays mandatory.
- **explore**: write-consent rule, "editing schemas, templates or `config.yaml` counts as implementing", ASCII-only diagrams, `openspec list --specs` / `show --type spec` reads, superspec artifact names in the capture table. When a capture needs a new change, explore may run `openspec new change` and never hand-creates `openspec/changes/`, then hands off to `/opsx-continue <name>`, which writes `brainstorm.md` through its review gate.

Skipped on purpose: store selection and project-root guards, `optionalWorkflow` and `/opsx:propose` handoffs, upstream's `mv` archive, "Ready for archive" strings, dynamic spec artifact ids, and "openspec x" description triggers.

## Key Decisions

1. Floor is >= 1.16 (user choice), not 1.4 with fallbacks.
2. One change covers skill/schema sync and strict-validate cleanup (user choice).
3. `design` stays mandatory in ff, exempt from the upstream "skip if instruction says optional" rule (user choice). Final gate packet is unchanged.
4. Explore does not run the review gate or write a brainstorm; it only scaffolds and hands off to `/opsx-continue`.
5. ff keeps its fixed artifact set. The `plan` dependency closure (tasks, specs, proposal, brainstorm) does not contain `design`, so a closure-built set would drop it.
6. Sync fetches `rules` itself; archive does not pass a rules snapshot to it.
7. Provenance headers change to `Adapted from OpenSpec 1.4.1, synced with 1.16.0` and list what was skipped.
8. Document language stays handled by the schema/config; skills stay in English.

## Open Questions

- Which 1.16 warnings should be fixed by rewording versus splitting requirements (the four over-500-character specs)? Plan to split into requirement + scenarios without changing behaviour; confirm during specs.
- Should `retire_capabilities` handling in sync be implemented in full or only block the empty-Requirements case? Default: block and report, honour the marker, skip upstream's extra symlink and line-accounting checks.
- Does `config-merge` need a test that `rules` survives `/opsx-init`? Existing scenarios cover it; a new test only if gaps appear.
