## Why

Delegation is hard-coded to one plugin, `pi-subagents` 0.84.0: its call shape, its `output` parameter, its `subagents_enable` helper, its manifest key and six fixed `superspec.*` agent names. Users who switch to `@tintinweb/pi-subagents` or `@gotgenes/pi-subagents` get a stopped or broken workflow, and every future plugin change would need another rewrite. Tasks also carry no difficulty or dependency data, so apply cannot pick agents and effort per task or run independent tasks at the same time. Making delegation capability-based, with a detected per-plugin adapter and task metadata, keeps the workflow stable across plugins and lets apply parallelise safely.

## What Changes

**Workflow delegation text**
- From: skills and `skills/references/subagent-routing.md` name `pi-subagents`, its call shape and the `superspec.*` agents, and the agent bodies tell children to call `contact_supervisor`.
- To: skills, the reference and agent bodies describe delegation and escalation by function (spawn a role, collect its report, wait) and define each role by its requirements (read-only or writer, tools, skills, report contract).
- Reason: the user asked for no plugin hard-coding.
- Impact: non-breaking for users; skill text changes.

**Agent selection**
- From: the parent must dispatch the canonical `superspec.*` identity. A missing or disabled one stops the stage, and generic agents are forbidden.
- To: the parent always selects, per role, an available agent that meets the role's requirements. It gives no precedence to bundled agents and announces each choice. When no agent qualifies, it reports and stops the affected lane under the existing failure rules.
- Reason: plugins differ in which agents exist; requirements are the stable contract.
- Impact: behaviour change for delegated stages.

**Subagent integration paragraph**
- From: no plugin-specific runtime guidance.
- To: the extension detects the installed subagent plugin by the spawn tool's parameter schema, using provenance as tie-breaker. It injects a "Subagent integration" paragraph into the routing note with that plugin's call shape, agent listing, report collection and wait mechanics, or states that delegation is unavailable.
- Reason: the same pattern as the document language and Interaction channel paragraphs.
- Impact: new extension behaviour; routing note text grows.

**Bundled agents and manifest**
- From: agents declared only through `pi-subagents.agents`, with `package: superspec` naming.
- To: bundled agents are declared for every supported plugin that discovers package agents (`pi-subagents` and `@tintinweb/pi-subagents`). Nothing is supplied for `@gotgenes/pi-subagents`.
- Reason: tintinweb is the user's primary plugin.
- Impact: `package.json` gains `pi.subagents.agents`; agent frontmatter must be readable by both plugins.

**Task metadata (bundled schema v7 → v8)**
- From: `tasks.md` and `plan.md` carry no difficulty or dependency data.
- To: the tasks phase records `Blocked by` per task in `tasks.md`. The plan phase records `Difficulty` (`Easy`, `Normal`, `Hard`, `Very Hard`) per plan task and refines dependencies in `plan.md`.
- Reason: agents need it to choose task order, agent and effort.
- Impact: schema version bump; projects upgrade through `/opsx-init`.

**Parallel apply**
- From: one implementation writer per worktree and strictly sequential tasks, with no per-dispatch thinking override.
- To: unblocked, independent tasks or task groups may run in parallel. Each writer lane runs in its own child worktree and branch from `<change>`, and the parent merges it after review. The parent picks each child's thinking level from task difficulty; model selection stays with user configuration.
- Reason: faster apply without writers colliding.
- Impact: apply orchestration and `apply.md` recording change.

## Capabilities

### New Capabilities
- `subagent-integration-paragraph`: detection of the installed subagent plugin and the injected Subagent integration paragraph (supported plugins, detection order, per-plugin mechanics, the unavailable case).
- `parallel-apply-lanes`: scheduling of unblocked tasks into parallel lanes, child worktree and branch per writer lane, merge-back after review, conflict handling, and how lanes are recorded in `apply.md`.

### Modified Capabilities
- `subagent-routing`: the shared reference becomes plugin-neutral. Availability is resolved through the detected adapter. Fixed canonical-role dispatch and the generic-agent ban are replaced by requirement-based selection. Report binding through `output` becomes adapter-defined collection. Concurrency allows parallel writer lanes in separate worktrees. Thinking may follow difficulty.
- `workflow-agents`: the catalog becomes requirement-defined roles with bundled candidate agents. Naming and frontmatter must work for both discovering plugins. Model and thinking ownership is narrowed for difficulty-driven thinking.
- `execution-commands`: the apply executor uses requirement-selected agents and parallel lanes. The verify delegation selects its agent by requirements.
- `planning-commands`: reconnaissance and internal spec and plan review seats refer to roles, not `superspec.*` names.
- `generate-specs-command`: map and capability scouts are selected by the scout role's requirements instead of `superspec.scout`, and the per-call thinking rule is aligned.
- `package-manifest`: package agents are declared for every supported discovering plugin.
- `routing-note`: the note carries the Subagent integration paragraph.
- `bundled-schema`: the tasks and plan instructions and templates require `Blocked by`, `Difficulty` and refined dependencies; the version moves to 8.
- `project-readme`: optional packages list the supported subagent plugins and what each gets.
- `usage-guide`: apply behaviour is described per detected plugin, including parallel lanes.
- `release-metadata`: the e2e checklist covers the supported plugins instead of one `pi-subagents` run.

## Impact

- Code: `extensions/superspec.ts`, `extensions/routing-note.ts`, a new detection and paragraph module beside `extensions/interaction-channel.ts`, and tests under `tests/`.
- Skills: `skills/references/subagent-routing.md`, `opsx-apply`, `opsx-continue`, `opsx-ff`, `opsx-explore`, `opsx-verify`, `opsx-generate-specs`.
- Agents: frontmatter and bodies of all six files in `agents/` (no plugin tool names).
- Schema: `schema/superspec/schema.yaml`, `templates/tasks.md`, `templates/plan.md`, `templates/apply.md`, version 8 and `tests/fixtures/schema-checksums.json`.
- Manifest: `package.json` (`pi.subagents.agents`).
- Docs: `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md`, `docs/usage-guide.md`, `docs/e2e-checklist.md`, `README.md`, `README.vi.md`, `CHANGELOG.md`.
- Dependencies: none added; all subagent plugins stay optional.
