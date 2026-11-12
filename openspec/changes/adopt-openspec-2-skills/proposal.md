## Why

pi-superspec ships eight hand-maintained forks of OpenSpec's workflow skills (`skills/opsx-*`, "synced with 1.16.0"). Each OpenSpec release needs a manual re-sync, and upstream fixes never reach users. OpenSpec 2.0 delivers its workflow only as skills in `.agents/skills/`, which pi reads natively, and keeps them current with `openspec update`. Using the stock skills and layering Superspec's rules on top removes the forks while keeping the workflow.

## What Changes

**Workflow skills**
- From: eight package skills `opsx-explore`, `-new`, `-continue`, `-ff`, `-apply`, `-verify`, `-sync`, `-archive`, adapted from OpenSpec 1.16.
- To: the stock `openspec-*` skills that OpenSpec 2.0 installs in the project's `.agents/skills/`. The package keeps only `opsx-generate-specs`, which has no upstream equivalent.
- Reason: upstream upgrades through `openspec update`; no fork to re-sync.
- Impact: breaking for the package layout. Users keep the same `/opsx-*` commands.

**Superspec rules**
- From: written into each forked skill.
- To: fixed rules ship with the bundled schema, as a new `workflow.md` in `schema/superspec/` that every artifact instruction and the apply block point to. The rules cover the review gate, the continue and ff loops, the Superpowers redirection, the apply/verify/archive overrides and the unused stock skills. Environment-dependent rules (interaction channel, subagent mechanics, command-to-skill mapping) stay in the routing note. The project's `openspec/config.yaml` is unchanged.
- Reason: the schema is already versioned, locked and upgraded by `/opsx-init`; the stock skills treat schema instructions as authoritative.
- Impact: the bundled schema bumps to v9; `subagent-routing.md` moves from `skills/references/` into the schema directory.

**Commands**
- From: each `prompts/opsx-*.md` reads the matching package skill.
- To: each points to its stock skill plus `workflow.md`, user input `$@`.
- Impact: non-breaking for users.

**`/opsx-init`**
- From: requires OpenSpec ≥ 1.16, runs `openspec init --tools none`, offers to delete legacy `.pi/` files.
- To:
  - Requires OpenSpec ≥ 2.0.
  - If the project's `.agents/skills/` lacks any of the eight stock skills, it checks the user's OpenSpec profile.
  - When the profile includes the eight workflows, it runs `openspec init --tools pi`.
  - Otherwise it prints the commands to fix the profile and stops before writing anything.
  - It never edits the global OpenSpec config.
  - The legacy cleanup is removed: OpenSpec 2.0's `init` and `update` remove 1.x `.pi/` output themselves.
- Impact: breaking for users on OpenSpec 1.x or on the default `core` profile; they get explicit instructions.

**Uninstall**
- From: removing the package removes every command and skill.
- To: it removes the commands and `opsx-generate-specs`. The stock skills in `.agents/skills/` belong to OpenSpec and stay.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `planning-commands`: the explore, new, continue and ff commands run stock skills under the workflow rules; requirements move from skill text to prompts and `workflow.md`.
- `execution-commands`: the same for apply, verify, sync and archive; archive follows the stock mechanics after its sync check.
- `routing-note`: the note maps each command to its stock skill, points to `workflow.md`, and names the stock skills Superspec does not use.
- `package-activation`: the package ships commands and only `opsx-generate-specs` as a skill.
- `review-gate`: one gate section in `workflow.md`, so the "identical sections" rule is removed; the tool-name check moves to `workflow.md`.
- `init-command`: OpenSpec 2.0 preflight, stock skill check and install, no legacy-cleanup step.
- `legacy-cleanup`: retired (the change sets `retire_capabilities: true`); OpenSpec 2.0 does it.
- `bundled-schema`: v9, ships `workflow.md` and `subagent-routing.md`, and every instruction points to `workflow.md`.
- `subagent-routing`: the shared reference lives in the schema directory.
- `generate-specs-command`: the scout dispatch reads the shared reference from `openspec/schemas/superspec/subagent-routing.md`.
- `project-readme`: OpenSpec 2.0 prerequisite and profile, uninstall leaves stock skills, unused stock skills.
- `usage-guide`: troubleshooting for OpenSpec version, profile and stock skill upgrades.

## Impact

- **Removed:** `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/` and `skills/references/`.
- **Changed:** `prompts/opsx-*.md`; `extensions/routing-note.ts`; `extensions/init/{init,preflight}.ts`.
- **Deleted:** `extensions/init/legacy.ts`.
- **Schema:** `schema/superspec/` gains `workflow.md` and `subagent-routing.md`, and the version moves to v9 with a new checksum.
- **Tests:** planning, execution, init, schema, routing-note, subagent-routing, generate-specs, README and docs tests are rewritten against prompts and `workflow.md`.
- **Docs:** README (both languages), `docs/architecture.md`, `docs/workflow.md`, `docs/usage-guide.md`, `docs/e2e-checklist.md`, `CHANGELOG.md`.
- **Dependency:** OpenSpec CLI ≥ 2.0 with a profile that includes explore, new, continue, ff, apply, verify, sync and archive. No new package dependency.
- **Projects:** a v8 project upgrades to v9 through `/opsx-init`, which also installs the stock skills. The project then commits `.agents/skills/`.
