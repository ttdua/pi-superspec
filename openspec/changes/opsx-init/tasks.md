## 1. Pi API and shared types

- [x] 1.1 Verify the installed pi types for `registerCommand`, confirm/notify UI, `ctx.hasUI`, `ctx.reload()` and Superpowers discoverability; record findings in the plan (`npm install` first if `node_modules` is absent)
- [x] 1.2 Define the `InitIO` interface (`exec`, `confirm`, `notify`, `reload`, `cwd`, `hasUI`) in `extensions/init/io.ts`

## 2. Preflight and config merge

- [x] 2.1 Write failing tests for the version check (supported, too old, missing) and implement `extensions/init/preflight.ts`, including the git and Superpowers warnings
- [x] 2.2 Write failing tests for the `config.yaml` merge (replace, add, create, preserve keys and comments, nested `schema` untouched, no write when already set) and implement `extensions/init/config.ts`

## 3. Schema install and lock

- [x] 3.1 Write failing tests for hashing and the lock file (sorted keys, trailing newline, deterministic bytes, lock excluded from `files`) and implement them in `extensions/init/schema-install.ts`
- [x] 3.2 Write failing tests for classifying an existing schema dir (absent, identical, foreign, edited, older, newer) and implement install-or-report with no writes in the non-install cases

## 4. Legacy cleanup

- [ ] 4.1 Write failing tests for detecting `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*` and for confirm, decline, non-interactive and unrelated-file cases; implement `extensions/init/legacy.ts`

## 5. Orchestrator and command

- [ ] 5.1 Write failing tests for the orchestrator order, `openspec init --tools none` only when `openspec/` is missing, validate failure skipping reload, and reload plus next-step output; implement `extensions/init/init.ts`
- [ ] 5.2 Register `/opsx-init` in `extensions/superspec.ts`, adapting pi's command `ctx` to `InitIO`, and extend `tests/extension.test.ts` for registration

## 6. Integration and verification

- [ ] 6.1 Add an integration test on an empty temp git repo with a real `openspec` (skipped when absent): valid and activated after run one, no file changes after run two, custom `config.yaml` keys survive
- [ ] 6.2 Run `npm test` and `npm run typecheck`
- [ ] 6.3 Run `pi -e .` in an empty git repo, execute `/opsx-init`, and confirm the opsx commands appear after reload
