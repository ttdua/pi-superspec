# Subagent routing

Shared integration policy for Superspec skills that delegate bounded work to the optional `pi-subagents` package. Skills read this before delegating and keep their stage-specific invocation next to the relevant step. This reference is not a skill or slash command; it does not register agents, write settings, install packages, or touch schema or templates. Canonical roles are `superspec.scout`, `superspec.spec-reviewer`, `superspec.plan-reviewer`, `superspec.implementer`, `superspec.task-reviewer`, and `superspec.verifier`.

## Availability

Resolve availability at use time, and preflight only the roles the current stage requires.

1. **Helper-only.** If only `subagents_enable` is visible, call it, then re-evaluate on the next model turn. Do not assume the full tool exists in the same turn.
2. **Available.** Use the installed tool's documented management surface to list or inspect agents. Resolve each required canonical name and confirm it is not disabled, and that the skills and tools the role needs are present.
3. **Absent.** If neither the tool nor its activation helper is available, announce the inline fallback once and follow the existing inline path. Gates, ordering, and evidence rules are unchanged. Do not invent or fabricate child calls.
4. **Unsupported or disabled.** Integration that is present but incompatible, or a role that is disabled or missing, is distinct from absent integration. See Failures; it never selects the inline fallback.

Tool availability alone does not authorize delegation beyond the requested workflow or applicable user/project instructions.

## Handoff

Child context is fresh, so the brief must be recoverable without parent history. Include:

- goal
- authoritative cwd and change root
- resolved input paths (artifacts, task files)
- task or criterion IDs
- refs or diff package for review work
- constraints
- allowed edits (none for read-only roles)
- acceptance criteria
- validation commands
- stop conditions
- report contract (the role's required sections)
- `output` binding

Bind the report with the subagent `output` parameter to a run-managed or explicit scratch artifact. A path in prose does not bind output. Omit per-dispatch model and thinking overrides; user and project configuration choose them.

Exact action shapes belong to the installed pi-subagents guidance; do not invent actions it does not document. Minimal canonical single-child call:

```
subagent({
  agent: "superspec.scout",
  task: "<goal, paths, constraints, acceptance criteria, stop conditions, report contract>",
  cwd: "<authoritative worktree>",
  context: "fresh",
  output: "<run-managed or scratch report path>"
})
```

Native async completion wakes the parent. Do not poll with short checks or sleeps, and do not use `bg_wait` for ordinary children.

## Authority

The parent owns official artifact writes, task checkbox updates, receipt outcomes, human gates, and publication decisions. Tool availability does not authorize delegation outside the requested workflow. A child may recommend; it cannot approve a gate, expand scope, push, merge, or open a pull request.

- Use fresh child context and no nested subagents. Keep one implementation writer per worktree; parallelize independent reads and reviews only.
- Reuse existing review seats (for example the SDD task-review seat); never double-dispatch the generic Superpowers reviewer alongside a Superspec reviewer.
- Re-read official dependencies and inspect returned evidence (paths, diffs, command/cwd/exit/counts) before writing artifacts, ticking tasks, or recording outcomes.
- A report missing required evidence or sections is incomplete. Never infer completion from process status or a successful exit, and headings alone do not prove correctness.
- Scope or contract conflicts are escalated, not resolved silently against approved artifacts.

## Failures

- **Named cause, stop.** When a required canonical role is disabled or missing, discovery is unsupported, or required skills or tools are unavailable, report the named cause and stop the affected delegated stage. Do not rewrite settings, and do not fall back to a generic agent, an alternate CLI, or inline recovery. Offer a package update or an explicitly chosen inline route as options for the user. The parent never chooses either route silently; the user decides.
- **Launch or runtime failure.** Stop the lane. Retain and report the exact error, run identity, cwd/worktree, and any partial state. Do not retry with another mechanism or recover inline in the background.
- **Incomplete report.** Record the gap and treat the task as not complete.

## Compatibility

Required pi-subagents capabilities: package discovery through top-level `pi-subagents.agents`, package namespace support, user/project override semantics, selected-skill support, and the `output` parameter. The reference build inspected is `0.84.0` at `d9f8f8c9a709a23adf5f323bb046f3fa91517d4c`. It was inspected, not smoke-tested here, and is not a proven minimum; other versions and forks are untested. Runtime evidence recorded during testing supersedes these assumptions, and no dependency pin is added.
