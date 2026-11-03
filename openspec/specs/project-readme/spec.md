# project-readme Specification

## Purpose
Define the English and Vietnamese READMEs: languages and cross-linking, installation instructions, quick start, command table, uninstall behaviour, and credits and license.

## Requirements
### Requirement: README languages and linking
The repository SHALL provide `README.md` in English as the default and `README.vi.md` in Vietnamese. Each file MUST link to the other near its top, and `README.vi.md` MUST follow the same section order as `README.md`.

#### Scenario: Default language is English
- **WHEN** a reader opens `README.md`
- **THEN** it is written in English and links to `README.vi.md` near the top

#### Scenario: Vietnamese mirror
- **WHEN** a reader opens `README.vi.md`
- **THEN** it links back to `README.md` and has the same section headings in the same order

### Requirement: README installation instructions
The README SHALL state that users install the dependencies themselves, and MUST list in order: `brew install openspec`, `pi install git:github.com/obra/superpowers`, the optional packages `pi-subagents`, `rpiv-ask-user-question` and `rpiv-todo` with what each adds, and `pi install https://github.com/ttdua/pi-superspec`.

#### Scenario: Required install commands present
- **WHEN** a reader follows the install section
- **THEN** each of the three required commands appears verbatim, in the order OpenSpec, Superpowers, this package

#### Scenario: Optional packages explained
- **WHEN** a reader looks for optional packages
- **THEN** `pi-subagents`, `rpiv-ask-user-question` and `rpiv-todo` are listed with the fallback used when each is absent

### Requirement: README quick start
The README SHALL include a quick start that runs `/opsx-init` in a repository and then takes a reader to a first archived change, and MUST link to the usage guide for the full walkthrough.

#### Scenario: Quick start reaches archive
- **WHEN** a reader follows the quick start on a clean repository
- **THEN** it names every command from `/opsx-init` to `/opsx-archive` and mentions every prerequisite those steps need

#### Scenario: Link to the guide
- **WHEN** a reader wants more detail
- **THEN** the README links to `docs/usage-guide.md`

### Requirement: README command table
The README SHALL contain a table of every shipped command: `/opsx-init`, `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync` and `/opsx-archive`, with a one-line behaviour each, and MUST state that `opsx-propose` and `opsx-bulk-archive` are not shipped.

#### Scenario: Table matches shipped prompts
- **WHEN** the table is compared with the files in `prompts/` plus `/opsx-init`
- **THEN** every command appears in both, and no command appears in only one

### Requirement: README uninstall behaviour
The README SHALL describe what happens on uninstall: removing the package removes every command and skill, while `openspec/` stays a valid OpenSpec project; it MUST also state that the copied `openspec/schemas/superspec/` and its lock file remain and may be deleted by the user.

#### Scenario: Remaining files stated
- **WHEN** a reader looks for what uninstall leaves behind
- **THEN** the README names the project schema directory and the lock file as remaining

### Requirement: README credits and license
The README SHALL credit Superspec (Daniel Hanold), its origin JiangWay `sdd-plus-superpowers`, and OpenSpec, and MUST state that the package is MIT licensed with a link to `LICENSE`.

#### Scenario: Credits present
- **WHEN** a reader opens the credits section
- **THEN** all three projects are named with links and the license is stated
