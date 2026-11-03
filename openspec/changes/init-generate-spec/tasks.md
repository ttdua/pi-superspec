## 1. `--generate` in /opsx-init

- [x] 1.1 Extend `parseInitArgs` in `extensions/init/args.ts` to remove a standalone `--generate` token, return `generate: true`, and keep `--lang` parsing unchanged; reject `--generate=<x>` and a repeated `--generate` (tests in `tests/init/args.test.ts`)
- [x] 1.2 In `extensions/init/init.ts`, add the `/opsx-generate-specs` next step to the activation report only when the flag is set; no hint for blocked, preflight-failed or validation-failed outcomes (tests in `tests/init/init.test.ts`)
- [x] 1.3 Update the usage text in the unknown-argument error to `/opsx-init [--lang <language>] [--generate]`
- [x] 1.4 Add an integration test: `--generate` on an empty temp git repo activates, and a second run leaves every file byte-identical (`tests/init/integration.test.ts`)

## 2. `/opsx-generate-specs` skill and prompt

- [ ] 2.1 Write `skills/opsx-generate-specs/SKILL.md`: precondition, MAP, existing-spec filtering, CONFIRM, bootstrap change, SCOUT dispatch with sequential fallback, spec output format with `Evidence:` and `Confidence: inferred`, document language, other artifacts, hand-off to `/opsx-ff bootstrap-specs`
- [ ] 2.2 Write `prompts/opsx-generate-specs.md` that delegates to the skill and references `$@`
- [ ] 2.3 Add content tests for the pair (pair exists and matches, no forbidden tool names, key rules present) alongside the existing command tests

## 3. Docs

- [ ] 3.1 Update `docs/architecture.md` (`/opsx-init` flag, components, runtime flow note that the new prompt is discovered after activation)
- [ ] 3.2 Update `docs/usage-guide.md` with the existing-codebase bootstrap section
- [ ] 3.3 Update the command table in `README.md` and `README.vi.md` (add `/opsx-generate-specs`, mention `--generate` on the init row) and keep the table test green
- [ ] 3.4 Add a `CHANGELOG.md` entry

## 4. Verification

- [ ] 4.1 Run `npm run typecheck` and `npm test`
- [ ] 4.2 Run `openspec validate init-generate-spec --strict`
