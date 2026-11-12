---
description: "Sync delta specs into living specs without archiving"
---
Use the `openspec-sync-specs` skill (read its SKILL.md from the available skills list) together with the `sync` section of `openspec/schemas/superspec/workflow.md`; where they differ, `workflow.md` wins.

If `openspec-sync-specs` is not in the available skills list, name the missing skill, point the user to `openspec config profile` and `openspec update` (or `/opsx-init`), and stop without doing the work another way.

User input: $@
