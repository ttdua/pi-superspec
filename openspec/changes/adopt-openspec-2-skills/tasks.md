## 1. Schema v9: workflow.md, subagent-routing.md, instruction pointers

Blocked by: none

- [x] 1.1 Write `schema/superspec/workflow.md` with sections explore, new, continue, ff, apply, verify, sync, archive, Review gate, Superpowers rule and Stock skills not used. Port every rule from `skills/opsx-*/SKILL.md` that `schema.yaml` does not already state, per design D2. Use harness-neutral wording: no pi or plugin tool names, commands spelled `/opsx-<cmd>`.
- [x] 1.2 Move `skills/references/subagent-routing.md` to `schema/superspec/subagent-routing.md`; turn its links to `docs/architecture.md` and `docs/e2e-checklist.md` into absolute repository URLs.
- [x] 1.3 Start every artifact `instruction` and the `apply` instruction in `schema/superspec/schema.yaml` with the `workflow.md` pointer sentence. Bump `version` and `x-pi-superspec.version` to 9 and update the header comment.
- [x] 1.4 Record the v9 digest in `tests/fixtures/schema-checksums.json`; update `tests/schema.test.ts` for v9, the `workflow.md` sections, the pointer sentence, harness-neutral wording over `workflow.md` and `subagent-routing.md`, and `openspec schema validate superspec`.
- [x] 1.5 Move each skill-text assertion of `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts` and `tests/subagent-routing.test.ts` that targets a rule now in `workflow.md` or `subagent-routing.md` so it reads those files. Keep one test per scenario of the planning-commands, execution-commands, review-gate, bundled-schema and subagent-routing deltas.

## 2. Prompts and package skills

Blocked by: 1

- [x] 2.1 Rewrite `prompts/opsx-{explore,new,continue,ff,apply,verify,sync,archive}.md` to name the mapped stock skill and its `workflow.md` section, state that `workflow.md` wins on conflict, and pass `$@`.
- [x] 2.2 Delete `skills/opsx-{explore,new,continue,ff,apply,verify,sync,archive}/` and `skills/references/`.
- [x] 2.3 Point `skills/opsx-generate-specs/SKILL.md` at `openspec/schemas/superspec/subagent-routing.md` instead of `../references/subagent-routing.md`.
- [x] 2.4 Update `tests/planning-commands.test.ts`, `tests/execution-commands.test.ts`, `tests/generate-specs-command.test.ts`, `tests/plugin-neutral.test.ts` and `tests/extension.test.ts` for prompts mapping to stock skills, the only remaining package skill, and the new reference path.

## 3. Routing note and session warning

Blocked by: 1

- [x] 3.1 Add the stock skills paragraph (command → stock skill map, the `workflow.md` override, unused stock skills) to `extensions/routing-note.ts`, before the document language paragraph.
- [x] 3.2 Add a file-only check for the eight stock skills under `.agents/skills/` and a `session_start` warning in `extensions/superspec.ts` (activated project with a UI; a failure never reaches the user).
- [x] 3.3 Cover both in `tests/routing-note.test.ts` and `tests/extension.test.ts`.

## 4. /opsx-init on OpenSpec 2.0

Blocked by: none

- [x] 4.1 Raise the preflight in `extensions/init/preflight.ts` to OpenSpec ≥ 2.0 and update its message; update `tests/init/preflight.test.ts` and the default version in `tests/helpers/io.ts`.
- [x] 4.2 Add the stock skill check and profile reading (`openspec config list --json`), with the stop-and-instruct path, in a new `extensions/init/stock-skills.ts`; test it in `tests/init/stock-skills.test.ts`.
- [x] 4.3 In `extensions/init/init.ts`, run `openspec init --tools pi` when `openspec/` or a stock skill is missing; remove every legacy cleanup call; add the commit-and-profile lines to the report; update `tests/init/init.test.ts`.
- [x] 4.4 Delete `extensions/init/legacy.ts` and `tests/init/legacy.test.ts`.
- [x] 4.5 Make `tests/init/integration.test.ts` require OpenSpec ≥ 2.0 (skip otherwise) and run it with an isolated `XDG_CONFIG_HOME` whose custom profile selects the eight workflows; assert activation, validation and the eight stock skills.

## 5. Documentation

Blocked by: 1, 2, 3, 4

- [ ] 5.1 Update `README.md` and `README.vi.md`: OpenSpec ≥ 2.0 and the profile command with the eight workflows; uninstall leaves `.agents/skills/`; the commands now run stock skills.
- [ ] 5.2 Update `docs/architecture.md` (Goals 2–3, components, `/opsx-init` steps, tool mapping, tested OpenSpec version) and `docs/workflow.md` (commands, conflicts resolved, routing note).
- [ ] 5.3 Update `docs/usage-guide.md` with the profile and missing-skills troubleshooting and the two upgrade paths; add the shipped-layout checks (ff gate stop, apply worktree and executor) to `docs/e2e-checklist.md`.
- [ ] 5.4 Add a breaking `CHANGELOG.md` entry; update `tests/project-readme.test.ts` and `tests/docs-subagents.test.ts` to the new text.
- [ ] 5.5 Update the `## Purpose` lines of `openspec/specs/planning-commands/spec.md`, `openspec/specs/execution-commands/spec.md` and `openspec/specs/bundled-schema/spec.md` to describe prompts running stock skills under `workflow.md` and to drop the fixed schema version (sync keeps an existing Purpose, so this edit is manual).
- [ ] 5.6 Run `bun run typecheck` and `bun run test`, and `openspec validate adopt-openspec-2-skills --strict`.
