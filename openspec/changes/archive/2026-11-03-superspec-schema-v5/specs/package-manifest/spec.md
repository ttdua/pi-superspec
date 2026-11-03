## MODIFIED Requirements

### Requirement: Published files
The published package SHALL include `extensions`, `skills`, `prompts` and `schema` and MUST exclude tests and fixtures.

#### Scenario: Files allow-list
- **WHEN** `package.json` is read
- **THEN** `files` contains `extensions`, `skills`, `prompts` and `schema` and does not contain `tests`
