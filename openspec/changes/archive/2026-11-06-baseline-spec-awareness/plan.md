# Baseline Spec Awareness Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `design.md`.

**Goal:** Planning instructions, the internal spec review and the routing note read the living specs (`openspec/specs/`) where they make decisions.

**Architecture:** Instruction-text changes only, placed where each decision is made (design Decisions 1–5): three artifact instructions in the bundled schema, two planning skills, one agent definition and the routing note constant. Every change is pinned by a text-assertion test in the existing suites.

**Tech Stack:** TypeScript, vitest (`bunx vitest run`), OpenSpec CLI ≥ 1.16 (schema tests run `openspec instructions <id> --json` in a temp project).

## Global Constraints

- `schema/superspec/schema.yaml` keeps `version: 6` and `x-pi-superspec.version: 6`; no artifact ID changes.
- Do not edit `openspec/schemas/superspec/` (project rule).
- Schema and template text names no tool (`plannotator`, `AskUserQuestion`, `ask_user_question`, `rpiv-`, `pi-subagents`, `Skill tool`) and spells commands `/opsx-<name>`.
- Skills name no Claude tool (existing `planning-commands` test).
- Repository text in English.
- Tests assert short key phrases with `toContain` / `toMatch` on whitespace-normalized text, as existing tests do.

## Review Focus

1. Existing schema tests that assert exact instruction phrases ("Check `openspec/specs/` for existing spec names", "use the existing spec folder name") must still pass: extend sentences, do not rewrite them. Covered by running the full `tests/schema.test.ts` in Task 1.
2. The routing note's "No forced change" test requires every `/opsx-new` line to contain "review": the new clause goes on the first path line only. Covered by the full `tests/routing-note.test.ts` in Task 2.
3. `tests/extension.test.ts` compares the injected note with `routingNote(...)`, so it follows the constant automatically; run it in Task 2.
4. The installed copy `openspec/schemas/superspec/` drifts from the bundled schema; no test compares them. Confirmed by `git diff --stat` showing no path under `openspec/schemas/` (Task 1 step 6).
5. The ff and continue skills keep their existing internal-check sentences (SA-P03/SA-P04 regexes); the new sentence is appended, not substituted. Covered by the full `tests/planning-commands.test.ts` in Task 3.

---

## Contracts

| Name | new / modified | Shape | public |
|---|---|---|---|
| `ROUTING_NOTE` (`extensions/routing-note.ts`) | modified | exported `string` constant; first path line becomes: `- No spec change (a small mistake, a typo, a fix restoring specified behaviour, a refactor): work directly with TDD and no change directory. Before treating work as a fix, confirm the behaviour in the living specs under openspec/specs/; behaviour not specified there makes it a spec change.` | yes — injected into every turn of activated projects |
| `brainstorm` / `proposal` / `specs` instructions (`schema/superspec/schema.yaml`) | modified | YAML block-scalar text in the artifact's `instruction`; added sentences listed in Task 1 | yes — read by `openspec instructions` in user projects |
| `superspec.spec-reviewer` definition (`agents/spec-reviewer.md`) | modified | Markdown body; new `## Baseline comparison` section after `## Permitted work`; frontmatter unchanged | no — package-internal agent, `advertise: false` |

---

## Task 1 — Schema baseline rules — implements 1.1, 1.2, 1.3

**Files:**
- Modify: `schema/superspec/schema.yaml` (brainstorm instruction ~L23–44; proposal bullet L60; specs instruction L113–124)
- Test: `tests/schema.test.ts` (`describe("final review findings")`, which has `instructionFor`)

**Interfaces:** Consumes none. Produces the `brainstorm` / `proposal` / `specs` instruction contracts.

- [ ] **Step 1: Write the failing tests** in `describe("final review findings")`:

```ts
it("brainstorm reads the baseline specs of touched capabilities", () => {
	const text = instructionFor("brainstorm");
	expect(text).toContain("read the living spec in `openspec/specs/` of each capability the change plausibly touches");
	expect(text).toContain("cite the existing requirements involved");
	expect(text).toContain("state explicitly when the change alters a specified requirement");
	for (const t of ["plannotator", "AskUserQuestion", "ask_user_question"]) expect(text).not.toContain(t);
});

it("proposal confirms modified capabilities in the living spec", () => {
	expect(instructionFor("proposal")).toContain(
		"List a capability here only after confirming in its living spec that existing requirements change.",
	);
});

it("specs start MODIFIED from the baseline block with exact headers", () => {
	const text = instructionFor("specs");
	expect(text).toContain("copy the full current requirement block from `openspec/specs/<capability>/spec.md`");
	expect(text).toContain("`MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers MUST match the main spec header exactly");
	expect(text).toContain("name the dropped scenario as intentional in the requirement text or the proposal");
});
```

- [ ] **Step 2: Run** `bunx vitest run tests/schema.test.ts` — Expected: the three new tests FAIL (missing text).
- [ ] **Step 3: Edit `schema.yaml`:**
  - brainstorm, after the output-redirection list: `Before brainstorming, read the living spec in \`openspec/specs/\` of each capability the change plausibly touches (judge from capability names and Purpose lines) and cite the existing requirements involved. Do not re-decide a specified requirement silently: state explicitly when the change alters a specified requirement.`
  - proposal, append to the Modified Capabilities bullet (L60): `List a capability here only after confirming in its living spec that existing requirements change.`
  - specs, append to the "Modified capabilities" bullet (L116): `For every \`MODIFIED\` requirement, first copy the full current requirement block from \`openspec/specs/<capability>/spec.md\`, then edit it. \`MODIFIED\`, \`REMOVED\` and \`RENAMED\` \`FROM\` headers MUST match the main spec header exactly. If a \`MODIFIED\` block drops a scenario, name the dropped scenario as intentional in the requirement text or the proposal.`
- [ ] **Step 4: Run** `bunx vitest run tests/schema.test.ts` — Expected: all PASS (including identity `version: 6`, harness-neutral and existing brainstorm tests).
- [ ] **Step 5: Run** `bunx tsc --noEmit` — Expected: exit 0.
- [ ] **Step 6: Check** `git diff --stat` lists `schema/superspec/schema.yaml` and `tests/schema.test.ts` only, nothing under `openspec/schemas/`.
- [ ] **Step 7: Commit** `git add schema/superspec/schema.yaml tests/schema.test.ts && git commit -m "feat(schema): read the baseline specs while planning"`

---

## Task 2 — Routing note confirms specified behaviour — implements 2.1

**Files:**
- Modify: `extensions/routing-note.ts:8`
- Test: `tests/routing-note.test.ts` (`describe("ROUTING_NOTE")`)

**Interfaces:** Produces the `ROUTING_NOTE` contract.

- [ ] **Step 1: Write the failing test:**

```ts
it("confirms specified behaviour before the fix path", () => {
	const line = ROUTING_NOTE.split("\n").find((l) => l.startsWith("- No spec change"));
	expect(line).toContain("confirm the behaviour in the living specs under openspec/specs/");
	expect(line).toContain("behaviour not specified there makes it a spec change");
});
```

- [ ] **Step 2: Run** `bunx vitest run tests/routing-note.test.ts` — Expected: new test FAILS.
- [ ] **Step 3: Replace line 8** with the exact text from the `ROUTING_NOTE` contract.
- [ ] **Step 4: Run** `bunx vitest run tests/routing-note.test.ts tests/extension.test.ts` — Expected: all PASS.
- [ ] **Step 5: Commit** `git add extensions/routing-note.ts tests/routing-note.test.ts && git commit -m "feat(routing-note): confirm specified behaviour in the living specs"`

---

## Task 3 — Spec review receives and uses the baseline — implements 3.1, 3.2

**Files:**
- Modify: `skills/opsx-continue/SKILL.md` (Internal check bullet, L73), `skills/opsx-ff/SKILL.md` (Internal check bullet, L63), `agents/spec-reviewer.md` (body)
- Test: `tests/planning-commands.test.ts` (`describe("planning specialist routing")`, holding SA-P03..05), `tests/agents.test.ts` (`describe("reviewer contract (SA-A04)")`)

**Interfaces:** Produces the `superspec.spec-reviewer` definition contract.

- [ ] **Step 1: Write the failing tests.** In `tests/planning-commands.test.ts`:

```ts
it("SA-P06 spec review receives the baseline main specs", () => {
	for (const c of ["continue", "ff"] as const) {
		const t = skill(c);
		expect(t, c).toContain("the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename");
		expect(t, c).toMatch(/no main spec[^.\n]*no baseline/i);
		expect(t, c).toMatch(/inline self-check[^.\n]*same main specs/i);
	}
});
```

In `tests/agents.test.ts`:

```ts
it("spec-reviewer compares deltas with the supplied baseline", () => {
	const { body } = load("spec-reviewer");
	expect(body).toContain("## Baseline comparison");
	expect(body).toMatch(/header[^.\n]*no exact match[^.\n]*main spec/i);
	expect(body).toMatch(/scenario[^.\n]*missing from a `MODIFIED` block[^.\n]*intentional/i);
	expect(body).toMatch(/main spec[^.\n]*not supplied[^.\n]*Limitations/i);
	expect(body).toMatch(/never report the comparison as passed/i);
});
```

- [ ] **Step 2: Run** `bunx vitest run tests/planning-commands.test.ts tests/agents.test.ts` — Expected: both new tests FAIL.
- [ ] **Step 3: Edit the skills.** In each Internal check bullet, insert directly before the sentence that starts `When the integration is absent`: `For the spec review, also pass the main spec \`openspec/specs/<capability>/spec.md\` of every capability the deltas modify, remove or rename; name a capability with no main spec as having no baseline. The inline self-check compares the deltas with the same main specs.` Keep every existing sentence unchanged.
- [ ] **Step 4: Edit `agents/spec-reviewer.md`.** Add after `## Permitted work`:
  - `## Baseline comparison` with three bullets: report every `MODIFIED`, `REMOVED` or `RENAMED` `FROM` header that has no exact match in the supplied main spec; report every scenario in the main spec that is missing from a `MODIFIED` block without being named as intentional; when a needed main spec is not supplied, record it under Limitations and never report the comparison as passed.
  - Purpose sentence becomes: `Review the delta specs supplied in the handoff against the proposal, capabilities, scout evidence and the supplied baseline main specs: requirement and scenario quality, testability, coverage, format, and language rules.`
- [ ] **Step 5: Run** `bunx vitest run tests/planning-commands.test.ts tests/agents.test.ts` — Expected: all PASS (SA-P03/SA-P04/SA-P05, SA-A04 and "no Claude tool names" included).
- [ ] **Step 6: Commit** `git add skills/opsx-continue/SKILL.md skills/opsx-ff/SKILL.md agents/spec-reviewer.md tests/planning-commands.test.ts tests/agents.test.ts && git commit -m "feat(planning): give the spec reviewer the baseline main specs"`

---

## Task 4 — Docs — implements 4.1, 4.2, 4.3

**Files:**
- Modify: `docs/workflow.md` (Step rules list L50+, Routing note list L169), `docs/usage-guide.md` (step 1 Brainstorm L49–54, step 4 Specs L72–77), `CHANGELOG.md` (`## [Unreleased]` → `### Added`)

- [ ] **Step 1: Edit `docs/workflow.md`.**
  - Step rules, add a bullet: `**baseline specs**: brainstorm reads the living specs of the capabilities it touches and states any deliberate change to a specified requirement; proposal lists a Modified Capability only after checking its living spec; a \`MODIFIED\` delta starts from the full current block, headers match the main spec exactly, and a dropped scenario is named; the spec reviewer (or inline self-check) receives those main specs.`
  - Routing note: the no-spec-change bullet's first line becomes `- No spec change (small mistake, typo, fix restoring specified behaviour, refactor; confirm the behaviour in openspec/specs/ first, unspecified behaviour is a spec change) →`; its continuation line is unchanged. Doc edits are checked by the final review, not by a new test.
- [ ] **Step 2: Edit `docs/usage-guide.md`.** Step 1 "The agent produces" gains `, citing the existing requirements of the capabilities it touches`; step 4 "The agent produces" gains `; a modified requirement starts from its current text in openspec/specs/ so nothing is dropped by accident`.
- [ ] **Step 3: Edit `CHANGELOG.md`.** Add one `### Added` bullet: `Baseline spec awareness: brainstorm, proposal and specs read the living specs under openspec/specs/ where they decide; the spec reviewer compares deltas with those main specs; the routing note confirms specified behaviour before the fix path.`
- [ ] **Step 4: Run** `bunx vitest run` — Expected: full suite PASS (docs tests such as "docs/workflow.md names specialist seats" included).
- [ ] **Step 5: Run** `openspec validate baseline-spec-awareness --strict` — Expected: `Change 'baseline-spec-awareness' is valid`.
- [ ] **Step 6: Commit** `git add docs/workflow.md docs/usage-guide.md CHANGELOG.md && git commit -m "docs: describe baseline spec awareness"`

---

## Scenario → test

- bundled-schema / Brainstorm cites touched requirements → `tests/schema.test.ts` "brainstorm reads the baseline specs of touched capabilities"
- bundled-schema / Deliberate change stated → same test (`state explicitly when the change alters a specified requirement`)
- bundled-schema / Brainstorm baseline rule is tool-neutral → same test (tool-name loop) and existing "brainstorm and finalize instructions name no review tool"
- bundled-schema / Proposal checks the living spec → `tests/schema.test.ts` "proposal confirms modified capabilities in the living spec"
- bundled-schema / Modified block starts from the baseline → `tests/schema.test.ts` "specs start MODIFIED from the baseline block with exact headers"
- bundled-schema / Headers match exactly → same test
- bundled-schema / Dropped scenario is visible → same test
- routing-note / Note text → existing `tests/routing-note.test.ts` "begins with its marker and mentions the key guidance"
- routing-note / Path stated → existing "states path and reason"
- routing-note / Specified behaviour confirmed → `tests/routing-note.test.ts` "confirms specified behaviour before the fix path"
- routing-note / No forced change → existing "does not force a change"
- routing-note / Paragraphs present → existing `tests/extension.test.ts` injection tests comparing with `routingNote(...)`
- routing-note / No enforcement → existing `tests/extension.test.ts` "registers no tool_call handler"
- planning-commands / Continue passes main specs → `tests/planning-commands.test.ts` "SA-P06 spec review receives the baseline main specs"
- planning-commands / Fast-forward passes main specs → same test
- planning-commands / Inline check uses the baseline → same test (`inline self-check … same main specs`)
- workflow-agents / Unmatched header → `tests/agents.test.ts` "spec-reviewer compares deltas with the supplied baseline"
- workflow-agents / Dropped scenario → same test
- workflow-agents / Baseline missing → same test
