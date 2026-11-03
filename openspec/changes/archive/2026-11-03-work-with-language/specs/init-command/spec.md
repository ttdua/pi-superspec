## ADDED Requirements

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
The language step SHALL run after the project schema has been installed or found identical and legacy cleanup is done, and before schema validation. When the existing schema blocks activation, `/opsx-init` MUST NOT write the language and MUST NOT ask for it, even when `--lang` is given.

#### Scenario: Blocked project with a flag
- **WHEN** the project has a foreign schema and `/opsx-init --lang vi` runs
- **THEN** the run is blocked and `config.yaml` has no `language:` line

#### Scenario: Blocked project without a flag
- **WHEN** the project has a foreign schema, a UI is available and no flag is given
- **THEN** the user is not asked for a language

## MODIFIED Requirements

### Requirement: Idempotency
Running `/opsx-init` again on an already initialised project SHALL leave every file byte-identical and MUST NOT delete or rewrite anything, except that an explicit `--lang`, an accepted language prompt, or the default language (written when the project has no valid `language:`) MAY write the `language:` line. Running without `--lang` MUST NOT remove or change an existing valid `language:` value.

#### Scenario: Second run is a no-op
- **WHEN** `/opsx-init` runs twice on an empty temp git repository
- **THEN** the first run yields a valid, activated project with `language: en` and the second run changes no file

#### Scenario: End to end on an empty repository
- **WHEN** `/opsx-init` runs on an empty temp git repository with a real `openspec`
- **THEN** `isActivated` is true and `openspec schema validate superspec` passes

#### Scenario: Existing language preserved
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init` runs without a flag
- **THEN** the file is byte-identical afterwards
