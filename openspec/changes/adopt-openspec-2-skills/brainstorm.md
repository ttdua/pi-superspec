## Design Summary

pi-superspec stops shipping its own forks of the OpenSpec workflow skills. A project uses the stock `openspec-*` skills that OpenSpec 2.0 installs into `.agents/skills/` (`openspec init --tools pi`), and keeps them current with `openspec update`. The Superspec workflow (brainstorm through finalize, review gates, worktree, Superpowers executors, subagent roles, receipts) stays the same. It is layered on top of the stock skills rather than written into them.

Why: today eight skills under `skills/opsx-*` are hand-maintained adaptations of OpenSpec's skills (headers say "Adapted from OpenSpec 1.4.1 … synced with 1.16.0"). Every OpenSpec release needs a manual re-sync, and fixes upstream do not reach users. OpenSpec 2.0 (released 2026-11-11) makes the skills the only delivery surface. It installs them once in `.agents/skills/`, which pi reads natively, and its `update` command keeps them current and cleans up older output. The user wants the upstream skills and upstream upgrades, without losing the workflow pi-superspec defines.

What exists today and what this changes:

- `docs/architecture.md` Components row "Skills + prompts" (pi versions of the `opsx` commands) and `docs/workflow.md` "Commands" and "Conflicts resolved" #7. The package no longer ships the forked skills. The prompts stay as the user-facing `/opsx-*` commands, but each points to a stock skill.
- `docs/architecture.md` Goals 2 and 3 ("workflow commands and skills load only in initialised projects", "removing the package removes every command and skill"). Commands still load only in activated projects. The stock skills are OpenSpec's and stay when the package is removed, as any OpenSpec project's skills would. **This alters a documented goal; the docs are updated in this change.**
- `docs/architecture.md` Non-goals ("Forking OpenSpec") is reinforced: no more forked skills.
- Living specs whose requirements change: `planning-commands` and `execution-commands` (command and skill pairs, skill wording requirements), `routing-note` (content), `package-activation` (conditional resource discovery returns no skill path), `review-gate` ("Identical gate section" across forked skills), `init-command` (OpenSpec preflight ≥ 2.0, stock skill check and install), `legacy-cleanup` (superseded by `openspec update`), `bundled-schema` (instruction wording that names `/opsx-*` skills), `project-readme` and `usage-guide`. `generate-specs-command` keeps its own skill, since OpenSpec has no equivalent.

Evidence: a throwaway spike (2026-11-12) ran pi with the OpenSpec 2.0 stock skills, the unchanged superspec v8 schema, and a routing note extended with about ten lines of overlay rules, with no `opsx-*` skills loaded.
- `/opsx-ff` stopped at the brainstorm gate, ran proposal through plan unattended (design included) and stopped at the final gate.
- `/opsx-apply` committed the artifacts, created the `<change-name>` worktree, ran the `executing-plans` fallback with TDD and wrote `apply.md`, without merging.
- One deviation: apply opened a code review gate that belongs to finalize.

## Alternatives Considered

### Alternative A: Keep the forks, only tolerate OpenSpec 2.0
- **Approach**: keep the eight `opsx-*` skills, require `openspec init --tools none`, and detect or remove stock skills in `.agents/skills/` so pi does not see two workflows.
- **Pros**: no behaviour risk; no command changes.
- **Cons**: manual re-sync with every OpenSpec release continues; upstream fixes never reach users; superspec must police files OpenSpec owns.
- **Why not chosen**: the user explicitly wants the stock skills and `openspec update` as the upgrade path.

### Alternative B: Overlay on the stock skills (chosen)
- **Approach**: stock skills do the mechanics. Everything superspec adds lives in two places the stock skills already honour. The bundled schema's artifact `instruction` and `apply` block (which the stock skills treat as authoritative) carry the fixed workflow rules. The routing note carries the parts that depend on the session's environment.
- **Pros**: upstream upgrades for free; one source of workflow truth (schema + routing note); much less package text to maintain.
- **Cons**: the overlay is a prompt-level contract. If a stock skill's wording drifts in a future OpenSpec release, the agent could follow it over the overlay. Needs a re-check per OpenSpec major release.
- **Why chosen**: the spike showed the stock skills defer to schema instructions and the overlay at the two hardest points (ff gates, apply worktree and executor).

### Alternative C: Hybrid
- **Approach**: stock skills for explore, new, continue, verify, sync and archive; keep forks for ff and apply.
- **Pros**: lowest risk at the two places the stock wording most conflicts with superspec.
- **Cons**: two mechanisms to maintain; the spike already showed ff and apply work with the overlay.
- **Why not chosen**: the evidence does not justify keeping forks; it can be revisited if a later OpenSpec release breaks the overlay.

## Agreed Approach

Alternative B. The user chose to write this change directly after the spike, rather than extend it.

Where the overlay lives (user's choice, option "combined"):

- **Fixed workflow rules go into the bundled schema's artifact `instruction` text and `apply` block.** These are the brainstorm and final gates of ff, one gate per artifact in continue, the Superpowers redirection, apply following the schema instead of the stock skill's own implementation loop, the code review gate belonging to finalize, verify in the worktree, and archive's sync check. The schema is already versioned, locked and upgraded by `/opsx-init`, so these rules ship and upgrade with it.
- **Environment-dependent rules stay in the routing note** the extension injects each turn: the Interaction channel paragraph (how to gate and ask with the tools present), the Subagent integration paragraph (how to dispatch with the plugin present), the mapping from `/opsx-*` names to stock skills, and which stock skills superspec does not use.
- **The project's `openspec/config.yaml` is not changed** beyond what `/opsx-init` writes today (`schema`, `language`). `context`, `rules` and `operations` stay the user's own. OpenSpec 2.0 does not change the format of `config.yaml` or a change's `.openspec.yaml`.

## Key Decisions

- **Stock skills are required.** Superspec relies on `openspec-explore`, `-new-change`, `-continue-change`, `-ff-change`, `-apply-change`, `-verify-change`, `-sync-specs` and `-archive-change` being present in `.agents/skills/`. It never writes or edits them. Upgrades happen through `openspec update`.
- **`/opsx-init` checks, then installs** (user's choice):
  - If the user's OpenSpec profile already includes all eight workflows, `/opsx-init` runs `openspec init --tools pi`.
  - If the profile lacks some (the 2.0 default `core` profile lacks new, continue, ff and verify), it prints the exact commands to run (`openspec config profile`, then `/opsx-init` again) and stops.
  - It never edits the user's global OpenSpec config.
- **Minimum OpenSpec version becomes 2.0.**
- **`/opsx-*` commands stay** as the way users start each step, now pointing at the stock skill plus the overlay. `/opsx-init` and `/opsx-generate-specs` are unchanged in name.
- **Stock skills superspec does not use** (`openspec-propose`, `openspec-update-change`, and `bulk-archive`/`onboard` if installed) are excluded by the overlay. Superspec does not delete them.
- **Legacy `.pi/` cleanup is dropped.** OpenSpec 2.0's own `update` removes the files that `--tools pi` wrote in 1.x.
- **The finalize-only code review gate is stated in the apply instruction**, fixing the one deviation the spike found.
- Every rule the forked skills carried that the schema does not already state must survive somewhere: schema instruction, routing note or `subagent-routing.md`. Examples: the ff interaction boundary, gate cascade, the Superpowers redirection rule, the executor choice, post-PR and fix-iteration modes, verify in the worktree, archive's delta-sync check. Silently losing one is a failure even if the commands run.

## Open Questions

- Whether `subagent-routing.md` stays a package-level reference file the overlay points to by path, or its content moves into the routing note's Subagent integration paragraph. Left to design.
- The bundled schema content changes, so its version bumps (v8 to v9), and existing v8 projects upgrade through the existing `/opsx-init` rules. Left to design: the exact instruction wording and whether a v8 project with forked skills still loaded needs a transition notice.
- The spike put the fixed rules in the routing note, not the schema. Design must confirm that the stock skills honour the same rules when they arrive through `instruction`, which the stock skills call authoritative. The re-check belongs in the e2e checklist.
