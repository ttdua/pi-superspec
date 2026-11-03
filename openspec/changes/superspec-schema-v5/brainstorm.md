## Design Summary

Implements `docs/workflow.md` (Artifact DAG, Steps, Step rules, Conflicts resolved
#1–#6 and #8), `docs/domain-model.md` (BundledSchema, Artifact, ApplyReceipt,
VerifyReport, FinalizeReceipt) and `docs/architecture.md` (Schema identity). Those
sections are settled and are not re-decided here.

Why: the package needs its own bundled OpenSpec schema, `schema/superspec/`, that
encodes the unified workflow and is harness-neutral. Upstream Superspec v4 (the schema
in `openspec/schemas/superspec/`, which drives this repo's own development and is never
edited) assumes Claude Code tool names, guesses the feature branch from `git log`,
ends apply in `finishing-a-development-branch`, and carries two overlapping verify
lists. v5 fixes those.

Goals:
- `schema/superspec/schema.yaml` + `templates/*.md`, `name: superspec`, `version: 5`,
  `x-pi-superspec: { version: 5 }`, adapted from v4 with credit.
- The nine-artifact DAG from workflow.md, with the documented step rules.
- Verified by tests: `openspec schema validate`, DAG-matches-docs, `openspec instructions apply`.
- `schema` shipped in the package (`package.json` `files`).

Non-goals: copying the schema into projects (`opsx-init`), lock file and upgrade
(`schema-auto-upgrade`), pi skills and prompts.

Anti-goals: touching `openspec/schemas/superspec/`; naming pi tools in the schema;
changing v4 behaviour that workflow.md does not mention.

## Alternatives Considered

### Alternative A: Fork v4 and edit in place
- **Approach**: Copy v4 `schema.yaml` and `templates/`, apply each documented change.
- **Pros**: Small, reviewable diff against upstream; keeps v4 behaviour wherever docs are silent.
- **Cons**: Long file (~780 lines); finalize instruction needs careful edits.
- **Why not chosen**: chosen.

### Alternative B: Rewrite a leaner schema
- **Approach**: Author a new, shorter schema from the docs.
- **Pros**: Less text.
- **Cons**: Easy to drift from v4 behaviour ("everything not stated keeps v4"); loses the upstream diff.
- **Why not chosen**: Risk of silent behaviour change outweighs brevity.

### Alternative C: Generate schema.yaml from a TypeScript builder
- **Approach**: Build the YAML from code.
- **Pros**: Removes repeated text.
- **Cons**: Adds a build step and a second source of truth for a text artifact.
- **Why not chosen**: Schemas differ only in text; no benefit.

## Agreed Approach

Alternative A (agreed with the user): fork v4 and edit in place.

## Key Decisions

- Test for "DAG matches docs" parses the Artifact table in `docs/domain-model.md`
  (ID, Requires) and compares it with `openspec status --json` (user chose parsing over a hard-coded table).
- `package.json` `files` gains `schema`, with a delta to the `package-manifest` spec,
  in this change (user decision).
- The upstream MIT `LICENSE` is copied into `schema/superspec/` for attribution.

## Open Questions

None blocking. Details of wording are left to the plan.
