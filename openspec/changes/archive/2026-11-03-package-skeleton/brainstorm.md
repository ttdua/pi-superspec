## Design Summary

Implements `docs/architecture.md`: Components, Runtime flow (activation only),
Constraints (pi package API) and Testing (unit: root discovery, marker detection).
No documented decision is changed.

Size: small change. Everything below was either stated in the change brief or is
marked **(my call)**.

**Package shape**

```text
pi-superspec/
├── package.json                  # keywords: pi-package; pi.extensions only
├── tsconfig.json
├── vitest.config.ts
├── extensions/
│   ├── superspec.ts              # default export (pi): registers resources_discover
│   └── activation.ts             # pure logic: findProjectRoot, isActivated
├── skills/superspec-placeholder/SKILL.md
├── prompts/opsx-placeholder.md
└── tests/
    ├── activation.test.ts
    ├── extension.test.ts         # handler wiring against a fake pi API
    └── fixtures/{marked,unmarked,comment-only,indented-only}/...
```

**Behaviour**

- `findProjectRoot(cwd)`: walk up from `cwd`; the first directory that contains an
  `openspec/` directory is the root; `undefined` if none. The nearest `openspec/`
  wins even if it is unmarked (no continuing upward past it).
- `isActivated(root)`: true only when `openspec/schemas/superspec/schema.yaml` exists
  and has a top-level `x-pi-superspec:` key. A missing file, unreadable file or
  missing key means not activated. No throw.
- `extensions/superspec.ts` handles `resources_discover` (`{cwd, reason}`): if the
  project is activated it returns `{ skillPaths: [<pkg>/skills], promptPaths:
  [<pkg>/prompts] }`, otherwise `{}`. Package paths come from `import.meta.url`, not
  from `cwd`.
- `package.json`: `keywords: ["pi-package"]`, `pi: { extensions: ["./extensions/superspec.ts"] }`
  and no `skills`/`prompts` keys, so nothing loads outside activation. Host package
  `@earendil-works/pi-coding-agent` is a `peerDependency` `"*"`. `files` ships only
  `extensions`, `skills`, `prompts`, so tests and fixtures are not published.
- Placeholder skill and prompt exist only to prove activation; they are replaced by
  the real opsx skills and prompts in later changes.

**Verification**

- Unit tests: root discovery (nested dir, root itself, none found, nearest wins),
  marker detection (marked, unmarked, schema file missing, key only in a comment or
  nested value), and the handler returns paths for marked and `{}` for unmarked.
- Manual "done when": `pi -e .` from inside a marked fixture shows the placeholder
  command; from an unmarked fixture it does not. Recorded in `tasks.md` 4.2.

## Alternatives Considered

### Alternative A: Vitest + `tsc --noEmit`, npm, no build step
- **Approach**: TypeScript source is loaded directly by pi; Vitest for tests; `tsc` only type-checks.
- **Pros**: later changes (hash check, upgrade, `config.yaml` merge, git guards) need fs/child-process mocking, which Vitest does well; no build output to keep in sync with `pi -e .`.
- **Cons**: one more devDependency family than the minimum.
- **Why not chosen**: chosen.

### Alternative B: `node:test` + `tsx`
- **Approach**: built-in runner, `tsx` to run TS.
- **Pros**: fewer dependencies.
- **Cons**: weaker mocking and watch story for the heavier tests coming in later changes; still needs `tsx`.
- **Why not chosen**: saves little now and costs in the upgrade-logic changes.

### Alternative C: Bun runtime and `bun test`
- **Approach**: bun for install, run and test.
- **Pros**: fast, runs TS natively.
- **Cons**: the target runtime for users is pi on Node; testing under a different runtime can hide differences.
- **Why not chosen**: tests should run on the same runtime users have.

## Agreed Approach

Alternative A, with the pure/IO split above (`activation.ts` testable without pi,
`superspec.ts` as a thin adapter). Marker detection uses a top-level-key line match
rather than a YAML parser, so the skeleton adds no runtime dependency.

## Key Decisions

1. **(my call)** Vitest + `tsc --noEmit`, npm, no build step.
2. **(my call)** Marker detection by line match `^x-pi-superspec:` (column 0), not a YAML parser. Later changes that need the `version:` value may introduce a parser then.
3. **(my call)** Nearest `openspec/` wins; an unmarked nearest project does not fall through to a marked ancestor.
4. **(my call)** Return directory paths (`skills/`, `prompts/`) rather than individual files so later changes only add files. Confirm during implementation that pi accepts directories from `resources_discover`; if not, return the files.
5. **(my call)** Fixtures are plain directories checked in under `tests/fixtures/`; tests never mutate them.
6. From the brief: no `skills`/`prompts` in the manifest; host packages as `peerDependencies` `"*"`.

## Open Questions

- Does pi 1.5.0 accept a directory in `skillPaths`/`promptPaths`? (Decision 4 fallback covers it.)
- Is the `files` allow-list in `package.json` acceptable now, or should it wait for `docs-release`? Defaulting to include it.
