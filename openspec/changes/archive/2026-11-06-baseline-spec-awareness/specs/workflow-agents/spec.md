## ADDED Requirements

### Requirement: Spec reviewer compares with the baseline
The spec reviewer SHALL compare each `MODIFIED`, `REMOVED` and `RENAMED` delta with the main spec supplied in its handoff: a header without an exact match in the main spec and a scenario present in the main spec but missing from a `MODIFIED` block without being named as intentional MUST each be reported as a finding. When a needed main spec is not supplied, the reviewer MUST record it under Limitations and MUST NOT report the comparison as passed.

#### Scenario: Unmatched header
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to report a `MODIFIED`, `REMOVED` or `RENAMED` header that has no exact match in the supplied main spec

#### Scenario: Dropped scenario
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to report a scenario dropped from a `MODIFIED` block without being named as intentional

#### Scenario: Baseline missing
- **WHEN** the spec reviewer definition is read
- **THEN** it tells the reviewer to record a missing main spec under Limitations instead of passing the comparison
