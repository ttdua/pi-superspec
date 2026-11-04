# Package Manifest Specification

## Purpose

Define the pi package manifest rules for pi-superspec: keyword, extensions-only declaration, peer dependencies and published files.
## Requirements
### Requirement: pi package manifest
`package.json` SHALL declare the `pi-package` keyword and a `pi` block that lists extensions only. It MUST NOT declare `skills`, `prompts` or `themes` in the `pi` block, so those resources load only through activation. It SHALL additionally declare top-level `pi-subagents.agents` as `["./agents"]` for optional package-agent discovery; this metadata MUST NOT change resource activation or require runtime registration.

#### Scenario: Extensions only
- **WHEN** `package.json` is read
- **THEN** `pi.extensions` lists `./extensions/superspec.ts` and `pi.skills`, `pi.prompts` and `pi.themes` are absent

#### Scenario: Package keyword
- **WHEN** `package.json` is read
- **THEN** `keywords` includes `pi-package`

#### Scenario: Optional discovery metadata
- **WHEN** compatible pi-subagents discovers the installed package in a project without the Superspec marker
- **THEN** it discovers the namespaced package agents while activated workflow skills/prompts remain hidden

### Requirement: Host packages as peer dependencies
Host packages provided by pi SHALL be declared in `peerDependencies` with version `"*"`, and the package MUST NOT have runtime `dependencies`.

#### Scenario: Peer declaration
- **WHEN** `package.json` is read
- **THEN** `@earendil-works/pi-coding-agent` is in `peerDependencies` with `"*"` and `dependencies` is absent or empty

### Requirement: Published files
The published package SHALL include `extensions`, `skills`, `prompts`, `schema`, and `agents` and MUST exclude tests and fixtures. Uninstalling the package MUST require no cleanup of copied agent definitions or generated agent settings.

#### Scenario: Files allow-list
- **WHEN** `package.json` is read
- **THEN** `files` contains `extensions`, `skills`, `prompts`, `schema`, and `agents` and does not contain `tests`

#### Scenario: Self-contained package
- **WHEN** the packaged resource paths are inspected and the package is removed
- **THEN** agent definitions belong to the package and no user/project agent directory or settings entry created by Superspec requires cleanup
