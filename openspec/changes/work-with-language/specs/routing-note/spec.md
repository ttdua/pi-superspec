## ADDED Requirements

### Requirement: Document language paragraph
When the project's `openspec/config.yaml` has a valid `language:` value, the routing note SHALL include a paragraph, read from the config on each `context` event, that tells the agent to write the prose of OpenSpec documents in that language, to keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file names and capability names in English, that code, comments and commits are not affected, and that a request to change the document language is handled by updating `language:` in `openspec/config.yaml`. When there is no valid `language:` the routing note MUST be identical to the note without this paragraph. The note MUST still start with the routing note marker so that the duplicate check applies.

#### Scenario: Language set
- **WHEN** a `context` event fires in an activated project whose config has `language: vi`
- **THEN** the injected note contains `vi`, the instruction to keep structural tokens in English, and the instruction to update `language:` on request

#### Scenario: Language absent
- **WHEN** a `context` event fires in an activated project whose config has no `language:`
- **THEN** the injected note equals the note without the language paragraph

#### Scenario: Language changed mid-session
- **WHEN** `language:` changes from `vi` to `en` between two `context` events
- **THEN** the second event injects a note naming `en` without a reload

#### Scenario: Marker preserved
- **WHEN** the note is built with a language
- **THEN** its text starts with the routing note marker and is not inserted twice
