## Why

After `/opsx-init` a project is activated but exposes only a placeholder command, so the planning half of the workflow cannot run in pi. The OpenSpec-generated skills also name Claude-only tools (`AskUserQuestion`, `TodoWrite`) that pi does not have. This change ships real planning commands that use pi tools with plain fallbacks, as set out in docs/workflow.md (Conflicts #7 and #9).

## What Changes

- Add four commands, each a thin prompt in `prompts/` that reads a skill in `skills/` and passes `$@`: `opsx-explore`, `opsx-new`, `opsx-continue`, `opsx-ff`. The skills are adapted from the OpenSpec 1.4.1 generated skills, with credit.
- Replace Claude tool names with pi tools (`ask_user_question` from `rpiv-ask-user-question`, `todo` from `rpiv-todo`) and plain-text fallbacks; load skills by reading `SKILL.md`.
- Add one rule for artifacts written by Superpowers skills (brainstorm, plan): read the named skill, write only to the change directory, ignore its closing handoff, stop if it is not installed.
- `opsx-ff` runs brainstorm interactively, then proposal → plan unattended, and stops before apply.
- **Remove** the placeholder skill and prompt from package-skeleton.
- Add a test that fails if `skills/` or `prompts/` contain `AskUserQuestion`, `TodoWrite` or "Task tool".

**Placeholder activation proof**
- From: activation is proven by one placeholder skill and prompt.
- To: activation is proven by the four real commands being discoverable.
- Reason: the placeholders are removed.
- Impact: non-breaking for users; updates `tests/extension.test.ts`.

## Capabilities

### New Capabilities
- `planning-commands`: the `opsx-explore`, `opsx-new`, `opsx-continue` and `opsx-ff` command and skill pairs, their pi tool mapping with fallbacks, the Superpowers-artifact rule, and the ff interaction boundary.

### Modified Capabilities
- `package-activation`: requirement "Placeholder commands prove activation" is replaced by one requiring the real planning commands to be visible only in an activated project.

## Impact

- New: `skills/opsx-{explore,new,continue,ff}/SKILL.md`, `prompts/opsx-{explore,new,continue,ff}.md`, a content test under `tests/`.
- Removed: `skills/superspec-placeholder/`, `prompts/opsx-placeholder.md`.
- Changed: `tests/extension.test.ts`; delta spec for `package-activation`.
- No change to the bundled schema, `package.json`, or the extension code. No new dependencies; `rpiv-*` packages stay optional.
- Out of scope: apply, verify, sync, archive, the routing note, `opsx-propose`, `opsx-bulk-archive`.
