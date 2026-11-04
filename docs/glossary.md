# Glossary

**Activated project** — A project whose `openspec/schemas/superspec/schema.yaml`
carries the `x-pi-superspec` marker. Only activated projects get the `opsx-*`
commands and skills.

**Apply block** — The top-level `apply:` section of the schema; the instructions
`/opsx-apply` follows.

**Archive** — OpenSpec step that syncs a change's delta specs into
`openspec/specs/` and moves the change into `openspec/changes/archive/`.

**Artifact** — A file the schema's DAG tracks (`brainstorm.md` … `finalize.md`).

**Authoritative copy** — The checkout whose copy of the change directory is the
truth at a given moment: the worktree from apply until finalize, the main checkout
otherwise.

**Bundled schema** — The `superspec` schema shipped inside the package.

**Capability** — A named area of behaviour (kebab-case). Each capability listed in
`proposal.md` gets one `specs/<capability>/spec.md`.

**Change** — One unit of work under `openspec/changes/<name>/`.

**Contracts** — The `## Contracts` section that opens `plan.md`: each shape the
plan introduces or changes (name, new / modified, exact shape, public flag). Apply
works to it and verify compares it with the code.

**Delta spec** — A spec file inside a change using `## ADDED / MODIFIED / REMOVED /
RENAMED Requirements` sections; merged into living specs at archive.

**Escape hatch** — Running Superpowers `finishing-a-development-branch` by hand when
the canonical finalize closeout does not fit.

**Feature branch** — The branch the user is on when apply starts; finalize merges the
worktree branch back into it. Not the integration branch.

**Finalize** — The git-side closeout after verify passes (Superspec v4).

**Integration branch** — The project's main line, typically `main`.

**Iteration** — Counter shared by `apply.md` and `verify.md`; increments on each
re-apply. The loop stops after 5.

**Ledger** — Superpowers SDD progress file under `.superpowers/sdd/`; used only to
recover after context loss.

**Living specs** — `openspec/specs/`, the current specification of the system.

**Lock file** — `.pi-superspec.json` next to the project schema: installed version
and file hashes. Written on a fresh install; not read yet (detecting user edits
from it is planned with `schema-auto-upgrade`, not shipped).

**Main checkout** — The repository's primary working tree, as opposed to a linked
worktree.

**Marker** — The `x-pi-superspec` top-level key in `schema.yaml`; identifies a schema
written by this package.

**OpenSpec** — CLI and conventions for spec-driven development (proposal, specs,
tasks, archive).

**Plan** — `plan.md`, the Superpowers micro-step TDD plan for a change.

**Routing note** — Context the extension injects in activated projects telling the
agent when to start a change and when to fix directly.

**Scenario** — A `#### Scenario:` block (WHEN/THEN) under a requirement; each maps
to at least one test.

**SDD** — Superpowers `subagent-driven-development`: a fresh subagent per plan task
with per-task review.

**Superpowers** — Skill set for coding agents: brainstorming, writing-plans, TDD,
worktrees, SDD, code review, debugging.

**Superspec** — Upstream OpenSpec schema by Daniel Hanold that wires Superpowers into
OpenSpec; v4 is the base this package extends.

**Worktree branch** — Branch of the apply worktree; always named `<change-name>`.
