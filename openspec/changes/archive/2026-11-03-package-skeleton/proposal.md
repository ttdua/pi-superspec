## Why

pi-superspec has docs but no package: nothing pi can load. Later changes (schema, `/opsx-init`, opsx commands, upgrade) all need a pi package, a TypeScript and test harness, and the activation rule that keeps commands out of unmarked projects. Doing this first lets every later change build and test on it.

## What Changes

- Add `package.json` as a pi package (`pi-package` keyword, `pi.extensions` only, host packages as `peerDependencies` `"*"`).
- Add TypeScript config and a Vitest test harness for the whole repo.
- Add `extensions/superspec.ts`: finds the project root (first directory up with `openspec/`) and, on `resources_discover`, returns `skillPaths` and `promptPaths` only when `openspec/schemas/superspec/schema.yaml` has the `x-pi-superspec` marker.
- Add one placeholder skill and one placeholder prompt to prove activation.
- Add test fixtures with and without the marker.

## Capabilities

### New Capabilities
- `package-activation`: project root discovery, marker detection, and conditional return of skill and prompt paths on `resources_discover`.
- `package-manifest`: pi package manifest rules (keyword, extensions-only declaration, peer dependencies, published files).

### Modified Capabilities

## Impact

- New files at the repo root (`package.json`, `tsconfig.json`, `vitest.config.ts`), `extensions/`, `skills/`, `prompts/`, `tests/`.
- New dev dependencies: `typescript`, `vitest`, `@earendil-works/pi-coding-agent` (types, also a peer). No runtime dependencies.
- No change to `openspec/schemas/superspec/` or any existing docs.
