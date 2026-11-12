## MODIFIED Requirements

### Requirement: README installation instructions
The README SHALL state that users install the dependencies themselves, and MUST list in order: `brew install openspec` (OpenSpec 2.0 or newer) followed by choosing a custom OpenSpec profile (`openspec config profile`) that selects the explore, new, continue, ff, apply, verify, sync and archive workflows, `pi install git:github.com/obra/superpowers`, the optional packages (one supported subagent plugin, `rpiv-ask-user-question` and `rpiv-todo`) with what each adds, and `pi install https://github.com/ttdua/pi-superspec`. The subagent plugins MUST be listed as `@tintinweb/pi-subagents` (recommended), `pi-subagents` and `@gotgenes/pi-subagents`, stating that the bundled agents are supplied to the first two and that the third uses only its own agents. The prerequisites MUST also name a user- or project-provided `coding-standards` skill: that the bundled implementer and reviewers apply it, where pi discovers it, and that without it they fall back to project conventions and the workflow does not stop.

#### Scenario: Required install commands present
- **WHEN** a reader follows the install section
- **THEN** each of the three required commands appears verbatim, in the order OpenSpec, Superpowers, this package

#### Scenario: Unused stock skills explained
- **WHEN** a reader reads `README.md` or `README.vi.md`
- **THEN** both name `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change` and `openspec-onboard` as stock skills that are not part of the workflow, say they are not removed, and point to the matching workflow skill instead, such as `openspec-ff-change` for ff

#### Scenario: OpenSpec profile explained
- **WHEN** a reader reads the OpenSpec prerequisite of `README.md` or `README.vi.md`
- **THEN** both say OpenSpec 2.0 or newer, name `openspec config profile`, list the eight workflows, and say that `openspec update` removes workflows the profile does not select

#### Scenario: Optional packages explained
- **WHEN** a reader looks for optional packages
- **THEN** the three subagent plugins, `rpiv-ask-user-question` and `rpiv-todo` are listed with the fallback used when each is absent

#### Scenario: Subagent plugin support stated
- **WHEN** a reader reads the subagent plugin entries of `README.md` or `README.vi.md`
- **THEN** both say which plugins receive the bundled agents and that `@gotgenes/pi-subagents` uses its own agents only

#### Scenario: Coding standard skill explained
- **WHEN** a reader reads the prerequisites of `README.md` or `README.vi.md`
- **THEN** both name the `coding-standards` skill, say that the bundled implementer and reviewers apply it, say that the user or project provides it under `.agents/skills/`, and say that without it agents fall back to project conventions and the workflow does not stop

### Requirement: README uninstall behaviour
The README SHALL describe what happens on uninstall: removing the package removes `/opsx-init`, `/opsx-generate-specs` and the `opsx-generate-specs` skill, while `openspec/` stays a valid OpenSpec project; it MUST also state that the copied `openspec/schemas/superspec/` and its lock file remain and may be deleted by the user, and that the stock OpenSpec skills in `.agents/skills/` belong to OpenSpec and remain.

#### Scenario: Remaining files stated
- **WHEN** a reader looks for what uninstall leaves behind
- **THEN** the README names the project schema directory, the lock file and the stock skills in `.agents/skills/` as remaining

### Requirement: README quick start
The README SHALL include a quick start that runs `/opsx-init` in a repository and then takes a reader through the workflow skills to a first archived change, and MUST link to the usage guide for the full walkthrough.

#### Scenario: Quick start reaches archive
- **WHEN** a reader follows the quick start on a clean repository
- **THEN** it names every step from `/opsx-init` to `openspec-archive-change` by skill id (`openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`), and mentions every prerequisite those steps need

#### Scenario: Link to the guide
- **WHEN** a reader wants more detail
- **THEN** the README links to `docs/usage-guide.md`

### Requirement: README command table
The README SHALL contain a table of every shipped command, `/opsx-init` and `/opsx-generate-specs`, with a one-line behaviour each. The `/opsx-init` row MUST mention `--generate` and `--force`. The README MUST also contain a table mapping each workflow step to its stock skill id and `/skill:<id>` invocation, and MUST state that `opsx-propose` and `opsx-bulk-archive` are not shipped and that the four unused stock skills are not part of the workflow. Near the table, the README MUST say that `/opsx-init` upgrades an older schema that is unchanged since install after confirmation, and that a schema with local edits is replaced only with `--force`, which keeps a backup.

#### Scenario: Table matches shipped prompts
- **WHEN** the command table is compared with the files in `prompts/` plus `/opsx-init`
- **THEN** every command appears in both, and no command appears in only one

#### Scenario: Init row mentions the flag
- **WHEN** the `/opsx-init` row is read
- **THEN** it mentions `--generate` and `--force`

#### Scenario: Skill table maps each step
- **WHEN** the workflow skill table is read
- **THEN** each of explore, new, continue, ff, apply, verify, sync and archive names its stock skill id and `/skill:<id>` invocation

#### Scenario: Upgrade behaviour stated
- **WHEN** a reader looks for what happens to an existing schema after a package update
- **THEN** the README describes the confirmed upgrade and `--force` with backup
