# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

First release of pi-superspec, the Superspec workflow (OpenSpec + Superpowers) for the pi coding agent.

### Added

- `/opsx-init` command that sets up a repository for the Superspec workflow: checks the OpenSpec version, runs `openspec init --tools none` when needed, merges `schema: superspec` into `openspec/config.yaml`, installs the bundled schema, offers to remove legacy `.pi/` openspec files, and validates the schema.
- Bundled `superspec` OpenSpec schema in `schema/superspec/`, installed to `openspec/schemas/superspec/` together with a lock file.
- Schema install classification (absent, identical, foreign, older, newer, edited, upgradable).
- Schema upgrade: `/opsx-init` replaces an older schema that is unchanged since install (decided from the lock file) after confirmation, or only reports the steps without a UI. A schema with local edits, a newer or a foreign schema is left unchanged until `/opsx-init --force`, which backs it up to `~/.pi/superspec-backups/` first and then replaces it. An activated project with a UI gets a session-start notice when the schema is outdated or edited. A test pins the bundled schema's version to a recorded checksum.
- Package activation: the workflow commands and skills are offered only in a project whose installed schema carries the `x-pi-superspec` marker.
- Planning commands: `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`.
- Execution commands: `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`.
- Review gates: `/opsx-continue` runs a review gate on the artifact it creates and, once approved, continues to the next artifact, stopping before `apply`; `/opsx-ff` gates `brainstorm.md`, runs the remaining artifacts unattended, then runs one final gate over proposal, design, specs, tasks and plan. A closed review is not an approval.
- Interaction channel: the extension detects how the agent asks and reviews (`inbox` via `plannotator_inbox`, `plannotator-tool`, `plannotator-cli` probed once per session start, `ask-tool`, `plain`; only active tools count) and injects an Interaction channel paragraph on every turn. Skills no longer name review or ask tools.
- Routing note with four paths: no spec change works directly with TDD; clear spec change uses `/opsx-ff`; spec change needing close review uses `/opsx-new` then `/opsx-continue`; questions, research and reviews are answered directly.
- Code review gate in finalize (step 2b): the worktree diff is reviewed before the feature branch is checked out, merged or pushed.
- `/opsx-init --generate` (prints a hint only) and `/opsx-generate-specs`, which drafts specs for an existing codebase into a `bootstrap-specs` change using `pi-subagents` scouts when installed, or sequentially otherwise; requirements backed only by code are labelled `Confidence: inferred`.
- Plan Contracts: `plan.md` has a required `## Contracts` section before the tasks that is the reviewed source of truth for contract shapes. Apply writes matching declarations or stubs per task and stops when a contract must change (asking the user for a public one), recording each change in a cumulative `## Contract deviations` section of `apply.md`. Verify check 5 checks design and contract coherence; verify still runs six checks.
- Routing note injected into the session context that directs the agent to the path that fits the work.
- Warning at session start when Superpowers is not installed.
- Baseline spec awareness: brainstorm, proposal and specs read the living specs under `openspec/specs/` where they decide; the spec reviewer compares deltas with those main specs; the routing note confirms specified behaviour before the fix path. Schema version 7; run `/opsx-init` to upgrade an installed v6 schema.
- Subagent adapters: the extension detects `@tintinweb/pi-subagents`, `pi-subagents`, `@gotgenes/pi-subagents`, the `pi-subagents` activation helper or no plugin, and injects a Subagent integration paragraph with the spawn, thinking, report and escalation mechanics. Skills name roles only.
- Plugin-neutral bundled agents with `superspec.<role>` identities, declared by both `pi-subagents.agents` and `pi.subagents.agents`; `@gotgenes/pi-subagents` supplies no bundled agents and uses only its own.
- Parallel apply lanes: schema v8 adds task groups with `Blocked by`, plan `Covers`, `Difficulty` and `Blocked by`, and a `## Lanes` table in `apply.md`. Independent tasks run in their own child worktrees and merge after review; `Difficulty` maps to the thinking level. Run `/opsx-init` to upgrade an installed v7 schema.
- Docs: compatibility table (`pi-subagents` smoke-tested; the other two inspected, not a proven minimum), three e2e runs, a `@gotgenes/pi-subagents` smoke and a lanes observation.
- Optional `language` key in `openspec/config.yaml` for the language of OpenSpec document prose.
  - `/opsx-init --lang <value>` writes it.
  - `/opsx-init` asks for it once per run when it is missing or invalid and a UI is available.
  - The default is `en`: it is written on an empty answer, cancel, invalid answer, or without a UI.
  - The routing note always tells agents to write document prose in that language, and names `en` when `config.yaml` has no valid `language:` (or no `config.yaml`).
  - Structural tokens (headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`) stay in English.
