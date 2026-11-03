# init-command Specification

## Purpose
Define the `/opsx-init` command: registration, OpenSpec preflight and warnings, project creation, orchestration order, validation, reload, and idempotency.

## Requirements
### Requirement: Command registration
The extension SHALL register a `/opsx-init` command unconditionally, independent of whether the current project is activated.

#### Scenario: Registered in an unactivated project
- **WHEN** the extension loads in a directory with no `openspec/`
- **THEN** the `opsx-init` command is registered

#### Scenario: Registered in an activated project
- **WHEN** the extension loads in an activated project
- **THEN** the `opsx-init` command is registered

### Requirement: OpenSpec preflight
`/opsx-init` SHALL run `openspec --version` first and require version 1.4 or higher. When `openspec` is missing or older, it MUST print the install line (`brew install openspec`), stop, and write no files.

#### Scenario: Supported version
- **WHEN** `openspec --version` reports 1.4.0 or higher
- **THEN** the command continues to the next step

#### Scenario: Version too old
- **WHEN** `openspec --version` reports a version below 1.4
- **THEN** the command prints the install line, stops, and the project directory is unchanged

#### Scenario: OpenSpec not installed
- **WHEN** running `openspec --version` fails
- **THEN** the command prints the install line, stops, and the project directory is unchanged

### Requirement: Non-blocking warnings
`/opsx-init` SHALL warn, and MUST NOT stop, when the working directory is not inside a git repository, and when Superpowers skills are not discoverable. A warning for Superpowers MUST be skipped when the package cannot determine discoverability reliably.

#### Scenario: Not a git repository
- **WHEN** the command runs outside a git repository
- **THEN** a warning is emitted and the remaining steps still run

#### Scenario: Superpowers missing
- **WHEN** Superpowers skills are not discoverable
- **THEN** a warning is emitted and the remaining steps still run

### Requirement: OpenSpec project creation
When `openspec/` is missing from the project root, `/opsx-init` SHALL run `openspec init --tools none`. When `openspec/` exists, it MUST NOT run `openspec init`.

#### Scenario: Fresh repository
- **WHEN** the command runs in a git repository without `openspec/`
- **THEN** `openspec init --tools none` runs and `openspec/` exists afterwards

#### Scenario: Existing openspec directory
- **WHEN** `openspec/` already exists
- **THEN** `openspec init` is not run

### Requirement: Stop on unmanaged schema
When the existing project schema is neither absent nor identical to the bundled one, `/opsx-init` SHALL report its state and stop after the legacy-cleanup step, without running validation and without calling `ctx.reload()`.

#### Scenario: Foreign schema present
- **WHEN** the project already has a schema without the `x-pi-superspec` marker
- **THEN** the state is reported, validation is not run and `ctx.reload()` is not called

### Requirement: Validation and activation
After installing, `/opsx-init` SHALL run `openspec schema validate superspec` and report the result. On success it MUST call `ctx.reload()` and print `/opsx-new <name>` as the next step. On failure it MUST report the validator output and MUST NOT reload.

#### Scenario: Validation passes
- **WHEN** validation succeeds
- **THEN** the result is reported, `ctx.reload()` is called, and the next step is printed

#### Scenario: Validation fails
- **WHEN** validation fails
- **THEN** the validator output is reported and `ctx.reload()` is not called

### Requirement: Idempotency
Running `/opsx-init` again on an already initialised project SHALL leave every file byte-identical and MUST NOT delete or rewrite anything.

#### Scenario: Second run is a no-op
- **WHEN** `/opsx-init` runs twice on an empty temp git repository
- **THEN** the first run yields a valid, activated project and the second run changes no file

#### Scenario: End to end on an empty repository
- **WHEN** `/opsx-init` runs on an empty temp git repository with a real `openspec`
- **THEN** `isActivated` is true and `openspec schema validate superspec` passes
