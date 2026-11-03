## ADDED Requirements

### Requirement: Generate option
`/opsx-init` SHALL accept `--generate` as a standalone token, alone or together with `--lang`, in either order. The token MUST be removed from the argument string before the `--lang` value is parsed, so a language value such as `Tiếng Việt` is unaffected. `--generate=<value>`, a repeated `--generate`, and any other argument that does not start with `--lang` MUST produce an error notice and stop before any file is written or any command that writes is run. The flag MUST NOT change what init writes or any other step; it only adds a hint to the final report. When init activates the project, the report MUST include `/opsx-generate-specs` as a next step in addition to `/opsx-new <name>`. When init is blocked, fails validation or fails preflight, no `/opsx-generate-specs` hint SHALL be printed. Init MUST NOT start any agent work or subagent because of the flag.

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
- **THEN** an error is reported and no file is created or changed

#### Scenario: Repeated flag
- **WHEN** `/opsx-init --generate --generate` runs
- **THEN** an error is reported and no file is created or changed

#### Scenario: Blocked project
- **WHEN** the project has a foreign schema and `/opsx-init --generate` runs
- **THEN** the run is blocked and the report does not mention `/opsx-generate-specs`

#### Scenario: Idempotent
- **WHEN** `/opsx-init --generate` runs a second time on an initialised project
- **THEN** every file is byte-identical afterwards
