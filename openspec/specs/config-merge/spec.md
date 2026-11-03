# config-merge Specification

## Purpose
Define how `/opsx-init` sets `schema: superspec` in `openspec/config.yaml` with a single-line edit that preserves every other key, comment and line ending.

## Requirements
### Requirement: Set schema key
`/opsx-init` SHALL ensure `openspec/config.yaml` contains a top-level `schema: superspec`. It MUST replace an existing top-level `schema:` line in place, or prepend `schema: superspec` when none exists, and MUST create the file when it is missing.

#### Scenario: Replace existing value
- **WHEN** `config.yaml` contains `schema: spec-driven`
- **THEN** that line becomes `schema: superspec`

#### Scenario: Add missing key
- **WHEN** `config.yaml` has no top-level `schema:` line
- **THEN** `schema: superspec` is added as the first line

#### Scenario: Missing file
- **WHEN** `openspec/config.yaml` does not exist
- **THEN** it is created containing `schema: superspec`

### Requirement: Preserve other content
The merge MUST leave every byte outside the top-level `schema:` line unchanged, including other keys, comments, blank lines, and nested keys named `schema`.

#### Scenario: Custom keys and comments survive
- **WHEN** `config.yaml` has `context`, `rules`, and comments alongside `schema: spec-driven`
- **THEN** only the `schema:` line differs afterwards

#### Scenario: Nested schema key untouched
- **WHEN** an indented `schema:` key exists under another key
- **THEN** it is not modified

### Requirement: Idempotent merge
When the top-level `schema:` is already `superspec`, the merge SHALL NOT write the file.

#### Scenario: Already set
- **WHEN** `config.yaml` already has `schema: superspec`
- **THEN** the file is not modified
