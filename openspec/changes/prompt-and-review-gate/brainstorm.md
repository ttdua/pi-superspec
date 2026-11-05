## Design Summary

**Intent.** The package's injected guidance currently does three things the user wants changed:

1. Skills (`opsx-continue`, `opsx-ff`, finalize) hard-code reviewer tool names and a tier list
   (`plannotator` tool, Plannotator CLI, `ask_user_question`, plain text). The user wants the
   skills to speak only of a neutral **review gate** / **approval gate** / **asking the user**,
   and the extension to detect which channel is available and inject the matching guidance,
   the same way it already injects the document language paragraph.
2. Every approval stops the workflow and waits for the user to type the next command. The user
   wants an approval to be the evidence that the workflow may continue.
3. The routing note pushes every piece of work into the Superspec flow with hard `MUST`
   wording. The user wants the agent to choose the path that fits the work.

The user also plans to review documents remotely, away from the terminal. Every question,
approval and review must therefore carry enough context to be decided without reading the
terminal, and the Plannotator Inbox is the preferred channel for all of them.

**Who it serves.** A pi user working in a Superspec-activated project, often reviewing from
another device through the Plannotator Inbox.

**Goals.**

- Skills contain no reviewer tool names; the review channel and its instructions come from
  the injected context, chosen by what is actually available in the session.
- Channel preference, highest first: Plannotator Inbox, the `plannotator` tool, the Plannotator
  CLI, `ask_user_question`, plain text. A channel that is unavailable or fails to open falls to
  the next one.
- The Inbox is used for review and approval gates on artifacts, for the questions asked in
  `/opsx-explore` and brainstorming, and for any other decision only the user can make.
- Every Inbox gate or question is self-contained: a summary of what was produced and why, the
  reviewed files attached for annotation, and the decision as a question with the gate's
  outcomes as choices.
- An approval (`approved`, or `approved with notes` handled as today) lets `/opsx-continue`
  go on to create the next planning artifact and open its gate without a new command. The
  chain stops before `apply`; implementation starts only on an explicit `/opsx-apply`.
- The routing note guides instead of forcing:
  - work that changes no project spec (small mistakes, typos, a fix restoring specified
    behaviour, a refactor) is done directly, outside Superspec;
  - work that changes specs and whose requirements are already clear goes to `/opsx-ff`;
  - work that changes specs and needs careful step-by-step review goes to `/opsx-new`, then
    `/opsx-continue`;
  - questions, research and reviews are answered directly with no change proposed.

  The agent states its choice and a one-line reason so the user can redirect it.

**Non-goals.**

- Auto-running `apply`, `verify` or `finalize` after an approval (decided: option A, stop
  before apply).
- Changing push / PR policy. Direct work and finalize still follow the project's `AGENTS.md`
  (no push or PR without explicit permission).
- Changing the gate outcomes (`approved`, `approved with notes`, `changes requested`,
  `dismissed`) or the revision cascade rules.
- Changing `/opsx-ff`'s two planned gates (brainstorm and final packet).

**Anti-goals.**

- A gate that continues on anything other than an explicit approval (a dismissed, skipped or
  set-aside review is never an approval).
- Inbox messages that only make sense next to the terminal (bare questions, paths without
  attachments, "see above").
- A routing note so loose that spec-changing work silently skips the change directory.

**Docs this change alters.** Per the project rule, these documented decisions change and are
updated in the same change:

- `docs/workflow.md` → *Review gates* (reviewer tier list and "`/opsx-continue` creates one
  artifact, runs a review gate on it, then stops"), *Routing note (activated projects)*,
  *Commands* (`/opsx-continue` row), *Conflicts resolved* #10.
- `docs/architecture.md` → *Components* (Extension row: what the `context` event injects),
  *Runtime flow* (`context` step), *pi tool mapping* (Ask the user / Review written work rows).
- `docs/glossary.md` / `docs/domain-model.md` where they define the review gate or routing
  note.

## Alternatives Considered

### Alternative A: Extension injects full per-channel gate guidance

- **Approach**: on each turn the extension detects the best available channel and injects a
  "Review gate" and "Asking the user" paragraph written for that channel (plus the next
  fallback). Skills only say "run the review gate as the routing note describes" and keep the
  shared outcome definitions.
- **Pros**:
  - Skills are free of tool names, as the user asked.
  - The prompt holds only channels that really exist, so the agent does not probe for tools.
  - Enabling or disabling the Inbox takes effect on the next turn.
- **Cons**:
  - Channel wording lives in TypeScript, so it is harder to read than markdown.
  - It adds a few hundred tokens per turn.

### Alternative B: One shared reference file, no detection

- **Approach**: move the tier list into `skills/references/review-gate.md`; skills point to it
  and the agent probes channels itself, as today.
- **Pros**: simplest, no extension change.
- **Cons**: tool names stay in skill files and the agent still probes.
- **Why not chosen**: it does not meet the user's first request (detect and inject, like the
  language paragraph).

### Alternative C: Hybrid, detection in the extension and detail in a reference file

- **Approach**: the extension injects one line naming the detected channel; the per-channel
  detail lives in a markdown reference the agent reads when a gate opens.
- **Pros**: short injected text; the channel wording is easy to edit as markdown.
- **Cons**: an extra file read per gate; tool names still live in a skills file.
- **Why not chosen**: it splits one behaviour across two places and keeps tool names in
  skills; A meets the request directly, and its readability cost is handled by keeping the
  injected text short and covered by per-channel tests.

## Agreed Approach

**Alternative A**, chosen by the user. The extension owns channel detection and channel-specific
gate and question guidance; skills own the workflow (when a gate opens, its outcomes, what
happens after each). Plannotator Inbox is the top channel. Approval auto-continues through the
planning artifacts and stops before `apply`. The routing note is rewritten as path guidance:
direct work for anything that changes no spec, `/opsx-ff` for clear spec changes, `/opsx-new`
for spec changes that need close review.

## Key Decisions

- Gate channel is detected and injected by the extension, not named in skills (user, option A).
- Channel preference: Plannotator Inbox → `plannotator` tool → Plannotator CLI →
  `ask_user_question` → plain text (user: "prioritise Plannotator, the Inbox highly").
- The Inbox is used for artifact gates and for explore and brainstorm questions, not only for
  notifications (user, after checking `plannotator inbox --help`: replies wake the session, and
  files can be attached and annotated, which suits remote review).
- Inbox gate content must be self-contained: summary, attachments, and a decision question
  (user: "the context must be complete so the terminal need not be read").
- Approval auto-continues `/opsx-continue` through the planning artifacts and stops before
  `apply` (user, option A).
- Routing: no spec change → direct work outside Superspec; spec change and clear → `/opsx-ff`;
  spec change needing close review → `/opsx-new`. "Hotfix" in the original request meant
  "a small fix that changes no spec", not a separate path that edits living specs (user
  clarification).
- Push and PR stay governed by the project's `AGENTS.md`; this change grants no new
  permission.

## Open Questions

- None blocking. Technical details (how availability is detected, how a CLI-only install is
  recognised, the exact injected wording, how an Inbox reply is mapped to a gate outcome) are
  left to `design.md`.
