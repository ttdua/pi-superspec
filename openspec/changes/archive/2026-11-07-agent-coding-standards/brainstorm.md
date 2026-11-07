## Design Summary

The bundled Superspec agents that write or judge code SHALL apply the user's or project's coding standard, which they load from a skill named `coding-standards`. The package does not ship that skill and does not define any thresholds. It only names the skill, so the standard stays in one place that the user owns and can change without a package release.

Why: an investigation of a project built with Superspec (`pi-jev-pilot`) found growing god functions. One closure in `registerWorkerRouting` is 355 lines long and owns four state maps and six responsibilities. It passed every stage. The plan's Contracts defined one factory that "owns" the lifecycle. The implementer followed TDD, which turns tests green but never asks for decomposition. `superspec.task-reviewer` replaces the Superpowers reviewer prompt (`systemPromptMode: replace`) and reviews "against the task, plan contracts, and specs" only, so the Code Quality/Structure part of the Superpowers task review was lost; the per-task review even praised "a single function". `superspec.plan-reviewer` checks coverage, ordering, contracts and test strategy, but not unit decomposition. None of the bundled agents can see a coding standard skill: they set `inheritSkills: false` and select only workflow skills.

Roles affected:
- `superspec.implementer`: selects `coding-standards` beside its three Superpowers skills and applies it while writing code, including the refactor step after each green test.
- `superspec.task-reviewer`: selects `coding-standards` and reviews code quality and structure as well as spec compliance. A violation that this change introduces is a finding with a severity, so `CHANGES_REQUESTED` can follow from structure alone.
- `superspec.plan-reviewer`: selects `coding-standards` and checks that the design and plan split units by responsibility before contracts are fixed. One entry point that owns several responsibilities is a finding.
- `superspec.scout`, `superspec.spec-reviewer` and `superspec.verifier` are unchanged. They do not write code, and they do not judge it against a standard.

The README lists the `coding-standards` skill as a dependency the user provides, as it already does for Superpowers. Like Superpowers, a missing `coding-standards` skill never stops the workflow:
- At `session_start` in an activated project with a UI, the extension warns once that the skill is missing. This mirrors the existing Superpowers warning.
- When a delegated stage runs without the skill, the parent announces once that the coding standard is unavailable and dispatches anyway.
- An agent that cannot load the skill records that under Limitations. It still does its structure duty against the project's own conventions (`AGENTS.md`, contributing guide).

Baseline specs touched:
- `workflow-agents`, "Explicit context and model ownership": explicit role-specific skills are already allowed. This change keeps that requirement as it is.
- `workflow-agents`, "Recon and review authority": this change **alters** the requirement. The plan and task reviewers gain a code-quality/structure responsibility, and their findings may cite the coding standard as the criterion, not only a requirement, scenario or task ID.
- `workflow-agents`, "Task-scoped implementation": this change **alters** the requirement. The required skill list grows from three skills to four.
- `project-readme`, "README installation instructions": this change **alters** the requirement, to name the `coding-standards` skill as a user-provided dependency.
- `subagent-routing`, "Availability and failure handling": this change **alters** the requirement. Today any unavailable role skill stops the delegated stage. The change adds a class of optional role skills, starting with `coding-standards`. A missing optional skill is announced and the stage continues. A missing required skill (for example `test-driven-development`) still stops the stage.
- `routing-note`, "Missing Superpowers warning": unchanged. A sibling requirement adds the `coding-standards` warning.
- `docs/architecture.md` "Components" (Package agents) and `docs/workflow.md` (specialist seats) are updated to say which roles carry the coding standard.

## Alternatives Considered

### Alternative A: Bundle a minimal `coding-standards` skill in the package
- **Approach**: ship a stack-neutral skill. A user or project skill with the same name overrides it.
- **Pros**: works out of the box on any machine.
- **Cons**: the package would own and version a standard. It would drift from the user's own standard and invite threshold debates in this repository.
- **Why not chosen**: the user wants the standard in one user-owned place. Changing it should never need a package release.

### Alternative B: No skill; generic instruction plus a fixed checklist in each agent prompt
- **Approach**: tell the agents to follow the project conventions (AGENTS.md, CONTRIBUTING), and write a structure checklist into the prompts.
- **Pros**: no new dependency.
- **Cons**: the standard would be hard-coded in three prompts, and changing it would need a package release. The project conventions often say nothing about code structure, as `pi-jev-pilot`'s don't.
- **Why not chosen**: it hard-codes the standard, which the user explicitly rejected.

### Alternative C: Stop the stage when the skill is missing
- **Approach**: treat `coding-standards` like every other role skill. A missing skill stops the delegated stage with a named cause.
- **Pros**: no stage ever runs without the standard.
- **Cons**: a new machine or a fresh install cannot run `/opsx-apply` until the user writes or installs a coding standard.
- **Why not chosen**: the user ruled at the brainstorm gate that a missing coding standard must not stop the workflow.

### Alternative D: User-level `agentOverrides` adding the skill
- **Approach**: each user adds `coding-standards` to the agents through pi-subagents settings.
- **Pros**: no package change.
- **Cons**: every user has to discover and repeat the fix. The reviewer prompt still has no code-quality duty, so it would load the skill and still review spec compliance only.
- **Why not chosen**: the user wants the bundled agents to carry the improvement themselves. It was tried and reverted.

## Agreed Approach

The bundled agents reference the skill by name. The user picked this in the Inbox: reference `coding-standards` by name as a user- or project-provided skill, documented as a dependency in the README in the same way as Superpowers. Unlike Alternative D, the reviewers also get an explicit duty to review structure, so loading the skill changes what they report.

## Key Decisions

- The package names the skill `coding-standards` and never ships, generates or edits it.
- The agent prompts state the review dimension, and the skill provides the criteria. The prompts contain no numeric thresholds (line counts, complexity).
- Only the roles that write code or judge its structure select the skill: implementer, task-reviewer and plan-reviewer.
- A missing `coding-standards` skill never stops a stage. The user sees a warning at `session_start` and a notice when a stage delegates. Agents note the gap under Limitations and fall back to the project's conventions. The inline path is unchanged.
- `coding-standards` is the only optional role skill. The Superpowers skills that roles select stay required.
- No schema change: the bundled schema version stays at 7. Design and plan quality is caught by the plan reviewer, not by new schema instructions.

## Open Questions

None. Whether the parent session itself should load the skill while it writes `design.md` and `plan.md` is out of scope; the user's global instructions already cover that.
