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
`/opsx-init` SHALL run `openspec --version` first and require version 1.16 or higher. When `openspec` is missing or older, it MUST print the install line (`brew install openspec`), stop, and write no files.

#### Scenario: Supported version
- **WHEN** `openspec --version` reports 1.16.0 or higher
- **THEN** the command continues to the next step

#### Scenario: Version too old
- **WHEN** `openspec --version` reports a version below 1.16, such as 1.4.1
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
When the existing project schema is neither absent nor identical to the bundled one and it is not replaced in this run (see "Schema upgrade" and "Force option"), `/opsx-init` SHALL report its state and stop after the legacy-cleanup step, without running validation and without calling `ctx.reload()`. The report MUST name the state, and for every blocked state other than an upgradable one MUST mention `/opsx-init --force` and that it keeps a backup.

#### Scenario: Foreign schema present
- **WHEN** the project already has a schema without the `x-pi-superspec` marker
- **THEN** the state is reported, validation is not run and `ctx.reload()` is not called

#### Scenario: Edited schema without force
- **WHEN** the project schema is edited and `/opsx-init` runs without `--force`
- **THEN** the run is blocked, the report mentions `--force`, and the schema directory is byte-identical afterwards

#### Scenario: Older schema with local edits without force
- **WHEN** the project schema is older and not pristine and `/opsx-init` runs without `--force`
- **THEN** the run is blocked, the report mentions `--force`, and the schema directory is byte-identical afterwards

#### Scenario: Newer schema without force
- **WHEN** the project schema is newer and `/opsx-init` runs without `--force`
- **THEN** the run is blocked, the report says the package is older than the project schema, and the schema directory is byte-identical afterwards

### Requirement: Validation and activation
After installing or replacing the schema, `/opsx-init` SHALL run `openspec schema validate superspec` and report the result. On success it MUST call `ctx.reload()` and print `/opsx-new <name>` as the next step. On failure it MUST report the validator output and MUST NOT reload.

#### Scenario: Validation passes
- **WHEN** validation succeeds
- **THEN** the result is reported, `ctx.reload()` is called, and the next step is printed

#### Scenario: Validation fails
- **WHEN** validation fails
- **THEN** the validator output is reported and `ctx.reload()` is not called

#### Scenario: Validation fails after replacement
- **WHEN** the schema was upgraded or force-replaced and validation fails
- **THEN** the replaced files are kept, the validator output and any backup path are reported, and `ctx.reload()` is not called

### Requirement: Idempotency
Running `/opsx-init` again on an already initialised project SHALL leave every file byte-identical and MUST NOT delete or rewrite anything, except that an explicit `--lang`, an accepted language prompt, or the default language (written when the project has no valid `language:`) MAY write the `language:` line. A project is already initialised when its schema is identical to the bundled one; replacing a schema that is not identical, through "Schema upgrade" or "Forced replacement", is not a re-run of an initialised project. Running without `--lang` MUST NOT remove or change an existing valid `language:` value.

#### Scenario: Second run is a no-op
- **WHEN** `/opsx-init` runs twice on an empty temp git repository
- **THEN** the first run yields a valid, activated project with `language: en` and the second run changes no file

#### Scenario: End to end on an empty repository
- **WHEN** `/opsx-init` runs on an empty temp git repository with a real `openspec`
- **THEN** `isActivated` is true and `openspec schema validate superspec` passes

#### Scenario: Existing language preserved
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init` runs without a flag
- **THEN** the file is byte-identical afterwards

### Requirement: Language option
`/opsx-init` SHALL accept `--lang <value>` and `--lang=<value>`. A valid value MUST be written to `language:` in `openspec/config.yaml`, overwriting an existing value. A `--lang` with a missing value, or a value that violates the rules of the `document-language` capability, MUST produce an error notice and stop before any file is written or any command that writes is run.

#### Scenario: Flag sets the language
- **WHEN** `/opsx-init --lang vi` runs on a fresh repository
- **THEN** `config.yaml` contains `language: vi` after the run

#### Scenario: Flag overwrites
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init --lang=en` runs
- **THEN** `config.yaml` contains `language: en`

#### Scenario: Missing value
- **WHEN** `/opsx-init --lang` runs with no value
- **THEN** an error is reported and no file is created or changed

#### Scenario: Invalid value
- **WHEN** `/opsx-init --lang` is given a 100-character value
- **THEN** an error is reported and no file is created or changed

### Requirement: Language prompt
When no `--lang` flag was given, `config.yaml` has no valid `language:` and a UI is available, `/opsx-init` SHALL ask the user for the document language, offering `en` as the default. A non-empty valid answer MUST be written to `language:`. Skipping, cancelling or an empty answer MUST fall back to the default language (see "Default language"). An invalid answer MUST produce a warning that it was not used and then fall back to the default language. Without a UI the command MUST NOT ask.

#### Scenario: User answers
- **WHEN** the user answers `vi` to the prompt
- **THEN** `config.yaml` contains `language: vi`

#### Scenario: User skips
- **WHEN** the user cancels the prompt or answers with an empty string
- **THEN** `config.yaml` contains `language: en` and the rest of the command continues

#### Scenario: Invalid answer
- **WHEN** the user answers with a 100-character value
- **THEN** a warning says the value was not used and `config.yaml` contains `language: en`

#### Scenario: Language already set
- **WHEN** `config.yaml` already has `language: vi` and no flag is given
- **THEN** the user is not asked

#### Scenario: No UI
- **WHEN** the command runs without a UI and without `--lang`
- **THEN** the user is not asked

### Requirement: Default language
When no `--lang` flag was given and `config.yaml` has no valid `language:` after the prompt step (the prompt was skipped, cancelled, invalid or not shown because there is no UI), `/opsx-init` SHALL write `language: en`. A valid existing `language:` value MUST NOT be changed. An invalid existing `language:` line, such as an over-long value, MUST be replaced by `language: en`.

#### Scenario: No flag and no UI
- **WHEN** `/opsx-init` runs without a UI and without `--lang` on a project that has no `language:` line
- **THEN** `config.yaml` contains `language: en`

#### Scenario: Existing value kept
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init` runs without a flag
- **THEN** the file is byte-identical afterwards

#### Scenario: Invalid existing value replaced
- **WHEN** `config.yaml` has a 100-character `language:` value and `/opsx-init` runs without a UI and without a flag
- **THEN** that line becomes `language: en`

### Requirement: Language step order
The language step SHALL run after the project schema has been installed, replaced or found identical and legacy cleanup is done, and before schema validation. When the existing schema blocks activation, `/opsx-init` MUST NOT write the language and MUST NOT ask for it, even when `--lang` is given.

#### Scenario: Blocked project with a flag
- **WHEN** the project has a foreign schema and `/opsx-init --lang vi` runs
- **THEN** the run is blocked and `config.yaml` has no `language:` line

#### Scenario: Blocked project without a flag
- **WHEN** the project has a foreign schema, a UI is available and no flag is given
- **THEN** the user is not asked for a language

#### Scenario: Upgraded project with a flag
- **WHEN** the project schema is upgradable, the user confirms, and `/opsx-init --lang vi` runs
- **THEN** `config.yaml` contains `language: vi` after the run

### Requirement: Generate option
`/opsx-init` SHALL accept `--generate` as a standalone token, alone or together with `--lang` and `--force`, in any order, and MUST remove it from the argument string before the `--lang` value is parsed. The flag MUST NOT change what init writes; it only adds a `/opsx-generate-specs` hint to the report of a successful activation.

#### Scenario: Flag alone
- **WHEN** `/opsx-init --generate` runs on a fresh repository
- **THEN** the project is activated, the report mentions `/opsx-generate-specs` and `/opsx-new <name>`, and `config.yaml` is the same as without the flag

#### Scenario: Flag with language
- **WHEN** `/opsx-init --lang vi --generate` runs on a fresh repository
- **THEN** `config.yaml` contains `language: vi` and the report mentions `/opsx-generate-specs`

#### Scenario: Flag before language
- **WHEN** `/opsx-init --generate --lang vi` runs on a fresh repository
- **THEN** `config.yaml` contains `language: vi` and the report mentions `/opsx-generate-specs`

#### Scenario: Multi-word language
- **WHEN** `/opsx-init --lang Tiếng Việt --generate` runs
- **THEN** `config.yaml` contains `language: Tiếng Việt`

#### Scenario: Flag with a value
- **WHEN** `/opsx-init --generate=yes` runs
- **THEN** an error is reported and no file is created or changed, and no command that writes is run

#### Scenario: Repeated flag
- **WHEN** `/opsx-init --generate --generate` runs
- **THEN** an error is reported and no file is created or changed, and no command that writes is run

#### Scenario: Other arguments
- **WHEN** `/opsx-init` runs with an argument that is neither `--generate` nor `--force` nor starts with `--lang`
- **THEN** an error is reported and no file is created or changed, and no command that writes is run

#### Scenario: Blocked project
- **WHEN** the project has a foreign schema and `/opsx-init --generate` runs
- **THEN** the run is blocked and the report does not mention `/opsx-generate-specs`

#### Scenario: Failed preflight or validation
- **WHEN** preflight or validation fails while `--generate` is given
- **THEN** no `/opsx-generate-specs` hint is printed

#### Scenario: No agent work
- **WHEN** `/opsx-init --generate` runs
- **THEN** init starts no agent work or subagent because of the flag

#### Scenario: Idempotent
- **WHEN** `/opsx-init --generate` runs a second time on an initialised project
- **THEN** every file is byte-identical afterwards

### Requirement: Schema upgrade
When the project schema is upgradable and `--force` is not given, `/opsx-init` SHALL ask the user to confirm the upgrade when a UI is available. On confirmation it MUST replace the schema without a backup and continue as after a fresh install, and the report MUST name the old and new versions and tell the user to commit `openspec/schemas/superspec/`. When the user declines or no UI is available, it MUST write nothing in the schema directory, print the upgrade steps, and stop as a blocked run.

#### Scenario: Confirmed upgrade
- **WHEN** a v6 schema installed by an earlier release is unchanged and the user confirms
- **THEN** the schema directory equals a fresh v7 install, no backup is written, validation runs, `ctx.reload()` is called and the report says upgraded from v6 to v7

#### Scenario: Declined upgrade
- **WHEN** the schema is upgradable and the user declines
- **THEN** the schema directory is byte-identical, validation is not run and `ctx.reload()` is not called

#### Scenario: No UI
- **WHEN** the schema is upgradable and the command runs without a UI
- **THEN** the user is not asked, the schema directory is byte-identical, the report names the upgrade steps, and `ctx.reload()` is not called

#### Scenario: Second run after upgrade
- **WHEN** `/opsx-init` runs again after a confirmed upgrade
- **THEN** every file is byte-identical afterwards

### Requirement: Force option
`/opsx-init` SHALL accept `--force` as a standalone token, alone or together with `--lang` and `--generate`, in any order, and MUST remove it from the argument string before the `--lang` value is parsed. A repeated `--force` or a valued form such as `--force=yes` MUST produce an error and write nothing.

#### Scenario: Force with language and generate
- **WHEN** `/opsx-init --force --lang vi --generate` runs on an edited schema
- **THEN** the schema is replaced, `config.yaml` contains `language: vi` and the report mentions `/opsx-generate-specs`

#### Scenario: Repeated or valued force
- **WHEN** `/opsx-init --force --force` or `/opsx-init --force=yes` runs
- **THEN** an error is reported and no file is created or changed, and no command that writes is run

#### Scenario: Force before or after language
- **WHEN** `/opsx-init --force --lang vi` or `/opsx-init --lang vi --force` runs
- **THEN** both parse as language `vi` with force enabled

#### Scenario: Language value missing before force
- **WHEN** `/opsx-init --lang --force` runs
- **THEN** an error about the missing `--lang` value is reported and no file is created or changed

### Requirement: Forced replacement
With `--force`, every existing schema that is not identical SHALL be backed up and then replaced without asking, and the run MUST continue as after a fresh install. The report MUST print the backup path and say `upgraded` for a lower version, `downgraded` for a newer one, and `replaced` for a foreign or same-version one. An absent schema MUST be installed fresh, and an identical one left unchanged with no backup.

#### Scenario: Force on an edited schema
- **WHEN** the project schema is edited and `/opsx-init --force` runs
- **THEN** a backup holding the old files exists at the printed path, the schema directory equals a fresh install, and `ctx.reload()` is called

#### Scenario: Force on a newer schema
- **WHEN** the project schema is newer and `/opsx-init --force` runs
- **THEN** a backup is written, the schema is replaced, and the report says downgraded

#### Scenario: Force on an older schema with local edits
- **WHEN** the project schema is older and not pristine and `/opsx-init --force` runs
- **THEN** a backup is written, the schema is replaced, and the report says upgraded

#### Scenario: Force on a foreign schema
- **WHEN** the project schema is foreign and `/opsx-init --force` runs
- **THEN** a backup labelled `foreign` is written, the schema is replaced, and the report says replaced

#### Scenario: Force on an absent schema
- **WHEN** the project has no schema directory and `/opsx-init --force` runs
- **THEN** the schema is installed fresh and no backup is written

#### Scenario: Force on an upgradable schema
- **WHEN** the project schema is upgradable and `/opsx-init --force` runs with a UI
- **THEN** the user is not asked, a backup is written and the schema is replaced

#### Scenario: Force on an identical schema
- **WHEN** the project schema is identical and `/opsx-init --force` runs
- **THEN** no backup is written and every schema file is byte-identical

#### Scenario: Second run after force
- **WHEN** `/opsx-init` runs again after a forced replacement
- **THEN** no backup is written and every file is byte-identical afterwards

#### Scenario: Backup failure
- **WHEN** the backup cannot be written
- **THEN** an error is reported, the schema directory is byte-identical, validation is not run and `ctx.reload()` is not called
