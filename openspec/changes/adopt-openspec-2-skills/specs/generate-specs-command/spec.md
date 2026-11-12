## MODIFIED Requirements

### Requirement: Scout dispatch
The skill SHALL read the shared integration reference at `openspec/schemas/superspec/subagent-routing.md` before delegating, and SHALL run one evidence-only scout per confirmed capability whose spec file is still missing, reapplying existing-name filtering after user edits. When a subagent plugin is detected it SHALL dispatch agents meeting the scout role, using configured models and parallel independent reads where useful. Otherwise it SHALL scout capabilities sequentially inline, writing each parent-authored spec before the next. Scouts MUST NOT write official specs; the parent SHALL consume their reports and write only the missing files, never overwrite existing specs or completed artifacts, and never fabricate child calls.

#### Scenario: With pi-subagents
- **WHEN** a subagent plugin is detected and three confirmed capabilities have missing specs
- **THEN** three evidence-only scouts are dispatched and the parent writes the three official delta specs

#### Scenario: Without pi-subagents
- **WHEN** the optional integration is absent
- **THEN** the parent investigates capabilities sequentially and writes each spec before starting the next without child calls

#### Scenario: Interrupted generation
- **WHEN** an existing bootstrap-specs change already contains one of the confirmed capability specs
- **THEN** that file is not rewritten or re-scouted and only the still-missing confirmed capabilities are processed


#### Scenario: Reference path
- **WHEN** `skills/opsx-generate-specs/SKILL.md` is read
- **THEN** it names `openspec/schemas/superspec/subagent-routing.md` and does not link `../references/subagent-routing.md`
