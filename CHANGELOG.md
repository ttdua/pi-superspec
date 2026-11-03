# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0]

First release of pi-superspec, the Superspec workflow (OpenSpec + Superpowers) for the pi coding agent.

### Added

- `/opsx-init` command that sets up a repository for the Superspec workflow: checks the OpenSpec version, runs `openspec init --tools none` when needed, merges `schema: superspec` into `openspec/config.yaml`, installs the bundled schema, offers to remove legacy `.pi/` openspec files, and validates the schema.
- Bundled `superspec` OpenSpec schema in `schema/superspec/`, installed to `openspec/schemas/superspec/` together with a lock file.
- Schema install classification (absent, identical, foreign, older, newer, edited); an existing schema that is not identical is left unchanged and activation stops.
- Package activation: the workflow commands and skills are offered only in a project whose installed schema carries the `x-pi-superspec` marker.
- Planning commands: `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`.
- Execution commands: `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`.
- Routing note injected into the session context that directs behaviour-changing work through `/opsx-new` before brainstorming.
- Warning at session start when Superpowers is not installed.
