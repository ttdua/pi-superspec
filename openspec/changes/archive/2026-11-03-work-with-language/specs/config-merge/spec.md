## ADDED Requirements

### Requirement: Set language key
When `/opsx-init` is given a document language, it SHALL ensure `openspec/config.yaml` contains a top-level `language:` line with that value. It MUST replace an existing top-level `language:` line in place, or insert the line directly after the top-level `schema:` line when none exists. The value MUST be written bare only when its first character is a letter or digit and every other character is a letter, digit, space or one of `_ . ( ) -`, and otherwise as a double-quoted JSON string.

#### Scenario: Add missing key
- **WHEN** `config.yaml` has `schema: superspec` and no `language:` line, and the language `vi` is requested
- **THEN** the line `language: vi` appears directly after the `schema:` line

#### Scenario: Replace existing value
- **WHEN** `config.yaml` contains `language: vi` and the language `en` is requested
- **THEN** that line becomes `language: en`

#### Scenario: Value needing quotes
- **WHEN** the requested language is `zh: simplified`
- **THEN** the line is written as `language: "zh: simplified"`

#### Scenario: Leading dash needs quotes
- **WHEN** the requested language is `- vi`
- **THEN** the line is written as `language: "- vi"`

#### Scenario: Nested language key untouched
- **WHEN** an indented `language:` key exists under another key
- **THEN** it is not modified and a top-level line is added

### Requirement: Read language key
The package SHALL read the document language from the top-level `language:` line of `openspec/config.yaml`, accepting a bare or a double-quoted value; a double-quoted value MAY be followed by an optional trailing comment. A missing file, a missing key, or a value that violates the rules of the `document-language` capability MUST yield no configured language; the package then uses the default language `en` of the `document-language` capability.

#### Scenario: Bare value
- **WHEN** the file contains `language: vi`
- **THEN** the language read is `vi`

#### Scenario: Quoted value
- **WHEN** the file contains `language: "zh: simplified"`
- **THEN** the language read is `zh: simplified`

#### Scenario: Quoted value with comment
- **WHEN** the file contains `language: "Tiếng Việt" # docs`
- **THEN** the language read is `Tiếng Việt`

#### Scenario: Missing file
- **WHEN** `openspec/config.yaml` does not exist
- **THEN** no language is read

## MODIFIED Requirements

### Requirement: Preserve other content
The merge MUST leave every byte outside the top-level `schema:` line, and outside the top-level `language:` line when a language is being set, unchanged, including other keys, comments, blank lines, and nested keys named `schema` or `language`.

#### Scenario: Custom keys and comments survive
- **WHEN** `config.yaml` has `context`, `rules`, and comments alongside `schema: spec-driven`
- **THEN** only the `schema:` line differs afterwards

#### Scenario: Nested schema key untouched
- **WHEN** an indented `schema:` key exists under another key
- **THEN** it is not modified

#### Scenario: Only the language line differs
- **WHEN** a language is set on a `config.yaml` that has `context`, `rules` and comments
- **THEN** only the `language:` line differs from the file before the merge
