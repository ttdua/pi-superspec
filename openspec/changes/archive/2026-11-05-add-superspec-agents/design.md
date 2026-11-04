## Context

The extension exposes skills/prompts only when the nearest OpenSpec project carries the Superspec marker (`extensions/superspec.ts:38–45`). `package.json` publishes no agents today. Apply delegates through Superpowers SDD, while generate-specs delegates mapping and capability scouting without naming a stable workflow-specific agent.

The inspected pi-subagents implementation supports a top-level `pi-subagents.agents` manifest entry, frontmatter `package` namespaces, package definitions below user/project overrides, and configured model selection. Evidence: pi-subagents `docs/agents.md` and `src/agents/agents.ts:572–600`, inspected at version `0.84.0`, commit `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`. This identifies a reference implementation, not a guaranteed minimum version for every distribution. End-to-end compatibility must be recorded against the actual installed build during implementation.

This change implements the approved brainstorm without changing the schema or extension activation path. The public contracts are the package discovery metadata and canonical agent identities. Their exact shapes are recorded in `plan.md`; this document explains the choices and reasons.

## Goals / Non-Goals

**Goals:** predictable role selection, bounded handoffs, parent-authored official artifacts, user-configured models, independent evidence, and graceful absence of the optional integration.

**Non-Goals:** runtime registration, copying agents to configuration directories, dependency installation, executable orchestration engine, nested delegation, schema/template changes, new approval gates, automatic publication, and claims that prompt instructions constitute a security sandbox.

## Decisions

### 1. Package metadata is the registration mechanism

Add `agents/` to the published files and declare its path in top-level `pi-subagents` metadata. Keep `pi.extensions` unchanged and keep `pi.skills`, `pi.prompts`, and `pi.themes` absent. This preserves activated resource discovery while allowing agents to appear wherever the package is installed. Agent files use local names plus the `superspec` package namespace; no generic aliases shadow existing agents.

Do not import pi-subagents at runtime or add it as a dependency. Do not modify settings to register agents. Use normal package priority, per-agent overrides, disable/eject, and removal semantics. Runtime registration was rejected because visibility is intentionally package-wide and lifecycle/collision handling would add unnecessary coupling.

### 2. Definitions are small, explicit role contracts

Create six Markdown definitions in `agents/`, each with a strict tools list, fresh context, project and global policy inheritance, no ambient skill catalog, no default progress file, and no nested delegation. No definition pins a model, provider, or thinking level. User/project agent configuration remains authoritative; dispatches omit model/thinking overrides.

- Scout uses inspection tools, including `bash` only for non-mutating inspection. It returns evidence and candidate observable behaviors, not official artifacts.
- Spec/plan/task reviewers receive read/search tools and `contact_supervisor`, but no shell or edit/write tools. The parent supplies immutable diff/command artifacts where reviewers cannot collect them directly.
- Implementer receives read/search, shell, edit/write, and supervisor tools. It is the only role authorized to edit assigned product files. Select the installed `test-driven-development`, `verification-before-completion`, and `systematic-debugging` skills explicitly, not the whole catalog.
- Verifier receives read/search, shell, and supervisor tools, and selects `verification-before-completion`. Shell is for assigned checks/tests only; it may produce build/test outputs but must not fix product files. This is a behavioral boundary, not filesystem enforcement.

The exact allowlists and report headings are Contracts in `plan.md`. `acceptanceRole` expresses review/acceptance intent and does not enforce access. Configured overrides can alter effective tools; handoffs retain the task's authority boundary and any incompatible widening is reported to the parent.

### 3. A shared reference owns integration policy

Create `skills/references/subagent-routing.md` without a `SKILL.md`; it is packaged with skills but is not a new slash command or independently discovered skill. Explore, continue, ff, apply, verify, and generate-specs explicitly read it before delegation. Keep each skill's stage-specific invocation adjacent to the relevant step instead of duplicating the entire policy.

The reference distinguishes four states:

1. **Available:** if only `subagents_enable` is visible, enable it and re-evaluate on the next model turn. List/inspect agents through the installed tool's documented management surface before first use. Resolve canonical names and ensure they are not disabled.
2. **Absent:** if neither the tool nor its activation helper is available, announce inline fallback once. Preserve the command's existing gates, ordering, and evidence rules.
3. **Incompatible or disabled:** report the missing/disabled canonical role, discovery capability, skill, or required tool; stop the affected delegated stage. Do not silently choose a generic agent or write settings. Explain package update or an explicitly chosen inline route as options.
4. **Launch/runtime failure:** stop the lane, retain exact error, run/worktree identity and partial state, and report. No alternate CLI, generic-role retry, or hidden inline recovery.

Preflight is not a startup extension probe or an automatic installer. Discovery is authoritative at use time; docs state the required capabilities and the smoke-tested build, not an unsupported blanket version promise.

### 4. Parent authority and output routing stay explicit

Each handoff carries goal, authoritative cwd and change root, resolved artifact/task paths, scope and allowed edits, applicable constraints, task/requirement/scenario IDs, refs or diff artifact when applicable, acceptance criteria, validation commands, report contract, and stop conditions. Pass output through pi-subagents' `output` parameter into run-managed artifacts; a path in prose alone does not bind output.

Use fresh context, no nested subagents, and one implementation writer per worktree. Parallelize independent recon/review only. Parent re-reads official dependencies and checks result evidence before writing official artifacts, checkbox progress, contract deviations, and receipts. A child cannot approve a human gate or authorize scope expansion, push, merge, or PR creation. Scope/contract conflicts are escalated rather than silently resolved against the approved artifacts.

Role reports use stable Markdown sections rather than introducing a JSON protocol or executable parser. Missing required evidence/sections mean an incomplete report, never success. Parent validates the report against the task and files; headings alone do not prove correctness.

### 5. Integrate existing workflow seats, not additional pipelines

- Explore: opportunistic scout for non-trivial recon; never mutate code/schema/config or write official artifacts from a child. Small conceptual questions stay inline.
- Continue/ff brainstorm: optional scout when facts are needed; parent remains the conversation owner. No new brainstorm gate.
- Continue/ff specs: one `spec-reviewer` pass after all files for that artifact exist and before the existing human gate/final ff gate. Plan uses one `plan-reviewer` pass. Fix/re-review actual findings as needed, without stopping unattended ff for extra approvals. Existing gate tier order and outcomes remain unchanged.
- Apply: substitute `superspec.implementer` and `superspec.task-reviewer` into SDD's implementer/task-review/final-review seats, including fix iterations. Keep spec compliance and quality in one task-review seat. Parent creates review packages for exact committed ranges. Never double-dispatch the generic Superpowers reviewer. Follow configured models rather than Superpowers' per-call model-pinning advice where it conflicts.
- Verify: verifier collects checks/evidence in the authoritative worktree. The parent may run missing checks itself, but reports unverifiable items as such, applies the six-check outcome policy, and writes/commits `verify.md`. A test launched by the verifier during this verify invocation is fresh; prior apply logs are not.
- Generate specs: one scout maps candidates, then the existing user confirmation occurs before any capability scout. Run one evidence-only scout for each confirmed, still-missing capability. Parent writes/validates the official delta spec per report; parallel children never write spec files. Keep resume, ignored directories, language, inferred labels, limits, and handoff unchanged. A spec-reviewer checks completed drafts before final strict validation, without a new human gate.
- Finalize, sync, archive, new-change scaffolding, and extension lifecycle remain unchanged.

### 6. Tests separate contracts from runtime evidence

Use existing Vitest patterns to assert manifest/frontmatter, bounded role prompts, references, stage ordering, output contracts, and preserved guards. Add parameterized tests over exact role identities and tool lists. Expand generate-specs tests to enforce map/confirm/scout/parent-write ordering and remove scout-writes/fast-model assumptions deliberately.

Extend `docs/e2e-checklist.md` with named smoke cases for activated/unmarked discovery, user/project model overrides, disabled/missing agents, absent integration, fresh-context calls, output routing, read-only canaries, one SDD review seat per task, fresh failing verify, and parent-authored generated specs. Record host/package versions or commits, commands/calls, run IDs, expected versus observed results, and limitations. Runtime smoke uses installed optional packages, not a new test dependency or private source import. A failed or unavailable smoke is a reported limitation, not a passing test.

## Risks / Trade-offs

- Package metadata/namespace support differs by version or fork → document capability requirements, list canonical roles at use time, and record tested build identities.
- Package-wide agent visibility adds catalog entries outside activated projects → use namespacing and `advertise: false`; do not inject a global routing note.
- Markdown contract tests can pass while a model ignores instructions → run real discovery/delegation smoke and retain run evidence separately.
- Shell can mutate files despite a read-only acceptance role → reviewers have no shell; scout/verifier prompts constrain shell use, smoke checks canaries, and documentation avoids sandbox claims.
- Model/default or agent overrides can remove required capabilities → respect operator settings and stop/report incompatibility instead of overriding them.
- Long reports or repeated reviews waste context → bounded references, run-managed report files, one existing seat per purpose, optional recon only when useful.
- Existing npm lockfile is repository policy → use Bun to run existing scripts without converting `package-lock.json`; no dependency installation is part of this change.

## Migration Plan

1. Add definitions/metadata and integration references, then update affected skills, tests, and documentation together.
2. On an installed package update, reload/restart Pi so package discovery and activated skills refresh; no `/opsx-init` or schema reinstall is required for this agent-only change.
3. Existing changes retain their artifacts; new dispatches use the new names after compatibility checks. Do not rewrite reviewed artifacts merely to add agents.
4. Roll back by restoring the prior package release; no generated agent files/settings need cleanup. Existing user overrides remain user-owned.

## Open Questions

None requiring another product decision. Implementation must report the exact smoke-tested Pi/pi-subagents builds and any unavailable runtime checks before claiming integration completion.
