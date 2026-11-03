## Context

`/opsx-init` is TypeScript (`extensions/init/`). It can run the `openspec` CLI and show UI, but only an LLM turn can call the `subagent` tool from `pi-subagents`, which is an optional package. Init ends with `ctx.reload()`, after which the command context is invalid, and prompts and skills are discovered only once the project is activated. `parseInitArgs` currently accepts a single form, `--lang <value>`, and treats everything after `--lang` as the value. The bundled `superspec` schema defines the DAG `brainstorm → proposal → design/specs → tasks → plan → apply → verify → finalize`, with review gates on `specs` and the final packet.

## Goals / Non-Goals

**Goals:**
- Give old codebases a one-command path to a reviewed first set of specs.
- Reuse existing machinery: the change workflow, review gates, `/opsx-ff`, the subagent fallback pattern from `opsx-apply`.
- Keep `/opsx-init` idempotent and deterministic.

**Non-Goals:**
- Starting agent work from inside `/opsx-init` (rejected, see brainstorm Alternative B).
- Changing the bundled schema or its version.
- Writing straight into `openspec/specs/`.
- Updating specs that already exist (a later `sync-generated-specs` idea, not here).
- Verifying how `pi-subagents` selects a model beyond a best-effort instruction.

## Decisions

1. **Hand-off via a `Next:` line.** `--generate` sets a boolean in the parsed args; `runInit` appends the hint to the activation report only. Blocked, failed and validation-failed outcomes print no hint. Alternative: trigger a turn after reload (unverified API ordering).
2. **Argument parsing.** Tokenise the argument string on whitespace. A token exactly equal to `--generate` is removed and sets the flag; the remaining string goes through the existing `--lang` parsing unchanged. `--generate=x`, a second `--generate`, and any other leftover that does not start with `--lang` stay errors. This keeps "text after `--lang` is the value" for values such as `Tiếng Việt`.
3. **Logic lives in a skill, not TypeScript.** Mapping and scouting are agent work. The skill is plain text, tested by content assertions like the other skills, and the prompt only delegates to it.
4. **Change name `bootstrap-specs`.** Fixed so a rerun finds it. If it exists the skill asks before continuing and never overwrites artifacts that are `done`.
5. **Scouts run in the skill, before `tasks`.** Specs are an input to `tasks`, so generation cannot move into `apply`. The skill writes `brainstorm`, `proposal`, `design` (stub) and `specs`, then hands off to `/opsx-ff bootstrap-specs`.
6. **Scout contract.** Each scout receives one capability and its directories and returns a spec file body only: a `## ADDED Requirements` section, each requirement with `SHALL`/`MUST`, at least one `#### Scenario:`, an `Evidence:` line, and `Confidence: inferred` when no test or doc backs it. Scouts read tests and docs as well as code.
7. **Defaults for large repositories.** At most 12 capabilities, skipping `node_modules`, `dist`, `build`, `vendor`, `.git` and generated files; larger candidate lists are trimmed in the confirmation question.
8. **Existing specs are untouched.** A candidate whose capability name already exists under `openspec/specs/` is dropped from the list and reported.
9. **Language.** Specs are written in the `language:` from `openspec/config.yaml`; keywords stay English.

## Risks / Trade-offs

- [Specs describe structure, not behaviour] → the scout contract requires WHEN/THEN scenarios and evidence; review gate and `verify` check them.
- [Inferred behaviour read as fact] → `Confidence: inferred` marks it; the reviewer decides.
- [Token cost on large repositories] → one confirmation with an estimate, a capability cap, ignored directories.
- [Sequential fallback is slow and fills context] → accepted; the skill says so and processes one capability at a time, writing each file before starting the next.
- [Fast-model selection unverified] → instruction is conditional; default model is the fallback.
- [`--generate` token inside a language value] → treated as the flag; a language named `--generate` is not realistic.

## Migration Plan

None: additive. Without `--generate` behaviour is unchanged. Rollback is removing the flag handling and the two new files.

## Open Questions

- Exact `pi-subagents` parameter for choosing a model.
- Whether a later change should offer refreshing specs from code on rerun.
