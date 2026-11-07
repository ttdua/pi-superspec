## Why

Projects built with Superspec grow god functions. In `pi-jev-pilot`, one 355-line closure passed design, plan review, per-task review, final review and verify. The bundled agents never see a coding standard (`inheritSkills: false`). `superspec.task-reviewer` replaced the Superpowers reviewer prompt and lost its code-quality duty. `superspec.plan-reviewer` never checks unit decomposition. The fix belongs in the bundled agents, so that every user gets it, while the standard itself stays in a user-owned skill.

## What Changes

**Coding standard skill on code-facing roles**
- From: only the implementer (three Superpowers skills) and the verifier select skills.
- To: the implementer, task reviewer and plan reviewer also select `coding-standards`, a user- or project-provided skill that the package names but never ships.
- Reason: the standard lives in one user-owned place and can change without a package release.
- Impact: non-breaking. Users without the skill see a warning and keep working.

**Review duties**
- From: the task reviewer checks against the task, plan contracts and specs; the plan reviewer checks coverage, ordering, contracts and test strategy.
- To: the task reviewer also reviews code quality and structure, and the plan reviewer checks that units are split by responsibility before contracts are fixed. A violation is a finding, and it can lead to `CHANGES_REQUESTED`. The coding standard can be cited as the criterion. Prompts contain no numeric thresholds.
- Reason: structure was not reviewed by anyone.
- Impact: reviews may now request changes for structure alone.

**Optional role skill**
- From: any unavailable role skill stops the delegated stage.
- To: `coding-standards` is optional. When it is missing, the parent announces it once and dispatches anyway; agents record the gap under Limitations and fall back to the project's own conventions. Required skills still stop the stage.
- Reason: the user ruled that a missing coding standard must not stop the workflow.
- Impact: non-breaking.

**Missing coding standard warning**
- To: at `session_start` in an activated project with a UI, the extension warns once when `skill:coding-standards` is not discoverable, in the same way as the Superpowers warning.

**README**
- To: both READMEs list the `coding-standards` skill as a user-provided dependency and say what it is used for and what happens without it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `workflow-agents`: the reviewers' review duties and allowed criteria change, the implementer's skill list grows, and a new requirement names the optional coding standard skill.
- `subagent-routing`: availability and failure handling distinguishes optional role skills from required ones.
- `routing-note`: a new requirement adds the missing coding standard warning at `session_start`.
- `project-readme`: the installation requirement names the `coding-standards` skill as a user-provided dependency.

## Impact

- `agents/implementer.md`, `agents/task-reviewer.md`, `agents/plan-reviewer.md`: frontmatter `skills` and prompt body.
- `skills/references/subagent-routing.md`: Availability and Failures sections.
- `extensions/routing-note.ts`, `extensions/superspec.ts`: detection and warning.
- `README.md`, `README.vi.md`, `docs/architecture.md` (Package agents), `docs/workflow.md` (specialist seats).
- Tests: `tests/agents.test.ts`, `tests/subagent-routing.test.ts`, `tests/routing-note.test.ts`, `tests/extension.test.ts`.
- No schema change (it stays at v7). No new package dependency. No settings are written.
