# schema-install Specification

## Purpose
Define how `/opsx-init` installs the bundled schema, writes the sha256 lock file, and classifies an existing schema directory without overwriting it.

## Requirements
### Requirement: Fresh install
When `openspec/schemas/superspec/` does not exist, `/opsx-init` SHALL copy the bundled `schema/superspec/` tree into it and write `.pi-superspec.json` there.

#### Scenario: Absent schema directory
- **WHEN** the project has no `openspec/schemas/superspec/`
- **THEN** the directory is created with every bundled file and a lock file

### Requirement: Lock file contents
The lock file SHALL be JSON with `schemaVersion` (the bundled schema's `version`), `packageVersion` (the package's `package.json` version), and `files`, a map of relative path to sha256 hex of every installed file except the lock itself. Keys MUST be sorted and the file MUST end with a newline so identical input yields identical bytes.

#### Scenario: Hashes match files
- **WHEN** the lock is read after install
- **THEN** each listed path exists and its sha256 equals the recorded value, and the lock lists no other files

#### Scenario: Versions recorded
- **WHEN** the lock is read after install
- **THEN** `schemaVersion` equals the bundled schema version and `packageVersion` equals the package version

#### Scenario: Deterministic output
- **WHEN** the install runs on two empty projects
- **THEN** both lock files are byte-identical

### Requirement: Existing schema directory
When `openspec/schemas/superspec/` exists, `/opsx-init` SHALL install nothing if its files match the bundled files by sha256, and otherwise MUST report the state (older, edited, newer, or foreign when `schema.yaml` lacks the `x-pi-superspec` marker) and write nothing in that directory. It MUST NOT back up, overwrite or delete files there; upgrade and `--force` belong to `schema-auto-upgrade`.

#### Scenario: Identical to bundled
- **WHEN** the existing directory matches the bundled files
- **THEN** no file is written and the lock is left unchanged

#### Scenario: Foreign schema
- **WHEN** the existing `schema.yaml` has no `x-pi-superspec` marker
- **THEN** the state is reported as foreign and the directory is unchanged

#### Scenario: Edited schema
- **WHEN** the existing marker version equals the bundled version and a bundled file is missing or differs in content
- **THEN** the state is reported as edited and the directory is unchanged

#### Scenario: Older or newer schema
- **WHEN** the existing marker version is lower or higher than the bundled version
- **THEN** the state is reported as older or newer and the directory is unchanged
