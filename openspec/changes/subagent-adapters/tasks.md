## 1. Subagent integration paragraph

Blocked by: none

- [ ] 1.1 Add `extensions/subagent-integration.ts` with pure `detectSubagentAdapter` (rule order tintinweb, pi-subagents, gotgenes, helper, none; schema-based with provenance tie-break) and unit tests for every rule (design D1; spec subagent-integration-paragraph)
- [ ] 1.2 Add `subagentParagraph(adapter)` with per-adapter text for spawn, agent listing, thinking, report collection, waiting and escalation, plus the helper, none and gotgenes cases, with unit tests (design D2, D7, D8, D10)
- [ ] 1.3 Wire the paragraph into `routingNote()` after the Interaction channel paragraph and compute it in the `context` hook from the active tools; update routing-note and extension tests (spec routing-note)

## 2. Bundled agents

Blocked by: none

- [ ] 2.1 Rewrite the frontmatter of the six `agents/*.md`: `name: superspec.<role>`, no `package`, `advertise: false`, both prompt-inheritance dialects with `prompt_mode: append`, built-in tools only (design D4; spec workflow-agents)
- [ ] 2.2 Make the six agent bodies plugin-neutral (escalation through the handoff's channel, or stop and report under Blockers) and add the plan reviewer's task-metadata checks (design D10; spec workflow-agents)
- [ ] 2.3 Update `tests/agents.test.ts` for the identities, frontmatter keys and the no-plugin-tool-name guard on agent bodies

## 3. Package manifest

Blocked by: none

- [ ] 3.1 Add `pi.subagents.agents` beside `pi-subagents.agents` in `package.json` and update `tests/manifest.test.ts` (spec package-manifest, release-metadata "Package metadata")

## 4. Bundled schema v8

Blocked by: 1

- [ ] 4.1 Update the `tasks` instruction and `templates/tasks.md`: a group is the unit given to one agent, independent work is its own group, and a `Blocked by:` line under each group heading naming groups only (spec bundled-schema)
- [ ] 4.2 Update the `plan` instruction and `templates/plan.md`: `## Task N` implements group N and lists its checkboxes, `**Difficulty:**`, `**Blocked by:**`, and the dependency carry-over rule (spec bundled-schema)
- [ ] 4.3 Update the `apply` instruction for parallel unblocked plan tasks and `templates/apply.md` with the `## Lanes` section (spec bundled-schema)
- [ ] 4.4 Bump the schema version and marker to 8, record the new digest in `tests/fixtures/schema-checksums.json`, and update the schema tests and the version-sensitive init and notice tests (spec bundled-schema "Schema identity", schema-version-pin)

## 5. Shared routing reference

Blocked by: 1

- [ ] 5.1 Rewrite `skills/references/subagent-routing.md` plugin-neutral: role requirement table, requirement-based selection with announcement and the fail-closed read-only rule, handoff with escalation, report collection, lanes, the difficulty-to-thinking mapping, and a link to the compatibility docs (spec subagent-routing, parallel-apply-lanes)
- [ ] 5.2 Update `tests/subagent-routing.test.ts` for the plugin-neutral reference, role table, selection, handoff, escalation and lane rules

## 6. Execution skills

Blocked by: 5

- [ ] 6.1 Update the `opsx-apply` skill: role-based executor selection, one lane per plan task, parallel scheduling, merge after review, conflict handling, escalation waits and `## Lanes` recording, with no plugin names (spec execution-commands, parallel-apply-lanes)
- [ ] 6.2 Update the `opsx-verify` skill to select an agent meeting the verifier role and delegate through the paragraph (spec execution-commands)
- [ ] 6.3 Update `tests/execution-commands.test.ts` for role wording, lanes and the forbidden-name guard over the execution skills and prompts

## 7. Planning and bootstrap skills

Blocked by: 5

- [ ] 7.1 Update the `opsx-continue`, `opsx-ff` and `opsx-explore` skills to name the scout, spec reviewer and plan reviewer roles and delegate through the paragraph (spec planning-commands)
- [ ] 7.2 Update the `opsx-generate-specs` skill to use the scout and spec reviewer roles, report collection through the paragraph, and no plugin names (spec generate-specs-command)
- [ ] 7.3 Update `tests/planning-commands.test.ts` and `tests/generate-specs-command.test.ts` for role wording and the forbidden-name guard over those skills and prompts

## 8. Documentation and release checks

Blocked by: 1, 2, 3, 4, 5, 6, 7

- [ ] 8.1 Update `docs/architecture.md` ("pi tool mapping", "Subagent compatibility" with per-plugin inspected or smoke-tested status), `docs/workflow.md`, `docs/domain-model.md` and `docs/glossary.md`
- [ ] 8.2 Update `README.md` and `README.vi.md` optional packages for the three subagent plugins, and `docs/usage-guide.md` for executor variants, task groups and parallel lanes, and bootstrap scouts (spec project-readme, usage-guide)
- [ ] 8.3 Update `docs/e2e-checklist.md` with the tintinweb, pi-subagents and no-plugin runs, the gotgenes smoke and the parallel-lanes observation, and add a `CHANGELOG.md` entry (spec release-metadata)
- [ ] 8.4 Add the tree-wide guard (no `superspec.*` agent names or plugin tool names in `skills/**`, `prompts/**` and agent bodies), then run `npm test`, `npm run typecheck` and `openspec validate subagent-adapters --strict`
