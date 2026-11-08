## MODIFIED Requirements

### Requirement: pi package manifest
`package.json` SHALL declare the `pi-package` keyword and a `pi` block whose only pi resource entry is `extensions`; the sole other key allowed in the `pi` block is the package-agent discovery entry `subagents`. It MUST NOT declare `skills`, `prompts` or `themes` in the `pi` block, so those resources load only through activation. It SHALL additionally declare package agents for every supported plugin that discovers them: top-level `pi-subagents.agents` and `pi.subagents.agents`, both `["./agents"]`. This metadata MUST NOT change resource activation or require runtime registration. No agent metadata is declared for plugins that do not discover package agents.

#### Scenario: Extensions only
- **WHEN** `package.json` is read
- **THEN** `pi.extensions` lists `./extensions/superspec.ts`, `pi.skills`, `pi.prompts` and `pi.themes` are absent, and no `pi` key other than `extensions` and `subagents` exists

#### Scenario: Package keyword
- **WHEN** `package.json` is read
- **THEN** `keywords` includes `pi-package`

#### Scenario: Optional discovery metadata
- **WHEN** a supported discovering plugin discovers the installed package in a project without the Superspec marker
- **THEN** it discovers the bundled agents while activated workflow skills/prompts remain hidden

#### Scenario: Both discovery keys
- **WHEN** `package.json` is read
- **THEN** `pi-subagents.agents` and `pi.subagents.agents` both equal `["./agents"]`
