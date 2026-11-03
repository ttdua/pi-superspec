## ADDED Requirements

### Requirement: pi package manifest
`package.json` SHALL declare the `pi-package` keyword and a `pi` block that lists extensions only. It MUST NOT declare `skills`, `prompts` or `themes` in the `pi` block, so those resources load only through activation.

#### Scenario: Extensions only
- **WHEN** `package.json` is read
- **THEN** `pi.extensions` lists `./extensions/superspec.ts` and `pi.skills`, `pi.prompts` and `pi.themes` are absent

#### Scenario: Package keyword
- **WHEN** `package.json` is read
- **THEN** `keywords` includes `pi-package`

---

### Requirement: Host packages as peer dependencies
Host packages provided by pi SHALL be declared in `peerDependencies` with version `"*"`, and the package MUST NOT have runtime `dependencies`.

#### Scenario: Peer declaration
- **WHEN** `package.json` is read
- **THEN** `@earendil-works/pi-coding-agent` is in `peerDependencies` with `"*"` and `dependencies` is absent or empty

---

### Requirement: Published files
The published package SHALL include `extensions`, `skills` and `prompts` and MUST exclude tests and fixtures.

#### Scenario: Files allow-list
- **WHEN** `package.json` is read
- **THEN** `files` contains `extensions`, `skills` and `prompts` and does not contain `tests`
