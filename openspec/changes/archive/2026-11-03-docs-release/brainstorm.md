## Design Summary

Implements `docs/architecture.md` — Non-goals (users install dependencies themselves), Constraints (MIT license, credits) and Testing (manual end-to-end checklist). No settled decision is changed.

**Intent.** This is the last change before release. Following the README on a clean repository must reach a first archived change with no undocumented step. No new features.

**Goals**
- `README.md` (English, default) and `README.vi.md` (Vietnamese), cross-linked at the top. Content: what it is, prerequisites (`brew install openspec`, `pi install git:github.com/obra/superpowers`), optional packages (`pi-subagents`, `rpiv-ask-user-question`, `rpiv-todo`), `pi install https://github.com/ttdua/pi-superspec`, `/opsx-init` quick start, command table, uninstall behaviour, credits.
- `docs/usage-guide.md` (English only): full walkthrough of one change, step by step (`/opsx-new` → `/opsx-continue` … → `/opsx-apply` → `/opsx-verify` → finalize → `/opsx-archive`), the `/opsx-ff` fast path, with and without `pi-subagents`, upgrading, troubleshooting.
- `docs/e2e-checklist.md`: the manual end-to-end checklist from the Testing section.
- `LICENSE` (MIT), `CHANGELOG.md`, `CONTRIBUTING.md`, and `package.json` metadata (`repository`, `homepage`, `bugs`).
- Bring `docs/*.md` in line with what shipped.

**Non-goals.** New features, code changes, a Vietnamese usage guide, a docs site.

**Anti-goals.** Documenting behaviour that was not shipped; README and guide drifting from the command prompts; claiming uninstall removes project files it does not remove.

**Constraints.** Public repository: all content in English except `README.vi.md`, which the maintainer requested. `openspec/schemas/superspec/` (upstream v4) is not edited.

## Alternatives Considered

### Alternative A: Short README + separate usage guide (chosen)
- **Approach**: Concise README in two languages; the long walkthrough lives in `docs/usage-guide.md`.
- **Pros**: README stays scannable; the guide can be long; only the README is duplicated across languages.
- **Cons**: One more file to keep in sync with the prompts.
- **Why not chosen**: n/a (chosen).

### Alternative B: Everything in the README
- **Approach**: One long README plus a long Vietnamese mirror.
- **Pros**: A single place to read.
- **Cons**: Hard to scan; two long files drift apart.
- **Why not chosen**: The drift risk is doubled and the quick start gets buried.

### Alternative C: Bilingual README, English-only guide with no separate structure
- **Approach**: Same as A but the guide folded into the README.
- **Pros**: Least maintenance.
- **Cons**: The most important content (the walkthrough) is neither short nor findable.
- **Why not chosen**: A gives the same language coverage with a better-organised README.

## Agreed Approach

Alternative A, as picked by the maintainer. The guide is English only; the Vietnamese README links to it.

## Key Decisions

- Install line for this package: `pi install https://github.com/ttdua/pi-superspec` (maintainer's choice).
- Extra project files added on the maintainer's request: `CHANGELOG.md`, `CONTRIBUTING.md`, `package.json` metadata. These are my picks for "other necessary files".
- Uninstall behaviour is documented as it is: removing the package removes every command and skill; `openspec/` stays valid, including the copied `openspec/schemas/superspec/` and its lock file, which the user may delete by hand.
- Every command, flag and message in the docs is checked against `prompts/`, `skills/` and `extensions/` before it is written.

## Open Questions

- None blocking. The guide's exact claims about `/opsx-init` output and migration prompts will be read from `extensions/init` during the plan.
