## Context

Delegation is written for `pi-subagents` 0.84.0 at `d9f8f8c9`: `skills/references/subagent-routing.md`, six `agents/*.md` with `package: superspec`, the `pi-subagents.agents` manifest key, and specs that require canonical `superspec.*` dispatch, the `output` parameter and one writer per worktree. Three plugins now matter, and they differ in contract, not only in name.

| Capability | `pi-subagents` 0.84 | `@tintinweb/pi-subagents` | `@gotgenes/pi-subagents` 25.x |
|---|---|---|---|
| Spawn tool | `subagent` (`agent`, `task`, `cwd`, `context`, `output`, `action`) | `Agent` (`subagent_type`, `prompt`, `description`, `run_in_background`, `thinking`, …) | `subagent` (`subagent_type`, `prompt`, `description`, `run_in_background`, `thinking`, …) |
| Result | inline, or file via `output` | inline / `get_subagent_result` | inline / `get_subagent_result` |
| Package agents | `pi-subagents.agents`, runtime name `<package>.<name>` | `pi.subagents.agents`, runtime name = frontmatter `name` (no namespace, `:` reserved) | none (`.pi/agents/`, `~/.pi/agent/agents/` only) |
| Thinking per call | only as a model suffix (`model:<level>`) | `thinking` parameter | `thinking` parameter |
| Lazy helper | `subagents_enable` | none | none |
| Child asks the parent | `contact_supervisor` tool (`reason: need_decision`), child waits | no tool; child ends its turn with the question, parent answers by `steer_subagent` or resume | `ask_parent` (child ends its turn, parent resumes) and `notify_parent`, always added |
| Prompt inheritance | `systemPromptMode`, `inheritProjectContext` | `prompt_mode` (`replace` drops AGENTS.md) | `prompt_mode` |

Verified in source: `pi-subagents` builds the runtime name as `package ? package + "." + name : name` and does not validate the local name's characters (`src/agents/identity.ts`, `src/agents/agents.ts`). The extension already injects language and Interaction channel paragraphs from the `context` hook (`extensions/superspec.ts`, `extensions/interaction-channel.ts`), and Pi exposes `pi.getAllTools()` with `parameters` and `sourceInfo`.

The six agent bodies currently name `contact_supervisor` with `reason: "need_decision"` and list it in `tools`. That is a `pi-subagents`-only tool, so the prompts themselves are plugin-specific, not only the routing reference.

Constraints: the schema stays harness-neutral (`bundled-schema` "Harness-neutral wording"). Nothing is written into `.pi/` (architecture anti-goal). No runtime dependency is added. Any change under `schema/superspec/` bumps the version and the checksum fixture.

## Goals / Non-Goals

**Goals:**
- Skills and agent bodies describe delegation and escalation by function, and roles by requirements. Plugin specifics (tool names, parameters, escalation tools) live only in one injected paragraph and in the handoff the parent writes from it.
- The parent works with `@tintinweb/pi-subagents` (primary), `pi-subagents` (kept) and `@gotgenes/pi-subagents` (its own agents only).
- `tasks.md` and `plan.md` carry dependencies and difficulty, and apply uses them to run independent work in parallel and pick effort.

**Non-Goals:**
- Supplying agents for `@gotgenes/pi-subagents`, or syncing agent files anywhere.
- Using plugin-native worktree isolation (`isolation: worktree`), workflows, scheduling or nested subagents.
- Choosing or pinning models.
- Upstream contributions to any plugin.

## Decisions

### D1. Detection by parameter schema, as a pure module
A new `extensions/subagent-integration.ts` exports `detectSubagentAdapter(tools)` and `subagentParagraph(adapter)`, mirroring `interaction-channel.ts`. `tools` is the `pi.getAllTools()` result, filtered to names in `pi.getActiveTools()`. Rules, in this order:
1. An active tool named `Agent` with `subagent_type` and `prompt` → `tintinweb`.
2. An active tool named `subagent` with `agent` or `task` → `pi-subagents`.
3. An active tool named `subagent` with `subagent_type` and `prompt` → `gotgenes`.
4. Only `subagents_enable` active → `pi-subagents-helper` (enable, then re-evaluate next turn).
5. Otherwise → `none`.

`sourceInfo.source` breaks a tie when two tools share a name. When several spawn tools are active, the first rule that matches wins, which makes tintinweb primary. The `context` hook recomputes the paragraph each call, so lazily registered tools are picked up.

Detection by name alone was rejected, because `pi-subagents` and gotgenes both register `subagent`. Detection by `settings.json` packages was rejected, because it misses local and forked installs.

### D2. The paragraph carries mechanics, the reference carries policy
`routingNote()` appends a "Subagent integration: <adapter>." paragraph after the Interaction channel paragraph. Per adapter it states: the spawn call shape, how to list agents and inspect their tools, how to pass thinking, how to collect the report, how to wait, and how a child escalates to the parent and how the parent answers. `skills/references/subagent-routing.md` keeps policy only: role requirements, selection, handoff, authority, lanes and failures. It names no plugin; per-plugin smoke-tested builds live in `docs/architecture.md` ("Subagent compatibility") and `docs/e2e-checklist.md`, which the reference links to. For `none`, the paragraph says delegation is unavailable and the inline path applies.

### D3. Roles are requirement sets; selection is fail-closed
The reference defines six roles, each with: access (`read-only` or `writer`), required tools, required skills (with `coding-standards` optional as today), and report contract. The parent lists the available agents through the adapter and picks, per role, one whose evidence shows it meets the requirements. Evidence is the plugin's listing detail or the agent file frontmatter. Bundled agents get no precedence. The parent announces `role → agent` once per stage.

A read-only role only accepts an agent whose tool set is known and contains no edit or write tool; an unknown tool set does not qualify. When no agent qualifies, the parent reports the role and the missing requirement, and stops that lane under the existing failure rules. Without a subagent plugin, the inline fallback is unchanged.

### D4. One agent file per role, readable by both discovering plugins
Each `agents/*.md` sets `name: superspec.<role>` and drops `package:`. `pi-subagents` then builds runtime `superspec.<role>`, and tintinweb registers `superspec.<role>`: the same identity in both, with no collision with generic `scout` or `reviewer`.

Frontmatter carries both dialects' keys: `systemPromptMode` and `inheritProjectContext` for `pi-subagents`, and `prompt_mode: append` for tintinweb (`replace` would drop AGENTS.md, which the role contract requires). `tools` and `skills` are shared. `tools` lists built-in tools only (`read`, `grep`, `find`, `ls`, plus `bash`, `edit`, `write` where the role allows them). No plugin tool such as `contact_supervisor` is listed (see D10).

`package.json` declares both `pi-subagents.agents` and `pi.subagents.agents` as `["./agents"]`. Two dialect directories were rejected: they mean duplicate role text and drift. Public contract: the frontmatter key set and the manifest keys.

### D5. Task metadata format (schema v8)
- **Unit of work is a group.** A `tasks.md` group `## N. <name>` is what one implementer receives; its checkboxes `N.1`, `N.2`, … are done in order by that same agent. Work that should run independently is its own group, so groups are sized by independence, not by checkbox count.
- `tasks.md`: directly under each group heading, one line `Blocked by: none` or `Blocked by: 1, 3` naming group numbers only. It is not a checkbox, so progress parsing is unchanged.
- `plan.md`: plan `## Task N` implements exactly `tasks.md` group N (`— implements N`, listing the checkboxes it covers). Every `## Task N` block gets `**Difficulty:** Easy|Normal|Hard|Very Hard` and `**Blocked by:** none|Task M, …`. Plan dependencies may refine tasks.md: they can add edges, and they can drop an edge only with a stated reason.
- The plan reviewer checks that the metadata is present, that every reference exists, that the graph is acyclic, and that the plan's dependencies cover those in tasks.md.
- A legacy plan without metadata is read as each task blocked by the previous one, so it runs sequentially.

Public contract: both line formats. The wording stays harness-neutral.

### D6. Lanes
- **Scheduling.** The scheduling unit is the plan task (one group). A plan task is ready when every task it is blocked by is merged into `<change>`. One lane runs one whole group. Ready tasks whose `Files` sets overlap are not run together. At most 3 writer lanes run at once; a project rule in AGENTS.md or `config.yaml` may lower that.
- **Isolation.** Each writer lane gets a child worktree on branch `<change>--task-<N>`, cut from the current `<change>` HEAD. It is created through the same worktree mechanism apply already uses (Superpowers `using-git-worktrees`, which honours project tooling rules).
- **Review and merge.** The lane's implementer works in that worktree, and the task reviewer reviews the lane range. Only after the review passes does the parent merge the lane into `<change>` with `--no-ff`, in task-ID order among the lanes that are done, then remove the lane worktree.
- **Conflicts.** On a merge conflict, the parent aborts the merge, discards the lane, and re-queues the task to run alone on the new HEAD. A second conflict stops apply and asks the user.
- **Unchanged.** Read and review lanes may run in parallel without worktrees. The final whole-branch review still runs over the full `<change>` range.

A single shared worktree with file-disjoint parallel writers was rejected, because shared staging and commits break isolation.

### D7. Thinking from difficulty
Default mapping in the reference: Easy → `low`, Normal → `medium`, Hard → `high`, Very Hard → `xhigh`. It applies to implementer and task-reviewer dispatches for that task. Where the adapter has a thinking parameter (tintinweb, gotgenes), the parent passes it. On `pi-subagents`, thinking is only settable through a model suffix and model stays unpinned, so the paragraph says thinking is not passed there. Agent-file locks win, and the plugin reports them. Models are never set.

### D8. Report collection
On `pi-subagents`, the parent keeps binding `output` to a scratch path. On tintinweb and gotgenes, the parent collects the final result (inline, or via `get_subagent_result` with wait) and writes it to a scratch file before checking evidence. The evidence rules are unchanged; a missing section is still incomplete.

### D9. apply.md records lanes without changing finalize
`templates/apply.md` keeps the single `Commit range` over `<change>` (merges included), which finalize and the code review gate already read. A new `## Lanes` table lists each task's ID, lane branch, lane range, review verdict and merge commit, or the word `sequential`. Public contract: the Lanes table columns.

### D10. Plugin-neutral agent bodies; escalation comes from the handoff
Agent bodies name no plugin tool. Each body says: "When you need a decision, are blocked, or find the handoff ambiguous, use the escalation channel your handoff names and wait for the answer. If the handoff names none, stop, and put the question under Blockers in your report. Do not guess." The handoff contract in the routing reference gains an `escalation` field. The parent fills it from the Subagent integration paragraph:
- `pi-subagents`: call `contact_supervisor` with `reason: "need_decision"` and wait.
- `gotgenes`: call `ask_parent`, then end the turn. The parent answers with a resume.
- `tintinweb`: end the turn with the question under Blockers. The parent answers with `steer_subagent` or a resume.

The parent handles an escalation as a pending question, not as a completed report. The same rule covers skills: no skill text names a plugin tool or parameter; skills say "spawn", "collect the report", "answer an escalation" and point to the paragraph.

A tests-level guard checks that `agents/*.md` bodies and `skills/**` contain none of `contact_supervisor`, `subagents_enable`, `ask_parent`, `get_subagent_result`, `steer_subagent`, `Agent(` or `subagent(`. Those names may appear only in `extensions/subagent-integration.ts`. Rejected alternative: a per-plugin body variant per agent. It doubles the role text and drifts.

## Risks / Trade-offs

- [Escalation without a listed tool: if `pi-subagents` exposes `contact_supervisor` only when it appears in `tools`, removing it loses that channel] → Source shows the child tool is registered from launch metadata, not from `tools`, and the 0.84 smoke recorded ambient tools beyond `tools`. The e2e smoke confirms it, and the D10 fallback (stop and report under Blockers) keeps the role safe meanwhile.
- [One file, two dialects: either plugin might reject the other's keys] → Unit tests assert both key sets. The e2e matrix smoke-tests discovery on both plugins before release, and the docs say "inspected, not smoke-tested" until then.
- [The tintinweb `name` namespace is shared; another package could claim `superspec.*`] → Selection checks requirements, not names, so a foreign agent with that name must still qualify. Local files outrank package agents by design.
- [Fail-closed selection can leave gotgenes without a qualifying read-only agent] → The parent reports the missing requirement and the user decides: define an agent in `.pi/agents/`, or choose the inline route explicitly.
- [Parallel lanes raise merge conflicts and review load] → File-overlap exclusion, a lane cap, task-ID merge order and a sequential re-run on conflict.
- [Superpowers SDD assumes one sequential task loop and one ledger] → The parent owns scheduling and keeps one SDD ledger in the change worktree. Each lane follows SDD's per-task implement → review → fix loop, and Superpowers itself is not edited.
- [Detection misreads a future plugin version] → Schema-based rules fall back to `none`, so the workflow runs inline instead of dispatching a wrong call. Tests cover each rule.
- [Difficulty is subjective] → The plan reviewer checks it against the task's micro-steps. Difficulty only tunes effort; it never skips a review.

## Migration Plan

1. Ship schema v8 (instructions, templates, checksum fixture). Projects upgrade with `/opsx-init`. In-flight v7 changes keep working, because metadata-less plans run sequentially (D5).
2. Ship the agent frontmatter and manifest change. Existing `pi-subagents` users keep the same runtime names.
3. Ship detection and the paragraph, then the reference and skill rewrite. Rollback is a package downgrade, and nothing outside the package is written.

## Open Questions

- Whether tintinweb accepts `pi-subagents`-only frontmatter keys without skipping the agent file (frontmatter is configuration, not prompt, so keys from both dialects are allowed there).
- Exact tintinweb listing surface for an agent's tools (tool description versus agent file) to confirm during the e2e smoke. Until then, D3 reads the agent file frontmatter at the plugin's documented discovery paths.
