# Adopt OpenSpec 2.0 Stock Skills Implementation Plan

> Executed via `/opsx-apply`, which chooses the executor.
> Spec reference: this change's `specs/` and `design.md`.

**Goal:** Replace the eight forked `opsx-*` skills with OpenSpec 2.0's stock `openspec-*` skills. Superspec's rules move to `schema/superspec/workflow.md` (schema v9) and the routing note, and `/opsx-init` installs and checks the stock skills. Iteration 3 then removes the `/opsx-<step>` prompts: users run the stock skills with `/skill:<id>`, and the routing note makes the agent read `workflow.md` first.

**Architecture:**
- Stock skills in the project's `.agents/skills/` do the mechanics.
- Every schema instruction points to `workflow.md`, which overrides the stock skill. The routing note tells the agent to read the matching `workflow.md` section before it runs a stock skill (iteration 3 removed the `/opsx-<cmd>` step prompts).
- The routing note adds a stock skills paragraph, and `session_start` warns when required skills are missing.
- `/opsx-init` requires OpenSpec ≥ 2.0, checks skills and profile, and runs `openspec init --tools pi`.

**Tech Stack:** TypeScript (pi extension, `bun`), vitest, OpenSpec CLI 2.x, YAML schema plus Markdown.

## Global Constraints

- **OpenSpec floor:** 2.0 (`major >= 2`). The install line stays `brew install openspec`.
- **Required stock skills, exact ids:** `openspec-explore`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs`, `openspec-archive-change`.
- **Required profile workflows, exact ids:** `explore`, `new`, `continue`, `ff`, `apply`, `verify`, `sync`, `archive`.
- **Unused stock skills, exact ids:** `openspec-propose`, `openspec-update-change`, `openspec-bulk-archive-change`, `openspec-onboard`.
- **Schema version:** `version: 9` and `x-pi-superspec.version: 9`.
- **Pointer sentence**, the first line of every artifact instruction and the apply instruction, verbatim: `Follow openspec/schemas/superspec/workflow.md for the command you are running; it overrides the running skill where they differ.`
- **Harness-neutral text** in `schema/superspec/**`: no `AskUserQuestion`, `rpiv-`, `pi-subagents`, `Skill tool` or `/opsx:`. In `workflow.md`, also no `TodoWrite`, `Task tool`, `ask_user_question`, `plannotator`, `tintinweb`, `gotgenes`, `contact_supervisor`, `subagents_enable`, `get_subagent_result`, `steer_subagent`, `Agent(` or `subagent(`.
- **Global OpenSpec config:** `/opsx-init` never runs `openspec config set|profile|reset`.
- **Repository language:** all content in English.

## Review Focus

- **Stock skill folder exists but `SKILL.md` is missing** (an interrupted `openspec update`). Expected: counted as missing, both in `/opsx-init` and in the session warning. Tested in Task 3 and Task 4.
- **`openspec config list --json` prints JSON with `workflows: null` under `core`.** Expected: profile not ready, with `new`, `continue`, `ff`, `verify` named as missing, not a crash. Tested in Task 4.
- **`.agents/skills/` is a symlink or unreadable during the session check.** Expected: no throw reaches the user and the session starts. Tested in Task 3.
- **Re-running `/opsx-init` on a v9 project with all skills present.** Expected: no `openspec init` and no `openspec config` call; files byte-identical. Tested in Task 4.
- **`openspec --version` prints `2.0.0-beta.1` or a banner line before the version.** Expected: parsed as major 2 and accepted. Tested in Task 4.

---

## Contracts

| Name | new / modified | Shape | public |
|---|---|---|---|
| `schema/superspec/workflow.md` | new | Markdown; H2 sections in this order: `## Shared rules`, `## explore`, `## new`, `## continue`, `## ff`, `## apply`, `## verify`, `## sync`, `## archive`, `## Review gate`, `## Superpowers rule`, `## Stock skills not used` | yes (shipped into projects) |
| `schema/superspec/subagent-routing.md` | modified (moved from `skills/references/`) | same content; compatibility links become `https://github.com/ttdua/pi-superspec/blob/main/docs/architecture.md` and `.../docs/e2e-checklist.md` | yes |
| `schema/superspec/schema.yaml` `version` / `x-pi-superspec.version` | modified | `9` / `9` | yes |
| `prompts/opsx-<cmd>.md` (8 files) | removed in Task 6 (modified in Task 2) | frontmatter `description`; body: the mapped stock skill id, the `workflow.md` section, the conflict rule, the missing-skill stop, `User input: $@` | yes (commands) |
| `REQUIRED_STOCK_SKILLS` in `extensions/stock-skills.ts` | new | `readonly string[]` of the 8 skill ids (Global Constraints) | no |
| `REQUIRED_WORKFLOWS` in `extensions/stock-skills.ts` | new | `readonly string[]` of the 8 workflow ids | no |
| `missingStockSkills(root: string): string[]` in `extensions/stock-skills.ts` | new | ids from `REQUIRED_STOCK_SKILLS` whose `<root>/.agents/skills/<id>/SKILL.md` is not a regular file that `accessSync(path, constants.R_OK)` accepts; never throws (an id whose check throws counts as missing) | no |
| `stockSkillsWarning(missing: string[]): string` in `extensions/stock-skills.ts` | new | message naming each missing id, `openspec config profile` and `openspec update` | no |
| `profileReadiness(json: string): { ready: true } \| { ready: false; missing: string[]; reason?: string }` in `extensions/init/stock-skills.ts` | new | ready iff the parsed `profile === "custom"` and `workflows` ⊇ `REQUIRED_WORKFLOWS`; invalid JSON → `{ ready: false, missing: [...REQUIRED_WORKFLOWS], reason: "unreadable" }` | no |
| `STOCK_SKILLS_PARAGRAPH` in `extensions/routing-note.ts` | new (rewritten in Task 6) | string starting `Stock skills:`; inserted between `ROUTING_NOTE` and the document language paragraph. Task 6: names each stock skill, tells the agent to read the matching `workflow.md` section (plus Shared rules, Review gate, Superpowers rule) before running a stock skill and to stop with instructions when the skill is missing, and lists the four unused stock skills | no |
| `checkOpenspec` minimum | modified | `major >= 2`; message `Install or upgrade OpenSpec (>= 2.0): brew install openspec` | no |
| `InitOutcome` in `extensions/init/init.ts` | modified | adds `"profile-not-ready"` | no |
| `extensions/init/legacy.ts` | removed | — | no |
| `ROUTING_NOTE` path guidance | modified (Task 6) | names `openspec-ff-change`, then `openspec-new-change` and `openspec-continue-change`, instead of `/opsx-ff`, `/opsx-new`, `/opsx-continue` | no |
| `/opsx-init` report next step | modified (Task 6) | `Next: ask the agent to start a change, or run /skill:openspec-new-change <name>` | yes |
| Eight step commands `/opsx-<cmd>` | removed (Task 6) | users run the stock skills with `/skill:<id>` or ask the agent; `/opsx-init` and `/opsx-generate-specs` stay | yes |

---

## Task 1: Schema v9 with workflow.md and subagent-routing.md — implements 1

**Covers:** 1.1, 1.2, 1.3, 1.4, 1.5
**Difficulty:** Very Hard
**Blocked by:** none

**Files:**
- Create: `schema/superspec/workflow.md`
- Create (git mv): `schema/superspec/subagent-routing.md` ← `skills/references/subagent-routing.md`
- Modify: `schema/superspec/schema.yaml`
- Modify: `tests/fixtures/schema-checksums.json`
- Modify: `tests/schema.test.ts`, `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts`, `tests/subagent-routing.test.ts`, `tests/schema-version-pin.test.ts` (only if it hardcodes 8)
- Create: `tests/workflow-rules.test.ts`
- Create (scratch, deleted in Task 5): `openspec/changes/adopt-openspec-2-skills/rule-ledger.md`

**Interfaces:**
- Produces: the `workflow.md` contract above; the pointer sentence (Global Constraints); the reference path `openspec/schemas/superspec/subagent-routing.md` for Task 2 and the docs.

- [ ] **Step 1: Write failing tests in `tests/workflow-rules.test.ts`.** Read `schema/superspec/workflow.md` and assert:
  - the twelve H2 headings appear in contract order;
  - exactly one `## Review gate`;
  - the continue and ff sections contain `Review gate` and no `| \`approved\` |` table row;
  - `workflow.md` contains none of the forbidden strings (Global Constraints);
  - it links `subagent-routing.md` relatively;
  - the explore section contains `/opsx-continue <name>` and does not recommend `openspec-propose`;
  - the archive section contains `openspec archive "<name>" --skip-specs -y` and `mv`, the latter only in a "never" sentence;
  - the apply section names the step 0 commit, the `<change-name>` worktree, "replace" for the stock task loop, the post-PR exception and "code review gate" as finalize-only;
  - the stock-skills section lists the four unused ids;
  - one assertion per Step 1b "MUST end in `workflow.md`" row, anchored on a phrase from that rule;
  - the shared rules name the `todo` tool and the plain checklist fallback.
- [ ] **Step 1b: Write the rule ledger.** Write a scratch ledger at `openspec/changes/adopt-openspec-2-skills/rule-ledger.md` (deleted in Task 5 Step 9). It has one row per rule sentence in `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/SKILL.md` with the columns source file:line, destination, test, and how the rule is covered. The destination is a `workflow.md` section, a `schema.yaml` instruction, `subagent-routing.md` or `stock 2.0`.
  - For `stock 2.0`, cite the passage of the rendered stock skill (`openspec init --tools pi` with OpenSpec 2.0 in a temp dir) that already enforces the rule. Without such a passage, the rule goes to `workflow.md`.
  - These rows MUST end in `workflow.md` with a test:
    - apply trigger precedence (post-PR, then fix-iteration, before `blocked`/`all_done`);
    - the apply workspace guard (`workspace-planning` with empty `allowedEditRoots`);
    - "the brainstorm gate is the brainstorming skill's design-doc approval; never ask for it separately";
    - continue's "only a human gate approval advances";
    - sync's "instructions unavailable → stop without writing";
    - archive's post-sync re-compare and "never pass `--no-validate`";
    - verify's 5-iteration stop and "post-PR iterations do not count".
- [ ] **Step 2: Port the scenario assertions.** For each scenario of the planning-commands, execution-commands and review-gate deltas, move the existing assertion in `tests/planning-commands.test.ts` / `tests/execution-commands.test.ts` that reads a `skills/opsx-*/SKILL.md` file so it reads `workflow.md` (by section) instead. Keep the scenario name as the `it` title. In `tests/subagent-routing.test.ts`, change the path to `schema/superspec/subagent-routing.md` and assert the compatibility links are absolute `https://github.com/ttdua/pi-superspec/` URLs.
- [ ] **Step 3: Extend `tests/schema.test.ts`.**
  - Version 9 in both fields.
  - Every artifact `instruction` and `apply.instruction` starts with the pointer sentence.
  - The harness-neutral scan also covers `workflow.md` and `subagent-routing.md`.
  - `openspec schema validate superspec` passes in a temp project (existing helper).
  - The v8 → v9 artifact ids are unchanged.
- [ ] **Step 4: Run `bun run test tests/workflow-rules.test.ts tests/schema.test.ts tests/subagent-routing.test.ts tests/planning-commands.test.ts tests/execution-commands.test.ts`.** Expected: FAIL in the new and ported assertions (`workflow.md` missing, version 8, reference path). Assertions on the prompt bodies and on the `skills/opsx-*` layout are not touched in Task 1; they stay green until Task 2 changes both together.
- [ ] **Step 5: Write `schema/superspec/workflow.md`.**
  - Port each rule from `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/SKILL.md` that `schema.yaml` does not already state, following design D2.
  - Copy the Review gate section once.
  - Write the Superpowers rule once.
  - Add the shared rules: Interaction channel for questions, Subagent integration paragraph for delegation, `todo` with the plain fallback.
  - Do not copy step text that `openspec instructions` already returns.
- [ ] **Step 6: Move and adjust the reference.** `git mv skills/references/subagent-routing.md schema/superspec/subagent-routing.md`, then make its two compatibility links absolute.
- [ ] **Step 7: Update `schema.yaml`.** Prepend the pointer sentence plus a blank line to every artifact `instruction` and to `apply.instruction`. Set the version to 9 in both fields, and change the header comment to `v9`.
- [ ] **Step 8: Record the digest.** Run `bun run test tests/schema-version-pin.test.ts` and record the printed v9 digest in `tests/fixtures/schema-checksums.json` as `"9": "<digest>"`.
- [ ] **Step 9: Run `bun run typecheck && bun run test`.** Expected: exit 0. The forked skills still exist in this task, so the layout and prompt tests stay green; any red test is a Task 1 defect to fix before committing.
- [ ] **Step 10: Commit.** `git commit -m "feat(schema): v9 workflow rules file for stock OpenSpec skills"`

## Task 2: Prompts map to stock skills; package keeps only generate-specs — implements 2

**Covers:** 2.1, 2.2, 2.3, 2.4
**Difficulty:** Normal
**Blocked by:** Task 1

**Files:**
- Modify: `prompts/opsx-{explore,new,continue,ff,apply,verify,sync,archive}.md`
- Delete: `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/`
- Delete: `skills/references/` (emptied by Task 1)
- Modify: `skills/opsx-generate-specs/SKILL.md`
- Modify: `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts`, `tests/generate-specs-command.test.ts`, `tests/plugin-neutral.test.ts`, `tests/extension.test.ts`

**Interfaces:**
- Consumes: `workflow.md` section names (Task 1); the reference path `openspec/schemas/superspec/subagent-routing.md`.
- Produces: the prompt bodies used in docs (Task 5).

- [ ] **Step 1: Write failing tests.**
  - For each of the 8 prompts, assert that it names its mapped stock skill id, `openspec/schemas/superspec/workflow.md`, the words "wins" or "overrides", `$@`, and the missing-skill stop (`openspec config profile`, `openspec update`).
  - `skills/` lists exactly `opsx-generate-specs`.
  - No `opsx-propose` or `opsx-bulk-archive` prompt exists.
  - `skills/opsx-generate-specs/SKILL.md` contains `openspec/schemas/superspec/subagent-routing.md` and not `../references/`.
  - `tests/extension.test.ts`: the discovered skill path holds `opsx-generate-specs/SKILL.md` and no `opsx-new/SKILL.md`.
  - `tests/plugin-neutral.test.ts`: the scan covers `skills/`, `prompts/` and `schema/superspec/workflow.md`.
- [ ] **Step 2: Run `bun run test tests/planning-commands.test.ts tests/execution-commands.test.ts tests/generate-specs-command.test.ts tests/plugin-neutral.test.ts tests/extension.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Rewrite the eight prompts.** Keep the frontmatter `description`. The body says:
  - "Use the `<stock-id>` skill (read its SKILL.md from the available skills list) together with the `<cmd>` section of `openspec/schemas/superspec/workflow.md`; where they differ, `workflow.md` wins.";
  - the missing-skill stop sentence;
  - `User input: $@`.
- [ ] **Step 4: Delete the eight forked skill directories and `skills/references/`; edit the generate-specs skill.** `git rm -r` the directories, then fix the two reference links in `skills/opsx-generate-specs/SKILL.md`.
- [ ] **Step 5: Run the same tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(prompts): run stock OpenSpec skills under workflow.md"`

## Task 3: Routing note stock skills paragraph and session warning — implements 3

**Covers:** 3.1, 3.2, 3.3
**Difficulty:** Normal
**Blocked by:** Task 1, Task 2

Task 2 is added because both tasks edit `tests/extension.test.ts`; one writer at a time.

**Files:**
- Create: `extensions/stock-skills.ts`
- Modify: `extensions/routing-note.ts`, `extensions/superspec.ts`
- Test: `tests/stock-skills.test.ts` (new), `tests/routing-note.test.ts`, `tests/extension.test.ts`

**Interfaces:**
- Produces: `REQUIRED_STOCK_SKILLS`, `REQUIRED_WORKFLOWS`, `missingStockSkills`, `stockSkillsWarning`, `STOCK_SKILLS_PARAGRAPH` (Contracts). Task 4 imports `REQUIRED_STOCK_SKILLS`, `REQUIRED_WORKFLOWS` and `missingStockSkills`.

- [ ] **Step 1: Write failing tests in `tests/stock-skills.test.ts`.**
  - `missingStockSkills` returns `[]` when all eight `SKILL.md` files exist.
  - It returns `["openspec-ff-change", "openspec-verify-change"]` when those two are absent.
  - It counts a directory without `SKILL.md` as missing.
  - It returns all eight when `.agents/skills` is a file and not a directory (no throw).
  - It counts a `SKILL.md` with mode `0o000` as missing (skip this case when running as root).
  - `stockSkillsWarning(["openspec-ff-change"])` contains `openspec-ff-change`, `openspec config profile` and `openspec update`.
- [ ] **Step 2: Write failing routing-note tests.**
  - `routingNote(...)` contains `STOCK_SKILLS_PARAGRAPH`.
  - That paragraph maps `/opsx-ff` to `openspec-ff-change` and `/opsx-apply` to `openspec-apply-change`, names `openspec/schemas/superspec/workflow.md` and `openspec-propose`.
  - It sits before the `Document language:` paragraph.
  - The "No forced change" assertion only scans the path-guidance text (`ROUTING_NOTE`).
- [ ] **Step 3: Write failing session_start tests in `tests/extension.test.ts`.**
  - A marked fixture with no `.agents/skills` warns once with a message containing `openspec-explore`.
  - A fixture with all eight `SKILL.md` files gives no warning.
  - No UI or an unmarked project gives no warning.
  - Patching `missingStockSkills` to throw still lets the session start, and the throw does not reach notify.
- [ ] **Step 4: Run `bun run test tests/stock-skills.test.ts tests/routing-note.test.ts tests/extension.test.ts`.** Expected: FAIL.
- [ ] **Step 5: Implement `extensions/stock-skills.ts`.** Per id, `statSync(p).isFile()` then `accessSync(p, constants.R_OK)` inside one try/catch.
- [ ] **Step 6: Add `STOCK_SKILLS_PARAGRAPH` in `extensions/routing-note.ts`.** Insert it in `routingNote()` right after `ROUTING_NOTE`.
- [ ] **Step 7: Call the check in `session_start`.** In `extensions/superspec.ts`, call `missingStockSkills(root)` in the activated + `ctx.hasUI` branch, inside try/catch. Notify `stockSkillsWarning(missing)` as a `"warning"` when non-empty. Run no command.
- [ ] **Step 8: Update the existing routing-note snapshot assertions.** `tests/extension.test.ts` lines that compare with `routingNote(...)` keep working because they call the function.
- [ ] **Step 9: Run the same tests plus `bun run typecheck`.** Expected: PASS.
- [ ] **Step 10: Commit.** `git commit -m "feat(extension): stock skills paragraph and missing-skill warning"`

## Task 4: /opsx-init on OpenSpec 2.0 — implements 4

**Covers:** 4.1, 4.2, 4.3, 4.4, 4.5
**Difficulty:** Hard
**Blocked by:** Task 3

The tasks.md group 4 has no blocker. Task 3 is added here because Task 4 imports `REQUIRED_STOCK_SKILLS`, `REQUIRED_WORKFLOWS` and `missingStockSkills` from `extensions/stock-skills.ts`.

**Files:**
- Modify: `extensions/init/preflight.ts`, `extensions/init/init.ts`
- Create: `extensions/init/stock-skills.ts`
- Delete: `extensions/init/legacy.ts`, `tests/init/legacy.test.ts`
- Modify: `tests/helpers/io.ts`, `tests/init/preflight.test.ts`, `tests/init/init.test.ts`, `tests/init/integration.test.ts`
- Create: `tests/init/stock-skills.test.ts`

**Interfaces:**
- Consumes: `REQUIRED_STOCK_SKILLS`, `REQUIRED_WORKFLOWS`, `missingStockSkills` (Task 3).
- Produces: `profileReadiness` and the `"profile-not-ready"` outcome (Contracts).

- [ ] **Step 1: Write failing preflight tests.**
  - `checkOpenspec` accepts `2.0.0`, `2.3.1` and `2.0.0-beta.1`.
  - It rejects `1.17.0` and `1.16.0` with a message containing `(>= 2.0)` and `brew install openspec`.
  - Change the `fakeIO` default stdout to `2.0.0\n`.
- [ ] **Step 2: Write failing `tests/init/stock-skills.test.ts` for `profileReadiness`.**
  - `{"profile":"custom","workflows":["explore","new","continue","ff","apply","verify","sync","archive","propose"]}` → ready.
  - `{"profile":"core","workflows":null}` → not ready; missing contains `new`, `continue`, `ff`, `verify`.
  - `{"profile":"custom","workflows":["explore","apply"]}` → missing the other six.
  - `"garbage"` → not ready with `reason: "unreadable"`.
- [ ] **Step 2b: Make the init fixtures command-aware.** In `tests/init/init.test.ts`:
  - The default `recording()` responder and every inline responder answer `--version` with `2.0.0\n`.
  - `config list --json` gets a ready custom-profile JSON.
  - `init --tools pi` writes the eight `.agents/skills/<id>/SKILL.md` files plus the `openspec/` skeleton into the call's `cwd`; other calls return 0.
  - A shared helper `withStockSkills(root)` pre-creates the eight files for tests that start from an existing project.
  - Version-rejection tests keep their own `1.x` responders.
- [ ] **Step 3: Write failing `runInit` tests in `tests/init/init.test.ts`, with a `recording` IO.**
  - Skills absent + core profile → outcome `profile-not-ready`; the notes contain `openspec config profile` and `/opsx-init`; no `openspec init` call; the project directory is unchanged.
  - Skills absent + ready profile + no `openspec/` → `openspec init --tools pi` runs once (assert the args).
  - All eight skills present → no `openspec config` and no `openspec init` call.
  - `openspec init` exits 1 → its stderr is reported, `config.yaml` and the schema are not written, and the outcome is `preflight-failed`.
  - `config list` fails → `profile-not-ready`, with "unreadable" in the notes.
  - No call ever has args starting `config set`, `config profile` or `config reset`.
  - The success report after an install contains `.agents/skills/` and `openspec config profile`.
  - Idempotency: schema identical + skills present → a second run changes no file.
  - Missing-skill restore: identical schema + missing ff + ready profile → `openspec init --tools pi` runs and the bytes of `config.yaml` and the schema directory are unchanged (the fake `init` writes only `.agents/skills/openspec-ff-change/SKILL.md`).
  - Remove the three legacy tests ("still runs legacy cleanup when blocked", etc.) and the `--tools none` tests.
- [ ] **Step 4: Run `bun run test tests/init`.** Expected: FAIL.
- [ ] **Step 5: Update `checkOpenspec`.** Change the minimum to `major >= 2` and the message.
- [ ] **Step 6: Implement `profileReadiness(json)`.** Put it in `extensions/init/stock-skills.ts`, plus `async function ensureStockSkills(io, root): Promise<"present" | "install" | { stop: string }>`. It returns `"present"` when `missingStockSkills(root)` is empty. Otherwise it runs `openspec config list --json` and maps not-ready to a stop message listing the missing workflows and the two commands.
- [ ] **Step 7: Rework `runInit` in `extensions/init/init.ts`.**
  - After the warnings, call `ensureStockSkills`. A stop yields `io.notify(stop, "error")` and returns `"profile-not-ready"`.
  - When `openspec/` is missing or the result is `"install"`, run `openspec init --tools pi` in the root. On a non-zero exit, notify and return `"preflight-failed"`.
  - Delete every `cleanLegacy` call and the import.
  - Add the two report lines when skills were installed.
- [ ] **Step 8: Delete the legacy files.** `git rm extensions/init/legacy.ts tests/init/legacy.test.ts`.
- [ ] **Step 9: Update `tests/init/integration.test.ts`.**
  - Skip unless `openspec --version` has major ≥ 2.
  - Create a temp `XDG_CONFIG_HOME`, then run `openspec config set profile custom` and `openspec config set workflows '["explore","new","continue","ff","apply","verify","sync","archive"]'` with that env.
  - Change the helper to `realIO(cwd, env)`: it captures `env` in its closure and calls `spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, ...env } })`. The production `InitIO` is unchanged.
  - Assert `isActivated`, a passing validation, all eight `SKILL.md` files, and a second run byte-identical.
- [ ] **Step 10: Run `bun run test tests/init` and `bun run typecheck`.** Expected: PASS. The local `openspec` is 1.17.0 today, so the integration test is skipped with a reason. Also run it once against a 2.0 CLI (`npx -y @fission-ai/openspec@2.0.0` on `PATH` through a temp shim directory) and record the result in `apply.md`.
- [ ] **Step 11: Commit.** `git commit -m "feat(init): require OpenSpec 2.0 and install stock skills"`

## Task 5: Documentation, purposes and full verification — implements 5

**Covers:** 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
**Difficulty:** Normal
**Blocked by:** Task 1, Task 2, Task 3, Task 4

**Files:**
- Modify: `README.md`, `README.vi.md`, `docs/architecture.md`, `docs/workflow.md`, `docs/usage-guide.md`, `docs/e2e-checklist.md`, `CHANGELOG.md`
- Modify: `openspec/specs/planning-commands/spec.md`, `openspec/specs/execution-commands/spec.md`, `openspec/specs/bundled-schema/spec.md` (Purpose lines only)
- Modify: `tests/project-readme.test.ts`, `tests/docs-subagents.test.ts`
- Delete: `openspec/changes/adopt-openspec-2-skills/rule-ledger.md`

**Interfaces:**
- Consumes: prompt wording (Task 2), init messages (Task 4), warning text (Task 3).

- [ ] **Step 1: Write failing README tests in `tests/project-readme.test.ts`.** For both READMEs:
  - the text names `OpenSpec 2.0`, `openspec config profile` and the eight workflows, and states that `openspec update` removes deselected workflows;
  - the four unused stock skill ids appear, with "not removed";
  - uninstall names `.agents/skills/`;
  - the command table still matches `prompts/` plus `/opsx-init`.

  Add a `usage guide` describe block to `tests/project-readme.test.ts`, reading `docs/usage-guide.md`, with one test per usage-guide scenario:
  - "Commands not appearing": `/opsx-init` and reload.
  - "Existing schema is not overwritten": `--force` and backup.
  - "Upgrade after a package update": the session-start notice and committing `openspec/schemas/superspec/`.
  - "Profile missing workflows": `openspec config profile` and the eight workflow ids.
  - "Stock skills removed by an update": `openspec update` follows the profile.
  - "Two upgrade paths": `openspec update` for stock skills; package update plus `/opsx-init` for `workflow.md`.
  - "Restore from backup": `~/.pi/superspec-backups/`.

  In `tests/docs-subagents.test.ts`, point the reference path at `schema/superspec/subagent-routing.md`.
- [ ] **Step 2: Run `bun run test tests/project-readme.test.ts tests/docs-subagents.test.ts`.** Expected: FAIL in the new README and usage-guide assertions.
- [ ] **Step 3: Update both READMEs, keeping the same section order.**
- [ ] **Step 4: Update `docs/architecture.md`.**
  - Goals 2–3 (uninstall leaves stock skills).
  - The components row "Skills + prompts" becomes "Prompts + workflow rules".
  - The `/opsx-init` steps follow design D6.
  - The tool mapping row "Load a skill".
  - A "Tested OpenSpec version: 2.0.0" line.
- [ ] **Step 5: Update `docs/workflow.md`.** Cover the commands table (stock skill column), conflicts #7 rewritten and new #11 (stock skill vs `workflow.md`), and the routing-note section.
- [ ] **Step 6: Update `docs/usage-guide.md` and `docs/e2e-checklist.md`.**
  - Usage guide: troubleshooting for profile missing workflows, stock skills removed by an update, and the OpenSpec version too old (2.0); the two upgrade paths.
  - E2E checklist: OpenSpec ≥ 2.0; the shipped-layout checks (ff stops at the brainstorm gate and the final gate; apply creates the `<change-name>` worktree, uses the executor and opens no code review gate).
- [ ] **Step 7: Add a `CHANGELOG.md` entry under Unreleased, marked BREAKING.** It covers OpenSpec ≥ 2.0, the eight-workflow profile, schema v9, the forked skills removed, and the legacy cleanup removed.
- [ ] **Step 8: Edit the three Purpose lines.**
  - planning-commands: "Defines the `/opsx-explore`, `/opsx-new`, `/opsx-continue` and `/opsx-ff` commands, which run the stock OpenSpec skills under `workflow.md`: …"
  - execution-commands: the same pattern.
  - bundled-schema: drop "(currently v7)".
- [ ] **Step 9: Delete `rule-ledger.md` and run `bun run typecheck && bun run test && openspec validate adopt-openspec-2-skills --strict`.** Expected: all pass; the strict validation prints "is valid".
- [ ] **Step 10: Commit.** `git commit -m "docs: OpenSpec 2.0 stock skills, profile and upgrade paths"`

---

## Task 6: Remove the step prompts — implements 6

**Covers:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
**Difficulty:** Hard
**Blocked by:** Task 1, Task 2, Task 3, Task 4, Task 5

Iteration 3 of apply, after the first final gate. The user decided to drop the eight step prompts; the delta specs, design D4/D5 and the proposal already say so.

**Files:**
- Modify: `schema/superspec/workflow.md`, `schema/superspec/schema.yaml`, `schema/superspec/templates/{apply,finalize,plan,verify}.md`, `tests/fixtures/schema-checksums.json` (the unreleased v9 digest)
- Delete: `prompts/opsx-{explore,new,continue,ff,apply,verify,sync,archive}.md`, `tests/helpers/stock-prompt.ts`
- Modify: `extensions/routing-note.ts`, `extensions/init/init.ts`, `skills/opsx-generate-specs/SKILL.md` (three `/opsx-ff` hand-offs at lines 3, 6 and 108 become `openspec-ff-change`)
- Modify: the `## Purpose` lines of `openspec/specs/planning-commands/spec.md`, `openspec/specs/execution-commands/spec.md` and `openspec/specs/generate-specs-command/spec.md` (sync keeps an existing Purpose, so this edit is manual)
- Modify: `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts`, `tests/routing-note.test.ts`, `tests/workflow-rules.test.ts`, `tests/schema.test.ts`, `tests/init/init.test.ts`, `tests/extension.test.ts`, `tests/generate-specs-command.test.ts`, `tests/project-readme.test.ts`, `tests/docs-subagents.test.ts`, `tests/plugin-neutral.test.ts`
- Modify: `README.md`, `README.vi.md`, `docs/{architecture,workflow,usage-guide,e2e-checklist,glossary,domain-model}.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the Contracts rows for `STOCK_SKILLS_PARAGRAPH`, the path guidance and the `/opsx-init` next step.
- Produces: no new exports.

- [ ] **Step 1: Write failing tests.**
  - `tests/routing-note.test.ts`:
    - the path guidance names `openspec-ff-change`, `openspec-new-change` and `openspec-continue-change` and contains none of the eight old command names;
    - the stock skills paragraph tells the agent to read the matching `workflow.md` section first, names the Shared rules, Review gate and Superpowers rule sections, names the missing-skill stop with `openspec config profile`, `openspec update` and `/opsx-init`, and still lists the four unused stock skills;
    - "No forced change" now checks `openspec-new-change`.
  - `tests/planning-commands.test.ts` and `tests/execution-commands.test.ts`: `prompts/` holds exactly `opsx-generate-specs.md`; none of the eight step prompts exists; no `opsx-propose` or `opsx-bulk-archive` prompt exists. Delete the prompt-shape assertions and `tests/helpers/stock-prompt.ts`.
  - `tests/workflow-rules.test.ts`: `workflow.md` contains none of the eight old command names and names each stock skill id in its section.
  - `tests/schema.test.ts`: the same scan over `schema.yaml` and `templates/*.md`.
  - `tests/init/init.test.ts`: the report next step names `/skill:openspec-new-change`.
  - `tests/extension.test.ts`: the discovered prompt path holds only `opsx-generate-specs.md`.
  - `tests/generate-specs-command.test.ts`: `skills/opsx-generate-specs/SKILL.md` names `openspec-ff-change bootstrap-specs` and no old command (update the assertions at lines ~50 and ~260 that expect `/opsx-ff bootstrap-specs`).
  - Doc assertions in `tests/project-readme.test.ts`:
    - the README command table lists exactly `/opsx-init` and `/opsx-generate-specs` (compared with `prompts/` plus `/opsx-init`);
    - a second README table has one row per step (explore, new, continue, ff, apply, verify, sync, archive) with its stock skill id and `/skill:<id>`, in both languages;
    - the quick start names `/opsx-init` and the skills from `openspec-new-change` to `openspec-archive-change`;
    - the usage guide walkthrough and ff section name the skills, say `/skill:<id>` or "ask the agent", and show `openspec-apply-change` as the next step after ff;
    - the usage guide has a "skill commands not appearing" entry naming `enableSkillCommands`.
  - Purpose lines: the three living specs' Purpose no longer name the eight commands and mention stock skills.
  - A repository-wide test in `tests/plugin-neutral.test.ts`: no file under `schema/`, `prompts/`, `skills/`, `extensions/` names `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync` or `/opsx-archive`.
- [ ] **Step 2: Run `bun run test`.** Expected: the new assertions FAIL.
- [ ] **Step 3: Replace the old command names with the stock skill ids** in `schema/superspec/workflow.md`, `schema.yaml` and the four templates. Keep `/opsx-init`. Rephrase sentences so they read naturally ("run `/opsx-apply`" → "use the `openspec-apply-change` skill"). Update the digest in `tests/fixtures/schema-checksums.json` as `tests/schema-version-pin.test.ts` prints it.
- [ ] **Step 4: Delete the eight prompts.** `git rm prompts/opsx-{explore,new,continue,ff,apply,verify,sync,archive}.md tests/helpers/stock-prompt.ts`.
- [ ] **Step 5: Rewrite the routing note** (`extensions/routing-note.ts`) as the Contracts rows say, and the `/opsx-init` next step in `extensions/init/init.ts`.
- [ ] **Step 6: Run `bun run typecheck && bun run test`.** Expected: PASS except doc assertions that still read the old docs.
- [ ] **Step 7: Update the docs.**
  - README (both languages): the command table lists `/opsx-init` and `/opsx-generate-specs`; a second table maps each step to its stock skill and `/skill:<id>`; quick start by skill id; unused stock skills; uninstall.
  - `docs/architecture.md`, `docs/workflow.md` (Commands table, Conflicts #11), `docs/usage-guide.md` (walkthrough and ff by skill id; troubleshooting "skill commands not appearing": `openspec init --tools pi` or `/opsx-init`, the profile, the `enableSkillCommands` setting), `docs/e2e-checklist.md` (explore, sync and archive each read their `workflow.md` section; the missing-skill stop), `docs/glossary.md`, `docs/domain-model.md`.
  - `CHANGELOG.md`: fold into the existing BREAKING entry that the eight step commands are gone.
  - Update the doc assertions in `tests/project-readme.test.ts` and `tests/docs-subagents.test.ts`.
- [ ] **Step 7b: Replace the three `/opsx-ff` hand-offs in `skills/opsx-generate-specs/SKILL.md`, and edit the three Purpose lines** (planning-commands, execution-commands, generate-specs-command: describe the steps as stock skills run under `workflow.md`, with no command names).
- [ ] **Step 8: Run `bun run typecheck && bun run test && openspec validate adopt-openspec-2-skills --strict`,** then `PATH=/tmp/os2shim:$PATH bun run test tests/schema.test.ts tests/init/integration.test.ts`. Expected: all pass.
- [ ] **Step 9: Commit.** `git commit -m "feat!: remove the /opsx step prompts; run stock skills with /skill:<id>"`

---

## Scenario → test

**Iteration 3 (Task 6) supersedes the prompt-related rows below.** The prompt scenarios ("Prompts exist without package skills", "Prompt maps to its stock skill") are replaced by "No prompts or skills for the steps" → `tests/planning-commands.test.ts` / `tests/execution-commands.test.ts` (layout of `prompts/` and `skills/`); "Mapped stock skill missing" and "Section read before the skill" → `tests/routing-note.test.ts` (stock skills paragraph); "Skill commands not appearing" (usage-guide) → `tests/project-readme.test.ts`; "Stock skill mapping", "Stock skills paragraph first", "Missing stock skill stop", "Section read before the stock skill" (routing-note) → `tests/routing-note.test.ts`; "Visible when marked", "Only the generate-specs prompt" (package-activation) → `tests/extension.test.ts`. The rows below that name a prompt are kept as history of iteration 1.

Iteration 3 mapping for the scenarios the revision changed: "Sync deferred" (bundled-schema) → `tests/schema.test.ts` and `tests/workflow-rules.test.ts` (text names `openspec-archive-change`); "No step commands" (bundled-schema) → `tests/schema.test.ts` scan; "Diff base" and the "Requested change loop" scenarios (review-gate) → `tests/workflow-rules.test.ts` finalize/review-gate section (names `openspec-verify-change`); "Flag alone" (init-command) → `tests/init/init.test.ts` (hint names `/opsx-generate-specs`); "Stops after specs" (generate-specs-command) → `tests/generate-specs-command.test.ts` (names `openspec-ff-change bootstrap-specs`); "Quick start reaches archive", "Skill table maps each step" (project-readme) → `tests/project-readme.test.ts` assertions listed in Task 6 Step 1; "ff stops before apply", "Skill commands not appearing" (usage-guide) → `tests/project-readme.test.ts` usage-guide block.

Tasks 1–5 above are the record of iterations 1 and 2. Where they name `/opsx-<step>` prompts or commands, Task 6 supersedes them.

**planning-commands**
- Prompts exist without package skills → `tests/planning-commands.test.ts` "Prompts exist without package skills"
- Prompt maps to its stock skill → `tests/planning-commands.test.ts` "Prompt maps to its stock skill"
- Mapped stock skill missing (planning) → `tests/planning-commands.test.ts` "Mapped stock skill missing"
- Sections present (planning) → `tests/workflow-rules.test.ts` "planning sections"
- Forbidden names absent → `tests/workflow-rules.test.ts` "forbidden names"
- Questions defer to the channel → `tests/workflow-rules.test.ts` "questions defer to the channel"
- Progress tracking fallback → `tests/workflow-rules.test.ts` "todo fallback"
- Explore overrides the stock hand-off → `tests/workflow-rules.test.ts` "explore hand-off"
- Brainstorm redirected, Skill missing (planning) → `tests/planning-commands.test.ts` Superpowers block, reading `workflow.md`
- Change created and stopped, Name exists → `tests/planning-commands.test.ts` new block
- Continue scenarios (Brainstorm then proposal, Gate before stop, Approval does not advance, Changes requested, Dismissed, Meaningful note on approval, Planning already complete, Planning completes mid-loop) → `tests/planning-commands.test.ts` continue block, reading `workflow.md` § continue
- Fast-forward scenarios (Reaches plan and gates, Brainstorm gate first, Final gate blocks apply pointer, Grounded tasks, Design always created, Skipped artifact reported) → `tests/planning-commands.test.ts` ff block
- Explore scenarios (No implementation, Consent before writing, Schema edits refused, Scaffold and hand off, Plain diagrams) → `tests/planning-commands.test.ts` explore block
- Interrupted specs, Planning complete, Older status output, Dependencies re-read → `tests/planning-commands.test.ts` partial-artifacts block
- Explore with repository recon, Small conceptual question → `tests/planning-commands.test.ts` recon block
- Continue reviews one artifact, Fast-forward retains two planned stops, Planning review without subagents → `tests/planning-commands.test.ts` review-seat block
- Continue passes main specs, Fast-forward passes main specs, Inline check uses the baseline → `tests/planning-commands.test.ts` baseline block

**execution-commands**
- Prompts exist without package skills, Prompt maps to its stock skill, Mapped stock skill missing, Excluded commands absent → `tests/execution-commands.test.ts` prompt block
- Sections present (execution), Delegation through the paragraph → `tests/workflow-rules.test.ts` "execution sections", "delegation names"
- Blocked change, Blocked by a missing tracking file, Stops after the receipt, Schema apply block replaces the stock loop → `tests/execution-commands.test.ts` apply block, reading `workflow.md` § apply
- With pi-subagents, Without pi-subagents, Unusable delegated executor → executor block
- Feedback after a PR is open → post-PR block
- Missing apply receipt, Verify in the worktree, Failing verify → verify block
- Sync only, Project rules applied, Instructions unavailable → sync block
- Archive scenarios (Unsynced deltas, Already synced, Incomplete artifacts, Sync verified before archive, Missing main spec, Task counts from the CLI, Skipped artifact, Unclear answer, Archive through the CLI) → archive block
- Skill missing (execution) → Superpowers block
- Located tick, Checkbox changed, Partial behavior → task-location block
- Added scope, Deferred behavior, Tracking file missing, All tracked tasks done → scope block
- Verify stays read-only, Progress from apply, Skipped check → verify-read-only block
- Executor briefed on contracts, Public contract needs a change, Internal contract change recorded → contracts block
- Matching contracts, Mismatched contract, Contract cannot be compared → verify-contracts block
- Fresh delegated evidence, Failing or missing evidence, Inline verify fallback → delegated-verify block

**routing-note**
- Skills removed by an update, All stock skills present, No side effects, No UI → `tests/extension.test.ts` stock-skills session block and `tests/stock-skills.test.ts`
- Note text, Path stated, Specified behaviour confirmed, No forced change, Paragraphs present, Stock skill mapping, Stock skills paragraph first, Subagent paragraph last, No enforcement → `tests/routing-note.test.ts`

**package-activation**
- Activated project, Unmarked project, Outside any project, Stock skills not returned → `tests/extension.test.ts` resources_discover block
- Visible when marked, Hidden when unmarked → `tests/activation.test.ts` and `docs/e2e-checklist.md`
- Only the generate-specs skill, No placeholder resources → `tests/planning-commands.test.ts` layout test

**review-gate**
- One section, Referenced, not repeated → `tests/workflow-rules.test.ts` "single gate section"
- Gate on the injected channel, Agent tool available, CLI only, No Plannotator, Nothing installed, Open failure falls through → `tests/interaction-channel.test.ts` (unchanged)
- No tool names in the gate section → `tests/workflow-rules.test.ts` "gate section tool names"

**init-command**
- Skills present, Profile ready, Default profile, Unreadable configuration, Global configuration untouched → `tests/init/init.test.ts` stock-skill block and `tests/init/stock-skills.test.ts`
- Supported version, Version too old, OpenSpec not installed → `tests/init/preflight.test.ts`
- Fresh repository, Existing project without stock skills, Existing openspec directory, Init fails → `tests/init/init.test.ts` project-creation block
- Foreign schema present, Edited schema without force, Older schema with local edits without force, Newer schema without force → `tests/init/init.test.ts` (existing, legacy expectations removed)
- Validation passes, Report after installing stock skills, Validation fails, Validation fails after replacement → `tests/init/init.test.ts`
- Second run is a no-op, End to end on an empty repository, Missing stock skills restored, Existing language preserved → `tests/init/init.test.ts` and `tests/init/integration.test.ts`
- Blocked project with a flag, Blocked project without a flag, Upgraded project with a flag → `tests/init/init.test.ts` language block

**bundled-schema**
- File shipped, Every instruction points to it, Still valid → `tests/schema.test.ts`
- Reference location, Linked from workflow.md → `tests/schema.test.ts` and `tests/subagent-routing.test.ts`
- Identity fields, Validates in a temp project, Upstream credit, No artifact ID changes → `tests/schema.test.ts`
- No tool names → `tests/schema.test.ts` harness-neutral scan

**subagent-routing**
- Integration policy loaded, Plugin-neutral reference, Role requirements listed, Compatibility links survive the copy → `tests/subagent-routing.test.ts`

**project-readme**
- Required install commands present, Unused stock skills explained, OpenSpec profile explained, Optional packages explained, Subagent plugin support stated, Coding standard skill explained, Remaining files stated → `tests/project-readme.test.ts`

**usage-guide**
- Commands not appearing, Existing schema is not overwritten, Upgrade after a package update, Profile missing workflows, Stock skills removed by an update, Two upgrade paths, Restore from backup → `tests/project-readme.test.ts` "usage guide" block (new in Task 5 Step 1)

**generate-specs-command**
- With pi-subagents, Without pi-subagents, Interrupted generation, Reference path → `tests/generate-specs-command.test.ts`

**legacy-cleanup** (retired)
- No legacy files, Legacy files found, User confirms, User declines, Non-interactive session, Unrelated files preserved → removed with `tests/init/legacy.test.ts`. OpenSpec 2.0 covers them; `docs/e2e-checklist.md` records the manual check that `/opsx-init` on a 1.x-initialised project removes `.pi/prompts/opsx-*.md` and keeps `.pi/prompts/mine.md`.
