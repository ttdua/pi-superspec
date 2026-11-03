## ADDED Requirements

### Requirement: Language setting
A project MAY declare its document language with a top-level `language: <value>` key in `openspec/config.yaml`. The value SHALL be a single-line string of 1 to 64 characters, trimmed, containing no Unicode control characters (category Cc) and no line or paragraph separators (U+2028, U+2029). A missing key, or a value that violates these rules, MUST be treated as unset, and an unset language means the default language `en`.

#### Scenario: Valid value
- **WHEN** `config.yaml` contains `language: vi`
- **THEN** the project's document language is `vi`

#### Scenario: Free-form name
- **WHEN** `config.yaml` contains `language: Tiếng Việt`
- **THEN** the project's document language is `Tiếng Việt`

#### Scenario: Unicode separator
- **WHEN** the value contains U+2028
- **THEN** the project's document language is `en`

#### Scenario: Missing key
- **WHEN** `config.yaml` has no top-level `language:` line
- **THEN** the project's document language is `en`

#### Scenario: Value too long
- **WHEN** the `language:` value is longer than 64 characters
- **THEN** the project's document language is `en`

#### Scenario: Empty value
- **WHEN** the `language:` value is empty
- **THEN** the project's document language is `en`

#### Scenario: Missing file
- **WHEN** `openspec/config.yaml` does not exist
- **THEN** the project's document language is `en`

### Requirement: Default language
The default document language SHALL be `en`. A project set up by `/opsx-init` SHALL end with a document language in `config.yaml`: the one chosen through `--lang` or the prompt, otherwise `en`. A project whose `config.yaml` has no valid `language:`, for example one initialised before this setting existed, MUST be treated as having the document language `en` without any file being changed.

#### Scenario: Nothing chosen at init
- **WHEN** `/opsx-init` finishes without `--lang` and the user chose no language
- **THEN** `config.yaml` contains `language: en`

#### Scenario: Project from before this setting
- **WHEN** an existing activated project has no `language:` line and no init is run
- **THEN** the project's document language is `en` and `config.yaml` is unchanged

### Requirement: Localised document content
When a document language is set, agents SHALL write the prose of OpenSpec documents in that language. The documents covered are the artifacts of a change under `openspec/changes/<name>/` and the main specs under `openspec/specs/`. Code, code comments, commit messages and the chat language MUST NOT be governed by this setting.

#### Scenario: Change artifact prose
- **WHEN** an agent writes `proposal.md` in a project whose language is `vi`
- **THEN** its explanatory prose is in Vietnamese

#### Scenario: Code and commits unaffected
- **WHEN** an agent writes code, a code comment or a commit message in a project whose language is `vi`
- **THEN** the language setting does not require those to be in Vietnamese

### Requirement: Structural tokens stay English
Whatever the document language, the following SHALL remain in English: section headings defined by the artifact templates, requirement names, scenario names, the keywords `WHEN`, `THEN`, `SHALL` and `MUST`, checkbox syntax, delta operation headers (`ADDED`, `MODIFIED`, `REMOVED`, `RENAMED Requirements`), file names and capability names. Requirement names are identifiers used to match delta operations and MUST NOT be translated.

#### Scenario: Delta spec in another language
- **WHEN** an agent writes a delta spec in a project whose language is `vi`
- **THEN** the `### Requirement:` and `#### Scenario:` names and the `SHALL`, `WHEN` and `THEN` keywords are English and the requirement descriptions are Vietnamese

#### Scenario: Switching language keeps delta matching
- **WHEN** the language changes from `en` to `vi` and a delta modifies an existing requirement
- **THEN** the delta uses the existing English requirement name

### Requirement: Language changes during work
The language SHALL be changeable at any time by updating `language:` in `config.yaml`, either by the agent when the user asks for a different document language or by running `/opsx-init --lang <value>`. A change takes effect for documents written after it; existing documents MUST NOT be translated automatically.

#### Scenario: User asks to switch
- **WHEN** the user asks the agent to write documents in English instead of Vietnamese
- **THEN** the agent updates `language:` in `openspec/config.yaml` and writes later documents in English

#### Scenario: Existing documents untouched
- **WHEN** the language changes
- **THEN** documents already written are not rewritten
