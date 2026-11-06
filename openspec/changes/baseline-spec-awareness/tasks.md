## 1. Bundled schema instructions

- [x] 1.1 Brainstorm instruction in `schema/superspec/schema.yaml` reads the living specs of touched capabilities, cites requirements and states deliberate changes (spec `bundled-schema`: Brainstorm reads the baseline specs)
- [x] 1.2 Proposal instruction confirms Modified Capabilities against the living spec (spec `bundled-schema`: Proposal confirms modified capabilities)
- [x] 1.3 Specs instruction copies the full baseline block for `MODIFIED`, requires exact headers, and names dropped scenarios (spec `bundled-schema`: Delta specs start from the baseline)

## 2. Routing note

- [x] 2.1 `ROUTING_NOTE` in `extensions/routing-note.ts` tells the agent to confirm specified behaviour in `openspec/specs/` before the fix path (spec `routing-note`: Routing note content)

## 3. Internal spec review

- [ ] 3.1 `skills/opsx-continue/SKILL.md` and `skills/opsx-ff/SKILL.md` pass the main specs of modified, removed or renamed capabilities to the spec reviewer and to the inline self-check (spec `planning-commands`: Spec review receives the baseline)
- [ ] 3.2 `agents/spec-reviewer.md` compares deltas with the supplied main specs and records a missing baseline under Limitations (spec `workflow-agents`: Spec reviewer compares with the baseline)

## 4. Docs

- [ ] 4.1 `docs/workflow.md` Step rules and Routing note describe the baseline rules
- [ ] 4.2 `docs/usage-guide.md` brainstorm and specs steps mention the baseline reads
- [ ] 4.3 `CHANGELOG.md` Unreleased entry
