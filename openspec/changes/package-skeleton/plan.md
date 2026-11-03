# package-skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a loadable pi package whose extension exposes skills and prompts only in projects carrying the `x-pi-superspec` marker.

**Architecture:** `extensions/activation.ts` holds pure functions (`findProjectRoot`, `isActivated`); `extensions/superspec.ts` is a thin pi adapter on `resources_discover`. Package-relative `skills/` and `prompts/` directories are returned only for activated projects. No build step: pi loads the `.ts` directly.

**Tech Stack:** TypeScript (strict, ESM), Vitest, `tsc --noEmit`, npm, `@earendil-works/pi-coding-agent` (types, peer).

**Spec:** `openspec/changes/package-skeleton/{proposal,design,tasks}.md` and `specs/package-activation/spec.md`, `specs/package-manifest/spec.md`

## Global Constraints

- pi package API: `pi.extensions` only in the manifest; no `skills`/`prompts`/`themes` keys.
- Host package `@earendil-works/pi-coding-agent` in `peerDependencies` with `"*"`; no runtime `dependencies`.
- Marker is a top-level key at column 0: `/^x-pi-superspec:/m`.
- Project root = nearest ancestor-or-self directory containing `openspec/`; nearest wins.
- Do not touch `openspec/schemas/superspec/` (upstream v4 dev schema).
- All repo content in English.
- Never mutate checked-in fixtures from tests.

## Review Focus

- `cwd` is a file path or does not exist: no throw, treated as no root.
- `openspec` exists but is a file, not a directory: not a root.
- `schema.yaml` is a directory or unreadable: not activated, no throw.
- Marker with CRLF line endings (`x-pi-superspec:\r\n`): still activated.
- A key that merely starts with the marker name (`x-pi-superspec-foo:`) is not the marker.

---

### Task 1: Tooling and manifest

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` (only if absent: `node_modules/`), `tests/manifest.test.ts`

**Interfaces:**
- Produces: npm scripts `test` (`vitest run`) and `typecheck` (`tsc --noEmit`); every later task runs tests with `npx vitest run <file>`.

- [ ] **Step 1: Write `tests/manifest.test.ts`** reading `package.json` and asserting: `keywords` contains `pi-package`; `pi.extensions` equals `["./extensions/superspec.ts"]`; `pi.skills`, `pi.prompts`, `pi.themes` are undefined; `peerDependencies["@earendil-works/pi-coding-agent"] === "*"`; `dependencies` is undefined or `{}`; `files` contains `extensions`, `skills`, `prompts` and not `tests`.
- [ ] **Step 2: Run** `npx vitest run tests/manifest.test.ts` (after Step 3's install). Expected: FAIL on missing `package.json` fields.
- [ ] **Step 3: Create `package.json`** (`name: pi-superspec`, `version: 0.0.0`, `type: module`, `license: MIT`, fields from Step 1, scripts above), then `npm install -D typescript vitest @earendil-works/pi-coding-agent`. Create `tsconfig.json` (`strict`, `module: NodeNext`, `moduleResolution: NodeNext`, `target: ES2022`, `noEmit`, `allowImportingTsExtensions`, `include: ["extensions","tests"]`) and `vitest.config.ts` (`include: ["tests/**/*.test.ts"]`).
- [ ] **Step 4: Run** `npx vitest run tests/manifest.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `git add -A && git commit -m "chore: add pi package manifest and test tooling"` (ensure `node_modules` is ignored).

### Task 2: Activation logic

**Files:**
- Create: `extensions/activation.ts`, `tests/activation.test.ts`, fixtures under `tests/fixtures/`:
  - `marked/openspec/schemas/superspec/schema.yaml` (contains `name: superspec` and `x-pi-superspec:\n  version: 5`) and `marked/src/nested/.gitkeep`
  - `unmarked/openspec/schemas/superspec/schema.yaml` (`name: superspec`, `version: 4`)
  - `comment-only/openspec/schemas/superspec/schema.yaml` (`# x-pi-superspec:` only)
  - `indented-only/openspec/schemas/superspec/schema.yaml` (`foo:\n  x-pi-superspec: {}`)

**Interfaces:**
- Produces: `findProjectRoot(cwd: string): string | undefined` and `isActivated(root: string): boolean` exported from `extensions/activation.ts`. Neither throws.

- [ ] **Step 1: Create the fixtures above.**
- [ ] **Step 2: Write failing tests** in `tests/activation.test.ts`, with a `mkdtemp(join(tmpdir(), "ps-"))` helper for tree-building cases:
  - `findProjectRoot`: root is cwd (`fixtures/marked`); ancestor (`fixtures/marked/src/nested` → `fixtures/marked`); none (temp dir without `openspec/` → `undefined`); nearest wins (temp tree with `openspec/` at `a/` and `a/b/`, cwd `a/b/c` → `a/b`); `openspec` is a file → not a root; nonexistent cwd → `undefined`.
  - `isActivated`: marked → true; unmarked → false; comment-only → false; indented-only → false; temp root without schema file → false; `schema.yaml` as a directory → false; CRLF marker (written to temp) → true; `x-pi-superspec-foo:` line → false.
- [ ] **Step 3: Run** `npx vitest run tests/activation.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement** both functions in `extensions/activation.ts` using `node:fs` and `node:path`: root walk uses `statSync(join(dir,"openspec")).isDirectory()` in try/catch, loops to `dirname(dir) === dir`; marker read uses `readFileSync` in try/catch and tests `/^x-pi-superspec:/m`.
- [ ] **Step 5: Run** `npx vitest run tests/activation.test.ts && npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: add project root discovery and marker detection`.

### Task 3: Extension, placeholders and end-to-end check

**Files:**
- Create: `extensions/superspec.ts`, `skills/superspec-placeholder/SKILL.md`, `prompts/opsx-placeholder.md`, `tests/extension.test.ts`

**Interfaces:**
- Consumes: `findProjectRoot`, `isActivated` from Task 2.
- Produces: default export `(pi: ExtensionAPI) => void` registering one `resources_discover` handler returning `{ skillPaths: [<pkgRoot>/skills], promptPaths: [<pkgRoot>/prompts] }` when activated, `{}` otherwise; `pkgRoot` from `import.meta.url`.

- [ ] **Step 1: Write failing tests** in `tests/extension.test.ts` using a fake `pi` (`{ on: (name, handler) => ... }` capturing the handler): handler for event `resources_discover` is registered; `cwd = fixtures/marked/src/nested` → result has absolute `skillPaths[0]` ending `/skills` and `promptPaths[0]` ending `/prompts`; `cwd = fixtures/unmarked` → `{}`; temp dir without `openspec/` → `{}`. Also assert both directories exist and contain the placeholder files.
- [ ] **Step 2: Run** `npx vitest run tests/extension.test.ts`. Expected: FAIL.
- [ ] **Step 3: Create the placeholders.** `SKILL.md` with frontmatter `name: superspec-placeholder` and a `description:` stating it only proves activation; `opsx-placeholder.md` with frontmatter `description:` and a one-line body saying so (both removed by later changes).
- [ ] **Step 4: Implement `extensions/superspec.ts`** (`import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"`).
- [ ] **Step 5: Run** `npm test && npm run typecheck`. Expected: all PASS.
- [ ] **Step 6: Manual done-when check.** From `tests/fixtures/marked` run `pi -e <repo>` and confirm the placeholder prompt/skill is listed; repeat in `tests/fixtures/unmarked` and confirm absent. If pi ignores directory paths, change the handler to return the files explicitly, update the tests, re-run Step 5. Record the outcome in the Task 4.2 line of `tasks.md`.
- [ ] **Step 7: Commit** `feat: add superspec extension with activation-gated placeholders`.
