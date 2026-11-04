## 1. Publish the namespaced specialist catalog

- [x] 1.1 Add the six `agents/*.md` definitions and discovery/publication metadata in `package.json`; cover identities, tools, context, skills, model ownership, and report boundaries in `tests/agents.test.ts` and `tests/manifest.test.ts`; document package ownership in `docs/architecture.md`, `docs/domain-model.md`, and `docs/glossary.md`.

## 2. Define shared integration policy

- [x] 2.1 Add `skills/references/subagent-routing.md` with availability, output binding, handoff, authority and failure rules; verify it in `tests/subagent-routing.test.ts`; document capabilities and compatibility limits in `docs/architecture.md`.

## 3. Route exploration and planning

- [x] 3.1 Update explore, continue, and ff skills to read the shared reference, use bounded reconnaissance and the existing spec/plan review seats, and preserve human gates; cover this in `tests/planning-commands.test.ts` and update `docs/workflow.md`.

## 4. Route execution and verification

- [x] 4.1 Update apply and verify skills to use the namespaced SDD seats and independent verifier evidence, preserve inline fallback and parent-owned receipts, and test these rules in `tests/execution-commands.test.ts`; update `docs/usage-guide.md` execution sections.

## 5. Separate capability evidence from official specs

- [x] 5.1 Update generate-specs to use evidence-only scouts and parent-authored specs with internal spec review, retaining confirmation, resume, format, language and validation contracts; update `tests/generate-specs-command.test.ts`, `docs/usage-guide.md`, and the generate-specs component description in `docs/architecture.md`.

## 6. Validate packaged integration and hand over

- [ ] 6.1 Update `README.md`, `README.vi.md`, and `docs/e2e-checklist.md`; run the complete test/typecheck and package checks plus real Pi/pi-subagents discovery/delegation smoke cases, recording exact build identities, run evidence and any blockers before claiming integration verified.
