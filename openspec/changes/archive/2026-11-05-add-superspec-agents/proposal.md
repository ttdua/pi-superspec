## Why

Superspec delegates implementation and codebase scouting today, but does not ship its own agent definitions or a consistent handoff contract. Generic roles require repeated workflow instructions, and generate-specs asks scouts to write official specs. Bundled specialists make delegation predictable while preserving parent authority and existing human gates.

## What Changes

- Publish six namespaced package agents: scout, spec-reviewer, plan-reviewer, implementer, task-reviewer, and verifier. Let pi-subagents discover them without copying files, installing dependencies, or adding runtime registration.
- Add bounded scout routing to explore and brainstorm; spec and plan review to existing planning boundaries; namespaced execution/review seats to apply; independent evidence collection to verify.
- Keep configured models, user/project overrides, fresh contexts, single-writer isolation, and parent-owned official artifacts. Missing pi-subagents retains inline execution; disabled agents or failed launches are reported rather than bypassed.

**Generate specs**
- From: capability scouts write delta specs, with per-dispatch fast-model selection.
- To: namespaced scouts return evidence after capability confirmation; the parent writes and validates delta specs using configured agent models.
- Reason: separate reconnaissance from official specification authority.
- Impact: changes internal delegation instructions, not the command name, generated spec format, or user confirmation gate.

## Capabilities

### New Capabilities

- `workflow-agents`: bundled agent catalog, identities, tools, context, and report responsibilities.
- `subagent-routing`: shared availability checks, handoff, error policy, model ownership, and delegation boundaries.

### Modified Capabilities

- `package-manifest`: publish agents and declare optional package discovery metadata while keeping activated skills/prompts dynamic and runtime dependencies absent.
- `planning-commands`: bounded scout use and internal spec/plan checks without changing human gates or explore's no-code boundary.
- `execution-commands`: namespaced SDD seats and delegated verify evidence with parent-owned receipts.
- `generate-specs-command`: scout evidence instead of scout-authored official specs, capability-confirmation ordering, and configured-model dispatch.

## Impact

- New published `agents/*.md` definitions and a shared integration reference under `skills/`.
- Changes to `package.json`, selected `skills/opsx-*/SKILL.md`, tests, README installation/usage sections, and architecture/workflow/domain/glossary/usage/E2E documentation.
- No edits to `openspec/schemas/superspec/`, the bundled schema/templates, activation extension, artifact DAG, command surface, or finalize publication behavior.
- No new runtime or development dependency. Compatibility is capability-based and must be demonstrated with an explicitly recorded pi-subagents build; no blanket compatibility claim for all versions/forks.
