## Context

pi-superspec is a pi package. Its commands and skills must load only in projects that
the package initialised (`docs/architecture.md` goals 2 and 3). The repo has docs and
OpenSpec scaffolding but no `package.json`, TypeScript config, extension or tests.

pi 1.5.0 fires `resources_discover` with `{ cwd, reason }` and accepts
`{ skillPaths, promptPaths, themePaths }`. Extensions are plain `.ts` files that pi
loads itself, so no build output is needed.

This change implements only activation: Components, Runtime flow (activation only),
Constraints (pi package API) and Testing (root discovery, marker detection). Schema
content, `/opsx-init`, real skills and prompts, upgrade, routing note and README are
separate changes.

## Goals / Non-Goals

**Goals:**
- A valid pi package: keyword `pi-package`, `pi.extensions` only, host packages as
  `peerDependencies` `"*"`.
- TypeScript and a test harness that later changes reuse.
- An extension that returns skill and prompt paths only for a marked project.
- A placeholder skill and prompt that prove activation, and fixtures with and without
  the marker.

**Non-Goals:**
- Schema content or version handling (`superspec-schema-v5`, `schema-auto-upgrade`).
- `/opsx-init`, the routing note, real opsx skills and prompts, README.
- Editing `openspec/schemas/superspec/` (upstream v4 used to develop this repo).

## Decisions

1. **Pure logic split from the pi adapter.** `extensions/activation.ts` exports
   `findProjectRoot(cwd)` and `isActivated(root)`; `extensions/superspec.ts` is a thin
   default export that wires them to `resources_discover`. Why: logic is testable
   without pi; the adapter test only needs a fake `pi.on`.
2. **Root discovery: nearest `openspec/` wins.** Walk up from `cwd`; the first
   directory containing an `openspec/` directory is the root. An unmarked nearest
   project does not fall through to a marked ancestor. Why: matches how OpenSpec
   itself resolves a project, and avoids activating on the wrong schema.
3. **Marker detection by line match, not a YAML parser.** `isActivated` reads
   `openspec/schemas/superspec/schema.yaml` and tests `/^x-pi-superspec:/m`
   (column 0). Missing file, read error or no match means not activated; never throws.
   Alternative: parse with `yaml`. Rejected for now: adds a runtime dependency for a
   boolean; the version value is needed only by the upgrade change, which can add a
   parser then.
4. **Return directories.** The handler returns `[<pkg>/skills]` and `[<pkg>/prompts]`
   so later changes only add files. Package paths derive from `import.meta.url`.
   Fallback if pi rejects directories: return the files explicitly.
5. **Manifest.** `pi.extensions: ["./extensions/superspec.ts"]` only; no `skills` or
   `prompts` keys, so nothing loads outside activation. `files` allow-lists
   `extensions`, `skills`, `prompts`.
6. **Tooling.** Vitest for tests, `tsc --noEmit` for type checking, npm scripts
   `test` and `typecheck`, ESM (`"type": "module"`), no build step. Alternatives
   `node:test` + `tsx` and `bun test` rejected (see brainstorm).
7. **Fixtures.** Checked-in directories `tests/fixtures/{marked,unmarked,no-openspec}`;
   tests read but never mutate them.

## Risks / Trade-offs

- [pi rejects directory entries in `skillPaths`/`promptPaths`] → implement decision 4
  with a test against real pi (`pi -e .`); switch to explicit files if needed.
- [Line match misses a marker written in flow style or indented] → documented
  convention: the marker is a top-level block key written by the bundled schema; the
  upgrade change may replace this with a parser.
- [Marker in a YAML comment or string matches] → the anchored `^` pattern rejects
  `# x-pi-superspec:` and indented occurrences; covered by tests.
- [`resources_discover` runs on every reload, reading one small file] → negligible.
- [Placeholder names collide with later real commands] → placeholder is named
  `opsx-placeholder` / `superspec-placeholder` and is deleted by the change that adds
  real ones.
