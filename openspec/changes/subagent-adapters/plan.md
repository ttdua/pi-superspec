# Subagent Adapters Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `design.md`.

**Goal:** Make delegation plugin-neutral, with a detected Subagent integration paragraph, requirement-selected roles, task-group metadata and parallel apply lanes.

**Architecture:** A pure module `extensions/subagent-integration.ts` detects the plugin from active tool schemas and renders one paragraph. The paragraph is appended to the routing note after the Interaction channel paragraph. All plugin tool names live only in that module and in the docs. Skills, the routing reference and agent bodies describe roles and functions. Schema v8 adds a group-level `Blocked by` to `tasks.md`, and `Difficulty` and `Blocked by` to `plan.md`.

**Tech Stack:** TypeScript (pi extension API: `context` hook, `getActiveTools`, `getAllTools`), Vitest, OpenSpec schema YAML and markdown templates, npm (`package-lock.json`).

## Global Constraints

- No runtime `dependencies`; host packages stay `peerDependencies` with `"*"` (package-manifest).
- Plugin tool and parameter names appear only in `extensions/subagent-integration.ts` and in docs. They never appear in `skills/**`, `prompts/**` or the bodies of `agents/*.md` (D10).
- The schema and templates stay harness-neutral: no `pi-subagents`, `rpiv-`, `AskUserQuestion`, `Skill tool` or `/opsx:` (bundled-schema "Harness-neutral wording").
- Any change under `schema/superspec/` bumps `version` and `x-pi-superspec.version` to 8 and records the digest in `tests/fixtures/schema-checksums.json`.
- `openspec/schemas/superspec/` is never edited.
- Repository content is in English; `README.vi.md` stays in sync with `README.md`.
- Test commands are `npm test` and `npm run typecheck`. Single file: `npx vitest run <file>`.
- Groups 1, 2 and 3 have disjoint files and may run in parallel. Group 4 shares `tests/extension.test.ts` with group 1, so it waits for it. Groups 6 and 7 have disjoint files and may run in parallel after group 5.
- Docs-reading assertions (`docs/usage-guide.md`, `docs/workflow.md`) stay unchanged until Task 8, which owns the docs.

## Review Focus

1. A pi build where `getAllTools` is missing, or returns tools without `parameters`, makes detection return `none` without throwing. Test: Task 1.
2. `parameters` given as a TypeBox object (keys under `properties`) and as a plain object are both read. Test: Task 1.
3. An MCP-prefixed tool name (`mcp__x__subagent`) matches by its `__<name>` suffix, like `hasTool` in `interaction-channel.ts`. Test: Task 1.
4. Legacy task metadata:
   - A `tasks.md` with old per-checkbox `- Blocked by:` lines, or with none, keeps its checkbox count. Test: Task 4.
   - A `plan.md` without `Blocked by` runs its tasks in plan order, one after another. When `plan.md` has metadata, it governs scheduling whatever `tasks.md` holds. Test: Task 6.
5. A lane whose implementer escalates on tintinweb (which has no escalation tool) is neither merged nor ticked while it waits. Test: Task 5 (reference) and Task 6 (apply).

---

## Contracts

| Name | new / modified | Shape | public |
|---|---|---|---|
| `SubagentAdapter` | new | `type SubagentAdapter = "tintinweb" \| "pi-subagents" \| "gotgenes" \| "pi-subagents-helper" \| "none"` (in `extensions/subagent-integration.ts`) | no |
| `SubagentToolInfo` | new | `interface SubagentToolInfo { name: string; parameters?: unknown; sourceInfo?: { source?: string; path?: string } }` | no |
| `paramKeys` | new | `paramKeys(parameters: unknown): Set<string>`; reads `properties` when it is an object, otherwise the object's own keys; anything else gives an empty set | no |
| `pickSpawnTool` | new | `pickSpawnTool(tools: readonly SubagentToolInfo[], adapter: SubagentAdapter): SubagentToolInfo \| undefined`; exported; prefers a tool whose `sourceInfo.source` contains the adapter's package name | no |
| `detectSubagentAdapter` | new | `detectSubagentAdapter(tools: readonly SubagentToolInfo[]): SubagentAdapter`; input is `getAllTools()` filtered to the active names. The pi-subagents rule requires `agent` or `task` and no `subagent_type` (changed in apply: a gotgenes-style tool with an extra `task` was misread) | no |
| `subagentParagraph` | new | `subagentParagraph(adapter: SubagentAdapter, toolName?: string): string`; first line `Subagent integration: <adapter>.`. Deviation (iteration 2): the optional `toolName` renames the spawn tool in the call shapes when it differs from the default; without it the output is unchanged | no |
| `resolveSubagentIntegration` | new | `resolveSubagentIntegration(tools: readonly SubagentToolInfo[]): { adapter: SubagentAdapter; tool?: SubagentToolInfo }`; detects in D1 order and picks the spawn tool via `pickSpawnTool` (provenance tie-break); `detectSubagentAdapter` delegates to it. Deviation (iteration 2): added to wire the tie-break into the runtime | no |
| `routingNote` | modified | `routingNote(language: string, channelText = "", subagentText = ""): string`; `subagentText` follows `channelText`, separated by a blank line; with `subagentText === ""` the output is identical to today | no |
| `createRoutingNoteMessage` | modified | `createRoutingNoteMessage(language: string, channelText = "", subagentText = ""): { role: "user"; content: { type: "text"; text: string }[]; timestamp: number }` | no |
| Agent frontmatter | modified | Shared keys: `name: superspec.<file stem>`, `description`, `advertise: false`, `systemPromptMode: replace`, `prompt_mode: append`, `defaultContext: fresh`, `inheritProjectContext: true`, `inheritGlobalContext: true`, `inheritSkills: false`, `defaultProgress: false`, `allowNestedSubagents: false`; no `package`, `model`, `thinking` or `output`. Per role, `tools` is today's list minus `contact_supervisor`, and `acceptanceRole` and `skills` are unchanged | yes |
| `package.json` agent discovery | modified | `"pi-subagents": { "agents": ["./agents"] }` and `"pi": { "extensions": ["./extensions/superspec.ts"], "subagents": { "agents": ["./agents"] } }` | yes |
| Routing reference role table | new | `## Roles` markdown table, columns `Role \| Access \| Required tools \| Skills \| Report`, one row per role: scout, spec reviewer, plan reviewer, implementer, task reviewer, verifier | no |
| Handoff field `escalation` | new | A handoff list item `escalation: <channel from the Subagent integration paragraph, or "none">` | no |
| `tasks.md` group dependency line | new | A line `Blocked by: none` or `Blocked by: <n>[, <n>]*` directly under each `## N. <name>` heading, before the checkboxes | yes |
| `plan.md` task metadata | new | Heading `## Task N: <name> — implements N`, then the lines `**Covers:** N.1, N.2, …`, `**Difficulty:** Easy\|Normal\|Hard\|Very Hard` and `**Blocked by:** none\|Task M[, Task M]*` | yes |
| `apply.md` Lanes section | new | A `## Lanes` table with columns `Task \| Lane branch \| Lane range \| Review \| Merge commit`; `Lane branch` is `<change>--task-<N>` or `sequential` | yes |
| Schema version | modified | `version: 8`, `x-pi-superspec: { version: 8 }` | yes |

---

## Task 1: Subagent integration paragraph — implements 1

**Covers:** 1.1, 1.2, 1.3
**Difficulty:** Hard
**Blocked by:** none

**Files:**
- Create: `extensions/subagent-integration.ts`, `tests/subagent-integration.test.ts`
- Modify: `extensions/routing-note.ts`, `extensions/superspec.ts` (the `context` handler)
- Test: `tests/routing-note.test.ts`, `tests/extension.test.ts` (the "interaction channel wiring" describe and the routing-note equality expectations)

**Interfaces:**
- Produces: `SubagentAdapter`, `SubagentToolInfo`, `paramKeys`, `pickSpawnTool`, `detectSubagentAdapter`, `subagentParagraph`, and the modified `routingNote` and `createRoutingNoteMessage` (see Contracts).

**Note on refresh:** the `context` hook works on a deep copy and does not persist what it returns (pi docs: "Modify messages non-destructively"). Session messages therefore never contain the note, and every LLM call rebuilds it from the current active tools. That is how a lazily registered tool gets picked up. The existing test "does not add a second note after the channel changes" stays unchanged.

- [ ] **Step 1 (1.1): Write the failing detection tests** in `tests/subagent-integration.test.ts`. A local test helper `tool(name, keys, source?)` returns `{ name, parameters: { type: "object", properties: Object.fromEntries(keys.map((k) => [k, {}])) }, sourceInfo: source ? { source } : undefined }`. One `it` per scenario name:
  - "tintinweb detected": `[tool("Agent", ["subagent_type", "prompt"])]` returns `"tintinweb"`.
  - "pi-subagents detected": `[tool("subagent", ["agent", "task"])]` returns `"pi-subagents"`.
  - "gotgenes detected by schema, not name": `[tool("subagent", ["subagent_type", "prompt"])]` returns `"gotgenes"`.
  - "Helper only": `[{ name: "subagents_enable" }]` returns `"pi-subagents-helper"`.
  - "Several plugins active": tintinweb plus pi-subagents tools return `"tintinweb"`.
  - "Nothing detected": `[]` returns `"none"`.
  - "Same name, schema decides": both `subagent` schemas together return `"pi-subagents"`.
  - "Same name and schema, provenance decides": two `subagent[agent,task]` tools with sources `"local"` and `"npm:pi-subagents"`. Detection returns `"pi-subagents"`, and `pickSpawnTool(tools, "pi-subagents")?.sourceInfo?.source` is `"npm:pi-subagents"`.
  - "No side effects": the module source contains no `node:fs` import, and a frozen input array is accepted.
  - Review Focus 1–3:
    - a tool without `parameters` gives `"none"`;
    - `{ name: "subagent", parameters: { agent: {}, task: {} } }` gives `"pi-subagents"`;
    - `tool("mcp__x__subagent", ["agent", "task"])` gives `"pi-subagents"`.
- [ ] **Step 2:** Run `npx vitest run tests/subagent-integration.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `paramKeys`, `pickSpawnTool` and `detectSubagentAdapter`** in the D1 order. Name matching is `name === n || name.endsWith("__" + n)`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5 (1.2): Write the failing paragraph tests**, one `it` per scenario name:
  - "Paragraph per adapter": for each of `tintinweb`, `pi-subagents` and `gotgenes`, the text starts with `Subagent integration: <adapter>.` and matches `/spawn/i`, `/list/i`, `/thinking/i`, `/report/i`, `/wait/i` and `/escalat/i`.
  - "Thinking on pi-subagents": the `pi-subagents` text matches `/no thinking level/i`.
  - "Report collection per adapter":
    - the `pi-subagents` text matches `/output[^.]*scratch/i`;
    - the `tintinweb` and `gotgenes` texts match `/scratch file[^.]*before[^.]*evidence/i`;
    - the `tintinweb` text contains `get_subagent_result`.
  - "Escalation channels":
    - `pi-subagents` contains `contact_supervisor`;
    - `gotgenes` contains `ask_parent` and `resume`;
    - `tintinweb` matches `/Blockers/` and contains `steer_subagent` and `resume`.
  - "Helper activation": the `pi-subagents-helper` text contains `subagents_enable` and matches `/next turn/i`.
  - "Unavailable delegation": the `none` text matches `/unavailable/i` and `/inline/i`, and does not match `/Agent\(|subagent\(|contact_supervisor/`.
  - "gotgenes has no bundled agents": the `gotgenes` text matches `/no bundled agents/i`.
  - "Pure functions": two calls with the same adapter return identical strings.
- [ ] **Step 6:** Run. Expected: FAIL.
- [ ] **Step 7: Implement `subagentParagraph`** as a `Record<SubagentAdapter, string>` of fixed texts with the D1, D2, D7, D8 and D10 mechanics.
  - **`pi-subagents`:**
    - Spawn: `subagent({ agent, task, cwd, context: "fresh", output })`.
    - Agents: listed with the tool's documented management action; read the tool's own guide before using it.
    - Thinking: no per-call thinking level.
    - Escalation: the child calls `contact_supervisor` with `reason: "need_decision"`, and the parent replies on the supervisor channel.
  - **`tintinweb`:**
    - Spawn: `Agent({ subagent_type, prompt, description, run_in_background, thinking })`.
    - Agents: listed in the `Agent` tool description.
    - Report: collect with `get_subagent_result({ agent_id, wait: true })`, then write it to a scratch file before checking evidence.
    - Escalation: the child ends its turn with the question under Blockers. The parent answers with `steer_subagent` while the child runs, or `Agent({ resume, prompt })` after it ends.
  - **`gotgenes`:**
    - Same as tintinweb, but the tool is named `subagent`.
    - Escalation: the child calls `ask_parent`, and the parent answers with `subagent({ resume, prompt })`.
    - The paragraph states "no bundled agents".
- [ ] **Step 8:** Run. Expected: PASS.
- [ ] **Step 9 (1.3): Write the failing wiring tests.**
  - `tests/routing-note.test.ts`:
    - `routingNote("en", "C", "S").endsWith("\n\nC\n\nS")`;
    - `routingNote("en", "C")` equals the current output;
    - "Paragraphs present" and "Subagent paragraph last": with real paragraphs, the index of `Subagent integration:` is greater than the index of `Interaction channel:`.
  - `tests/extension.test.ts`:
    - "Lazily registered tool": `setup({ getActiveTools: () => sets.shift(), getAllTools: () => [tool("Agent", ["subagent_type", "prompt"])] })` with `sets = [[], ["Agent"]]`. Two `note()` calls, each from `[BOOTSTRAP, PROMPT]`, contain `Subagent integration: none.` and then `Subagent integration: tintinweb.`.
    - Without `getAllTools`, the note contains `Subagent integration: none.`.
    - Change all five routing-note equality expectations (the `toBe(routingNote(...))` cases, including "names en for an invalid on-disk language") to pass `subagentParagraph("none")` as the third argument.
- [ ] **Step 10:** Run `npx vitest run tests/routing-note.test.ts tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 11: Implement the wiring.**
  - Add the `subagentText` parameter to `routingNote` and `createRoutingNoteMessage`.
  - In the `context` handler:
    - `const active = getActiveTools()` (existing);
    - `const all = typeof pi.getAllTools === "function" ? pi.getAllTools() : []`;
    - `const tools = all.filter((t) => active.includes(t.name))`;
    - pass `subagentParagraph(detectSubagentAdapter(tools))`.
- [ ] **Step 12:** Run `npm test` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 13:** Commit `feat: detect subagent plugin and inject integration paragraph`.

## Task 2: Bundled agents — implements 2

**Covers:** 2.1, 2.2, 2.3
**Difficulty:** Normal
**Blocked by:** none

**Files:**
- Modify: the six `agents/*.md`
- Test: `tests/agents.test.ts`

**Interfaces:**
- Produces: the Agent frontmatter contract.

- [ ] **Step 1 (2.3): Update `tests/agents.test.ts`.**
  - "Catalog identities" and "Same identity across plugins": in `SA-A01`, each file's `frontmatter.name === "superspec." + stem` and `frontmatter.package === undefined`.
  - "Both dialects present": in `SA-A02`, `prompt_mode === "append"` and `advertise === false`.
  - "Built-in tools only": in `SA-A02`, remove `contact_supervisor` from every `TOOLS` entry. Every tool must be in `["read","grep","find","ls","bash","edit","write"]`.
  - Remove `expect(body).toMatch(/contact_supervisor/)` from the scout test "is evidence-only and inspection-only" and from the implementer test "escalates and refuses publication…". Replace it in both with `expect(body).toMatch(/escalation channel[^.]*handoff/i)`.
  - Keep `expect(escalation).toMatch(/except[^.]*`coding-standards`/)` in "implementer applies the coding standard at refactor".
  - New "No plugin tool names": no body matches `/contact_supervisor|subagents_enable|ask_parent|notify_parent|get_subagent_result|steer_subagent|Agent\(|subagent\(/`.
  - New "Escalation from the handoff": every body matches `/escalation channel[^.]*handoff/i` and `/Blockers/`.
  - New "Plan reviewer checks task metadata", covering bundled-schema "Dropped without a reason": the plan-reviewer body matches `/Difficulty/`, `/Blocked by/`, `/cycle/i` and `/tasks\.md[^.]*dependenc[^.]*reason/i`.
- [ ] **Step 2:** Run `npx vitest run tests/agents.test.ts`. Expected: FAIL.
- [ ] **Step 3 (2.1):** Edit the frontmatter of all six files to the contract.
- [ ] **Step 4 (2.2): Replace each escalation sentence** with: "When you need a decision, are blocked, or find the handoff ambiguous or contradictory, use the escalation channel your handoff names and wait for the answer. If the handoff names none, stop and put the question under Blockers in your report. Do not guess." In `implementer.md`, keep its existing list of escalation causes, including the `coding-standards` exception, and change only the channel wording. Add a plan-reviewer checklist item: every plan task has `Difficulty` (one of the four values) and `Blocked by`; every reference exists; there is no cycle; the `tasks.md` group dependencies are carried over, or a reason is stated for dropping one.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(agents): plugin-neutral bodies and dual-dialect frontmatter`.

## Task 3: Package manifest — implements 3

**Covers:** 3.1
**Difficulty:** Easy
**Blocked by:** none

**Files:**
- Modify: `package.json`
- Test: `tests/manifest.test.ts`

- [ ] **Step 1: Update `tests/manifest.test.ts`.**
  - "Extensions only": in "declares extensions only in the pi block", `Object.keys(pkg.pi).sort()` equals `["extensions", "subagents"]`, and `pi.extensions` equals `["./extensions/superspec.ts"]`.
  - "Both discovery keys" and "Optional discovery metadata": in `SA-M01`, `pkg["pi-subagents"].agents` and `pkg.pi.subagents.agents` both equal `["./agents"]`.
  - New "Metadata added only": `pkg.scripts` equals `{ test: "vitest run", typecheck: "tsc --noEmit" }`, `pkg.dependencies` is undefined, and `pkg.files` equals `["extensions","skills","prompts","schema","agents"]`.
- [ ] **Step 2:** Run `npx vitest run tests/manifest.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Add `"subagents": { "agents": ["./agents"] }` inside `pi`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(manifest): declare package agents for tintinweb discovery`.

## Task 4: Bundled schema v8 — implements 4

**Covers:** 4.1, 4.2, 4.3, 4.4
**Difficulty:** Hard
**Blocked by:** Task 1 (shares `tests/extension.test.ts`)

**Files:**
- Modify: `schema/superspec/schema.yaml` (the `tasks`, `plan` and `apply` instructions; `version`; the marker)
- Modify: `schema/superspec/templates/tasks.md`, `templates/plan.md`, `templates/apply.md`
- Modify: `tests/fixtures/schema-checksums.json`
- Test: `tests/schema.test.ts`, `tests/init/init.test.ts`, `tests/init/schema-install.test.ts`, `tests/extension.test.ts` ("schema notice" describe only)

- [ ] **Step 1 (4.1): Write the failing tests for the tasks metadata** in `tests/schema.test.ts`:
  - "Instruction states the unit": the `tasks` instruction matches `/group[^.]*unit[^.]*one agent/i` and `/independent[^.]*own group/i`.
  - "Group references only": it matches `/Blocked by[^.]*group numbers/i`.
  - "Template shows the line": in `templates/tasks.md`, each `^## \d+\.` line is followed (after at most one blank line) by `^Blocked by: `, and no `- [ ]` line is followed by a `Blocked by` line.
  - "Progress unaffected" and Review Focus 4: write three `tasks.md` variants into a temp project's change directory: template-filled, legacy per-checkbox `  - Blocked by:` lines, and no metadata. For each, `openspec instructions apply --change x --json` gives `progress.total` equal to the number of `- [ ]` lines.
- [ ] **Step 2 (4.2): Write the failing tests for the plan metadata.**
  - Change "plan instruction carries the handoff, ID, scenario and spec rules" to expect `Every plan task names the tasks.md group it implements (e.g. \`Task 3 — implements 3\`)`.
  - Change "plan template does not pre-select an executor" to expect `/^## Task 1: .*implements N$/m`.
  - "Template has the fields": `templates/plan.md` contains `**Covers:**`, `**Difficulty:**` and `**Blocked by:**`.
  - "Instruction requires the fields": the `plan` instruction contains `Easy`, `Normal`, `Hard` and `Very Hard`.
  - "Dropped dependency needs a reason": the `plan` instruction matches `/carry[^.]*tasks\.md[^.]*dependenc[^.]*reason/i`.
  - "Harness-neutral metadata text": the existing forbidden-name test already covers the whole schema.
- [ ] **Step 3 (4.3): Write the failing tests for apply.**
  - "Parallel rule present": the `apply` instruction matches `/one writer per worktree/i`, `/merged? (back )?after[^.]*review/i` and `/without dependency metadata[^.]*one after another/i`.
  - Change "apply ticks tasks.md as official status…" to expect `When a plan task's review passes, tick the tasks.md boxes of its group. tasks.md is the official status; the executor's ledger is for recovery only.`
  - "Lanes section" and "Template fields": `templates/apply.md` has `## Lanes` and the five column names. The "Deviations section" test stays.
  - "Lanes table": the `apply` instruction matches `/Lanes[^.]*each (plan )?task/i` and `/commit range[^.]*(covers|including)[^.]*merge/i`.
- [ ] **Step 4:** Run `npx vitest run tests/schema.test.ts`. Expected: FAIL.
- [ ] **Step 5:** Edit the three instructions and the three templates to the contracts.
- [ ] **Step 6 (4.4): Make the version-sensitive tests version-relative.**
  - In `tests/init/init.test.ts`, define `const V = bundledVersion()` (read `version:` from `schema/superspec/schema.yaml`).
    - `newer()` writes `V + 1`.
    - Replace `"upgraded from v6 to v7"` with `` `upgraded from v6 to v${V}` ``, `/^v7-/` with `` new RegExp(`^v${V}-`) ``, and `"downgraded from v8 to v7"` with `` `downgraded from v${V + 1} to v${V}` ``.
  - In `tests/init/schema-install.test.ts`, use the same `V`:
    - every fixture meant to be newer ("newer for a v8 marker", the `"newer"` case in "classification writes nothing", and the `"newer"` install fixture) writes `V + 1`;
    - `lock.schemaVersion` is expected to equal `V`;
    - the replacement result is expected to be `{ from: 6, to: V }`.
    - Literal `v7` labels passed only as `backupPath` inputs, `versionLabel(7)` and the historical checksum key `"7"` stay.
  - In the `tests/extension.test.ts` "schema notice" test, change `toContain("v7")` to `` toContain(`v${V}`) ``.
  - Then set `version: 8` and the marker.
  - Run `npx vitest run tests/schema-version-pin.test.ts`, copy the printed digest into `tests/fixtures/schema-checksums.json` under `"8"`, and rerun.
  - "Identity fields": `tests/schema.test.ts` expects `version: 8`.
  - "No artifact ID changes": the artifact IDs equal the nine IDs of version 7.
- [ ] **Step 7:** Run `npm test` and `npm run typecheck`. Expected: PASS, including "Validates in a temp project".
- [ ] **Step 8:** Commit `feat(schema): v8 task groups, difficulty, dependencies and lanes`.

## Task 5: Shared routing reference — implements 5

**Covers:** 5.1, 5.2
**Difficulty:** Hard
**Blocked by:** Task 1

**Files:**
- Modify: `skills/references/subagent-routing.md`
- Test: `tests/subagent-routing.test.ts`

**Interfaces:**
- Consumes: the adapter names from Task 1, referred to only as "the Subagent integration paragraph".
- Produces: the Routing reference role table, the Handoff field `escalation`, and the section names `Roles`, `Availability`, `Selection`, `Handoff`, `Lanes`, `Authority`, `Failures`, `Compatibility`. Tasks 6 and 7 cite these sections.

- [ ] **Step 1 (5.2): Rewrite `tests/subagent-routing.test.ts`.**
  - Update `section()` to the new section names.
  - Replace the SA-R01 and SA-R05 assertions that pin `subagents_enable`, `agent: "superspec.`, `output:` and "installed pi-subagents guidance".
  - Add one `it` per scenario name, each scoped to the named section:
    - "Plugin-neutral reference" (whole file): no match for `/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|ask_parent|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./`.
    - "Role requirements listed" (Roles): the header row is `Role | Access | Required tools | Skills | Report`, with six rows. Scout, spec reviewer, plan reviewer, task reviewer and verifier are `read-only`; the implementer is `writer`.
    - "Lazy tool activation" (Availability): `/Subagent integration paragraph[^.]*activat[^.]*next (model )?turn/i` and `/list[^.]*agents[^.]*before[^.]*dispatch/i`.
    - "Optional integration absent" (Availability): `/unavailable[^.]*inline/i` and `/announce/i`.
    - "Selection by requirements" (Selection): `/no precedence/i`, `/announce[^.]*(chosen|agent)/i`.
    - "Disabled or incompatible agent" (Selection): `/known tool set[^.]*no (edit|write)/i`, `/report[^.]*role[^.]*missing requirement/i`, `/stop/i` and `/(no|never|without)[^.]*(settings|bypass)/i`.
    - "Optional skill missing" (Availability): keep the SA-R09 assertions.
    - "Recoverable bounded handoff" (Handoff): the existing field list minus `` `output` ``, plus `/escalation/i`.
    - "Report kept as scratch artifact" (Handoff): `/scratch/i` and `/write[^.]*itself/i`.
    - "Escalation answered" and Review Focus 5 (Handoff): `/escalat[^.]*(waiting|not[^.]*complete)/i`, `/not (merge|tick)/i` and `/answer[^.]*(paragraph's answer mechanism|as the paragraph describes)[^.]*or ask the user/i`.
    - "Incomplete report" and "Failed child lane" (Failures): keep SA-R04 and SA-R06.
    - "One review seat and one writer" and "Report is not authority" (Authority): keep SA-R07 and SA-R08. From SA-R07, drop the model rule and the `wakes the parent` and `bg_wait` assertions. Replace them with `/wait[^.]*as the Subagent integration paragraph describes/i` and `/(no|do not)[^.]*(short )?poll/i`.
    - "Parallel writers isolated" (Authority): `/one implementation writer per worktree/i` and `/separate worktrees?/i`.
  - Lanes section, one `it` per parallel-apply-lanes scenario:
    - "Independent tasks ready together" and "Blocked task waits": `/ready[^.]*every[^.]*Blocked by[^.]*merged/i`.
    - "One lane per group": `/one lane[^.]*(whole )?(task )?group/i`, `/same (implementer|agent)[^.]*in order/i` and `/(not|never)[^.]*separate lanes/i`.
    - "Overlapping files": `/files overlap[^.]*(not|never)[^.]*same time/i`.
    - "Two parallel writers": `/own (child )?worktree[^.]*<change-name>--task-<N>/`.
    - "Lane cap": `/at most three writer lanes/i`.
    - "Review gates the merge": `/merge[^.]*only after[^.]*review/i`.
    - "Final review covers merges": `/final whole-branch review[^.]*merges/i`.
    - "Conflict re-run": `/abort[^.]*merge[^.]*alone[^.]*new HEAD/i`.
    - "Second conflict": `/second conflict[^.]*(stop|ask)/i`.
    - "Hard task": the table rows `Easy | low`, `Normal | medium`, `Hard | high`, `Very Hard | xhigh`, plus `/implementer and (the )?task reviewer/i` and `/no model/i`.
    - "Adapter without per-call thinking": `/paragraph says[^.]*no thinking[^.]*(pass|send) none/i`.
    - "Legacy plan" (Review Focus 4): `/without[^.]*Blocked by[^.]*one after another/i` and `/plan[^.]*governs/i`.
  - Compatibility: keep "documents compatibility truthfully", reworded to check for a link to `docs/architecture.md` and `docs/e2e-checklist.md`. The `architecture compatibility note` describe reads `docs/architecture.md`, so Task 8 owns it and Task 5 leaves it unchanged.
- [ ] **Step 2:** Run `npx vitest run tests/subagent-routing.test.ts`. Expected: FAIL.
- [ ] **Step 3 (5.1): Rewrite the reference** with the eight sections and the role table. Keep the current Authority and Failures wording wherever it does not name a plugin. Move the inspected-build note to `Compatibility` as links only.
- [ ] **Step 4:** Run `npx vitest run tests/subagent-routing.test.ts`. Expected: PASS. Then run `npm test`; the only failures allowed are in skill tests that still assert `superspec.*` (owned by Tasks 6 and 7).
- [ ] **Step 5:** Commit `feat(skills): plugin-neutral shared routing reference with roles and lanes`.

## Task 6: Execution skills — implements 6

**Covers:** 6.1, 6.2, 6.3
**Difficulty:** Hard
**Blocked by:** Task 5

**Files:**
- Modify: `skills/opsx-apply/SKILL.md`, `skills/opsx-verify/SKILL.md`
- Test: `tests/execution-commands.test.ts` (SA-E01 to SA-E07 and the apply executor test; the usage-guide test is left to Task 8)

- [ ] **Step 1 (6.3): Update the tests.**
  - "With pi-subagents" and "Unusable delegated executor":
    - SA-E01 expects `implementer role`, `task reviewer role`, `/one combined spec[^\n]*quality[^\n]*task reviewer role/i` and `/final whole-branch[^.\n]*task reviewer role/i`.
    - SA-E03 expects `/no available agent meets[^.]*stop/i` and `/(no|never)[^.]*(generic replacement|silently go inline)/i`.
  - "Without pi-subagents": SA-E02 expects `/Subagent integration paragraph[^.]*unavailable[^.]*executing-plans/i` and keeps `/never invent subagent calls/i`.
  - Verify scenarios:
    - "Fresh delegated evidence": SA-E04 expects `verifier role`.
    - "Failing or missing evidence" and "Inline verify fallback": SA-E05 to SA-E07 are unchanged.
  - New "Delegation through the paragraph": for each of `opsx-apply`, `opsx-verify`, `opsx-sync` and `opsx-archive`, the skill and prompt match neither `/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./`, nor any delegating skill text other than `Subagent integration paragraph`.
  - New apply lanes tests:
    - `/one lane per plan task/i`;
    - `/Lanes/`;
    - `/merge[^.]*after[^.]*review/i`;
    - Review Focus 4: `/without[^.]*Blocked by[^.]*one after another/i`;
    - Review Focus 5: `/escalat[^.]*(neither|not)[^.]*(merge|tick)/i`.
- [ ] **Step 2:** Run `npx vitest run tests/execution-commands.test.ts`. Expected: FAIL.
- [ ] **Step 3 (6.1): Edit step 5 of `opsx-apply`.**
  - Choose the executor through the paragraph.
  - Select agents for the implementer and task reviewer roles, and announce them.
  - Schedule plan tasks per the reference's `Lanes` section, one lane per plan task.
  - An escalated lane waits.
  - Record `## Lanes`.
  - Remove `pi-subagents`, "the `subagent` tool" and `superspec.*`.
- [ ] **Step 4 (6.2): Edit `opsx-verify`'s delegated-evidence paragraph** to say "an agent meeting the verifier role" and to delegate "as the Subagent integration paragraph describes".
- [ ] **Step 5:** Run `npx vitest run tests/execution-commands.test.ts`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(skills): apply and verify select agents by role and run lanes`.

## Task 7: Planning and bootstrap skills — implements 7

**Covers:** 7.1, 7.2, 7.3
**Difficulty:** Normal
**Blocked by:** Task 5

**Files:**
- Modify: `skills/opsx-continue/SKILL.md`, `skills/opsx-ff/SKILL.md`, `skills/opsx-explore/SKILL.md`, `skills/opsx-generate-specs/SKILL.md`
- Test: `tests/planning-commands.test.ts` (SA-P01 to SA-P06 and the consumer-link test; the workflow-doc test is left to Task 8), `tests/generate-specs-command.test.ts`

- [ ] **Step 1 (7.3): Update the tests.**
  - planning-commands:
    - "Explore with repository recon": SA-P01 expects `scout role`.
    - "Continue reviews one artifact": SA-P03 expects `spec reviewer role` and `plan reviewer role`.
    - "Fast-forward retains two planned stops": SA-P04 expects the same two roles.
    - "Continue passes main specs" and "Fast-forward passes main specs": SA-P06 expects `spec reviewer`.
    - "Small conceptual question", "Planning review without subagents" and "Inline check uses the baseline": SA-P02 and SA-P05 are unchanged.
  - generate-specs-command:
    - "states the required rules and values": replace the needle `pi-subagents` with `Subagent integration paragraph`.
    - "Map respects configured model": SA-G02 expects `scout role` and keeps the no-model/thinking assertions.
    - "With pi-subagents": SA-G04 expects `/one evidence-only scout per confirmed capability[^.\n]*missing/i` and `/collect[^.]*report/i` instead of `` `output` ``.
    - "Format validates": SA-G12 searches for `spec reviewer role`.
    - "Without pi-subagents" and "Interrupted generation": SA-G05 and SA-G06 are unchanged.
  - New "Delegation through the paragraph" and "Skills name roles": `opsx-continue`, `opsx-ff`, `opsx-explore`, `opsx-generate-specs` and their prompts do not match the forbidden-name regex of Task 6.
- [ ] **Step 2:** Run `npx vitest run tests/planning-commands.test.ts tests/generate-specs-command.test.ts`. Expected: FAIL.
- [ ] **Step 3 (7.1, 7.2): Edit the four skills.** Replace each `superspec.<role>` with "an agent meeting the <role> role". Replace each plugin mechanic with "as the Subagent integration paragraph describes", and replace the `output` binding with "collect the report as the paragraph describes".
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat(skills): planning and bootstrap skills delegate by role`.

## Task 8: Documentation and release checks — implements 8

**Covers:** 8.1, 8.2, 8.3, 8.4
**Difficulty:** Normal
**Blocked by:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- Modify: `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md`, `docs/glossary.md`, `docs/usage-guide.md`, `docs/e2e-checklist.md`, `README.md`, `README.vi.md`, `CHANGELOG.md`
- Create: `tests/docs-subagents.test.ts`, `tests/plugin-neutral.test.ts`
- Test: `tests/project-readme.test.ts`, the usage-guide test in `tests/execution-commands.test.ts`, the workflow-doc test in `tests/planning-commands.test.ts`, the `architecture compatibility note` describe in `tests/subagent-routing.test.ts`

- [ ] **Step 1: Write the failing tests.**
  - `tests/project-readme.test.ts`:
    - New "Required install commands present": the install section of `README.md` contains `brew install openspec`, `pi install git:github.com/obra/superpowers` and `pi install https://github.com/ttdua/pi-superspec`, in that order.
    - New "Optional packages explained" and "Subagent plugin support stated": both READMEs name `@tintinweb/pi-subagents`, `pi-subagents` and `@gotgenes/pi-subagents`. `README.md` matches `/gotgenes[^\n]*own agents/i`, and `README.vi.md` matches `/gotgenes[^\n]*agent (riêng|của nó)/i`.
    - "Coding standard skill explained": the existing test stays.
  - `tests/docs-subagents.test.ts`:
    - "Both executors described" and "Parallel lanes described": the usage guide matches `/executing-plans/`, `/Blocked by/`, `/Difficulty/`, `/lane/i`, `/worktree/i` and `/Very Hard[^\n]*xhigh/`.
    - "Bootstrap path covered": it matches `/scouts?[^.]*(detected|subagent plugin)/i` and names `openspec/changes/bootstrap-specs/`.
    - "Inferred label explained": it matches `/Confidence: inferred[^.]*review/i`.
    - "Both runs covered", "gotgenes smoke", "Parallel lanes observed" and "Expected results stated", over `docs/e2e-checklist.md`:
      - there are run headings for `@tintinweb/pi-subagents`, `pi-subagents` and "without a subagent plugin";
      - a `@gotgenes/pi-subagents` section names `ask_parent` and `resume`;
      - the tintinweb run mentions `## Lanes`;
      - every `- [ ]` item contains `Expected:`.
    - Architecture: the "Subagent compatibility" section names all three plugins, each followed by `inspected` or `smoke-tested`.
  - In `tests/subagent-routing.test.ts`, replace "records the inspected reference build without a proven minimum" with per-plugin rows:
    - the `pi-subagents` row contains `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c` and `smoke-tested`;
    - the `@tintinweb/pi-subagents` row contains `50460b5df6934c4237983a504808a04ee0f8a0a0` and `inspected`;
    - the `@gotgenes/pi-subagents` row contains `25.0.5` and `inspected`;
    - the section still contains `not a proven minimum`.
  - Update the usage-guide test in `execution-commands.test.ts` and the workflow-doc test in `planning-commands.test.ts`: expect role names, and allow the `superspec.*` names only as "bundled candidates".
  - `tests/plugin-neutral.test.ts` (8.4): for every file under `skills/**` and `prompts/**`, and for the bodies of `agents/*.md`, no match for `/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|ask_parent|notify_parent|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(/`. `skills/**` also has no `superspec\.` match.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3 (8.1–8.3): Edit the docs.**
  - **Architecture:**
    - Replace the tool-mapping rows with "Subagent integration paragraph (detected)".
    - Add a compatibility table with full SHAs and the note "not a proven minimum": `pi-subagents` 0.84.0 `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`, smoke-tested for the cases listed in the e2e checklist; `@tintinweb/pi-subagents` `50460b5df6934c4237983a504808a04ee0f8a0a0`, inspected; `@gotgenes/pi-subagents` 25.0.5 `52854c12d590142e61a4f6a6947be9084035300d`, inspected.
  - **Workflow:** steps 5–7, with the specialist seats described as roles.
  - **Domain model:** task group, `Blocked by`, `Difficulty`, lanes and the Lanes table.
  - **Glossary:** Subagent integration paragraph, role, lane.
  - **READMEs (both):** optional packages.
  - **Usage guide:** executor variants, groups and lanes, and bootstrap scouts.
  - **E2E checklist:** three runs, the gotgenes smoke and the lanes observation.
  - **`CHANGELOG.md`:** an Unreleased entry.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck` and `openspec validate subagent-adapters --strict`. Expected: all PASS.
- [ ] **Step 5:** Commit `docs: subagent adapters, roles and parallel lanes`.

---

## Scenario → test

- **subagent-integration-paragraph**
  - In `tests/subagent-integration.test.ts` (Task 1, Step 1): tintinweb detected; pi-subagents detected; gotgenes detected by schema, not name; Helper only; Several plugins active; Nothing detected; Same name, schema decides; Same name and schema, provenance decides; No side effects.
  - In `tests/extension.test.ts` (Task 1, Step 9): Lazily registered tool.
  - In `tests/subagent-integration.test.ts` (Task 1, Step 5): Paragraph per adapter; Thinking on pi-subagents; Report collection per adapter; Escalation channels; Helper activation; Unavailable delegation; gotgenes has no bundled agents; Pure functions.
- **routing-note**
  - Existing tests in `tests/routing-note.test.ts` and `tests/extension.test.ts`: Note text; Path stated; Specified behaviour confirmed; No forced change; No enforcement.
  - In `tests/routing-note.test.ts` (Task 1, Step 9): Paragraphs present; Subagent paragraph last.
- **workflow-agents**
  - In `tests/agents.test.ts` (Task 2): Catalog identities; Same identity across plugins; Built-in tools only; Both dialects present; No plugin tool names; Escalation from the handoff; Plan reviewer checks task metadata.
  - Existing tests in `tests/agents.test.ts`: Bounded child context; Evidence-only scout; Independent reviewer; Task reviewer reviews structure; Plan reviewer checks decomposition; No numeric thresholds.
  - In `tests/plugin-neutral.test.ts` (Task 8): Skills name roles.
- **package-manifest**
  - In `tests/manifest.test.ts` (Task 3): Extensions only; Package keyword; Optional discovery metadata; Both discovery keys.
- **release-metadata**
  - In `tests/manifest.test.ts` (Task 3): Metadata added only.
  - In `tests/docs-subagents.test.ts` (Task 8): Both runs covered; gotgenes smoke; Parallel lanes observed; Expected results stated.
- **bundled-schema**
  - In `tests/schema.test.ts` (Task 4): Identity fields; Validates in a temp project; Upstream credit; No artifact ID changes; Template fields; Deviations section; Lanes section; Instruction states the unit; Template shows the line; Group references only; Progress unaffected; Template has the fields; Instruction requires the fields; Harness-neutral metadata text; Dropped dependency needs a reason; Parallel rule present.
  - In `tests/agents.test.ts`, test "Plan reviewer checks task metadata" (Task 2): Dropped without a reason.
- **subagent-routing**
  - In `tests/subagent-routing.test.ts` (Task 5), section-scoped: Integration policy loaded; Plugin-neutral reference; Role requirements listed; Lazy tool activation; Optional integration absent; Selection by requirements; Disabled or incompatible agent; Failed child lane; Optional skill missing; Recoverable bounded handoff; Report kept as scratch artifact; Escalation answered; Incomplete report; One review seat and one writer; Parallel writers isolated; Report is not authority.
- **parallel-apply-lanes**
  - In `tests/subagent-routing.test.ts` (Task 5), Lanes section: Independent tasks ready together; Blocked task waits; One lane per group; Legacy plan; Overlapping files; Two parallel writers; Lane cap; Review gates the merge; Final review covers merges; Conflict re-run; Second conflict; Hard task; Adapter without per-call thinking.
  - In `tests/execution-commands.test.ts` (Task 6): the apply lanes tests.
  - In `tests/schema.test.ts` (Task 4), via the template columns plus the apply instruction's per-task Lanes and covering commit range, and in `tests/docs-subagents.test.ts` (Task 8): Lanes table.
- **execution-commands**
  - Existing tests in `tests/execution-commands.test.ts`: Forbidden names absent; Ask fallback.
  - In `tests/execution-commands.test.ts` (Task 6): Delegation through the paragraph; With pi-subagents; Without pi-subagents; Unusable delegated executor; Fresh delegated evidence; Failing or missing evidence; Inline verify fallback.
- **planning-commands**
  - In `tests/planning-commands.test.ts` (Task 7): Explore with repository recon; Small conceptual question; Continue reviews one artifact; Fast-forward retains two planned stops; Planning review without subagents; Continue passes main specs; Fast-forward passes main specs; Inline check uses the baseline.
- **generate-specs-command**
  - In `tests/generate-specs-command.test.ts` (Task 7): Forbidden names absent; Ask fallback; Delegation through the paragraph; Map respects configured model; With pi-subagents; Without pi-subagents; Format validates.
  - Existing tests in `tests/generate-specs-command.test.ts`: Evidence on every requirement; Evidence content; Inferred label; Observable behaviour; Tests and docs read; Parent authors official specs; Candidate list shape; Ignored directories; Interrupted generation.
- **project-readme**
  - In `tests/project-readme.test.ts` (Task 8): Required install commands present; Optional packages explained; Subagent plugin support stated; Coding standard skill explained.
- **usage-guide**
  - In `tests/docs-subagents.test.ts` (Task 8): Both executors described; Parallel lanes described; Bootstrap path covered; Inferred label explained.
