# docs-release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the README (EN + VI), usage guide, e2e checklist, license and release metadata so a new user can follow the README on a clean repo to a first archived change.

**Architecture:** Documentation and metadata only. Facts are read from `extensions/`, `prompts/`, `skills/` and `schema/superspec/` first; every doc claim is then checked against them. The README is short and links to `docs/usage-guide.md`; `README.vi.md` mirrors the README section for section.

**Tech Stack:** Markdown, `package.json`, `openspec` CLI, `npm test`, `npm run typecheck`, shell checks (`grep`, `diff`).

**Spec:** `openspec/changes/docs-release/specs/` (project-readme, usage-guide, release-metadata) and `openspec/changes/docs-release/design.md`; source docs `docs/architecture.md` (Non-goals, Constraints, Testing) and `docs/workflow.md`.

## Global Constraints

- Install lines verbatim: `brew install openspec`, `pi install git:github.com/obra/superpowers`, `pi install https://github.com/ttdua/pi-superspec`.
- Optional packages: `pi-subagents`, `rpiv-ask-user-question`, `rpiv-todo`.
- Commands: `/opsx-init`, `/opsx-explore`, `/opsx-new`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`; `opsx-propose` and `opsx-bulk-archive` are not shipped.
- License MIT; credits: Superspec (Daniel Hanold), JiangWay `sdd-plus-superpowers`, OpenSpec.
- All repository content is English except `README.vi.md`. `openspec/schemas/superspec/` and `schema/superspec/LICENSE` are never edited.
- `package.json`: add only `repository`, `homepage`, `bugs`; do not touch `scripts`, dependencies, `files` or `pi`.
- No code, prompt, skill or schema changes. A doc that cannot be made true without one is recorded as a finding in `apply.md`, not fixed.

## Review Focus

- Clean repo with no `openspec/` and no git: README must say `/opsx-init` warns (not a git repo) and still proceeds.
- Existing project schema that differs from the bundled one (edited, foreign, older, newer): guide must say `/opsx-init` warns and writes nothing, and that auto-upgrade, `--force` and backup are not yet shipped.
- Project already initialised by upstream Superspec v4 (no marker): guide must say `/opsx-init` offers migration after backup.
- Uninstall: README must not claim `openspec/schemas/superspec/` or the lock file is removed.

---

## File Structure

| File | Responsibility |
|---|---|
| `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `package.json` | release metadata |
| `README.md`, `README.vi.md` | front door, install, quick start, command table, uninstall, credits |
| `docs/usage-guide.md` | full walkthrough, ff, executor variants, upgrades, troubleshooting |
| `docs/e2e-checklist.md` | manual end-to-end checklist |
| `docs/architecture.md`, `workflow.md`, `domain-model.md`, `glossary.md` | aligned with what shipped |

### Task 1: Ground truth — implements 1.1, 1.2

**Files:**
- Create: `openspec/changes/docs-release/notes.md` (scratch facts; deleted in Task 7)

**Interfaces:**
- Produces: `notes.md` with sections `Init`, `Upgrade`, `Uninstall`, `Commands`, `Doc drift`; later tasks quote only facts recorded there.

- [ ] **Step 1:** Read `extensions/init/*`, `extensions/activation.ts`, `extensions/superspec.ts`, `extensions/routing-note.ts` and record under `Init`/`Upgrade`: the `/opsx-init` steps and messages, the `--force` flag and backup path, the five upgrade cases, the write guards (main checkout, trusted, `hasUI`), the lock file name.
- [ ] **Step 2:** Read `prompts/opsx-*.md` and `skills/opsx-*/SKILL.md`; record under `Commands` each command's arguments and what it stops before.
- [ ] **Step 3:** Record under `Uninstall` exactly which files remain in a project after the package is removed (`openspec/`, `openspec/schemas/superspec/`, `.pi-superspec.json`).
- [ ] **Step 4:** Diff `docs/*.md` against the facts and list each mismatch under `Doc drift`.
- [ ] **Step 5:** Verify: `grep -c '^## ' openspec/changes/docs-release/notes.md` prints `5`.
- [ ] **Step 6:** Commit: `git add openspec/changes/docs-release/notes.md && git commit -m "docs(docs-release): record ground-truth notes"`

### Task 2: Release metadata — implements 2.1, 2.2, 2.3, 2.4

**Files:**
- Create: `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `CONTRIBUTING.md` heading `## Keeping the READMEs in sync` that Task 4 does not need to reference.

- [ ] **Step 1: Check (fails first):** `test -f LICENSE && grep -q 'MIT License' LICENSE` — Expected: fails (no file).
- [ ] **Step 2:** Create `LICENSE` with the MIT text, `Copyright (c) 2026 <git config user.name>`; leave `schema/superspec/LICENSE` untouched.
- [ ] **Step 3:** Add to `package.json`: `repository` `{ "type": "git", "url": "git+https://github.com/ttdua/pi-superspec.git" }`, `homepage` `https://github.com/ttdua/pi-superspec#readme`, `bugs` `{ "url": "https://github.com/ttdua/pi-superspec/issues" }`.
- [ ] **Step 4:** Create `CHANGELOG.md` (Keep a Changelog style) with one `## [0.1.0]` entry listing shipped capabilities taken from `openspec/specs/` names.
- [ ] **Step 5:** Create `CONTRIBUTING.md` covering: changes go through the OpenSpec workflow; `npm test` and `npm run typecheck`; `openspec/schemas/superspec/` is never edited; English-only content except `README.vi.md`; section `## Keeping the READMEs in sync`.
- [ ] **Step 6: Check (passes):**
  - `grep -q 'MIT License' LICENSE`
  - `git diff --stat schema/superspec/LICENSE` prints nothing
  - `git diff package.json | grep '^[-+]' | grep -v '^+++\|^---'` shows only added lines for `repository`, `homepage`, `bugs`
  - `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"` exits 0
  - `grep -q 'npm run typecheck' CONTRIBUTING.md && grep -q 'openspec/schemas/superspec' CONTRIBUTING.md && grep -q 'README.vi.md' CONTRIBUTING.md`
- [ ] **Step 7:** Commit: `git add LICENSE CHANGELOG.md CONTRIBUTING.md package.json && git commit -m "docs: add license, changelog, contributing and package metadata"`

### Task 3: English README — implements 3.1

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Task 1 `notes.md`.
- Produces: top-level headings, in this order, which Task 4 mirrors: `What it is`, `Prerequisites`, `Install`, `Quick start`, `Commands`, `Uninstall`, `Credits and license`.

- [ ] **Step 1: Check (fails first):** the scenario checks in Step 3 against a missing file.
- [ ] **Step 2:** Write `README.md` with the headings above. First lines link to `README.vi.md`. `Install` lists the three required commands in order, then the optional packages each with its fallback (from `docs/architecture.md` pi tool mapping). `Quick start` runs `/opsx-init` then `/opsx-new`, `/opsx-continue` (repeat), `/opsx-apply`, `/opsx-verify`, finalize, `/opsx-archive`, states the git-repo and clean-tree prerequisites found in Task 1, and links to `docs/usage-guide.md`. `Commands` is a table of all nine commands, plus a line that `opsx-propose` and `opsx-bulk-archive` are not shipped. `Uninstall` names the remaining files from `notes.md`. `Credits and license` links the three projects and `LICENSE`.
- [ ] **Step 3: Checks (scenario → check)**
  - Default language / VI link: `head -10 README.md | grep -q 'README.vi.md'`
  - Install order: `grep -n 'brew install openspec\|pi install git:github.com/obra/superpowers\|pi install https://github.com/ttdua/pi-superspec' README.md` prints three lines with ascending line numbers
  - Optional packages: `for p in pi-subagents rpiv-ask-user-question rpiv-todo; do grep -q "$p" README.md || echo MISSING $p; done` prints nothing
  - Quick start reaches archive / guide link: `grep -q 'opsx-archive' README.md && grep -q 'docs/usage-guide.md' README.md`
  - Table matches prompts: `diff <(ls prompts | sed 's/\.md$//;s/^opsx-/\/opsx-/' | sort) <(grep -o '`/opsx-[a-z]*`' README.md | tr -d '`' | sort -u | grep -v '^/opsx-init$')` prints nothing
  - Uninstall: `grep -q 'openspec/schemas/superspec' README.md && grep -q '.pi-superspec.json' README.md`
  - Credits: `grep -q 'sdd-plus-superpowers' README.md && grep -q 'danielhanold/superspec' README.md && grep -q 'Fission-AI/OpenSpec' README.md && grep -q 'MIT' README.md`
- [ ] **Step 4:** Commit: `git add README.md && git commit -m "docs: add English README"`

### Task 4: Vietnamese README — implements 3.2

**Files:**
- Create: `README.vi.md`

**Interfaces:**
- Consumes: Task 3 headings and content.

- [ ] **Step 1: Check (fails first):** Step 3 against a missing file.
- [ ] **Step 2:** Translate `README.md` into Vietnamese keeping the same section order, the same code blocks and command names untranslated, and technical keywords in English. First lines link to `README.md`; the usage-guide link points to the English `docs/usage-guide.md` with a note that it is English only.
- [ ] **Step 3: Checks (scenario → check)**
  - Back link: `head -10 README.vi.md | grep -q 'README.md'`
  - Same structure: `diff <(grep -c '^## ' README.md) <(grep -c '^## ' README.vi.md)` prints nothing
  - Same code blocks: `diff <(grep -c '^```' README.md) <(grep -c '^```' README.vi.md)` prints nothing
  - Same commands: `diff <(grep -o '/opsx-[a-z]*' README.md | sort -u) <(grep -o '/opsx-[a-z]*' README.vi.md | sort -u)` prints nothing
- [ ] **Step 4:** Commit: `git add README.vi.md && git commit -m "docs: add Vietnamese README"`

### Task 5: Usage guide — implements 4.1, 4.2

**Files:**
- Create: `docs/usage-guide.md`

**Interfaces:**
- Consumes: `notes.md`, `docs/workflow.md` step table.
- Produces: heading anchors `#fast-forward-with-opsx-ff`, `#troubleshooting` referenced by the e2e checklist.

- [ ] **Step 1: Check (fails first):** Step 3 against a missing file.
- [ ] **Step 2:** Write the guide with sections: `Before you start`, `Step by step` (one subsection per workflow step 1–10, each saying what the user does, what the agent produces, and the output file), `Fast-forward with /opsx-ff` (brainstorm interactive, rest unattended through plan, stops before apply, then `/opsx-apply`), `Executors` (with `pi-subagents`: SDD; without: `executing-plans` plus whole-branch review; `rpiv-ask-user-question` / `rpiv-todo` fallbacks), `Existing schemas` (as shipped, from `notes.md`: fresh install, identical → unchanged, any other state → warning and no writes; state plainly that auto-upgrade, `--force` and backup are not yet shipped; no invented behaviour), `Troubleshooting` (commands missing → run `/opsx-init`, reload; OpenSpec < 1.4; Superpowers not found). Link to `workflow.md` rather than restating its conflict table.
- [ ] **Step 3: Checks (scenario → check)**
  - Ten steps covered: `for s in brainstorm proposal design specs tasks plan apply verify finalize archive; do grep -qi "$s" docs/usage-guide.md || echo MISSING $s; done` prints nothing
  - Output named per step: `grep -c 'brainstorm.md\|proposal.md\|design.md\|specs/\|tasks.md\|plan.md\|apply.md\|verify.md\|finalize.md' docs/usage-guide.md` prints 9 or more
  - ff stops before apply: `grep -A12 'Fast-forward' docs/usage-guide.md | grep -qi 'apply'`
  - Both executors: `grep -q 'executing-plans' docs/usage-guide.md && grep -q 'subagent' docs/usage-guide.md`
  - Existing schema and troubleshooting: `grep -qi 'not yet shipped' docs/usage-guide.md && grep -qi 'troubleshooting' docs/usage-guide.md`
- [ ] **Step 4:** Commit: `git add docs/usage-guide.md && git commit -m "docs: add usage guide"`

### Task 6: E2E checklist — implements 4.3

**Files:**
- Create: `docs/e2e-checklist.md`

**Interfaces:**
- Consumes: guide anchors from Task 5.

- [ ] **Step 1: Check (fails first):** Step 3 against a missing file.
- [ ] **Step 2:** Write the checklist: preconditions, then `Run A — with pi-subagents` and `Run B — without pi-subagents`, each a numbered checkbox list from `/opsx-init` through `/opsx-archive` covering the ten workflow steps; every item ends with `Expected:` and the observable result (file exists, command listed, status output, archive directory). Include an `/opsx-ff` variant item in each run.
- [ ] **Step 3: Checks (scenario → check)**
  - Both runs: `grep -c '^## Run ' docs/e2e-checklist.md` prints `2`
  - Expected results: `diff <(grep -c '^- \[ \]' docs/e2e-checklist.md) <(grep -c 'Expected:' docs/e2e-checklist.md)` prints nothing
  - Init through archive: `grep -q 'opsx-init' docs/e2e-checklist.md && grep -q 'opsx-archive' docs/e2e-checklist.md`
- [ ] **Step 4:** Commit: `git add docs/e2e-checklist.md && git commit -m "docs: add manual e2e checklist"`

### Task 7: Align project docs — implements 5.1, 5.2

**Files:**
- Modify: `docs/architecture.md`, `docs/workflow.md`, `docs/domain-model.md`, `docs/glossary.md`
- Delete: `openspec/changes/docs-release/notes.md`

**Interfaces:**
- Consumes: `Doc drift` list from Task 1.

- [ ] **Step 1: Check (fails first):** `for f in README.md README.vi.md LICENSE CHANGELOG.md CONTRIBUTING.md docs/usage-guide.md docs/e2e-checklist.md; do grep -q "$f" docs/architecture.md || echo MISSING $f; done` — Expected: lists missing files.
- [ ] **Step 2:** Update the `docs/architecture.md` component tree to match the repository's top-level contents (extensions subtree, README pair, LICENSE, CHANGELOG, CONTRIBUTING, new docs); add a link to the guide and checklist; point the Testing section's manual end-to-end bullet at `e2e-checklist.md`.
- [ ] **Step 3:** Fix every other item in `Doc drift` across the four docs. Ruling (user-approved): docs describe what shipped — schema auto-upgrade, `--force`, backup, write guards and "repair" are marked as planned (change `schema-auto-upgrade`, not yet shipped), including `docs/architecture.md` Goal 4 and the upgrade table; this deliberate change to a documented decision is stated in the doc itself; where a fix would need a code change, leave the doc accurate to the code and note the finding in `apply.md`.
- [ ] **Step 4:** Delete `notes.md`.
- [ ] **Step 5: Check (passes):** the Step 1 loop prints nothing; `ls | sort` and the architecture tree list the same top-level entries (`diff <(ls -A | grep -v '^\.git$\|node_modules\|^\.' | sort) <(<manual list from the tree>)` is reviewed by eye and recorded in `apply.md`).
- [ ] **Step 6:** Commit: `git add -A docs openspec/changes/docs-release && git commit -m "docs: align project docs with shipped package"`

### Task 8: Clean-repo dry run and final checks — implements 6.1, 6.2, 6.3

**Files:**
- Modify: whichever doc a gap is found in

**Interfaces:**
- Consumes: all docs above.

- [ ] **Step 1:** In a scratch directory (session scratchpad), `git init` a repo and follow `README.md` literally: run every command that does not need an interactive pi session (`openspec --version`, `openspec init --tools none`, copy of the bundled schema as `/opsx-init` does, `openspec schema validate superspec`, `openspec new change demo`, `openspec status --change demo --json`). Record each command and any step the README did not mention.
- [ ] **Step 2:** For every undocumented step found, add it to the README (and `README.vi.md`) and the guide; re-run until none are found. Steps that need a live pi session are listed in `apply.md` as covered by the e2e checklist, not claimed as run.
- [ ] **Step 3:** Check every command, flag and path named in `README.md`, `README.vi.md` and `docs/usage-guide.md`: `grep -o '`[^`]*`' README.md docs/usage-guide.md | sort -u` reviewed against the repository; `grep -o '\](\([^)#]*\)' README.md README.vi.md docs/usage-guide.md | sed 's/](//' | sort -u | while read p; do case $p in http*) ;; *) test -e "$p" || echo BROKEN $p;; esac; done` prints nothing (run from the repo root, adjusting for the guide's relative links).
- [ ] **Step 4:** Run `npm test`, `npm run typecheck` and `openspec validate docs-release`. Expected: all pass.
- [ ] **Step 5:** Commit any fixes: `git add -A && git commit -m "docs: close gaps found in clean-repo dry run"`
