## MODIFIED Requirements

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

### Requirement: Generate option
`/opsx-init` SHALL accept `--generate` as a standalone token, alone or together with `--lang`, in either order, and MUST remove it from the argument string before the `--lang` value is parsed. The flag MUST NOT change what init writes; it only adds a `/opsx-generate-specs` hint to the report of a successful activation.

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
- **WHEN** `/opsx-init` runs with an argument that is neither `--generate` nor starts with `--lang`
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
