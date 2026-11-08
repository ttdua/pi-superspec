## MODIFIED Requirements

### Requirement: README installation instructions
The README SHALL state that users install the dependencies themselves, and MUST list in order: `brew install openspec`, `pi install git:github.com/obra/superpowers`, the optional packages (one supported subagent plugin, `rpiv-ask-user-question` and `rpiv-todo`) with what each adds, and `pi install https://github.com/ttdua/pi-superspec`. The subagent plugins MUST be listed as `@tintinweb/pi-subagents` (recommended), `pi-subagents` and `@gotgenes/pi-subagents`, stating that the bundled agents are supplied to the first two and that the third uses only its own agents. The prerequisites MUST also name a user- or project-provided `coding-standards` skill: that the bundled implementer and reviewers apply it, where pi discovers it, and that without it they fall back to project conventions and the workflow does not stop.

#### Scenario: Required install commands present
- **WHEN** a reader follows the install section
- **THEN** each of the three required commands appears verbatim, in the order OpenSpec, Superpowers, this package

#### Scenario: Optional packages explained
- **WHEN** a reader looks for optional packages
- **THEN** the three subagent plugins, `rpiv-ask-user-question` and `rpiv-todo` are listed with the fallback used when each is absent

#### Scenario: Subagent plugin support stated
- **WHEN** a reader reads the subagent plugin entries of `README.md` or `README.vi.md`
- **THEN** both say which plugins receive the bundled agents and that `@gotgenes/pi-subagents` uses its own agents only

#### Scenario: Coding standard skill explained
- **WHEN** a reader reads the prerequisites of `README.md` or `README.vi.md`
- **THEN** both name the `coding-standards` skill, say that the bundled implementer and reviewers apply it, say that the user or project provides it under `.agents/skills/`, and say that without it agents fall back to project conventions and the workflow does not stop
