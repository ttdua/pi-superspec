# schema-version-pin Specification

## Purpose
Keep a schema `version` tied to exactly one content of `schema/superspec/`, so a same-version difference in an installed project always means a local edit and an upgrade is never needed without a version bump.

## Requirements

### Requirement: Schema checksum pinned per version
The repository SHALL keep `tests/fixtures/schema-checksums.json`, mapping each schema `version` to a digest of every relative path and content under `schema/superspec/`. A test MUST fail, with a message telling the maintainer to bump `version` or record the digest, when the current version has no digest or a different one, and MUST fail when a higher version is recorded.

#### Scenario: Unchanged schema
- **WHEN** the tests run on a tree whose digest matches the record for its version
- **THEN** the pin test passes

#### Scenario: Content changed without a version bump
- **WHEN** a file under `schema/superspec/` changes and `version` stays the same
- **THEN** the pin test fails and its message mentions bumping the version

#### Scenario: New version without a record
- **WHEN** `version` is raised and no digest is recorded for it
- **THEN** the pin test fails and its message mentions recording the digest

#### Scenario: Digest covers paths and file set
- **WHEN** a file is renamed, added or removed without changing other content
- **THEN** the digest changes

#### Scenario: Digest is deterministic
- **WHEN** the digest is computed twice on the same tree
- **THEN** both results are equal

#### Scenario: No future versions recorded
- **WHEN** the record lists a version higher than the current schema version
- **THEN** the pin test fails
