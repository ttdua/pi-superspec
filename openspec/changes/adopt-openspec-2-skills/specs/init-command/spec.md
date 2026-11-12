## ADDED Requirements

### Requirement: Stock skill check
After the preflight, `/opsx-init` SHALL check `.agents/skills/` for the eight required stock skills and continue when all are present. Otherwise it SHALL read `openspec config list --json`; the profile is ready when it is `custom` and selects the eight workflows. When it is not ready or cannot be read, the command MUST report why, print `openspec config profile` and `/opsx-init`, and stop with no writes. It MUST NOT edit the global OpenSpec configuration.

#### Scenario: Skills present
- **WHEN** `openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs` and `openspec-archive-change` exist under `.agents/skills/`
- **THEN** `openspec config list` is not run and the command continues

#### Scenario: Profile ready
- **WHEN** stock skills are missing and `openspec config list --json` reports profile `custom` with workflows `explore`, `new`, `continue`, `ff`, `apply`, `verify`, `sync` and `archive`
- **THEN** the command continues to project creation

#### Scenario: Default profile
- **WHEN** stock skills are missing and `openspec config list --json` reports profile `core`
- **THEN** the command names `new`, `continue`, `ff` and `verify` as missing, prints `openspec config profile` and `/opsx-init`, stops, and the project directory is unchanged

#### Scenario: Unreadable configuration
- **WHEN** stock skills are missing and `openspec config list --json` fails or prints invalid JSON
- **THEN** the command reports the failure, prints the same steps, stops, and the project directory is unchanged

#### Scenario: Global configuration untouched
- **WHEN** the command runs in any state
- **THEN** it never runs `openspec config set`, `openspec config profile` or `openspec config reset`

## MODIFIED Requirements

### Requirement: OpenSpec preflight
`/opsx-init` SHALL run `openspec --version` first and require version 2.0 or higher. When `openspec` is missing or older, it MUST print the install line (`brew install openspec`), stop, and write no files.

#### Scenario: Supported version
- **WHEN** `openspec --version` reports 2.0.0 or higher
- **THEN** the command continues to the next step

#### Scenario: Version too old
- **WHEN** `openspec --version` reports a version below 2.0, such as 1.17.0
- **THEN** the command prints the install line, stops, and the project directory is unchanged

#### Scenario: OpenSpec not installed
- **WHEN** running `openspec --version` fails
- **THEN** the command prints the install line, stops, and the project directory is unchanged

### Requirement: OpenSpec project creation
After the stock skill check passes, `/opsx-init` SHALL run `openspec init --tools pi` in the project root when `openspec/` is missing or when any required stock skill is missing from `.agents/skills/`. When `openspec/` exists and every required stock skill is present, it MUST NOT run `openspec init`. When `openspec init` fails, `/opsx-init` MUST report its output and stop before writing `config.yaml` or the schema.

#### Scenario: Fresh repository
- **WHEN** the command runs in a git repository without `openspec/` and the OpenSpec profile is ready
- **THEN** `openspec init --tools pi` runs, and `openspec/` and the eight stock skills exist afterwards

#### Scenario: Existing project without stock skills
- **WHEN** `openspec/` exists, `.agents/skills/` lacks `openspec-ff-change`, and the OpenSpec profile is ready
- **THEN** `openspec init --tools pi` runs

#### Scenario: Existing openspec directory
- **WHEN** `openspec/` exists and all eight stock skills are present
- **THEN** `openspec init` is not run

#### Scenario: Init fails
- **WHEN** `openspec init --tools pi` exits non-zero
- **THEN** its output is reported and neither `config.yaml` nor the schema is written

### Requirement: Stop on unmanaged schema
When the existing project schema is neither absent nor identical to the bundled one and it is not replaced in this run (see "Schema upgrade" and "Force option"), `/opsx-init` SHALL report its state and stop, without running validation and without calling `ctx.reload()`. The report MUST name the state, and for every blocked state other than an upgradable one MUST mention `/opsx-init --force` and that it keeps a backup.

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
After installing or replacing the schema, `/opsx-init` SHALL run `openspec schema validate superspec` and report the result. On success it MUST call `ctx.reload()` and print `Next: ask the agent to start a change, or run /skill:openspec-new-change <name>` as the next step. When this run installed stock skills, the report MUST also say to commit `.agents/skills/` and to keep the eight required workflows in the OpenSpec profile, because `openspec update` removes workflows the profile does not select. On failure it MUST report the validator output and MUST NOT reload.

#### Scenario: Validation passes
- **WHEN** validation succeeds
- **THEN** the result is reported, `ctx.reload()` is called, and the next step is printed

#### Scenario: Report after installing stock skills
- **WHEN** validation succeeds in a run that ran `openspec init --tools pi`
- **THEN** the report tells the user to commit `.agents/skills/` and to keep the eight workflows in the OpenSpec profile

#### Scenario: Validation fails
- **WHEN** validation fails
- **THEN** the validator output is reported and `ctx.reload()` is not called

#### Scenario: Validation fails after replacement
- **WHEN** the schema was upgraded or force-replaced and validation fails
- **THEN** the replaced files are kept, the validator output and any backup path are reported, and `ctx.reload()` is not called

### Requirement: Idempotency
Running `/opsx-init` again on an already initialised project SHALL leave every file byte-identical and MUST NOT delete or rewrite anything, except that an explicit `--lang`, an accepted language prompt, or the default language (written when the project has no valid `language:`) MAY write the `language:` line. A project is already initialised when its schema is identical to the bundled one and all eight required stock skills are present under `.agents/skills/`; restoring missing stock skills through `openspec init --tools pi` is not a re-run of an initialised project and MAY write only under `.agents/skills/` and the files OpenSpec manages for the `pi` tool; replacing a schema that is not identical, through "Schema upgrade" or "Forced replacement", is not a re-run of an initialised project. Running without `--lang` MUST NOT remove or change an existing valid `language:` value.

#### Scenario: Second run is a no-op
- **WHEN** `/opsx-init` runs twice on an empty temp git repository
- **THEN** the first run yields a valid, activated project with `language: en` and the second run changes no file

#### Scenario: End to end on an empty repository
- **WHEN** `/opsx-init` runs on an empty temp git repository with a real `openspec` 2.x and an isolated OpenSpec config whose profile selects the eight workflows
- **THEN** `isActivated` is true, `openspec schema validate superspec` passes, and the eight stock skills exist under `.agents/skills/`

#### Scenario: Missing stock skills restored
- **WHEN** the schema is identical to the bundled one, `.agents/skills/` lacks `openspec-ff-change`, and the OpenSpec profile is ready
- **THEN** `openspec init --tools pi` restores the skill, and `openspec/config.yaml` and `openspec/schemas/superspec/` are byte-identical afterwards

#### Scenario: Existing language preserved
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init` runs without a flag
- **THEN** the file is byte-identical afterwards

### Requirement: Language step order
The language step SHALL run after the project schema has been installed, replaced or found identical, and before schema validation. When the existing schema blocks activation, `/opsx-init` MUST NOT write the language and MUST NOT ask for it, even when `--lang` is given.

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
- **THEN** the project is activated, the report mentions `/opsx-generate-specs` and the next step printed by "Validation and activation", and `config.yaml` is the same as without the flag

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
