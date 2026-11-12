## MODIFIED Requirements

### Requirement: Conditional resource discovery
On `resources_discover` the extension SHALL return the package's `skills` and `prompts` paths when the project for the event's `cwd` is activated, and SHALL return no paths otherwise. Returned paths MUST be absolute and derived from the package location, not from `cwd`. The package `skills` path holds only `opsx-generate-specs`; the workflow skills come from the project's `.agents/skills/`, which the extension neither returns nor writes.

#### Scenario: Activated project
- **WHEN** `resources_discover` fires with a `cwd` inside a marked project
- **THEN** the result contains the package `skills` path in `skillPaths` and the package `prompts` path in `promptPaths`

#### Scenario: Unmarked project
- **WHEN** `resources_discover` fires with a `cwd` inside an unmarked project
- **THEN** the result contains no skill or prompt paths

#### Scenario: Outside any project
- **WHEN** `resources_discover` fires with a `cwd` that has no project root
- **THEN** the result contains no skill or prompt paths

#### Scenario: Stock skills not returned
- **WHEN** `resources_discover` fires in an activated project
- **THEN** no returned path points into the project's `.agents/skills/`

### Requirement: Planning commands are visible only when activated
The package SHALL ship the `opsx-explore`, `opsx-new`, `opsx-continue`, `opsx-ff`, `opsx-apply`, `opsx-verify`, `opsx-sync`, `opsx-archive` and `opsx-generate-specs` prompts and the `opsx-generate-specs` skill, and SHALL NOT ship any other skill or a placeholder skill or prompt. These resources MUST be visible in pi only in an activated project.

#### Scenario: Visible when marked
- **WHEN** pi is started with `pi -e .` inside a marked fixture project
- **THEN** the `opsx-new` and `opsx-apply` commands are available

#### Scenario: Hidden when unmarked
- **WHEN** pi is started with `pi -e .` inside an unmarked fixture project
- **THEN** none of the planning or execution commands is available

#### Scenario: Only the generate-specs skill
- **WHEN** the package `skills/` directory is listed
- **THEN** it contains `opsx-generate-specs` and no other skill directory

#### Scenario: No placeholder resources
- **WHEN** the package resource directories are listed
- **THEN** no placeholder skill or prompt exists
