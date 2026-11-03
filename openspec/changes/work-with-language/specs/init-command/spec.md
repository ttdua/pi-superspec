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
When no `--lang` flag was given, `config.yaml` has no valid `language:` and a UI is available, `/opsx-init` SHALL ask the user for the document language and MUST allow skipping. A non-empty valid answer MUST be written to `language:`. Skipping, cancelling, an empty answer or an invalid answer MUST write nothing. Without a UI the command MUST NOT ask.

#### Scenario: User answers
- **WHEN** the user answers `vi` to the prompt
- **THEN** `config.yaml` contains `language: vi`

#### Scenario: User skips
- **WHEN** the user cancels the prompt
- **THEN** `config.yaml` has no `language:` line and the rest of the command continues

#### Scenario: Language already set
- **WHEN** `config.yaml` already has `language: vi` and no flag is given
- **THEN** the user is not asked

#### Scenario: No UI
- **WHEN** the command runs without a UI and without `--lang`
- **THEN** the user is not asked and no `language:` line is written

## MODIFIED Requirements

### Requirement: Idempotency
Running `/opsx-init` again on an already initialised project SHALL leave every file byte-identical and MUST NOT delete or rewrite anything, except that an explicit `--lang` or an accepted language prompt MAY write the `language:` line. Running without `--lang` MUST NOT remove or change an existing `language:` value.

#### Scenario: Second run is a no-op
- **WHEN** `/opsx-init` runs twice on an empty temp git repository
- **THEN** the first run yields a valid, activated project and the second run changes no file

#### Scenario: End to end on an empty repository
- **WHEN** `/opsx-init` runs on an empty temp git repository with a real `openspec`
- **THEN** `isActivated` is true and `openspec schema validate superspec` passes

#### Scenario: Existing language preserved
- **WHEN** `config.yaml` has `language: vi` and `/opsx-init` runs without a flag
- **THEN** the file is byte-identical afterwards
