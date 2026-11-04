## 1. Plan contracts and design hint

- [x] 1.1 Add the `## Contracts` section to `schema/superspec/templates/plan.md` before `## Task 1`, and require it (with the `None` rule, name references from per-task `Interfaces`, language-neutral wording) in the `plan` instruction of `schema/superspec/schema.yaml`
- [x] 1.2 Add the public-contract hint to the `design` instruction and to `schema/superspec/templates/design.md`, keeping the `No design needed:` stub rule
- [x] 1.3 Cover both in `tests/schema.test.ts` (template heading order, instruction text, hint text, no tool names)

## 2. Apply

- [x] 2.1 Add the per-task order and the stop rule (public contract asks the user, internal contract updates `plan.md` and logs a deviation) to the `apply:` block in `schema.yaml`
- [x] 2.2 Add the "Contract deviations" section to `schema/superspec/templates/apply.md`
- [x] 2.3 Update `skills/opsx-apply/SKILL.md` to brief the executor on Contracts and record deviations, including in fix iterations and the post-PR loop, with tests in `tests/execution-commands.test.ts`
- [x] 2.4 Cover the apply block and the template in `tests/schema.test.ts`

## 3. Verify

- [x] 3.1 Widen check 5 in the `verify` instruction of `schema.yaml` and in `schema/superspec/templates/verify.md` to design decisions plus `plan.md` Contracts and deviations, with the warning and `not verified` rules
- [ ] 3.2 Update `skills/opsx-verify/SKILL.md` for the contract comparison, with tests in `tests/execution-commands.test.ts`
- [x] 3.3 Update the schema tests that read the verify text (including the `six checks` test) so they still pass

## 4. Docs

- [ ] 4.1 Update `docs/workflow.md` (plan row and step rules for plan, apply.md contents, verify check 5) and `docs/domain-model.md` (`ApplyReceipt` field, plan content, `VerifyReport` check 5)
- [ ] 4.2 Update `docs/usage-guide.md` (verify check list wording) and add a `docs/glossary.md` entry for "Contracts" if the glossary lists artifact terms
- [ ] 4.3 Add a `CHANGELOG.md` entry

## 5. Final check

- [ ] 5.1 Run `npm test` and `npm run typecheck`, then `openspec validate --all --json`, and confirm the schema version is still 6 and `openspec/schemas/superspec/` is untouched
