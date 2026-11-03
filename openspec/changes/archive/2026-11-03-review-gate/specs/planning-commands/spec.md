## MODIFIED Requirements

### Requirement: Continue creates one artifact
The `opsx-continue` skill SHALL create exactly the next ready artifact, run the review gate on that artifact's file(s), and then stop. When no change name is given and several changes exist, it MUST ask the user to choose. It MUST NOT create the following artifact in the same call, even after approval.

#### Scenario: Brainstorm then proposal
- **WHEN** `/opsx-continue` runs on a new change twice, approving in between
- **THEN** `brainstorm.md` exists after the first run and `proposal.md` after the second

#### Scenario: Gate before stop
- **WHEN** `/opsx-continue` creates an artifact
- **THEN** the review gate runs on that file before the skill stops

#### Scenario: Approval does not advance
- **WHEN** the reviewer approves the artifact
- **THEN** no further artifact is created until the next `/opsx-continue`

### Requirement: Fast-forward interaction boundary
The `opsx-ff` skill SHALL run the brainstorm artifact interactively and run the review gate on `brainstorm.md` once it is written. After that gate is approved it SHALL create each remaining artifact up to the schema's apply requirement (`plan`) without asking the user, asking only when required input is missing, and then run one final review gate over the remaining artifacts. It MUST NOT start apply and MUST end by pointing to `/opsx-apply` only after the final gate is approved.

#### Scenario: Reaches plan and gates
- **WHEN** `/opsx-ff <name>` runs and the brainstorm is approved
- **THEN** `plan.md` exists, the final review gate has run, no apply artifact exists, and the final message points to `/opsx-apply`

#### Scenario: Brainstorm gate first
- **WHEN** `/opsx-ff <name>` writes `brainstorm.md`
- **THEN** the review gate runs on that file before `proposal.md` is created

#### Scenario: Final gate blocks apply pointer
- **WHEN** the final gate outcome is `changes_requested`
- **THEN** the artifacts are revised and the gate is opened again before the skill points to `/opsx-apply`
