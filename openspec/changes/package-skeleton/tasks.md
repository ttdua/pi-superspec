## 1. Tooling and manifest

- [ ] 1.1 Add `package.json` (`type: module`, keyword `pi-package`, `pi.extensions` only, `peerDependencies` `"*"`, `files` allow-list, `test` and `typecheck` scripts) and install dev dependencies `typescript`, `vitest`, `@earendil-works/pi-coding-agent`
- [ ] 1.2 Add `tsconfig.json` (strict, ESM, `noEmit`) and `vitest.config.ts`
- [ ] 1.3 Add a manifest test covering the `package-manifest` scenarios

## 2. Activation logic

- [ ] 2.1 Add fixtures `tests/fixtures/{marked,unmarked,comment-only,indented-only}` (marked has a nested directory); the "no root" and "nearest wins" cases build trees in an OS temp dir, because this repo's own `openspec/` is an ancestor of every in-repo fixture
- [ ] 2.2 Write failing tests for `findProjectRoot` (cwd, ancestor, none, nearest wins) and implement it in `extensions/activation.ts`
- [ ] 2.3 Write failing tests for `isActivated` (marked, unmarked, missing file, comment/nested marker) and implement it

## 3. Extension and placeholders

- [ ] 3.1 Add `skills/superspec-placeholder/SKILL.md` and `prompts/opsx-placeholder.md`
- [ ] 3.2 Write failing tests for the `resources_discover` handler against a fake pi API (marked, unmarked, outside project) and implement `extensions/superspec.ts`

## 4. Verification

- [ ] 4.1 Run `npm test` and `npm run typecheck`
- [ ] 4.2 Run `pi -e .` in a marked and an unmarked fixture; confirm the placeholder command appears and is hidden respectively, and whether pi accepts directory paths (fallback: return files)
