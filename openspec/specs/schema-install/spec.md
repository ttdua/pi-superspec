# schema-install Specification

## Purpose
Define how `/opsx-init` installs the bundled schema, writes the sha256 lock file, classifies an existing schema directory against the bundled schema and its lock, and replaces it safely, with a backup outside the project when forced.

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
When `openspec/schemas/superspec/` exists, `/opsx-init` SHALL install nothing if every bundled file matches by sha256, and otherwise MUST classify the directory as one of: `upgradable` (marker version lower than bundled and the tree is pristine, see "Pristine schema"), `older` (marker version lower and not pristine), `edited` (same marker version and a bundled file is missing or differs), `newer` (marker version higher), or `foreign` (`schema.yaml` lacks the `x-pi-superspec` marker with a version). Classification MUST NOT write any file. Files in that directory MUST be overwritten or deleted only through "Schema replacement", and only in the cases the `init-command` capability allows.

#### Scenario: Identical to bundled
- **WHEN** the existing directory matches the bundled files
- **THEN** no file is written and the lock is left unchanged

#### Scenario: Foreign schema
- **WHEN** the existing `schema.yaml` has no `x-pi-superspec` marker
- **THEN** the state is reported as foreign

#### Scenario: Edited schema
- **WHEN** the existing marker version equals the bundled version and a bundled file is missing or differs in content
- **THEN** the state is reported as edited

#### Scenario: Older schema unchanged since install
- **WHEN** the existing marker version is lower than the bundled version and the tree is pristine
- **THEN** the state is reported as upgradable

#### Scenario: Older or newer schema
- **WHEN** the existing marker version is lower than the bundled version and the tree is not pristine, or higher than the bundled version
- **THEN** the state is reported as older or newer

#### Scenario: Classification writes nothing
- **WHEN** any existing directory is classified
- **THEN** every file in it is byte-identical afterwards

### Requirement: Pristine schema
An existing schema directory SHALL be pristine only when its lock is JSON with a numeric `schemaVersion` equal to the marker version in `schema.yaml` and a `files` object of strings, and the regular files in the directory at any depth, other than the lock, are exactly the `files` keys with equal sha256. Any extra file (such as `.DS_Store`) and a missing, unreadable or malformed lock MUST make it not pristine.

#### Scenario: Untouched install
- **WHEN** a directory was installed with its lock and no file was changed
- **THEN** it is pristine

#### Scenario: Changed file
- **WHEN** one installed file differs from its lock hash
- **THEN** it is not pristine

#### Scenario: Extra or missing file
- **WHEN** a file not listed in the lock is added, or a listed file is removed
- **THEN** it is not pristine

#### Scenario: No usable lock
- **WHEN** the lock file is missing or is not valid lock JSON
- **THEN** it is not pristine

#### Scenario: Lock version mismatch
- **WHEN** the lock's `schemaVersion` differs from the marker version in `schema.yaml`
- **THEN** it is not pristine

### Requirement: Schema replacement
Replacing an existing schema SHALL remove `openspec/schemas/superspec/`, copy the bundled tree into it and write a new lock file with the same contents a fresh install writes. When a backup is requested, the whole existing directory, lock included, MUST be copied to the backup directory before anything is removed, and a failed backup MUST leave the existing directory unchanged.

#### Scenario: Replace without backup
- **WHEN** an upgradable directory is replaced without a backup
- **THEN** the directory equals a fresh install, file for file, and its lock is byte-identical to a fresh install's lock

#### Scenario: Replace with backup
- **WHEN** an edited directory is replaced with a backup
- **THEN** the backup directory holds every file of the old directory, including its lock, with identical bytes, and the project directory equals a fresh install

#### Scenario: Backup fails
- **WHEN** copying to the backup directory fails
- **THEN** the existing directory is byte-identical afterwards and the failure is reported

#### Scenario: Replacement fails after backup
- **WHEN** the backup succeeds and removing or copying the schema then fails
- **THEN** the failure is reported with the backup path, and the backup is intact

### Requirement: Backup location
A backup SHALL be written to `<home>/.pi/superspec-backups/<folder>-<hash8>/<label>-<timestamp>/`: `<folder>` is the project folder name, `<hash8>` the first 8 hex characters of the sha256 of the project's real root path, `<label>` is `v<marker version>` or `foreign`, and `<timestamp>` is UTC `YYYYMMDDTHHMMSSmmmZ`. An existing backup directory MUST NOT be overwritten, and backups MUST NOT be written inside the project or the OS temporary directory.

#### Scenario: Path shape
- **WHEN** an edited v7 schema in project `/work/app` is backed up
- **THEN** the backup directory matches `~/.pi/superspec-backups/app-[0-9a-f]{8}/v7-\d{8}T\d{9}Z/`

#### Scenario: Foreign label
- **WHEN** a foreign schema is backed up
- **THEN** the last path segment starts with `foreign-`

#### Scenario: Distinct projects
- **WHEN** two projects with the same folder name in different locations are backed up
- **THEN** their backups are in different directories
