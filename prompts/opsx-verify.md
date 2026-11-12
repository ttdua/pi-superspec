---
description: "Verify an applied change and write verify.md"
---
Use the `openspec-verify-change` skill (read its SKILL.md from the available skills list) together with the `verify` section of `openspec/schemas/superspec/workflow.md`; where they differ, `workflow.md` wins.

If `openspec-verify-change` is not in the available skills list, name the missing skill, point the user to `openspec config profile` and `openspec update` (or `/opsx-init`), and stop without doing the work another way.

User input: $@
