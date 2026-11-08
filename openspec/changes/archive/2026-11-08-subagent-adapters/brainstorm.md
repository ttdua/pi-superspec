## Design Summary

Superspec currently delegates through exactly one subagent plugin. `skills/references/subagent-routing.md`, the `subagent-routing`, `workflow-agents`, `execution-commands`, `planning-commands` and `package-manifest` specs, `package.json` and the docs (`docs/architecture.md` "pi tool mapping" and "Subagent compatibility") all assume `pi-subagents` 0.84.0. They hard-code its call shape (`subagent({agent, task, cwd, context, output})`), its lazy helper (`subagents_enable`), its manifest key (`pi-subagents.agents`) and the six canonical `superspec.*` agent names.

The user now runs other plugins, so that coupling breaks the workflow:

- `@gotgenes/pi-subagents` (25.x) registers a `subagent` tool with a different schema (`subagent_type`, `prompt`, `description`). It has no `output` parameter and does not discover package agents.
- `@tintinweb/pi-subagents` registers `Agent`. It discovers package agents through `pi.subagents.agents`, supports `skills:`, `tools:` and `disallowed_tools`, and has no `output` parameter.

This change makes delegation plugin-neutral, and adds task metadata and parallel execution so that delegation can pick suitable agents and effort.

1. **Capability-based workflow text.** Skills, the shared routing reference and the bundled agent bodies describe delegation by function, including how a child escalates to the parent,: spawn a role, collect its report, wait for completion, and say what the role needs (read-only or writer, required tools, required skills, report contract). They name no plugin, no plugin tool (for example `contact_supervisor`) and no fixed agent.
2. **Role requirements, not fixed agents.** Each role (scout, spec reviewer, plan reviewer, implementer, task reviewer, verifier) is defined by its requirements. The parent always selects the agent by those requirements from what the installed plugin offers. The bundled `superspec.*` agents are candidates that meet them, not mandatory identities, and they are not preferred over others that also qualify. The parent announces which agent it chose for each role.
3. **Bundled agents supplement compatible plugins.** The package ships its agents for the plugins that can discover package agents: `pi-subagents` (current) and `@tintinweb/pi-subagents` (primary target). For `@gotgenes/pi-subagents` it supplies nothing: no generated files and no sync. The parent still delegates there by choosing among the agents that plugin provides.
4. **Detected adapter paragraph.** Like the document language and Interaction channel paragraphs (`routing-note` "Routing note content"), the extension detects the installed subagent plugin and injects a "Subagent integration" paragraph into the routing note. The paragraph carries that plugin's call shape, how to list agents, how to collect a report, how to wait, and the child's escalation tool, which the parent passes on in the handoff. Detection is by the tool's parameter schema (capability), with `sourceInfo`/package provenance as tie-breaker. When nothing is detected, the paragraph says delegation is unavailable and the inline path applies.
5. **Task difficulty and dependencies.** The unit of work handed to one subagent is a task group (`## N` in `tasks.md`, which is `## Task N` in `plan.md`), not a single checkbox. Independent work is split into separate groups; checkboxes inside a group are done by the same agent in order. The tasks phase records `Blocked by` per group in `tasks.md`, naming other groups only. The plan phase adds a difficulty (`Easy`, `Normal`, `Hard`, `Very Hard`) per plan task and refines dependencies in `plan.md`. The metadata exists so the parent can choose task order, agent and effort.
6. **Parallel lanes.** During apply, task groups that do not depend on each other and are not blocked can run at the same time. Each parallel writer lane gets its own child worktree and branch cut from the `<change>` branch. The parent merges a lane back after its review passes.
7. **Effort follows difficulty.** The parent chooses the child's thinking level from the task difficulty at dispatch time. Agent-file locks are still honoured, since the plugin enforces them.

## Alternatives Considered

### Alternative A: Swap to one new plugin
- **Approach**: Rewrite the routing reference and agents for `@tintinweb/pi-subagents` only and drop `pi-subagents`.
- **Pros**: Smallest diff; one dialect.
- **Cons**: Same hard-coding problem one plugin later; breaks users still on `pi-subagents`; does not address gotgenes at all.
- **Why not chosen**: The user explicitly asked that the workflow not hard-code a plugin.

### Alternative B: Sync managed agent files for every plugin
- **Approach**: The extension writes `superspec.*` agent files in each plugin's dialect into `.pi/agents/` or `~/.pi/agent/agents/`, including for gotgenes.
- **Pros**: Uniform role availability on all three plugins.
- **Cons**: Writes into `.pi/`, which is an architecture anti-goal ("Writing files into the project's `.pi/` that the user did not ask for"). Needs drift and ownership tracking, and contradicts `package-manifest` "Published files" (no cleanup on uninstall).
- **Why not chosen**: With selection by role requirements, gotgenes can delegate to its own qualifying agents, so the cost buys nothing the user asked for.

### Alternative C: Upstream package-agent discovery in gotgenes
- **Approach**: Contribute package-agent discovery or an agent provider seam to `@gotgenes/pi-subagents`.
- **Pros**: The cleanest long-term outcome for gotgenes.
- **Cons**: Out of this repository's control. Gotgenes decision 0002 keeps provider seams rationed, so acceptance is uncertain.
- **Why not chosen**: Not needed for this change. It stays an optional follow-up outside the repo.

## Agreed Approach

Plugin-neutral, capability-described delegation with a detected adapter paragraph (items 1 to 4 of the Design Summary), plus task metadata (item 5), parallel lanes in child worktrees (item 6) and difficulty-driven effort (item 7). This is preferred over Alternative A because the workflow text no longer changes when the user changes plugins. Only the adapter paragraph does, and it follows the established pattern of the language and Interaction channel paragraphs. It is preferred over Alternative B because it writes nothing into `.pi/` and keeps "Published files" intact.

## Key Decisions

- **Supported adapters**: `@tintinweb/pi-subagents` (primary), `pi-subagents` (kept). `@gotgenes/pi-subagents` is detected and supported for delegation to its own agents, but receives no bundled agents.
- **Detection**: by the spawn tool's parameter schema; provenance (`sourceInfo`/package) breaks ties, for example two plugins that both register a tool named `subagent`.
- **Selection**: always by role requirements. Bundled `superspec.*` agents get no precedence. The parent announces the chosen agent per role. A role whose requirements no available agent meets is reported, and the stage follows the existing failure rules.
- **Unit of work**: a task group. `Blocked by` names groups, never individual checkboxes. Work that should run independently becomes its own group.
- **Metadata placement**: `Blocked by` is written per group in `tasks.md` during the tasks phase. `Difficulty` is written in `plan.md`, together with dependencies refined during the plan phase.
- **Difficulty scale**: `Easy`, `Normal`, `Hard`, `Very Hard`.
- **Parallelism**: only for writer lanes with no unresolved dependency. Each writer lane runs in its own child worktree and branch from `<change>`, and is merged back by the parent after review. Read and review lanes may also run in parallel.
- **Effort**: the parent picks the thinking level from difficulty. Model selection stays with the user's configuration.

Changes to specified requirements (stated explicitly, per the brainstorm rule):

- `subagent-routing` "Shared integration reference": the reference stops naming one plugin's capabilities and documents role requirements and the adapter paragraph instead.
- `subagent-routing` "Availability and failure handling": the lazy-helper step becomes adapter-specific. The rule "no fallback to a generic agent" is replaced by requirement-based selection.
- `subagent-routing` "Bounded handoff and reports": binding reports through the `output` parameter becomes "collect the report through the adapter's mechanism; the parent writes it to scratch when the plugin cannot".
- `subagent-routing` "Parent authority and concurrency" and `execution-commands` "Executor depends on subagent availability": "one implementation writer per worktree" stays true per worktree, but parallel lanes in child worktrees are allowed. "Omit per-dispatch model/thinking overrides" is narrowed: thinking may be set from difficulty, while model stays omitted.
- `workflow-agents` "Namespaced specialist catalog" and "Explicit context and model ownership": the catalog becomes requirement-defined roles with bundled candidate agents. Namespacing and frontmatter must work for both discovering plugins.
- `package-manifest` "pi package manifest": the manifest declares package agents for every supported discovering plugin (`pi-subagents.agents` and `pi.subagents.agents`).
- `routing-note` "Routing note content": the note also carries the Subagent integration paragraph.
- `bundled-schema`: the tasks and plan instructions and templates gain the metadata. This is a schema version bump (7 to 8), and the wording stays harness-neutral ("Harness-neutral wording").
- `planning-commands` "Bounded planning reconnaissance" and "Internal spec and plan review seats" refer to roles instead of `superspec.*` names.

Docs updated in the same change: `docs/architecture.md` ("pi tool mapping", "Subagent compatibility"), `docs/workflow.md` (steps 5 to 7 and the specialist seats), `docs/domain-model.md` (Worktree, task metadata), README/README.vi and `docs/e2e-checklist.md` (adapter matrix).

## Open Questions

- Whether one agent file can serve both `pi-subagents` (local `name` + `package: superspec`) and tintinweb (frontmatter `name` without namespace, `prompt_mode`), or whether two dialect directories are needed. To resolve in design after checking how `pi-subagents` treats a dotted `name`.
- The difficulty-to-thinking mapping that the parent applies (a default table in the routing reference), and whether `openspec/config.yaml` may override it.
- Maximum number of parallel writer lanes, and how merge conflicts between lanes are handled (stop and ask, or serialize the conflicting lane).
- How lanes, child worktrees and per-lane commit ranges are recorded in `apply.md` without breaking finalize, which reads one commit range.
- Runtime smoke evidence for tintinweb and gotgenes. Until it exists, both are documented as inspected, not smoke-tested.
