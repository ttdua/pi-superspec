## Context

The brainstorm settled the approach: stock OpenSpec 2.0 skills plus an overlay. Fixed rules ship with the bundled schema, environment-dependent rules stay in the routing note, and `openspec/config.yaml` stays the user's. This document covers how.

Facts checked against OpenSpec 2.0.0 (CLI and the skills it renders for `--tools pi`):

- **Skill location.** `openspec init --tools pi` writes `.agents/skills/openspec-<id>/SKILL.md` for each workflow in the user's global profile, plus `.agents/skills/.openspec-target`. It also replaces 1.x output in `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*`, removing it when unmodified. Files the user added (`.pi/prompts/mine.md`) are kept.
- **Profile sets.** The default `core` profile installs propose, explore, apply, update, sync and archive. It does not install new, continue, ff or verify.
  - `openspec init` has no per-project workflow flag. The workflow list lives only in `~/.config/openspec/config.json`.
  - `openspec config list --json` prints `profile` and, for `custom`, `workflows`; for `core`, `workflows` is `null`.
- **Updates follow the profile.** `openspec update` under `core` **removes** previously installed new, continue, ff and verify skills ("Removed: 4 skill directories (deselected workflows)").
- **Re-runs are clean.** Re-running `openspec init --tools pi` on a project that already has `openspec/`, a superspec schema and `language:` exits 0 and leaves `config.yaml` and the schema byte-identical. A second run changes nothing.
- **The stock skills defer to the schema.** They read `openspec instructions <artifact> --json` and treat `instruction` as authoritative ("If the `instruction` field directs you to use a specific skill or command…, invoke it"). Apply reads `openspec instructions apply` and treats `context` as required input.
- **Stock behaviour that conflicts with Superspec:**
  - ff: "keep momentum", no gates.
  - continue: one artifact, then stop, no gate.
  - apply: its own task loop, step 6.
  - archive: moves the directory with `mv`, not `openspec archive`.
  - explore: hands off to `openspec-propose`.
  - All of them carry store selection and a project-root guard.
- **Schema files.** The OpenSpec schema format allows extra files in the schema directory; `openspec schema validate` passes with an added `workflow.md`. Instructions are plain text, so a pointer to a file path is just text.

Current package at the start of this change: eight forked skills, eight prompts that read them, `skills/references/subagent-routing.md`, and `opsx-generate-specs`. The schema is v8. The routing note carries the paths, language, Interaction channel and Subagent integration paragraphs.

## Goals / Non-Goals

**Goals:**
- No forked OpenSpec skill remains in the package; projects use stock skills and upgrade them with `openspec update`.
- Every rule the forks carried and the schema does not already state survives in `workflow.md`, the routing note or `subagent-routing.md`.
- `/opsx-init` sets up the stock skills when it can and explains exactly what to run when it cannot, without touching global config.
- A session warns when the stock skills Superspec needs are missing, for example after an `openspec update` under `core`.

**Non-Goals:**
- Editing, patching or wrapping the stock `SKILL.md` files (they belong to OpenSpec; `openspec update` overwrites edits).
- Writing `rules`, `context` or `operations` into the project's `openspec/config.yaml`.
- Editing the user's global OpenSpec config.
- Supporting OpenSpec 1.x.
- Removing stock skills Superspec does not use (`openspec-propose`, `openspec-update-change`, …).

## Decisions

### D1. One rules file in the schema: `schema/superspec/workflow.md`

The fixed rules live in one Markdown file shipped in the schema directory and copied into projects with the schema. Every artifact `instruction` and the `apply` block start with one line: "Follow `openspec/schemas/superspec/workflow.md` for the command you are running; it overrides the running skill where they differ." The file is organised by command (explore, new, continue, ff, apply, verify, sync, archive) plus shared sections: the Review gate, the Superpowers rule, and the stock skills not used.

*Why not inline the rules in each instruction:*
- Per-command rules (continue's loop, ff's two gates, archive's sync check) do not belong to one artifact.
- The Review gate would repeat in brainstorm, every artifact and finalize.
- The CLI already returns large instructions; duplication bloats every call.

*Why not the routing note:* the user chose to keep fixed rules versioned with the schema. The routing note is per turn and not reviewable in the project.

*Why a file and not a schema field:* the OpenSpec schema has no field for workflow-level text. Unknown top-level keys are a risk across versions (`x-pi-superspec` is already one, but adding prose there is fragile). A file is inert to the CLI and validates.

### D2. Which rules move where

| Rule (from the forks) | Destination |
|---|---|
| Review gate: outcomes, notes handling, cascade, code review gate | `workflow.md` § Review gate (single copy, so the "identical sections" rule disappears) |
| continue: one artifact, gate, loop, stop before apply, finalize after verify, partial glob artifacts | `workflow.md` § continue |
| ff: brainstorm gate, unattended to plan, always design, final packet, grounded tasks, skipped report | `workflow.md` § ff |
| Internal spec/plan review seats, baseline main specs in the handoff | `workflow.md` § continue and § ff, referencing `subagent-routing.md` |
| Superpowers redirection (drop prefix, write only where told, skip handoff, missing → stop) | `workflow.md` § Superpowers rule (instructions already name `superpowers:<x>`) |
| new: stop after scaffold, existing name → continue | `workflow.md` § new (the stock skill already stops) |
| explore: no code, consent before capture, never write brainstorm/plan, scaffold → `openspec-continue-change`, ASCII, scout recon | `workflow.md` § explore (replaces the stock `openspec-propose` handoff) |
| apply: the schema apply block replaces the stock step 6 loop; worktree discovery for re-runs; fix-iteration and post-PR modes; executor by subagent availability; lanes; contracts; scope pauses; located ticks; stop after receipt; no code review gate in apply | `workflow.md` § apply, plus the existing `apply` block |
| verify: run in the worktree, require `apply.md`, six schema checks replace the stock list, delegated evidence, fresh tests, write `verify.md`, outcomes, loop | `workflow.md` § verify, plus the existing `verify` instruction |
| sync: stock skill as is (it already covers Purpose, retire marker, blocking) | no overlay beyond the command mapping |
| archive: completion warnings, sync check and re-compare (stock already does both); archive with `openspec archive "<name>" --skip-specs -y`, never `mv` | `workflow.md` § archive |
| Ask through the Interaction channel; no Claude tool names | the routing note's Interaction channel paragraph (unchanged); `workflow.md` refers to it |
| Track progress with the `todo` tool, plain checklist fallback | `workflow.md` (shared rule near the top) |
| Running a step without its stock skill | the routing note's stock skills paragraph: name the missing skill, point to `openspec config profile` and `openspec update` or `/opsx-init`, stop |
| Delegation mechanics | the routing note's Subagent integration paragraph (unchanged) |
| Command → stock skill map; unused stock skills (`openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change`, `openspec-onboard`) | routing note (new paragraph) and `workflow.md` § Stock skills not used |
| Store selection and the project-root guard in stock skills | left to the stock skills; harmless in an initialised project |

### D3. `subagent-routing.md` moves into the schema directory

It becomes `schema/superspec/subagent-routing.md` and reaches projects as `openspec/schemas/superspec/subagent-routing.md`. `workflow.md` links it relatively. `opsx-generate-specs` (still a package skill) links the project copy by path. The routing note does not change: the Subagent integration paragraph still holds the mechanics, and the reference still holds the role policy.

*Why:* with the forks gone, nothing else in `skills/references/` points to it, and the rules that cite it now live in the schema directory.

### D4. No prompts for the workflow steps

The eight prompts `prompts/opsx-{explore,new,continue,ff,apply,verify,sync,archive}.md` are deleted (decided after the first final gate, which had approved prompts that point to the stock skills). Users run the stock skills with `/skill:<id>` (pi registers every discovered skill that way; `enableSkillCommands` defaults to true) or ask the agent. The `opsx-generate-specs` prompt and skill stay, and `/opsx-init` stays an extension command. The mapping, used in `workflow.md` and the routing note, is explore→`openspec-explore`, new→`openspec-new-change`, continue→`openspec-continue-change`, ff→`openspec-ff-change`, apply→`openspec-apply-change`, verify→`openspec-verify-change`, sync→`openspec-sync-specs`, archive→`openspec-archive-change`.

*How the rules still reach the agent:*
- **Artifacts:** every schema `instruction` and the apply block start with the pointer sentence, so any run that creates an artifact or applies reads `workflow.md`.
- **Everything else (explore, sync, archive, verify entry, change selection):** the routing note's stock skills paragraph is injected every turn and tells the agent to read the matching `workflow.md` section before running a stock skill, however it was invoked, and to stop when the skill is missing.

*Why this is riskier than prompts:* a prompt ran the rule read as the first action of the command. The paragraph relies on the agent following a standing instruction. The e2e checklist therefore covers explore, sync and archive explicitly, and the release gate is a real pi session.

### D5. Routing note: path guidance and one new paragraph

The path guidance names the stock skills instead of commands: "Spec change with clear requirements: use the `openspec-ff-change` skill. Spec change that needs careful step-by-step review: use `openspec-new-change`, then `openspec-continue-change`."

After the four paths, the note gets a "Stock skills" paragraph that:
- tells the agent that before running any of the eight stock skills (`openspec-explore`, `-new-change`, `-continue-change`, `-ff-change`, `-apply-change`, `-verify-change`, `-sync-specs`, `-archive-change`), however it was invoked, it reads that skill's section of `openspec/schemas/superspec/workflow.md` plus Shared rules, Review gate and Superpowers rule;
- says `workflow.md` overrides the stock skill where they differ;
- says that if the stock skill is not in the available skills list, the agent names it, points to `openspec config profile` and `openspec update` (or `/opsx-init`), and stops without doing the work another way;
- names `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard` as not part of Superspec and suggests the matching stock skill instead.

The paragraph comes before the document language paragraph. The routing note's existing text and order stay otherwise.

### D6. `/opsx-init` order

1. **Preflight.** `openspec --version` ≥ 2.0, else print the install line and stop with no writes.
2. **Warnings.** Warn when not in a git repo and when Superpowers is missing, as today.
3. **Stock skill check.** Required ids: explore, new, continue, ff, apply, verify, sync, archive.
   - If `.agents/skills/openspec-<id>/SKILL.md` exists for every required id, continue.
   - Otherwise read `openspec config list --json`.
   - If the profile is `custom` and `workflows` contains every required id, the profile is ready.
   - If not, report the missing workflows and print two commands, then stop before writing anything:
     - `openspec config profile` (pick the eight workflows);
     - `/opsx-init` again.
   - If the config cannot be read or parsed, report that and stop the same way.
4. **Project creation.** If `openspec/` is missing, run `openspec init --tools pi`. If it exists and skills are missing, also run `openspec init --tools pi`, which leaves `config.yaml` and the schema byte-identical (checked). Failure: print its output and stop.
5. **Config, schema, language, validation, report, reload.** As today, minus legacy cleanup. The next step in the report is to ask the agent to start a change or to run `/skill:openspec-new-change <name>`. The report adds "Commit `.agents/skills/`" when skills were installed. It also says to keep the eight workflows in the OpenSpec profile, because `openspec update` removes deselected ones.

Idempotency is redefined: a project is initialised when its schema is identical **and** the eight stock skills are present. Restoring missing skills writes only what OpenSpec manages for the `pi` tool.

*Why check skills on disk first:* a project whose skills are present needs nothing from the profile. Skipping the profile read keeps `/opsx-init` idempotent and silent on re-runs.

*Why not always run `openspec init --tools pi`:*
- It refreshes skills to the installed CLI version, which is `openspec update`'s job.
- Running it on every `/opsx-init` would make re-runs write files whenever the CLI changed.

### D7. Session-start check for missing stock skills

In an activated project with a UI, `session_start` warns once when any required `openspec-<id>` skill is missing from the project's `.agents/skills/`. The warning names the missing ids and says to add them to the OpenSpec profile and run `openspec update` (or `/opsx-init`). The check is a directory test only, with no CLI call and no writes. A missing skill makes the agent report it and stop (the routing note's stock skills paragraph, D5) rather than improvise.

*Why:* `openspec update` under the default profile silently removes four required skills (verified). Without a session check, the next `openspec-ff-change` run would find no ff skill.

### D8. Legacy cleanup removed

The change sets `retire_capabilities: true` in `.openspec.yaml` so the sync may delete the emptied `legacy-cleanup` spec, as the sync rules require.


`extensions/init/legacy.ts` and its call sites go. OpenSpec 2.0's `init --tools pi` (run by `/opsx-init` step 4 when skills are missing) removes unmodified 1.x `.pi/` output and keeps user files (verified). The `legacy-cleanup` capability is retired.

### D9. Schema v9

Adding `workflow.md` and `subagent-routing.md` and the pointer line changes the schema tree, so `version` and `x-pi-superspec.version` become 9. A new checksum is recorded in `tests/fixtures/schema-checksums.json`. No artifact id changes, so a pristine v8 project upgrades through the existing `/opsx-init` confirmation. Harness-neutral wording rules apply to `workflow.md` too: no pi tool names, no plugin names, workflow steps named by their stock skill id (`openspec-ff-change`, …); only `/opsx-init` and `/opsx-generate-specs` are spelled as commands. Stock skill ids (`openspec-*`) are allowed: they are OpenSpec's, not pi's.

### D10. Tests

- **Deleted:** tests that read `skills/opsx-*/SKILL.md` (planning, execution, the review gate identity, the routing reference link).
- **Rewritten:** the same requirements are now tested against `workflow.md`, the routing note and the schema text. Each moved rule keeps one test that finds its anchor phrase in `workflow.md`.
- **Preflight and init:** tests move to version 2.0, the skill check, the profile parsing and the `init --tools pi` path, using the existing fake IO.
- **Integration:** the integration test runs the real CLI when it is ≥ 2.0. It uses an isolated `XDG_CONFIG_HOME` with a custom profile so the user's config is never touched.

## Risks / Trade-offs

- [Stock skill wording drifts in a later OpenSpec release and wins over `workflow.md`] → the routing note and every instruction say `workflow.md` overrides. [Without prompts, explore, sync and archive depend on the routing note alone] → the e2e checklist covers them and the PR flags it as unverified. The e2e checklist re-runs the ff gate stop and the apply worktree check per OpenSpec minor release, and records the tested OpenSpec version in `docs/architecture.md`.
- [The spike put the overlay in the routing note; v9 puts it in the schema] → the e2e checklist covers the same two checks with the shipped layout before release (brainstorm gate, worktree and executor in apply).
- [User runs `openspec update` under `core` and loses four skills] → D7 session warning; `/opsx-init` report and README say to keep the eight workflows.
- [Global profile is shared across projects; changing it adds skills to other projects on their next update] → documented; `/opsx-init` never changes it and only prints the command.
- [Uninstall no longer removes all workflow skills] → documented change of Goal 3; the stock skills are OpenSpec's.
- [`.agents/skills/` is shared with other tools (`.openspec-target` lists them)] → Superspec only reads it and never edits or deletes there.
- [Larger instruction text per CLI call] → the pointer line is short; `workflow.md` is read once per command.

## Migration Plan

1. Release with a CHANGELOG entry marked breaking: OpenSpec ≥ 2.0, profile with the eight workflows, schema v9.
2. Per project:
   - update the package;
   - `/opsx-init`, which confirms the v8 → v9 upgrade and installs the stock skills, or explains the profile fix;
   - commit `openspec/schemas/superspec/` and `.agents/skills/`.
3. **Rollback:** reinstall the previous package version, then `/opsx-init --force` to restore v8. The stock skills can stay; without the v9 rules they behave as plain OpenSpec.

## Open Questions

None. The brainstorm's two open questions are settled in D3 (subagent-routing location) and D9 (schema v9).
