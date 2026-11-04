# Superspec Package Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Executed via `/opsx-apply`, which chooses the executor. Do not implement during `/opsx-ff`.

**Goal:** Ship six namespaced Superspec package agents and use them at existing workflow boundaries without changing artifact or human-approval authority.

**Architecture:** pi-subagents discovers Markdown agents through package metadata. A shared packaged reference defines integration policy; existing opsx skills select roles at their existing stages. Parent sessions own official artifacts and decisions; children return bounded evidence or execute one authorized implementation task.

**Tech Stack:** Existing TypeScript/ESM extension, Markdown/YAML frontmatter, Pi `parseFrontmatter`, Vitest, OpenSpec >=1.16, optional capability-compatible pi-subagents. No new dependency or executable orchestration layer.

**Spec:** `openspec/changes/add-superspec-agents/specs/` and `design.md`; `tasks.md` is the official implementation checklist. All paths below are repository-relative unless explicitly resolved by a runtime handoff.

## Global Constraints

- Bundle exactly `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, and `superspec.verifier`.
- Use top-level `pi-subagents.agents: ["./agents"]`; keep `pi.extensions` unchanged and `pi.skills`, `pi.prompts`, and `pi.themes` absent.
- No new runtime/development dependency, settings writes, automatic installation, runtime registration, or user/project agent copies.
- Do not edit `openspec/schemas/superspec/`, `schema/superspec/`, extension activation, or the artifact DAG.
- Parent owns official artifact writes, task checkbox updates, receipt outcomes, human gates, and publication decisions.
- Use fresh child context, no nested delegation, one implementation writer per worktree, and no per-dispatch model/thinking override.
- Agent availability is not permission to delegate outside the requested workflow or applicable user/project instructions.
- Preserve optional inline execution only for absent integration; report disabled/missing agents, incompatibility and child failures without hidden recovery.
- Repository content is English, except the existing `README.vi.md` translation. Preserve document-language rules for generated user artifacts.
- Run scripts with Bun; preserve the existing `package-lock.json` and CI package-manager policy without converting it. No install is required by this plan; missing dependencies are a blocker to report.
- Do not push, merge, publish, or open a PR without explicit user authorization. Update task checkboxes only after implementation and review pass.

## Review Focus

1. Lazy tool exposure must enable then inspect the installed management surface, not misclassify the helper-only state as absent — `SA-R01` (Task 2), runtime `SM-03`.
2. Disabled/missing canonical agents or missing required skills/tools must stop the affected stage, not bypass configured policy via a generic agent — `SA-R03` (Task 2), runtime `SM-04`.
3. An interrupted bootstrap with existing spec files must neither re-scout nor overwrite them; the map agent is not a pre-confirmation capability scout — `SA-G03`/`SA-G06` (Task 5), runtime `SM-09`.
4. A successful child exit with missing evidence, old test logs, or the wrong cwd must not produce verified completion — `SA-R06`/`SA-E06` (Tasks 2/4), runtime `SM-07`/`SM-08`.
5. Package discovery outside activation, namespace collisions, configured models, and user/project overrides must work in the real installed runtime, not merely parse in unit tests — `SA-M01`/`SA-A01` (Task 1), runtime `SM-01`/`SM-02`.

## Contracts

These are Markdown/manifest interfaces, not new TypeScript exports or CLI flags. Exact externally selectable names and package metadata are public; report shapes are internal but stable across the task boundaries below. Public contract changes require user approval and a recorded deviation.

| Name | new / modified | Shape | public |
|---|---|---|---|
| Discovery metadata | new | `package.json["pi-subagents"] = { "agents": ["./agents"] }`; append `"agents"` to `files`; retain existing `pi` fields | yes |
| Agent identities | new | Files `agents/{scout,spec-reviewer,plan-reviewer,implementer,task-reviewer,verifier}.md`; local `name` equals basename, `package: superspec`, no aliases | yes |
| Shared agent defaults | new | `advertise: false`, `systemPromptMode: replace`, `defaultContext: fresh`, `inheritProjectContext: true`, `inheritGlobalContext: true`, `inheritSkills: false`, `defaultProgress: false`, `allowNestedSubagents: false`; omit `model`, `thinking`, `output`, `defaultReads`, `extensions`, memory and nesting grants | no |
| Tool sets | new | Recon: `read, grep, find, ls, bash, contact_supervisor`; review: `read, grep, find, ls, contact_supervisor`; implementation: `read, grep, find, ls, bash, edit, write, contact_supervisor`; verification: same as recon. Never include `subagent` | no |
| Role acceptance/skills | new | `acceptanceRole: writer` only for implementer, `read-only` for others. Implementer `skills: test-driven-development, verification-before-completion, systematic-debugging`; verifier `skills: verification-before-completion`; others omit `skills` | no |
| Shared reference | new | `skills/references/subagent-routing.md`, not a `SKILL.md`; sections `Availability`, `Handoff`, `Authority`, `Failures`, `Compatibility` | no |
| Handoff | new | Goal; authoritative cwd/changeRoot; resolved input paths; task/criterion IDs; refs/diff package; constraints; allowed edits; acceptance criteria; validation; stop conditions; report contract; `output` binding. Omit per-call model/thinking, use fresh context | no |
| Common report | new | Markdown `## Summary`, `## Evidence`, `## Findings`, `## Limitations`; explicit `none`/not-run reasons rather than omitted evidence. No JSON parser/schema is introduced | no |
| Scout report | new | Common sections plus `## Candidate behaviors` and `## Start here`; evidence references paths/lines, source/tests/docs and confidence gaps | no |
| Reviewer report | new | Common sections plus `## Verdict`; findings identify criterion, severity, path/line or artifact section, evidence and recommendation; verdict `PASS`, `CHANGES_REQUESTED`, or `INCOMPLETE` is advisory, not human approval | no |
| Implementer report | new | Common sections plus `## Changes`, `## Validation`, `## Contract deviations`; exact file list, BASE..HEAD, command/cwd/exit/counts and blockers. No official artifact edits | no |
| Verifier report | new | Common sections plus `## Checks` and `## Validation`; one row per six checks with `verified`, `failed`, or `not verified`; command/cwd/exit/counts and evidence for each runnable check | no |
| Generate-specs ownership | modified | Map -> confirm -> evidence-only capability scouts -> parent writes missing delta specs -> spec review -> strict validation; retain existing spec format/language/resume contracts | no |

## File Structure and Build Order

1. Task 1 supplies `agents/*.md` and discovery metadata, tested in new `tests/agents.test.ts` and existing `tests/manifest.test.ts`. Architecture/domain/glossary explain ownership.
2. Task 2 supplies the shared reference and new `tests/subagent-routing.test.ts`. Tasks 3–5 consume it.
3. Task 3 changes only explore/continue/ff selection instructions plus planning tests/workflow docs.
4. Task 4 changes only apply/verify selection instructions plus execution tests/usage docs.
5. Task 5 changes generate-specs ownership plus its existing tests and relevant docs.
6. Task 6 validates the installed package and updates README/E2E guidance. No production helper is added just to make a prompt-content test pass.

Tasks execute in order. The overlapping documentation files have one writer at a time. Scope does not include living-spec edits: the change deltas are synced later by archive.

## Task 1: Publish the specialist catalog — implements 1.1

**Files:**
- Create: `agents/scout.md`, `agents/spec-reviewer.md`, `agents/plan-reviewer.md`, `agents/implementer.md`, `agents/task-reviewer.md`, `agents/verifier.md`, `tests/agents.test.ts`.
- Modify: `package.json`, `tests/manifest.test.ts`, `docs/architecture.md` (Components), `docs/domain-model.md` (Package), `docs/glossary.md` (package agents versus activated project).

**Interfaces:**
- Consumes: existing Pi `parseFrontmatter` from `@earendil-works/pi-coding-agent`; existing manifest resource activation rules.
- Produces: public identities/discovery metadata and exact definition/report contracts listed above. No new TS runtime function.

- [ ] **Step 1: Add manifest red tests.** In `tests/manifest.test.ts`, add `SA-M01` asserting `pkg["pi-subagents"]` equals `{ agents: ["./agents"] }`; retain assertions for unchanged extension and absent `pi.skills/prompts/themes`. Add `SA-M02` for published `agents` and real paths under that directory; retain zero-runtime-dependency coverage. Expected values come from `package-manifest` delta, not computed metadata.
- [ ] **Step 2: Run red manifest tests.** Run `bun run test -- tests/manifest.test.ts`; expect failure on absent discovery metadata/published agents, not a harness error.
- [ ] **Step 3: Add agent contract red tests.** Use `parseFrontmatter`, as existing planning tests do. Define the six literal names once in the test; parameterize tests per agent. Each test ID maps to the single acceptance criterion in the matrix below (additional parameter rows share that criterion). `SA-A01` asserts exact file set, local names, namespace, nonempty descriptions, advertise false and no aliases. `SA-A02` asserts exact shared flags, tool sets, absent model/thinking/defaultReads/output, no `subagent` or nesting grant. Test parsers normalize comma-separated lists/boolean scalar representations only; they do not recreate discovery behavior.
- [ ] **Step 4: Pin role behavior tests.** `SA-A03` asserts scout/report evidence-only ownership and required headings; `SA-A04` asserts all reviewer report fields, no shell/write tools, exact-range limitation and advisory verdict values. `SA-A05` asserts implementer selected skills, TDD, authorized edit scope, report fields, and escalation/no-publication/no-official-artifact rules. `SA-A06` asserts verifier skill, all six checks, failed/not-verified handling, required validation fields and no-fixes/no-receipt rule. Use focused content assertions for actual obligations, not full prompt snapshots or tautological comparisons to the implementation.
- [ ] **Step 5: Run red agent tests.** Run `bun run test -- tests/agents.test.ts`; expect missing definitions/contract failures.
- [ ] **Step 6: Write the definitions and metadata.** Apply Contracts exactly. Role prompts state purpose, permitted work, authority, supervisor escalation, and report sections. Reports default to `none` with explanations for empty findings; required evidence never disappears. Scout shell is inspection-only; verifier shell is assigned tests/checks; neither promise is a sandbox. Read-only reviewers consume parent-provided diff/command evidence. Model configuration remains outside prompts/frontmatter. Keep extension and schema files untouched.
- [ ] **Step 7: Update ownership docs.** Explain package-wide discovery, activated skills versus globally available namespaced agents, public names, parent ownership and no copies. Correct Components publication list; do not claim package agents load through `resources_discover`.
- [ ] **Step 8: Run green checks.** Run `bun run test -- tests/agents.test.ts tests/manifest.test.ts tests/extension.test.ts tests/activation.test.ts` and `bun run typecheck`; expect zero failures and exit 0. Actual discoverability remains `SM-01`, not proven by these tests.
- [ ] **Step 9: Commit the deliverable.** Stage only this task's files. Commit `feat: publish namespaced Superspec workflow agents`. Parent reviews diff/test evidence before ticking 1.1.

## Task 2: Define shared integration policy — implements 2.1

**Files:**
- Create: `skills/references/subagent-routing.md`, `tests/subagent-routing.test.ts`.
- Modify: `docs/architecture.md` (pi tool mapping and compatibility).

**Interfaces:**
- Consumes: Task 1 canonical names, tool/skills boundaries and report contracts.
- Produces: shared reference at the exact path in Contracts. Other skills link it as `../references/subagent-routing.md` relative to their own skill directory.

- [ ] **Step 1: Write reference red tests.** `SA-R00` asserts the reference exists, has the five named sections, is not a `SKILL.md`, and defines no runtime registration/settings/dependency installation/schema changes. `SA-R01` pins helper-only -> enable -> next-turn re-evaluation -> installed management/list/inspect -> canonical role check. `SA-R02` pins neither tool nor helper -> announce once -> existing inline path with unchanged gates/evidence and no invented calls.
- [ ] **Step 2: Write failure and handoff red tests.** `SA-R03` pins disabled/missing roles, unsupported discovery, missing skills/tools -> report named cause/stop/no setting rewrite or generic/CLI/inline bypass. `SA-R04` pins failed launch/runtime -> retain exact error/run/cwd/partial state and stop. `SA-R05` pins every handoff field and `output` parameter binding to run/scratch artifacts. `SA-R06` pins missing evidence/section -> incomplete, no completion from process status. `SA-R07` pins one writer/fresh context/no nesting/no model override and reuses existing review seats. `SA-R08` pins parent official-artifact/outcome/gate/publication authority and evidence inspection.
- [ ] **Step 3: Run red tests.** Run `bun run test -- tests/subagent-routing.test.ts`; expect missing reference/contract assertions to fail.
- [ ] **Step 4: Author the reference.** Implement `design.md` Decisions 3–4 and the Contracts without adding a new skill. Give one minimal single-child call example with canonical agent, task, authoritative cwd, fresh context and `output`; no exact model. Explicitly defer action shapes to installed pi-subagents guidance rather than inventing unavailable APIs. Preflight only required roles for the current stage; keep unsupported integration distinct from absent integration. Native async completion wakes the parent: no short polling/sleeps/ordinary-child `bg_wait`.
- [ ] **Step 5: Document compatibility truthfully.** In architecture, state package discovery/namespace/override/selected-skill/output capabilities and the inspected reference build `0.84.0` at `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`. Mark it inspected, not smoke-tested or a proven minimum. Actual test evidence in Task 6 supersedes assumptions; no dependency pin is added.
- [ ] **Step 6: Run green checks and commit.** Run `bun run test -- tests/subagent-routing.test.ts tests/planning-commands.test.ts tests/manifest.test.ts`; expect no failures or accidental discovered skill. Commit only the three task files as `feat: define bounded Superspec subagent handoffs`. Parent reviews before ticking 2.1.

## Task 3: Route exploration and planning — implements 3.1

**Files:**
- Modify: `skills/opsx-explore/SKILL.md`, `skills/opsx-continue/SKILL.md`, `skills/opsx-ff/SKILL.md`, `tests/planning-commands.test.ts`, `docs/workflow.md`.

**Interfaces:**
- Consumes: Task 2 shared reference; Task 1 scout/spec-reviewer/plan-reviewer contracts.
- Produces: stage-local routing instructions, not another command or gate. Existing human review gate text/outcomes remain authoritative.

- [ ] **Step 1: Add planning red tests.** `SA-P01` asserts explore's optional bounded scout, shared reference and evidence-only no-write boundary. `SA-P02` asserts small conceptual exploration stays inline and scout availability alone does not trigger calls. `SA-P03` checks continue: after completed specs/plan creation, select the matching reviewer, resolve substantive findings/re-review before the existing human gate, no second artifact from continue. `SA-P04` pins ff internal review without extra human stops and preserves its brainstorm/final gates. `SA-P05` pins inline self-check when integration is absent. `SA-R00`'s linkage assertion is completed in the shared reference tests after all affected skills are wired by Task 5; keep a separate focused assertion here for the three current consumers.
- [ ] **Step 2: Run red tests.** Run `bun run test -- tests/planning-commands.test.ts`; new routing assertions fail, existing gate/order tests remain the regression baseline.
- [ ] **Step 3: Update stage routing.** Add a short shared-reference loader near each skill's delegation guidance. Explore remains a stance, not a new fixed workflow: use scout only when recon earns its overhead. Continue's artifact-creation step runs the relevant internal check on the completed artifact, including existing dependency files needed to assess newly added partial specs, while preserving existing files unless findings require an explicitly reviewed revision; ff runs checks within its unattended loop before the existing final gate. Optional brainstorm recon never moves the user conversation into a child. Do not copy policy blocks or alter review gate tier behavior.
- [ ] **Step 4: Update workflow documentation.** Add concise specialist seats beside existing owners; distinguish internal advisory checks from human approval. Preserve exact DAG, authoritative worktree, mandatory task/whole-branch review, and the two ff stops.
- [ ] **Step 5: Run green checks and commit.** Run `bun run test -- tests/planning-commands.test.ts tests/subagent-routing.test.ts` (current consumer coverage only) and `bun run typecheck`; expect exit 0. Commit `feat: route Superspec planning to bounded specialists`. Parent reviews before ticking 3.1.

## Task 4: Route implementation and verification — implements 4.1

**Files:**
- Modify: `skills/opsx-apply/SKILL.md`, `skills/opsx-verify/SKILL.md`, `tests/execution-commands.test.ts`, `docs/usage-guide.md` (apply/verify sections).

**Interfaces:**
- Consumes: shared availability/handoff policy and implementer/task-reviewer/verifier report shapes.
- Produces: existing executor/receipt contracts with namespaced seats. No new receipt field or schema change.

- [ ] **Step 1: Add executor red tests.** `SA-E01` asserts canonical implementer per task plus one combined spec/quality task-reviewer and one final whole-branch seat, no duplicate generic reviewer, single writer, configured models and parent-owned progress. `SA-E02` asserts tool+helper absence selects existing inline execution with whole-branch review. `SA-E03` asserts missing/disabled canonical role or failure stops without replacement. Include fix/post-PR delegation paths under the same policy where those modes use children; existing iteration/Contracts tests remain unchanged.
- [ ] **Step 2: Add verifier red tests.** `SA-E04` asserts shared policy, verifier role, authoritative cwd, six checks and parent-only receipt. `SA-E05` asserts command/cwd/exit/counts/evidence from current invocation accepted, old apply/verify results rejected. `SA-E06` pins failing test -> FAIL, unavailable check -> not verified and at most PASS_WITH_WARNINGS, no child fixes. `SA-E07` pins absent integration -> same inline verify. Keep the existing contract-coherence warning-only rule: mismatch alone is not FAIL.
- [ ] **Step 3: Run red tests.** Run `bun run test -- tests/execution-commands.test.ts`; expect new routing assertions to fail while existing guard tests still run.
- [ ] **Step 4: Modify the skills.** Apply loads shared policy before choosing executor; maps SDD roles to canonical identities and explicitly overrides conflicting generic model-pinning advice without rewriting Superpowers. Parent supplies exact BASE..HEAD review packages because shell-free reviewers cannot obtain committed ranges themselves. Existing task order, worktree reuse, five-iteration cap, public-contract stop and receipt fields remain unchanged. Verify may delegate collection, then parent inspects report/files and runs missing checks it can; never trusts report-only success or modifies code during verify.
- [ ] **Step 5: Update usage documentation.** Explain seats, exact evidence required, inline absence versus incompatible/failed integration, fresh tests, parent receipts, and unchanged next commands. Do not add merge/push authority.
- [ ] **Step 6: Run green checks and commit.** Run `bun run test -- tests/execution-commands.test.ts tests/subagent-routing.test.ts tests/schema.test.ts` and `bun run typecheck`; expect exit 0. Commit `feat: use Superspec execution and verification agents`. Parent reviews before ticking 4.1.

## Task 5: Generate specs from evidence-only scouts — implements 5.1

**Files:**
- Modify: `skills/opsx-generate-specs/SKILL.md`, `tests/generate-specs-command.test.ts`, `tests/subagent-routing.test.ts` (complete consumer linkage), `docs/usage-guide.md` (generate-specs), `docs/architecture.md` (component description).

**Interfaces:**
- Consumes: shared policy, scout evidence report and spec-reviewer findings; existing capability/format/language contract.
- Produces: same `bootstrap-specs/specs/<capability>/spec.md` files authored by parent, not children; no new public flag or command.

- [ ] **Step 1: Derive red tests from the delta.** `SA-G01` pins <=12 compound kebab-case candidates with purpose/directories. Separate `SA-G14` pins ignored roots; retain existing literal-value assertions. `SA-G02` pins one map scout using configured model settings with no model/thinking override. `SA-G03` pins map before confirmation and capability scouts restricted to the confirmed list; separate `SA-G15` pins cancellation creates no change or capability scout. Keep the map/capability distinction explicit in test descriptions.
- [ ] **Step 2: Pin ownership and resume red tests.** `SA-G04` asserts one evidence-only `superspec.scout` per confirmed missing capability, parent writes official files, no child `write` instruction for spec paths. `SA-G05` asserts absent integration scouts inline sequentially and writes each spec before the next. `SA-G06` pins re-filter after rename and skip existing spec files/done artifacts. `SA-G07`–`SA-G11` separately assert evidence presence/content, inferred label, observable behavior and reading tests/docs. `SA-G12` pins internal spec-review -> final strict validation -> fix/rerun and unchanged ff handoff; `SA-G13` pins parent-only artifact writing and run-managed reports.
- [ ] **Step 3: Run red tests.** Run `bun run test -- tests/generate-specs-command.test.ts`; expect violations of scout-writes/fast-model behavior to fail. Update old assertions only where the delta deliberately changes behavior: rename the old scout-write contract assertion to evidence/parent-output contracts, retain literal requirement/header/language assertions and all confirmation/resume/no-product-code guards.
- [ ] **Step 4: Rewrite delegation stages, not the entire skill.** Preserve preconditions, map size/ignores, existing-name filter, confirmation once, bootstrap creation/resume, document language and final handoff. Place evidence contract before dispatch; give scouts capability/directories and source/tests/docs obligations, plus an output report binding, not an official spec output path. Parent turns evidence into SHALL-first requirements with Evidence/Confidence lines in the existing format. Spec-reviewer checks new drafts, parent resolves findings and strict-validates; no new human gate.
- [ ] **Step 5: Complete policy linkage tests and docs.** `SA-R00` now also parameterizes all six consuming skills and resolves each `../references/subagent-routing.md` link to the packaged file. Replace architecture/usage claims that scouts write specs or select a fast model. Retain every existing unaffected behavior in the docs and tests.
- [ ] **Step 6: Run green checks and commit.** Run `bun run test -- tests/generate-specs-command.test.ts tests/subagent-routing.test.ts tests/planning-commands.test.ts tests/execution-commands.test.ts` and `bun run typecheck`; expect exit 0. Commit `feat: keep generated specification authority in the parent`. Parent reviews before ticking 5.1.

## Task 6: Verify the installed integration — implements 6.1

**Files:**
- Modify: `README.md`, `README.vi.md`, `docs/e2e-checklist.md`.
- Evidence: explicit run-managed/scratch report, not a new checked-in generated report or root `context.md`/`progress.md`.

**Interfaces:**
- Consumes: all package/skill contracts from Tasks 1–5.
- Produces: documented compatibility prerequisites, named smoke procedures, actual run evidence and honest limitations. No new runtime code.

- [ ] **Step 1: Extend the manual acceptance checklist.** Add `SM-01`–`SM-10` below with exact setup, expected behavior and evidence fields. Baseline/red result for each is observed before its corresponding feature is considered verified; do not fabricate a failing historical run. Keep existing with/without-subagents release runs and ff gates.
- [ ] **Step 2: Run the unit/typecheck/package baseline.** Run `bun run test`, `bun run typecheck`, and `openspec validate add-superspec-agents --strict`; require exit 0 and record pass/skip counts. Look up `bun pm pack --help` before packaging; create the tarball in scratch, inspect its file list with `tar -tf <tarball>`, and prove all six definitions plus the reference are included while tests/fixtures are absent. Preserve lockfiles and do not install packages.
- [ ] **Step 3: Prepare disposable runtime fixtures.** Use installed Pi, Superpowers, and pi-subagents. Record versions, source commits when available and effective settings excluding secrets. Configure the candidate package via local project package settings in disposable trusted marked/unmarked fixture projects, never by changing global settings. Verify tool detail reports the candidate worktree/package source rather than an older globally installed copy. Read installed management help before list/inspect/disable calls. If setup, auth, required skills or optional packages are unavailable, stop and record the blocker; do not install or substitute tools silently.
- [ ] **Step 4: Run discovery/configuration smoke.** `SM-01`: in unmarked and marked fixtures list all six canonical agents, verify generic identities coexist, package source is correct and unmarked workflow commands remain hidden. Snapshot user/project settings and agent directories before/after discovery/removal; expect no Superspec-generated copies/settings. `SM-02`: use disposable project agent/model overrides with valid configured models; inspect effective canonical role/model and launch without a per-call model. Confirm user/project precedence and disabling without modifying global settings.
- [ ] **Step 5: Run failure/authority smoke.** `SM-03`: helper-only exposure activates tool then resolves roles; absent-tool fixture uses the announced inline route. `SM-04`: disposable disabled/missing role, missing required skill/tool and controlled failing launch each report/stop with no generic/CLI/inline bypass. `SM-05`: read-only scout/reviewer calls against scratch canary files leave product/spec/canary bytes unchanged; all six roles launch with their expected tools/skills/context/report contracts. `SM-07`: incomplete report is not accepted as done. Bind report outputs explicitly and inspect returned artifact references; no root progress/context files or nested calls.
- [ ] **Step 6: Run workflow smoke.** `SM-06`: a disposable small change uses the namespaced implementer, one combined task reviewer per task and final whole-branch review, correct authoritative cwd, no parallel writers, no duplicate generic reviewer or unauthorized publication. `SM-08`: verify runs fresh tests now, including a deliberately failing scratch test -> FAIL, and an unavailable-check case -> not verified; parent alone writes receipt and no fixes occur. `SM-09`: generate-specs map -> confirmation -> scouts -> parent-authored files; cancel creates no change, resume preserves existing spec bytes, strict validation and language/evidence rules hold. `SM-10`: continue/ff internal checks retain exactly the existing human gates; small explore stays inline and recon stays evidence-only. Use actual UI/tool flows and record run IDs/transcripts, commands, cwd, outputs and canary snapshots. Never synthesize user approval; a required unavailable human gate remains an explicit blocker.
- [ ] **Step 7: Finalize user guidance.** Update both READMEs consistently: optional compatible integration, six canonical roles, package-wide visibility versus activated routing, configuration ownership, reload/restart after package update, no schema reinstall, absent fallback versus reported incompatibility, removal without copies. Docs distinguish inspected builds from builds actually smoke-tested, and never imply a shell allowlist is a sandbox.
- [ ] **Step 8: Run final checks and review scope.** Repeat `bun run test`, `bun run typecheck`, and strict change validation after doc edits. Inspect diff and untracked files; schema/extension/lockfiles remain unchanged and scratch output is not staged. Every required smoke must have actual result evidence; leave 6.1 open and record a blocker if it cannot run, rather than marking unverified integration complete. Unit green is not E2E green.
- [ ] **Step 9: Commit and hand over.** Commit `docs: document and verify Superspec package agent integration` only after acceptance evidence is reviewed. Parent ticks 6.1 only when the task is fully verified; record remaining limitations in the apply receipt. No push/merge/PR is authorized by this plan.

## Scenario → test

Each row is one acceptance criterion extracted from the named delta scenario. Unit IDs are stable test-name prefixes; a row can have parameterized cases but must not combine unrelated criteria. Expected values come directly from the named requirement/Contracts, not a reimplementation of discovery. `SM-*` cases are runtime acceptance checks: they cannot be proved by prompt-string assertions alone. This matrix describes planned checks, not results already run.

| Criterion / source scenario | Test ID and test name | Expected-value source / runtime complement |
|---|---|---|
| workflow-agents: Catalog identities | SA-A01 `bundles exactly six namespaced roles` | Namespaced specialist catalog; SM-01 |
| workflow-agents: Bounded child context | SA-A02 `uses explicit fresh context and configured models` | Explicit context and model ownership + Contracts; SM-02/05 |
| workflow-agents: Evidence-only scout | SA-A03 `scout returns evidence without official edits` | Recon and review authority; SM-05 |
| workflow-agents: Independent reviewer | SA-A04 `reviewers are shell-free evidence-only seats` | Recon and review authority; SM-05 |
| workflow-agents: Implementation boundary | SA-A05 `implementer escalates unauthorized changes` | Task-scoped implementation; SM-06 |
| workflow-agents: Incomplete or failing evidence | SA-A06 `verifier reports failed and unverified checks` | Independent verification evidence; SM-08 |
| subagent-routing: Integration policy loaded | SA-R00 `consumers load one packaged reference` | Shared integration reference; SM-10 |
| subagent-routing: Lazy tool activation | SA-R01 `activates helper before role preflight` | Availability and failure handling; SM-03 |
| subagent-routing: Optional integration absent | SA-R02 `announces absence fallback without child calls` | Availability and failure handling; SM-03 |
| subagent-routing: Disabled or incompatible agent | SA-R03 `stops on disabled or incompatible roles` | Availability and failure handling; SM-04 |
| subagent-routing: Failed child lane | SA-R04 `retains child failure and partial state` | Availability and failure handling; SM-04 |
| subagent-routing: Recoverable bounded handoff | SA-R05 `brief binds paths scope and output` | Bounded handoff and reports; SM-05 |
| subagent-routing: Incomplete report | SA-R06 `does not accept reports missing evidence` | Bounded handoff and reports; SM-07 |
| subagent-routing: One review seat and one writer | SA-R07 `preserves single writer and existing seats` | Parent authority and concurrency; SM-06 |
| subagent-routing: Report is not authority | SA-R08 `retains parent artifact and gate authority` | Parent authority and concurrency; SM-06/08 |
| package-manifest: Extensions only | Existing `declares extensions only in the pi block` | pi package manifest; marked/unmarked extension regression tests |
| package-manifest: Package keyword | Existing `declares the pi-package keyword` | pi package manifest |
| package-manifest: Optional discovery metadata | SA-M01 `declares optional package-agent discovery` | pi package manifest; SM-01 |
| package-manifest: Files allow-list | SA-M02 `publishes agents with existing resources` | Published files; tarball inspection |
| package-manifest: Self-contained package | SM-01 `discovery and removal leave no agent copies` | Published files; before/after config snapshots |
| planning-commands: Explore with repository recon | SA-P01 `explore permits bounded evidence-only scouting` | Bounded planning reconnaissance; SM-10 |
| planning-commands: Small conceptual question | SA-P02 `small exploration stays inline` | Bounded planning reconnaissance; SM-10 |
| planning-commands: Continue reviews one artifact | SA-P03 `continue reviews the completed artifact before its gate` | Internal spec and plan review seats; SM-10 |
| planning-commands: Fast-forward retains two planned stops | SA-P04 `ff adds no human stop for specialist checks` | Internal spec and plan review seats; SM-10 |
| planning-commands: Planning review without subagents | SA-P05 `planning self-checks inline when absent` | Internal spec and plan review seats; SM-03/10 |
| execution-commands: With pi-subagents | SA-E01 `apply uses namespaced SDD seats once` | Executor depends on subagent availability; SM-06 |
| execution-commands: Without pi-subagents | SA-E02 `apply preserves inline executor and branch review` | Executor depends on subagent availability; SM-03/06 |
| execution-commands: Unusable delegated executor | SA-E03 `apply stops an unusable delegated lane` | Executor depends on subagent availability; SM-04 |
| execution-commands: Fresh delegated evidence | SA-E04 `verify delegates in the authoritative worktree`; SA-E05 `verify accepts only current-invocation test evidence` | Delegated verify evidence with parent receipt; SM-08 |
| execution-commands: Failing or missing evidence | SA-E06 `verify cannot turn failed or missing evidence into pass` | Delegated verify evidence with parent receipt; SM-08 |
| execution-commands: Inline verify fallback | SA-E07 `verify retains inline absence fallback` | Delegated verify evidence with parent receipt; SM-03/08 |
| generate-specs-command: Candidate list shape | SA-G01 `map retains the bounded candidate contract` | Map stage; SM-09 |
| generate-specs-command: Ignored directories | SA-G14 `map excludes ignored and generated roots` | Map stage; SM-09 |
| generate-specs-command: Map respects configured model | SA-G02 `map uses the configured namespaced scout` | Map stage; SM-02/09 |
| generate-specs-command: User trims the list | SA-G03 `capability scouts follow the confirmed list` | Confirm before scouting; SM-09 |
| generate-specs-command: User cancels | SA-G15 `cancel creates no change or capability scouts` | Confirm before scouting; SM-09 |
| generate-specs-command: With pi-subagents | SA-G04 `capability scouts return evidence for parent writing` | Scout dispatch; SM-09 |
| generate-specs-command: Without pi-subagents | SA-G05 `inline scouting writes each spec sequentially` | Scout dispatch; SM-09 |
| generate-specs-command: Interrupted generation | SA-G06 `resume preserves existing capability specs` | Scout dispatch; SM-09 |
| generate-specs-command: Evidence on every requirement | SA-G07 `parent output requires evidence on every requirement` | Spec output format; SM-09 |
| generate-specs-command: Evidence content | SA-G08 `evidence names source test or doc locations` | Spec output format; SM-09 |
| generate-specs-command: Inferred label | SA-G09 `source-only requirements retain inferred confidence` | Spec output format; SM-09 |
| generate-specs-command: Observable behaviour | SA-G10 `requirements describe observable behavior` | Spec output format; SM-09 |
| generate-specs-command: Tests and docs read | SA-G11 `capability evidence includes tests and docs` | Spec output format; SM-09 |
| generate-specs-command: Format validates | SA-G12 `parent reviews then strict-validates and retries` | Spec output format; existing literal format/language tests; SM-09 |
| generate-specs-command: Parent authors official specs | SA-G13 `only the parent authors official delta files` | Spec output format; SM-09 |

## Self-Review and Completion Evidence

Check all six delta files against this matrix before implementation. Every new/modified requirement has a task and every scenario has a unit and/or explicit runtime seam. Keep existing unaffected tests as regression coverage, including gate tier order, contract deviations, resume authority, language, schema neutrality, missing apply receipt, and five-iteration limits.

The plan changes Markdown/manifest contracts, so there are no invented runtime function signatures to reconcile. Public identity/metadata shapes are defined once in Contracts; later tasks consume them. Task 6 is the evidence boundary for actual discovery, model routing and model behavior; no string test is labeled E2E. This planning packet does not report any implementation test or smoke as already passing.
