## ADDED Requirements

### Requirement: Document language paragraph
The routing note SHALL include a paragraph, built on each `context` event from the project's effective document language, that tells the agent to write the prose of OpenSpec documents in that language, to keep headings, requirement and scenario names, `WHEN`/`THEN`/`SHALL`/`MUST`, checkbox syntax, delta operation headers, file names and capability names in English, that code, comments and commits are not affected, and that a request to change the document language is handled by updating `language:` in `openspec/config.yaml`. The effective language is the valid `language:` value of `openspec/config.yaml`, or `en` when the file or the key is missing or the value is invalid. The note MUST still start with the routing note marker so that the duplicate check applies.

#### Scenario: Language set
- **WHEN** a `context` event fires in an activated project whose config has `language: vi`
- **THEN** the injected note contains `vi`, the instruction to keep structural tokens in English, and the instruction to update `language:` on request

#### Scenario: Language absent
- **WHEN** a `context` event fires in an activated project whose config has no `language:`
- **THEN** the injected note contains the language paragraph naming `en`

#### Scenario: Invalid language
- **WHEN** a `context` event fires in an activated project whose config has a 100-character `language:` value
- **THEN** the injected note contains the language paragraph naming `en`

#### Scenario: Language changed mid-session
- **WHEN** `language:` changes from `vi` to `en` between two `context` events
- **THEN** the second event injects a note naming `en` without a reload

#### Scenario: Marker preserved
- **WHEN** the note is built with a language
- **THEN** its text starts with the routing note marker and is not inserted twice
