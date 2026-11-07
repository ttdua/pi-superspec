## MODIFIED Requirements

### Requirement: README installation instructions
The README SHALL state that users install the dependencies themselves, and MUST list in order: `brew install openspec`, `pi install git:github.com/obra/superpowers`, the optional packages `pi-subagents`, `rpiv-ask-user-question` and `rpiv-todo` with what each adds, and `pi install https://github.com/ttdua/pi-superspec`. The prerequisites MUST also name a user- or project-provided `coding-standards` skill: that the bundled implementer and reviewers apply it, where pi discovers it, and that without it they fall back to project conventions and the workflow does not stop.

#### Scenario: Required install commands present
- **WHEN** a reader follows the install section
- **THEN** each of the three required commands appears verbatim, in the order OpenSpec, Superpowers, this package

#### Scenario: Optional packages explained
- **WHEN** a reader looks for optional packages
- **THEN** `pi-subagents`, `rpiv-ask-user-question` and `rpiv-todo` are listed with the fallback used when each is absent

#### Scenario: Coding standard skill explained
- **WHEN** a reader reads the prerequisites of `README.md` or `README.vi.md`
- **THEN** both name the `coding-standards` skill, say that the bundled implementer and reviewers apply it, say that the user or project provides it under `.agents/skills/`, and say that without it agents fall back to project conventions and the workflow does not stop
