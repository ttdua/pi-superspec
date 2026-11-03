## Context

Pi has no `Skill`, `AskUserQuestion`, `TodoWrite` or `Task` tool. Skills are listed in
the system prompt (name + path) and loaded by reading `SKILL.md`; prompt arguments
arrive as `$@`. See `docs/architecture.md` (pi tool mapping). The OpenSpec 1.4.1
generated skills in `.claude/skills/openspec-*` are the source being adapted.

## Decisions

### Files

```text
skills/opsx-explore/SKILL.md   prompts/opsx-explore.md
skills/opsx-new/SKILL.md       prompts/opsx-new.md
skills/opsx-continue/SKILL.md  prompts/opsx-continue.md
skills/opsx-ff/SKILL.md        prompts/opsx-ff.md
```

Removed: `skills/superspec-placeholder/`, `prompts/opsx-placeholder.md`.
Frontmatter `name` equals the directory name (portable per pi docs); prompts have a
`description`. Each SKILL.md carries a one-line credit to the OpenSpec 1.4.1 skill it
adapts. `package.json` is untouched (resources come from `resources_discover`).

### Prompt shape

Prompt body: read the `SKILL.md` of skill `opsx-<x>` (from the available skills list,
or `/skill:opsx-<x>`), follow it, treating `$@` as the user input. Nothing else.

### Tool mapping inside skills

| Source | pi text |
|---|---|
| `AskUserQuestion` | "Use the `ask_user_question` tool if available; otherwise ask in plain text with numbered options and wait." Marked recommended option first. |
| `TodoWrite` | "Track progress with the `todo` tool if available; otherwise state the checklist in your reply." |
| Skill invocation | "Read the skill's `SKILL.md`." |

The exact registered tool names of `rpiv-ask-user-question` / `rpiv-todo` are
confirmed against the packages at implementation time; wording says "if available"
so a wrong name degrades to the fallback rather than failing.

### Superpowers-backed artifacts

Rule (in `opsx-continue` and `opsx-ff`, duplicated because skills load
independently): if an artifact `instruction` names `superpowers:<x>`, read skill `<x>`
and follow it; write output only where the instruction says; do not follow the
skill's own "next skill" or execution handoff; if `<x>` is not found, stop and tell
the user to install Superpowers.

### Per-command behaviour

- **explore**: adapted from `openspec-explore`; no code written; tool mapping only.
- **new**: input is a name or description; derive kebab-case; omit `--schema` (the
  project's `config.yaml` selects `superspec`); `openspec new change`, show status
  and the first artifact's instructions, stop. Existing name → suggest continue.
- **continue**: select change (ask if none given and several exist), create the next
  ready artifact, stop for review. Brainstorm is run via the rule above.
- **ff**: create the change if absent, brainstorm interactively, then loop
  proposal → design(if ready) → specs → tasks → plan unattended until `applyRequires`
  (`plan`) is done; never start apply; final message points to `/opsx-apply`.

### Verification

A vitest test scans `skills/` and `prompts/`: no `AskUserQuestion`, `TodoWrite`,
`Task tool`; four skill/prompt pairs exist with matching names; each prompt names its
skill and contains `$@`; placeholders are gone. `tests/extension.test.ts` placeholder
assertions are replaced by real-command assertions. Manual in-pi run per the "Done
when" criteria.

## Risks / Trade-offs

- Behaviour rests on instruction text; a weak model may skip the Superpowers rule.
  Mitigated by a plain "stop if skill not found" rather than silent improvisation.
- Tool names of the optional rpiv packages may differ; "if available" wording and the
  plain fallback bound the damage.
