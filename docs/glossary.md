# Glossary

**Activated project** — A project whose `openspec/schemas/superspec/schema.yaml`
carries the `x-pi-superspec` marker. Only activated projects get the
`/opsx-generate-specs` command and skill.

**Apply block** — The top-level `apply:` section of the schema; the instructions
`openspec-apply-change` follows.

**Package agents** — The six `superspec.<role>` specialist agent definitions under
`agents/`, declared by `pi-subagents.agents` and `pi.subagents.agents` and available wherever the package is
installed. Unlike activated project skills and prompts, they do not depend on
activation, are not returned by `resources_discover`, and are never copied; the
parent session owns dispatch and all official artifact writes.

**Subagent integration paragraph** — Context the extension injects each turn that describes
how to delegate with the detected subagent plugin (`tintinweb`, `pi-subagents`, `gotgenes`,
`pi-subagents-helper` or `none`): spawn, list, thinking, report collection and escalation. Skills
refer to it and never name plugin tools.

**Role** — A set of requirements (access, tools, skills, report sections) that a stage needs from a
child agent, such as scout or task reviewer. Any available agent that evidently meets them may take
the role; the bundled `superspec.*` agents are only candidates.

**Lane** — One run of one plan task by one implementer. Independent ready tasks run in parallel
lanes, each in its own child worktree, merged after review.

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

**Contracts** — The `## Contracts` required section of `plan.md`, before the tasks: each shape the
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
and file hashes. Written on every install and replacement; read to decide whether an
older schema is pristine.

**Backup root** — `~/.pi/superspec-backups/`, where `/opsx-init --force` copies the
schema it replaces, outside the project so OpenSpec does not list it as a schema.

**Main checkout** — The repository's primary working tree, as opposed to a linked
worktree.

**Marker** — The `x-pi-superspec` top-level key in `schema.yaml`; identifies a schema
written by this package.

**OpenSpec** — CLI and conventions for spec-driven development (proposal, specs,
tasks, archive).

**Plan** — `plan.md`, the Superpowers micro-step TDD plan for a change.

**Pristine** — A project schema whose files are exactly those recorded in its lock
file, with equal hashes and the lock version equal to the marker version; an extra
file such as `.DS_Store` breaks it. Only an older pristine schema is upgraded
after confirmation.

**Interaction channel** — How the agent asks questions and runs review gates: the first
available of `inbox`, `plannotator-tool`, `plannotator-cli`, `ask-tool`, `plain`. The
extension detects it and injects it as a paragraph; skills do not name the tools.

**Review gate** — A point where the reviewer decides on written work (`approved`,
`approved with notes`, `changes requested`) before the workflow moves on, held on the
Interaction channel. A closed or dismissed review is not an approval.

**Routing note** — Context the extension injects in activated projects telling the
agent which of four paths fits the work: fix directly, `openspec-ff-change`,
`openspec-new-change` then `openspec-continue-change`, or answer directly.

**Scenario** — A `#### Scenario:` block (WHEN/THEN) under a requirement; each maps
to at least one test.

**SDD** — Superpowers `subagent-driven-development`: a fresh subagent per plan task
with per-task review.

**Superpowers** — Skill set for coding agents: brainstorming, writing-plans, TDD,
worktrees, SDD, code review, debugging.

**Superspec** — Upstream OpenSpec schema by Daniel Hanold that wires Superpowers into
OpenSpec; v4 is the base this package extends.

**Worktree branch** — Branch of the apply worktree; always named `<change-name>`.
