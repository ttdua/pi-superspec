## ADDED Requirements

### Requirement: Project root discovery
The extension SHALL find the project root by walking up from the given working directory and selecting the first directory that contains an `openspec/` directory. It SHALL report no root when none exists up to the filesystem root. The nearest `openspec/` SHALL win even when it is not activated.

#### Scenario: Root is the working directory
- **WHEN** the working directory contains `openspec/`
- **THEN** that directory is the project root

#### Scenario: Root is an ancestor
- **WHEN** the working directory is nested below a directory containing `openspec/`
- **THEN** that ancestor is the project root

#### Scenario: No openspec directory
- **WHEN** no directory from the working directory to the filesystem root contains `openspec/`
- **THEN** no project root is reported

#### Scenario: Nearest openspec wins
- **WHEN** both a nested directory and one of its ancestors contain `openspec/`
- **THEN** the nested directory is the project root

---

### Requirement: Marker detection
A project SHALL be activated if and only if `openspec/schemas/superspec/schema.yaml` under its root exists and contains a top-level `x-pi-superspec:` key at column 0. A missing or unreadable file, or the absence of the key, MUST yield not activated and MUST NOT throw.

#### Scenario: Marker present
- **WHEN** the schema file has a top-level `x-pi-superspec:` key
- **THEN** the project is activated

#### Scenario: Marker absent
- **WHEN** the schema file exists without an `x-pi-superspec:` key
- **THEN** the project is not activated

#### Scenario: Schema file missing
- **WHEN** `openspec/schemas/superspec/schema.yaml` does not exist
- **THEN** the project is not activated and no error is raised

#### Scenario: Marker only in a comment or nested
- **WHEN** `x-pi-superspec:` appears only after a `#` or indented
- **THEN** the project is not activated

---

### Requirement: Conditional resource discovery
On `resources_discover` the extension SHALL return the package's `skills` and `prompts` paths when the project for the event's `cwd` is activated, and SHALL return no paths otherwise. Returned paths MUST be absolute and derived from the package location, not from `cwd`.

#### Scenario: Activated project
- **WHEN** `resources_discover` fires with a `cwd` inside a marked project
- **THEN** the result contains the package `skills` path in `skillPaths` and the package `prompts` path in `promptPaths`

#### Scenario: Unmarked project
- **WHEN** `resources_discover` fires with a `cwd` inside an unmarked project
- **THEN** the result contains no skill or prompt paths

#### Scenario: Outside any project
- **WHEN** `resources_discover` fires with a `cwd` that has no project root
- **THEN** the result contains no skill or prompt paths

---

### Requirement: Placeholder commands prove activation
The package SHALL ship one placeholder skill and one placeholder prompt that are visible in pi only in an activated project.

#### Scenario: Visible when marked
- **WHEN** pi is started with `pi -e .` inside a marked fixture project
- **THEN** the placeholder command is available

#### Scenario: Hidden when unmarked
- **WHEN** pi is started with `pi -e .` inside an unmarked fixture project
- **THEN** the placeholder command is not available
