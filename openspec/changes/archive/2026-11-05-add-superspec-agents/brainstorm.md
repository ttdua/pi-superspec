## Design Summary

Ship Superspec-owned package agents that pi-subagents discovers automatically, and route existing Superspec workflow steps to the appropriate specialists. The intent is consistent, bounded delegation with workflow-specific evidence, not a second orchestration framework.

The user selected package-wide agent availability in the exploration Inbox discussion: installed agents may appear in any project, while automatic Superspec workflow routing remains available only through activated `/opsx-*` skills. The six-role catalog and routing below are proposals submitted for approval at this brainstorm gate, not previously approved implementation decisions.

### Goals

- Bundle `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, and `superspec.verifier`.
- Discover agents from the installed package without copying files into user/project directories or installing pi-subagents automatically.
- Use specialists at meaningful existing workflow boundaries, retaining inline execution when pi-subagents is absent.
- Preserve parent ownership of official artifacts, task progress, outcome classification, human gates, and publication authority.
- Keep model/provider selection under user/project configuration rather than per-dispatch hardcoded overrides.

### Non-goals and anti-goals

No new orchestrator, artifact DAG, human approval gate, mandatory external research agent, runtime registration subsystem, dependency installation, or finalize/push/merge automation. Do not duplicate Superpowers task reviews, spawn children merely because they are available, or describe tool allowlists as a security sandbox.

### Existing decisions and proposed documentation changes

- `docs/architecture.md`, "pi tool mapping" and "Constraints": preserve optional pi-subagents integration, inline fallback, and harness-neutral schema text. Put agent selection and Pi tool instructions in skills, not schema/templates.
- `docs/workflow.md`, "Steps", "Step rules", and "Review gates": preserve the artifact DAG, authoritative worktree copy, per-task plus whole-branch review, fresh verification evidence, and human approval outcomes.
- `docs/domain-model.md`, "Package", "Artifact", "ApplyReceipt", and "VerifyReport": extend Package ownership to bundled agents without changing artifact identities or receipt authority.
- `docs/glossary.md`, "Activated project" and "SDD": distinguish package agent availability from activated commands; retain fresh implementer and per-task review semantics.
- Explicitly change the documented generate-specs behavior: scouts currently write delta specs themselves (`skills/opsx-generate-specs/SKILL.md`, steps 6–8; `docs/usage-guide.md`, generate-specs section). Scouts will return evidence and candidate observable behaviors; the parent writes and validates official delta specs. Update the existing spec and tests in the same change.
- Extend package manifest documentation/specification to include published agents and optional third-party discovery metadata, without exposing skills/prompts outside activation or adding runtime dependencies.

## Alternatives Considered

### Alternative A: Package-discovered, namespaced agents

- **Approach**: Publish an `agents/` directory, declare it through `pi-subagents.agents`, and give each definition the `superspec` package namespace.
- **Pros**: Uses existing discovery, override, disable/eject, and model configuration behavior; no install-time copies or registration lifecycle; no runtime import dependency.
- **Cons**: Agents are discoverable outside activated projects. Supported pi-subagents versions must implement package discovery and namespaced definitions.
- **Disposition**: Selected by the user for availability; recommended for integration.

### Alternative B: Activation-bound runtime registration

- **Approach**: Register and dispose agents through pi-subagents runtime registration when the project activates.
- **Pros**: Agent visibility could track activation.
- **Cons**: Adds load-order, session lifecycle, readiness, and collision handling; configured-agent collisions do not have package discovery's normal override semantics.
- **Why not chosen**: The user chose package-wide availability, making the extra lifecycle unnecessary.

### Alternative C: Reuse generic agents with expanded dispatch prompts

- **Approach**: Keep using generic scout/worker/reviewer agents and put every Superspec contract into each handoff.
- **Pros**: Smallest package footprint and no new catalog to maintain.
- **Cons**: Does not provide the requested bundled specialists; repeated prompts can drift, and generic scout behavior currently conflates recon with writing official specs.
- **Why not chosen**: A small namespaced catalog makes responsibilities discoverable and reusable while task-specific values remain in handoffs.

## Agreed Approach

Use Alternative A for the registration mechanism, as explicitly selected by the user. Submit the following bounded catalog and routing for approval; implementation details and exact contracts belong in `design.md` and `plan.md` after this gate.

| Role | Responsibility | Boundary |
|---|---|---|
| `superspec.scout` | Local codebase recon, impact, constraints, evidence, and candidate behaviors | No product or official artifact edits |
| `superspec.spec-reviewer` | Review observable requirements, scenarios, scope, contradictions, and evidence | Findings only; no approval authority |
| `superspec.plan-reviewer` | Review feasibility, Contracts, dependencies, task coverage, and scenario-to-test mapping | Findings only; no plan edits |
| `superspec.implementer` | Execute one approved task with TDD and validation | Assigned implementation scope only; no nested delegation or publication |
| `superspec.task-reviewer` | Review task spec compliance and quality; reuse for whole-branch review | Read-only findings tied to the exact review range |
| `superspec.verifier` | Independently inspect requirements, scenarios, Contracts, and fresh command evidence | No product fixes or official receipt edits; parent classifies the final outcome |

### Routing

- Explore/brainstorm: scout only when repository recon materially helps; the parent retains the user conversation and decisions.
- Specs: one spec review of the completed draft before the existing human gate. For `/opsx-ff`, this is internal checking before the final packet gate, not a new stop.
- Plan: one plan review before its existing gate/final packet gate.
- Apply: substitute the namespaced implementer and task reviewer into the existing Superpowers SDD seats; do not append a duplicate review pipeline. Final whole-branch review remains mandatory.
- Verify: use the verifier for independent evidence collection when available; parent checks evidence, writes `verify.md`, and applies existing PASS/PASS_WITH_WARNINGS/FAIL rules. Tests must be fresh in this verify invocation.
- Generate specs: map, confirm candidates with the user, scout each confirmed capability, then parent-authored/validated delta specs. Parallelize independent reads, not official artifact writes.
- Finalize, sync, and archive stay parent-owned. Generic researcher/oracle roles remain optional for external facts or material design critique; no Superspec copies are needed.

### Delegation constraints

Parent briefs carry resolved artifact paths, authoritative cwd, scope, task/requirement IDs, acceptance criteria, validation commands, and stop conditions. Children use fresh bounded context and do not delegate further. Only one implementation writer operates in a worktree at a time. Reports go to run-managed or explicit scratch artifacts, not unsolicited repository-root files.

Read-only roles have narrow tools; `acceptanceRole` alone is not access control. Verifier commands may create test/build outputs and are not a sandbox guarantee. Missing tool providers, disabled agents, unsupported discovery, or launch errors must be reported rather than silently bypassing operator settings. Inline fallback applies to absent pi-subagents, not as an undisclosed recovery from a failed launch. All roles inherit applicable project constraints; global constraints required by the task are explicitly preserved in configuration or the brief.

## Key Decisions

1. User decision: agents are discoverable package-wide, not activation-bound.
2. Proposed: six namespaced agents; no unqualified aliases that shadow existing generic roles.
3. Proposed: parent owns official artifacts and progress; the implementer edits only its authorized task scope.
4. Proposed: agent checks reuse existing workflow seats and never replace human gates.
5. Preserve harness-neutral bundled schema and leave `openspec/schemas/superspec/` untouched.
6. Preserve optional integration, no runtime dependencies, and user/project model configuration.
7. Establish supported pi-subagents capability/version evidence during design; do not claim compatibility with all forks or versions from the locally inspected implementation alone.

## Open Questions

No unresolved product choice blocks this brainstorm review. Approval at this gate settles the proposed catalog and routing. Exact allowlists, report contracts, compatibility checks, test fixtures, and per-skill insertion points remain design/plan work, constrained by this document.
