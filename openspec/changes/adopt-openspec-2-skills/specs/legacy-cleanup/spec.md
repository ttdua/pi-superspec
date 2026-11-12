## REMOVED Requirements

### Requirement: Detect legacy files

**Reason**: OpenSpec 2.0's `openspec init --tools pi` and `openspec update` remove the unmodified `.pi/prompts/opsx-*.md` and `.pi/skills/openspec-*` files that 1.x wrote and keep files the user added. `/opsx-init` runs `openspec init --tools pi` whenever stock skills are missing, so the package no longer needs its own detection.

**Migration**: Run `/opsx-init` (or `openspec update`) with OpenSpec 2.0; it reports and removes the legacy files. Files the user edited are listed by OpenSpec for manual removal.

### Requirement: Confirm before deleting

**Reason**: The package no longer deletes legacy files; OpenSpec 2.0 does, under its own rules.

**Migration**: None needed; OpenSpec keeps edited files and lists them.
