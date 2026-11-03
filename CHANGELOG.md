# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

First release of pi-superspec, the Superspec workflow (OpenSpec + Superpowers) for the pi coding agent.

### Added

- `/opsx-init` command that sets up a repository for the Superspec workflow: checks the OpenSpec version, runs `openspec init --tools none` when needed, merges `schema: superspec` into `openspec/config.yaml`, installs the bundled schema, offers to remove legacy `.pi/` openspec files, and validates the schema.
- Bundled `superspec` OpenSpec schema in `schema/superspec/`, installed to `openspec/schemas/superspec/` together with a lock file.
- Schema install classification (absent, identical, foreign, older, newer, edited); an existing schema that is not identical is left unchanged and activation stops.
- Package activation: the workflow commands and skills are offered only in a project whose installed schema carries the `x-pi-superspec` marker.
- Planning commands: `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`.
- Execution commands: `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`.
- Review gates: `/opsx-continue` runs a review gate on the artifact it creates and then stops; `/opsx-ff` gates `brainstorm.md`, runs the remaining artifacts unattended, then runs one final gate over proposal, design, specs, tasks and plan. The reviewer is the `plannotator` tool, then the Plannotator CLI in the background, then `ask_user_question`, then plain text; a closed review is not an approval.
- Code review gate in finalize (step 2b): the worktree diff is reviewed before the feature branch is checked out, merged or pushed.
- `/opsx-init --generate` (prints a hint only) and `/opsx-generate-specs`, which drafts specs for an existing codebase into a `bootstrap-specs` change using `pi-subagents` scouts when installed, or sequentially otherwise; requirements backed only by code are labelled `Confidence: inferred`.
- Routing note injected into the session context that directs behaviour-changing work through `/opsx-new` before brainstorming.
- Warning at session start when Superpowers is not installed.
- Optional `language` key in `openspec/config.yaml` for the language of OpenSpec document prose.
  - `/opsx-init --lang <value>` writes it.
  - `/opsx-init` asks for it once per run when it is missing or invalid and a UI is available.
  - The default is `en`: it is written on an empty answer, cancel, invalid answer, or without a UI.
  - The routing note always tells agents to write document prose in that language, and names `en` when `config.yaml` has no valid `language:` (or no `config.yaml`).
  - Structural tokens (headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`) stay in English.
