## Context

The six bundled agents in `agents/` set `inheritSkills: false`. Only the implementer and the verifier select skills, and all of those are Superpowers skills. pi-subagents resolves selected skills per child. A missing skill does not fail the launch: the run summary shows `Skills not found: <name>`, and the child starts without it. The routing reference (`skills/references/subagent-routing.md`) is stricter. Its Availability step checks that "the skills and tools the role needs are present", and its Failures section stops the delegated stage when "required skills or tools are unavailable".

The extension already warns at `session_start` when Superpowers is missing. It detects Superpowers by the `skill:brainstorming` command in `pi.getCommands()` (`hasSuperpowers` in `extensions/routing-note.ts`).

## Goals / Non-Goals

**Goals:**
- The implementer, task reviewer and plan reviewer load the user's `coding-standards` skill and apply it.
- The task and plan reviewers have an explicit structure duty, so that loading the skill changes what they report.
- A missing `coding-standards` skill never stops a stage, and the user is told about it.

**Non-Goals:**
- Shipping, generating or editing a coding standard.
- Numeric thresholds or lint gates.
- Changes to the bundled schema, the scout, the spec reviewer or the verifier.
- Making the parent session load the skill while it writes artifacts.

## Decisions

### D1. Skill selection in frontmatter, not in the handoff
`coding-standards` is added to the frontmatter `skills` of the three roles. The implementer keeps its three Superpowers skills first.
- Why: the selection travels with the agent definition. Every dispatch gets it with no change to `subagent-driven-development` or the parent's brief, and user `agentOverrides` can still replace it.
- Alternative: have `opsx-apply` and `opsx-ff` pass `skill:` per dispatch. Rejected: two skills would repeat the policy, and a generic Superpowers dispatch path would miss it.

### D2. One sentence of duty per role, criteria in the skill
Each prompt gains a short duty that names the skill and the dimension. The criteria themselves stay in the skill.
- Implementer: apply the coding standard while writing, including the refactor step after each green test; do not defer splitting to a later task.
- Task reviewer: review code quality and structure in the stated range as well as spec compliance. Report each violation that the range introduced as a finding, citing the coding standard rule as the criterion.
- Plan reviewer: check that the design and plan split units by responsibility before contracts are fixed. One entry point or contract that owns several responsibilities is a finding.

The criterion field of a finding may name a coding standard rule. Before this change it was limited to a requirement, scenario or task ID. Severity follows the skill. If the skill gives no severity, the reviewer judges it. The reviewer contract tests check only for the duty, the skill name and the absence of digits next to "lines" or "complexity".
- Alternative: write a structure checklist into the prompts. Rejected: it hard-codes the standard (brainstorm, Alternative B).

### D3. Fallback when the skill is missing
When a role cannot load `coding-standards`, it says so under Limitations and applies the project's own conventions (`AGENTS.md`, contributing guide). It still performs its structure duty. A reviewer MUST NOT return `INCOMPLETE` only because the skill is missing.

### D4. Optional role skills in the routing reference
The Availability step splits role skills into required and optional. `coding-standards` is the only optional one, and the reference names it. A missing optional skill is announced once per stage ("coding standard unavailable: agents fall back to project conventions") and dispatch continues. A missing required skill still goes to Failures and stops the stage. The parent never writes settings or installs the skill.
- Why: pi-subagents already launches a child with a missing skill and only warns. The policy now matches that runtime behaviour for this one skill, instead of contradicting it.

### D5. Detection and warning in the extension
`hasCodingStandards(commands)` is true when `pi.getCommands()` contains `skill:coding-standards`. It mirrors `hasSuperpowers`. `CODING_STANDARDS_MISSING_WARNING` explains that the bundled implementer and reviewers use a `coding-standards` skill, and that without one they fall back to project conventions. It does not name an install command, because the skill is user-authored. The `session_start` handler emits it once per session start, with the same guards as the Superpowers warning: an activated project and a UI.
- Risk: `enableSkillCommands: false` hides skill commands. The Superpowers check has the same limitation, so it is accepted and noted in the README.

### D6. Documentation
Both READMEs gain a Prerequisites bullet for the `coding-standards` skill: what it is, that the user provides it under `~/.agents/skills/` or `.agents/skills/`, and the fallback when it is absent. `docs/architecture.md` (Package agents) and `docs/workflow.md` (specialist seats) name the three roles that carry it.

### D7. What stays unchanged, and how it is checked
The bundled schema stays at v7, and the inline apply path stays as it is. Neither gets a new scenario. The existing `schema-version-pin` test fails on any edit under `schema/superspec/`, and the inline path lives in skills that this change does not touch. The announcement repeats once per delegated stage, not once per session. A stage is the unit the user watches, and a long session can run several of them.

## Risks / Trade-offs

- [Skill content is outside the package's control, so review quality varies by user] → Intended: the standard belongs to the user. The fallback to project conventions keeps a floor.
- [Reviewers may now return `CHANGES_REQUESTED` more often and lengthen apply] → Intended. The fix loop already exists, and violations cost less to fix in the task that created them.
- [A skill named `coding-standards` that is something else would be loaded] → Accepted. The name is documented, and the user owns their skills.
- [Detection misses a skill when skill commands are disabled] → Same as for Superpowers. The warning is advisory, and delegation still works through pi-subagents' own skill resolution.

## Migration Plan

None. Existing users get the new agent definitions after a package update and a reload. Without the skill they see one warning per session start and nothing else changes. Rollback is a package downgrade.

## Open Questions

None.
