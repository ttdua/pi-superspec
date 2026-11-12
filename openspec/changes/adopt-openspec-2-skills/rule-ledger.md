# Rule ledger (scratch, deleted in Task 5)

One row per rule sentence (or rule bullet) of the eight forked skills. Destinations: `W§<section>` = `schema/superspec/workflow.md` section; `S:<id>` = `schema/superspec/schema.yaml` instruction (artifact id or `apply`); `R§<section>` = `schema/superspec/subagent-routing.md`; `stock` = OpenSpec 2.0.0 stock skill, cited as `<skill>:<line>` of the files rendered by `openspec init --tools pi`. Tests: `WR` = `tests/workflow-rules.test.ts`, `SC` = `tests/schema.test.ts`, `PC`/`EC` = `tests/planning-commands.test.ts`/`tests/execution-commands.test.ts`, `SR` = `tests/subagent-routing.test.ts`. Descriptive sentences (examples, illustrations, CLI step text the CLI returns) are listed as `no rule` where they carry no obligation.

Must-port rows (all in `workflow.md` with a test) are marked **MUST**.

## opsx-explore

| Source | Destination | Test | Coverage |
|---|---|---|---|
| explore:6 provenance header | no rule | — | Removed with the fork. |
| explore:8 think deeply, visualize | stock | — | openspec-explore:13 (same sentence). |
| explore:10 never write code / implement | W§explore + stock | WR explore "never writes code" | openspec-explore:15, :348; anchored "Never write code." |
| explore:10 if asked to implement, create a change | W§explore | WR explore "never writes code" | Stock points to `openspec-propose` (openspec-explore:15); overridden: "point the user to creating a change with `/opsx-new <name>`". |
| explore:10 MAY create OpenSpec artifacts | stock | — | openspec-explore:15 "You MAY create or update OpenSpec change artifacts ... within a confirmed scope". |
| explore:12 stance, not a workflow | stock | — | openspec-explore:17. |
| explore:18-24 stance bullets (curious, threads, visual, adaptive, patient, grounded) | stock | — | openspec-explore:36-41. |
| explore:25 ask through the Interaction channel | W§Shared rules | WR "questions defer to the channel" | "Ask the user as the routing note's Interaction channel paragraph describes". |
| explore:29-61 "What You Might Do" lists | stock | — | openspec-explore:69-115 (same lists). |
| explore:63-80 diagram example | no rule | — | Illustration; stock has the same (openspec-explore:90-107). |
| explore:82 diagrams use ASCII only | W§explore + stock | WR explore "diagrams use ASCII only" | openspec-explore:109-110; kept in workflow.md as an explicit anchor (spec scenario Plain diagrams). |
| explore:84-87 surface risks | stock | — | openspec-explore:112-115. |
| explore:93 read subagent routing before delegation | W§Shared rules (Delegation) | WR "delegation names" | Link `[subagent routing](subagent-routing.md)`. |
| explore:93 scout only when recon earns overhead; bounded paths; collect report per paragraph | W§explore (Recon) | WR explore "scout recon" | Anchored "scout role", "Subagent integration paragraph". |
| explore:93 scout evidence-only, read-only, never writes code/schema/artifacts | W§explore (Recon) | WR explore "scout recon" | "evidence-only and read-only ... never write code, schema or official artifacts". |
| explore:93 small conceptual work inline; availability alone not a trigger | W§explore (Recon) | WR explore "scout recon" | Anchored. |
| explore:93 user conversation stays with parent | W§explore (Recon) | WR explore "scout recon" | Anchored. |
| explore:93 integration absent → inline | W§Shared rules (Delegation) | WR "delegation names" | "When that paragraph says delegation is unavailable, do the work inline." |
| explore:99 use OpenSpec naturally | stock | — | openspec-explore:121. |
| explore:103-106 run `openspec list --json` and `--specs` | stock | — | openspec-explore:126-141 (adds `--specs` and `openspec show --type spec`). |
| explore:108-113 what list tells you, read a spec with `openspec show <id> --type spec` | stock | — | openspec-explore:139-141. |
| explore:117-122 offer to start a change with `/opsx-new` | W§explore (hand-offs) | WR "explore hand-off" | Stock offers a proposal / `openspec-propose` (openspec-explore:152, :321, :338); overridden to `/opsx-new <name>` / `/opsx-continue <name>`. |
| explore:124 may run `openspec new change`; never create `openspec/changes/` by hand | W§explore + stock | WR explore "does not write brainstorm.md" | openspec-explore:158, :353; anchored in W. |
| explore:124 then point to `/opsx-continue <name>` | W§explore | WR "explore hand-off" | Overrides openspec-explore:163 (`openspec-propose`). |
| explore:124 explore only scaffolds; no `brainstorm.md`; no review gate | W§explore | WR explore "does not write brainstorm.md" | Stock would capture requested artifacts (openspec-explore:158-163); overridden. |
| explore:130-134 read existing change artifacts from status | stock | — | openspec-explore:170-173. |
| explore:136-138 reference artifacts naturally | stock | — | openspec-explore:175-177. |
| explore:142-149 capture table | W§explore + stock | WR explore "never captures brainstorm.md" | Stock table (openspec-explore:184-191) lists the same targets; W names them for superspec. |
| explore:151 `brainstorm.md`/`plan.md` never capture targets | W§explore | WR explore "never captures brainstorm.md or plan.md" | Anchored verbatim. |
| explore:153-156 example offers | stock | — | openspec-explore:193-196. |
| explore:158 user decides; don't auto-capture | stock | — | openspec-explore:198, :352. |
| explore:158 before the first write name file and scope, wait for yes, unless asked | W§explore + stock | WR explore "asks consent before the first write" | openspec-explore:15, :352 (stricter); W keeps the fork sentence verbatim (spec scenario Consent before writing). |
| explore:164-170 what you don't have to do | stock | — | openspec-explore:202-211. |
| explore:176-262 entry-point examples | no rule | — | Illustrations; stock has the same (openspec-explore:213-315). |
| explore:270-273 ending options incl. `/opsx-new` | W§explore (hand-offs) | WR "explore hand-off" | Stock ending names `openspec-propose` (openspec-explore:321, :338); overridden. |
| explore:275-291 summary block | stock | — | openspec-explore:325-342 (hand-off line overridden as above). |
| explore:293 summary optional | stock | — | openspec-explore:344. |
| explore:290 guardrail don't implement | W§explore + stock | WR explore "never writes code" | openspec-explore:348. |
| explore:291 schema/template/config.yaml edit = implementing | W§explore + stock | WR explore "never writes code" | openspec-explore:348 says the same; kept verbatim in W (spec scenario Schema edits refused). |
| explore:292-299 remaining guardrails | stock | — | openspec-explore:349-356. |

## opsx-new

| Source | Destination | Test | Coverage |
|---|---|---|---|
| new:8 artifact-driven workflow | stock | — | openspec-new-change:13. |
| new:10 input: name or description | stock | — | openspec-new-change:28. |
| new:16-17 ask one open question | stock + W§Shared rules | WR "questions defer to the channel" | openspec-new-change:34-35; channel per W. |
| new:19 derive kebab-case name | stock | — | openspec-new-change:37. |
| new:21 do not proceed without understanding | stock | — | openspec-new-change:39. |
| new:25 run `openspec list --json` first; existing name → suggest `/opsx-continue`, STOP | W§new | WR new "suggests continue for an existing name" | Stock only suggests continuing (openspec-new-change:87) without a pre-check; W adds the check and the `/opsx-continue` name. |
| new:29 always omit `--schema` | W§new | WR new "never passes --schema" | Stock passes `--schema` on request (openspec-new-change:41-49); overridden. |
| new:33-35 show status, use returned paths | stock | — | openspec-new-change:58-62. |
| new:38-42 first ready artifact instructions | stock | — | openspec-new-change:64-70. |
| new:44 STOP and wait | stock + W§new | WR new "creates no artifact" | openspec-new-change:72. |
| new:48-52 summary contents | stock | — | openspec-new-change:76-80. |
| new:53 closing prompt `/opsx-continue` / `/opsx-ff` | W§new | WR new "overrides the stock closing prompt" | Stock prompt (openspec-new-change:81) names no command; overridden. |
| new:56-57 create no artifacts, do not advance | W§new + stock | WR new "creates no artifact" | openspec-new-change:84-85. |
| new:58 invalid name → ask through the channel | stock + W§Shared rules | WR "questions defer to the channel" | openspec-new-change:86. |
| new:59 existing → suggest continue | W§new | WR new | As new:25. |
| new:60 never pass `--schema` | W§new | WR new | As new:29. |

## opsx-continue

| Source | Destination | Test | Coverage |
|---|---|---|---|
| continue:8 create, gate, advance | W§continue | WR continue "gates each artifact" | "Gate and advance" bullet. |
| continue:10 name inferable counts; vague → prompt | stock | — | openspec-continue-change:28. |
| continue:16 one change → use and announce; several → ask through channel | W§Shared rules (Change selection) + stock | WR "never guesses the change" | openspec-continue-change:34-46. |
| continue:18-24 show top 3-4 with name, schema, status, recency, mark recommended | W§Shared rules + stock | WR "never guesses the change" | openspec-continue-change:39-44 (no schema column); W adds schema. |
| continue:26 never guess with several changes | W§Shared rules | WR "never guesses the change" | Anchored "never guess". |
| continue:30-36 status fields | stock | — | openspec-continue-change:48-56. |
| continue:35 fall back to `isComplete` | W§continue + stock | WR continue "stops before apply" | openspec-continue-change:55, :69; anchored in W. |
| continue:38 `skipped` satisfied, never create, no files | W§continue + stock | WR continue "skipped as satisfied" | openspec-continue-change:54, :89-90. |
| continue:42 partial glob artifact check first | stock + W§continue | WR continue "completes partial glob artifacts" | openspec-continue-change:62-65 (same check); W adds the gate after it. |
| continue:44-46 planning complete → only a ready `finalize`; else point to `/opsx-apply`, STOP | W§continue | WR continue "creates only finalize" | Stock congratulates and stops (openspec-continue-change:69-73), no finalize, no command name; overridden. |
| continue:48-49 next is `apply` → do not create, point to `/opsx-apply` | W§continue | WR continue "stops before apply" | Stock has no apply stop; added. |
| continue:52-62 pick first ready, get instructions, field meanings | stock | — | openspec-continue-change:77-90. |
| continue:61 instruction names `superpowers:<x>` → Superpowers rule | W§Superpowers rule | WR "redirects output" | Plus `S:brainstorm`, `S:plan` name the skill. |
| continue:65 re-read dependencies from disk | stock | — | openspec-continue-change:92, :131. |
| continue:66-68 template, context/rules constraints, write to path | stock | — | openspec-continue-change:93-98. |
| continue:69 multi-file artifact counts as one | stock | — | openspec-continue-change:63-65, :93. |
| continue:70 partial: write missing only, gate, continue, never overwrite | W§continue | WR continue "completes partial glob artifacts" | Stock stops after (openspec-continue-change:65); W gates and continues. |
| continue:71 one artifact per gate, show what is unlocked | W§continue + stock | WR continue "gates each artifact" | openspec-continue-change:100. |
| continue:72 finalize code review gate at step 2b before closeout | W§continue + `S:finalize` step 2b | WR continue "runs the code review gate for finalize" | Anchored. |
| continue:73 internal check: read routing, spec/plan reviewer roles | W§continue + W§Shared rules | WR continue "internal review" | Anchored. |
| continue:73 give artifact and dependency files, incl. existing specs for partial | W§continue | WR continue "internal review" | "including existing specs when only partial specs were added". |
| continue:73 resolve findings, re-review before human gate; preserve files | W§continue | WR continue "internal review" | Anchored. |
| continue:73 verdict advisory, adds no stop or artifact, does not advance | W§continue | WR continue "only a human gate approval advances" | Anchored. |
| continue:73 baseline main specs; no main spec → no baseline; inline check same specs | W§continue | WR continue "internal review" | Anchored verbatim. |
| continue:73 integration absent → inline self-check; disabled role stops | W§continue | WR continue "internal review" | Anchored. |
| continue:74 gate; approved → next artifact; stop at planning complete / apply; changes → revise; dismissed → ask; finalize follow-up commit | W§continue + W§Review gate | WR continue "gates each artifact", "runs the code review gate" | Anchored. |
| continue:75 repeat loop | W§continue | WR continue "gates each artifact" | "Repeat until planning is complete or the next ready artifact is `apply`." |
| continue:78-79 all blocked → show status | stock | — | openspec-continue-change:105-107. |
| continue:82-84 show progress | stock | — | openspec-continue-change:109-112. |
| continue:85 `todo` tool, checklist fallback | W§Shared rules | WR "todo fallback" | Anchored. |
| continue:89 Superpowers artifact rule (drop prefix, read skill, write only where told, ignore closing step, no second artifact) | W§Superpowers rule | WR "redirects output" | Anchored. |
| continue:89 brainstorm gate is design-doc approval; do not ask separately | **MUST** W§Superpowers rule | WR "brainstorm gate is the brainstorming skill's design-doc approval" | Anchored verbatim ("never ask for it separately"). |
| continue:89 skill missing → STOP, install Superpowers | W§Superpowers rule | WR "redirects output" | Anchored. |
| continue:91-111 Review gate (outcomes table, dismissed, open, notes, cascade, code review gate 1-4) | W§Review gate | WR "single gate section", PC continue review gate block | Copied once, verbatim. |
| continue:115-121 output incl. two closing prompts | W§continue (Output) + stock | WR — (anchored in PC) | Stock prompt (openspec-continue-change:121) overridden. |
| continue:125 use the schema's sequence | stock | — | openspec-continue-change:125. |
| continue:128 one artifact per gate | W§continue | WR continue "gates each artifact" | Anchored. |
| continue:129 only a human gate approval advances | **MUST** W§continue | WR continue "only a human gate approval advances" | Anchored with the three non-advancing outcomes. |
| continue:130 STOP at planning complete / apply; never create apply | W§continue | WR continue "stops before apply" | Anchored. |
| continue:131 read dependencies from disk | stock | — | openspec-continue-change:131. |
| continue:132 never skip or reorder | stock | — | openspec-continue-change:132. |
| continue:133 ask when context unclear | stock | — | openspec-continue-change:133. |
| continue:134 verify file exists | stock | — | openspec-continue-change:134. |
| continue:135 never copy context/rules | stock | — | openspec-continue-change:136-138. |

## opsx-ff

| Source | Destination | Test | Coverage |
|---|---|---|---|
| ff:8 brainstorm with the user, then everything | W§ff | WR ff "brainstorm gate first" | Brainstorm gate bullet. |
| ff:10 input | stock | — | openspec-ff-change:28. |
| ff:16-20 ask, derive kebab name, understand first | stock + W§Shared rules | — | openspec-ff-change:32-39. |
| ff:24-28 create if missing; omit `--schema` | W§ff + stock | WR new "never passes --schema" (same rule) | openspec-ff-change:41-45 does not pass `--schema`; W states it. |
| ff:30 existing name → tell, confirm, skip done, never overwrite | W§ff | — (PC ff block) | Stock only suggests continuing (openspec-ff-change:128); W keeps the fork rule. |
| ff:33-39 build order from status | stock | — | openspec-ff-change:47-54. |
| ff:43 `todo` tool, fallback | W§Shared rules | WR "todo fallback" | Anchored. |
| ff:45-56 loop, get instructions, fields | stock | — | openspec-ff-change:60-74. |
| ff:57 Superpowers rule | W§Superpowers rule | WR "redirects output" | Anchored. |
| ff:58 read dependencies | stock | — | openspec-ff-change:75. |
| ff:59 inspect repository before drafting; tasks reference real files | W§ff + stock | WR ff "grounds tasks" | openspec-ff-change:76-79; anchored in W (spec scenario Grounded tasks). |
| ff:60-62 template, glob path, multi-file, constraints | stock | — | openspec-ff-change:80-83. |
| ff:63 internal spec/plan review, unattended, no extra stop, baseline, inline fallback, scout recon | W§ff (Internal checks → W§continue rule) | WR ff "keeps exactly two planned stops", continue "internal review" | Anchored. |
| ff:64 verify files exist, show progress | stock | — | openspec-ff-change:81, :84, :129. |
| ff:67 brainstorm interactive; gate is design approval | W§ff + W§Superpowers rule | WR ff "brainstorm gate first" | Anchored. |
| ff:68 gate on `brainstorm.md` first, no later artifacts before approval | W§ff | WR ff "brainstorm gate first" | Anchored. |
| ff:69 then unattended to `applyRequires`; re-run status | W§ff | WR — (PC ff block) | "Unattended phase" bullet. |
| ff:70 ask only when input missing; record assumptions; no execution-handoff question | W§ff | WR — (PC ff block) | Overrides openspec-ff-change:96-98 / :127 (asks freely). |
| ff:71 always create design; skip only `skipped`; no repetition of brainstorm in design | W§ff + `S:design` | WR ff "always creates design" | Overrides openspec-ff-change:92 (stock skips optional design). Non-repetition is in `S:brainstorm`. |
| ff:72 nothing ready but unmet → stop, report | W§ff | — | "If no artifact is ready while `applyRequires` is unmet ..." |
| ff:73 only two planned stops | W§ff | WR ff "keeps exactly two planned stops" | Anchored. |
| ff:74 final gate packet explicit list, never folder, no brainstorm; cascade; late brainstorm reopens all five | W§ff + W§Review gate | WR ff "final gate packet" | Late brainstorm cascade lives once in W§Review gate. |
| ff:77-79 final status | stock | — | openspec-ff-change:100-103. |
| ff:83 Superpowers rule incl. "only permitted stops" and design-doc approval | **MUST** W§Superpowers rule + W§ff | WR "brainstorm gate is the ... design-doc approval", ff "keeps exactly two planned stops" | Anchored. |
| ff:85-105 Review gate | W§Review gate | WR "single gate section" | Same single copy. |
| ff:109-113 summary incl. skipped with reason, gate outcome | W§ff (End) | WR ff "always creates design" | Anchored. |
| ff:114 point to `/opsx-apply` only after final gate approved | W§ff | WR ff "points to /opsx-apply only after the final gate" | Overrides openspec-ff-change:111. |
| ff:118-122 creation guidelines | stock | — | openspec-ff-change:115-122. |
| ff:125 create all `apply.requires` artifacts | stock | — | openspec-ff-change:125. |
| ff:126 never create `apply` | W§ff | — | "Never create the `apply` artifact". |
| ff:127 do not start apply; stop after final gate | W§ff | WR ff "points to /opsx-apply only after" | Anchored "do not start apply". |
| ff:128 read dependencies | stock | — | openspec-ff-change:126. |
| ff:129 brainstorm interactive, never fabricate answers/approval | W§ff | — | "never fabricate the user's answers or approval". |
| ff:130 verify each file exists | stock | — | openspec-ff-change:129. |

## opsx-apply

| Source | Destination | Test | Coverage |
|---|---|---|---|
| apply:8 wraps the apply instruction | W§apply | WR apply "schema apply block replaces the stock loop" | Anchored. |
| apply:10, :16-20 select change, ask, announce | W§Shared rules + stock | WR "never guesses the change" | openspec-apply-change:32-39. |
| apply:24-28 locate worktree first; reuse; skip step 0; read `apply.md` there | W§apply | WR apply "reuses the existing worktree" | Anchored. |
| apply:31-35 status and apply instructions fields | stock | — | openspec-apply-change:41-60. |
| apply:37-42 trigger precedence post-PR → fix-iteration → blocked → all_done | **MUST** W§apply | WR apply "trigger precedence" | Index order asserted. |
| apply:40 blocked by cause (missing artifacts / tracking file), no code | W§apply + stock | WR apply "trigger precedence" | openspec-apply-change:66-68; W names `/opsx-continue`. |
| apply:41 all_done → `/opsx-verify` then `/opsx-archive` | W§apply | WR apply "trigger precedence" | Overrides stock "review or verification" (openspec-apply-change:69). |
| apply:44 workspace guard | **MUST** W§apply | WR apply "workspace guard" | Anchored verbatim. |
| apply:48 read `contextFiles` | stock | — | openspec-apply-change:89. |
| apply:48 follow apply instruction setup, not copy step text | W§apply + `S:apply` | WR apply "schema apply block replaces the stock loop" | Anchored. |
| apply:48 progress display | stock | — | openspec-apply-change:97-102. |
| apply:48 `todo` tool fallback | W§Shared rules | WR "todo fallback" | Anchored. |
| apply:50 Superpowers rule | W§Superpowers rule | WR "redirects output" | Anchored. |
| apply:54 read routing before executor | W§Shared rules (Delegation) | WR "delegation names" | Link anchored. |
| apply:56 delegated executor: SDD, select and announce implementer/task reviewer | W§apply (Executor) + `S:apply` step 2a | WR apply "executor seats" | Anchored. |
| apply:57-60 seats: implementer per task, one combined review, final whole-branch seat, no duplicate generic reviewer | W§apply | WR apply "executor seats" | Anchored. |
| apply:61 one writer per worktree; configured models; thinking only per Lanes; overrides model pinning; parent todo/ticks; BASE..HEAD | W§apply | WR apply "executor seats" | Anchored. |
| apply:62 lanes per plan task; Blocked by; overlap; legacy; plan governs | R§Lanes + W§apply | SR lanes tests, WR apply "executor seats" | Scheduling details live in R§Lanes (unchanged); W points there. |
| apply:62 overrides SDD sequential rule only in child worktrees | W§apply | WR apply "executor seats" | Anchored. |
| apply:62 review then merge, parent ticks; escalated lane waits | W§apply + R§Lanes | WR apply "executor seats" | Anchored. |
| apply:62 record `## Lanes` | `S:apply` step 3 + R§Lanes | SC "lanes table is recorded per plan task" | Already in schema. |
| apply:63 inline executor: executing-plans, tell user, manual TDD, whole-branch review | W§apply + `S:apply` 2b | WR apply "executor seats" | Anchored. |
| apply:64 no role / incompatible / launch / mid-run failure → stop lane, no substitute, never silently inline | W§apply + R§Failures | WR apply "executor seats" | Anchored. |
| apply:65 same policy in fix-iteration and post-PR | W§apply | WR apply "executor seats" | Anchored. |
| apply:66 never invent subagent calls | W§Shared rules | WR "delegation names" | Anchored. |
| apply:67 brief Contracts; public → user; internal → plan.md + deviations | W§apply + `S:apply` Contracts rule | WR apply "contracts, ticks" | Anchored. |
| apply:69 change-directory authority in worktree | `S:apply` step 1 + W§apply | SC "apply names worktree branch and worktree authority" | Already in schema. |
| apply:71 record executor | `S:apply` step 3 | SC | Schema receipt fields. |
| apply:71 tick at sourcePath/line after checking; never a different task; fully implemented | W§apply + stock | WR apply "contracts, ticks" | openspec-apply-change:111-112, :192-194; anchored in W. |
| apply:73 pause: unclear, design issue, blocker, added scope, narrowing | W§apply + stock | WR apply "contracts, ticks" | openspec-apply-change:116-121. |
| apply:77 receipt after final review; carry deviations; STOP; no finishing; `/opsx-verify` | W§apply + `S:apply` step 3 | WR apply "receipt", "code review gate is finalize-only" | Anchored. |
| apply:83-87 post-PR mode (receiving-code-review, feature branch, TDD, N+1 entry, verify, finalize.md, push policy, AGENTS.md) | W§apply | WR apply "receipt, post-PR and fix-iteration modes" | Anchored. |
| apply:92-96 fix-iteration (cap 5, systematic-debugging, artifact first, TDD, raise Iteration, commit, STOP) | W§apply | WR apply "receipt, post-PR and fix-iteration modes" | Anchored. |
| apply:100 Superpowers rule | W§Superpowers rule | WR | Anchored. |
| apply:104-107 output | W§apply (Receipt and stop) | — | "report the executor and the commit range". |
| apply:109 pause → channel | W§Shared rules | WR "questions defer to the channel" | Anchored. |
| apply:112 blocked/all_done get no code except modes | W§apply | WR apply "trigger precedence" | Anchored. |
| apply:113 reuse worktree, never redo step 0 | W§apply | WR apply "reuses the existing worktree" | Anchored. |
| apply:114 stop at 5 fix iterations | W§apply | WR apply "receipt, post-PR and fix-iteration modes" | "if it is already 5, stop". |
| apply:115 read contextFiles | stock | — | openspec-apply-change:185. |
| apply:116 minimal changes, tick right away | stock | — | openspec-apply-change:188-189. |
| apply:117 pause on errors | stock | — | openspec-apply-change:190. |
| apply:118 pause before scope change | W§apply + stock | WR apply "contracts, ticks" | openspec-apply-change:191. |
| apply:119 never finishing-a-development-branch | W§Shared rules (Finishing) + `S:apply` step 3 | SC "apply stops after final review" | Anchored. |
| apply:120 use contextFiles names | stock | — | openspec-apply-change:193. |
| apply:121 suggest artifact updates | W§apply + stock | — | openspec-apply-change:187. |

## opsx-verify

| Source | Destination | Test | Coverage |
|---|---|---|---|
| verify:8 wraps verify instruction | W§verify | WR verify "fresh tests and the six checks" | Anchored. |
| verify:10, :16-20 select, ask, announce | W§Shared rules + stock | WR "never guesses the change" | openspec-verify-change:32-43. |
| verify:24-30 locate worktree; post-finalize main checkout; else ask, never guess | W§verify | WR verify "requires apply.md and runs in the worktree" | Anchored. |
| verify:32 worktree authority; never read change from main checkout before finalize | W§verify + `S:verify` | WR verify | Anchored. |
| verify:36 require `apply.md`, else `/opsx-apply`; note Iteration, range, executor | W§verify + `S:verify` | WR verify "requires apply.md" | Anchored. |
| verify:39-44 three CLI calls in worktree | `S:verify` + stock | — | openspec-verify-change:45-57; worktree cwd per W. |
| verify:44 workspace-planning → stop | W§Shared rules (Workspace mode) | WR "stops in workspace-planning mode" | Anchored. |
| verify:48 follow verify instruction six checks; use contextFiles | W§verify + `S:verify` | WR verify "six checks" | Six checks in `S:verify`. |
| verify:50 progress from apply instruction; unavailable tracking → not verified | stock | — | openspec-verify-change:85-87 (`unavailableTrackingFiles` → not verified). |
| verify:52 Superpowers rule | W§Superpowers rule | WR | Anchored. |
| verify:54 delegated evidence (verifier role, cwd, report, never fix, parent writes, fresh only, reject old, inspect, absent → inline, failure → stop) | W§verify | WR verify "delegated evidence" | Anchored. |
| verify:57 fresh test run, record command/exit/counts | W§verify + `S:verify` check 4 | WR verify "fresh tests" | Anchored. |
| verify:58 verification-before-completion evidence | `S:verify` | SC "verify instruction ... loads verification-before-completion" | Already in schema. |
| verify:59 contracts check 5 read-only, deviation is expected, warning never FAIL, uncomparable not verified | `S:verify` check 5 + W§verify | SC verify check 5 tests; WR verify | Schema states warning/not-verified; W adds read-only and deviation-as-baseline. |
| verify:61 no sync check, no main spec edits | W§verify + `S:verify` | WR verify "is read-only" | Anchored. |
| verify:65-71 write `verify.md` contents | `S:verify` + verify template | SC verify template tests | Template sections. |
| verify:73-78 outcomes; failing tests FAIL; not verified caps | `S:verify` + W§verify | SC, WR verify "fresh tests" | Anchored "Failing fresh tests are `FAIL`". |
| verify:80 prefer lower severity; never PASS with failing tests | stock | — | openspec-verify-change:213. |
| verify:84 PASS → `/opsx-continue` in worktree for finalize, then `/opsx-archive` | W§verify (Next step) + `S:verify` loop | WR — (EC verify block) | Anchored. |
| verify:85 code-fixable FAIL → `/opsx-apply` then verify | W§verify + `S:verify` | — | Anchored. |
| verify:86 stop after 5 iterations; iteration = apply.md; post-PR not counted | **MUST** W§verify | WR verify "5-iteration stop, and post-PR iterations do not count" | Anchored verbatim. |
| verify:87 artifact-level FAIL | W§verify + `S:verify` | — | Anchored. |
| verify:91 Superpowers rule | W§Superpowers rule | WR | Anchored. |
| verify:95-99 output incl. "iteration N of 5" | W§verify | — | "loop status (iteration N of 5)". |
| verify:101 pause → channel | W§Shared rules | WR | Anchored. |
| verify:104 everything in the worktree | W§verify | WR verify | Anchored. |
| verify:105 no implement/archive | W§verify + stock | WR verify "is read-only" | openspec-verify-change:62. |
| verify:106 never verify without apply.md | W§verify | WR verify "requires apply.md" | Anchored. |
| verify:107 fresh tests | W§verify | WR verify "fresh tests" | Anchored. |
| verify:108 actionable recommendations | stock | — | openspec-verify-change:214. |
| verify:109 no sync check | W§verify | WR verify "is read-only" | Anchored. |
| verify:110 read systematic-debugging; stop after 5 | W§apply (Fix-iteration) + W§verify | WR apply/verify | Anchored. |
| verify:111 no finishing | W§Shared rules (Finishing) | — | Anchored. |

## opsx-sync

| Source | Destination | Test | Coverage |
|---|---|---|---|
| sync:8-10 agent-driven merge | stock | — | openspec-sync-specs (whole skill is the agent-driven merge). |
| sync:12, :18-22 select, ask, announce | W§Shared rules + stock | WR "never guesses the change" | openspec-sync-specs:36-45. |
| sync:30 workspace-planning → stop | W§Shared rules (Workspace mode) | WR "stops in workspace-planning mode" | Anchored. |
| sync:32 work in the worktree when one exists | W§sync (Where) | — | Stock has no worktree notion; kept. |
| sync:36 use `existingOutputPaths`; none → stop | stock | — | openspec-sync-specs:58-62. |
| sync:38-42 delta section kinds | stock | — | openspec-sync-specs:78-82. |
| sync:44 read specs instructions once; apply rules; never copy | W§sync + stock | WR sync "instructions unavailable" | openspec-sync-specs:88-102; anchored in W. |
| sync:44 instructions fail → STOP without writing | **MUST** W§sync + stock | WR sync "instructions unavailable: stop without writing any spec" | openspec-sync-specs:93-95 also; anchored verbatim. |
| sync:48 read delta and main; order RENAMED, REMOVED, MODIFIED, ADDED | W§sync | WR sync "applies operations in order" | Stock does not fix an order; kept. |
| sync:50 RENAMED keeps body | stock | — | openspec-sync-specs:156-157. |
| sync:51 REMOVED deletes block | stock | — | openspec-sync-specs:131-132. |
| sync:52 MODIFIED replaces whole block, no partial merge | W§sync | — (EC sync block) | Stock merges intelligently (openspec-sync-specs:123-129, :257); fork's whole-block rule kept. |
| sync:53 ADDED appended; existing header → MODIFIED | stock | — | openspec-sync-specs:119-121. |
| sync:55 exact header match; unmatched → report and ask | W§sync | WR sync "applies operations in order" | Anchored. |
| sync:57 new capability only from ADDED; MODIFIED/RENAMED/REMOVED-only blocked; copy Purpose; TBD; never delta headers; never overwrite Purpose | stock | — | openspec-sync-specs:110-115, :163-176, :159-161, :236-237, :282. |
| sync:59 empty Requirements → stop; retire only with `retire_capabilities: true`; report Purpose, restorable | stock | — | openspec-sync-specs:131-154, :190-191. |
| sync:61 block per capability; list blocked in report | W§sync (Blocks) | — | Stock reports per capability but does not require listing partial state; kept. |
| sync:63 preserve unmentioned; idempotent; already-applied entries skipped silently | stock + W§sync (Headers) | — | openspec-sync-specs:129, :281, :285; skip-silently rule anchored in W. |
| sync:67-71 validate; on failure fix or ask | W§sync + stock | — | openspec-sync-specs:180-181. |
| sync:75 do not archive | W§sync | WR sync "never archives" | Anchored. |
| sync:79-97 output | stock | — | openspec-sync-specs:261-276. |
| sync:100-106 guardrails | stock + W§sync | WR sync | openspec-sync-specs:280-290; "outside `openspec/specs/`" and "do not move or delete" in W. |

## opsx-archive

| Source | Destination | Test | Coverage |
|---|---|---|---|
| archive:8 delta-sync check before archive | stock + W§archive | WR archive | openspec-archive-change:111-167. |
| archive:10 runs in main checkout after finalize, before PR merge | W§archive (Where) | — | Kept. |
| archive:12, :18-21 select, ask, announce, active only, schema | W§Shared rules + stock | WR "never guesses the change" | openspec-archive-change:34-44. |
| archive:29 parse status | stock | — | openspec-archive-change:75-80. |
| archive:31 workspace-planning → stop | W§Shared rules | WR "stops in workspace-planning mode" | Anchored. |
| archive:33 `skipped` counts as complete; incomplete → warn, confirm | stock | — | openspec-archive-change:82-85. |
| archive:37 task counts from `openspec list --json`; invalid → stop; unlisted → stop; 0 → skip; incomplete → confirm | stock | — | openspec-archive-change:89-109. |
| archive:39 warnings never block silently | stock | — | openspec-archive-change:211. |
| archive:43 delta paths; none → skip | stock | — | openspec-archive-change:113-116. |
| archive:45-48 synced definition | W§archive (Synced means) | — (EC archive block) | Stock uses semantic comparison; fork definition kept. |
| archive:50 missing main spec decided by operations; retire exception | stock | — | openspec-archive-change:120-124. |
| archive:52 idempotent, second check "already synced" | W§archive | — | Anchored. |
| archive:56 all synced → archive without syncing | W§archive (Choices) | — | Stock offers "Archive now / Sync anyway / Cancel" (openspec-archive-change:131); overridden. |
| archive:57 blocked → only archive-without-sync or cancel; unclear → ask again | W§archive + stock | WR archive "offers only safe choices" | openspec-archive-change:129, :137. |
| archive:58 not synced → three choices recommended first; unclear → ask again; Sync now runs sync | W§archive + stock | WR archive | openspec-archive-change:130-148. |
| archive:61 sync reports blocked → blocked path; still re-compare others | W§archive (Sync now) | — | Stock stops on any block (openspec-archive-change:150-152); fork fallback kept. |
| archive:62 re-compare all; "Synced" only if all match; else stop | **MUST** W§archive + stock | WR archive "re-compares after a sync" | openspec-archive-change:161-167; anchored. |
| archive:64 check lives in archive, not verify | W§verify | WR verify "is read-only" | Anchored. |
| archive:68-72 check `openspec archive --help` | W§archive | — | "Check `openspec archive --help` first". |
| archive:76-79 always `--skip-specs`; skill owns spec update | W§archive | WR archive "archives through the CLI" | Overrides stock `mv` (openspec-archive-change:171-184). |
| archive:82 always `-y`; target exists or CLI fails → stop, no manual move | W§archive | WR archive "archives through the CLI" | Anchored. |
| archive:86 summary contents | W§archive (Summary) + stock | — | openspec-archive-change:186-193. |
| archive:91-99 output Specs values | W§archive (Summary) | — | Anchored list. |
| archive:102 never guess change | W§Shared rules | WR | Anchored. |
| archive:103 warn and confirm | stock | — | openspec-archive-change:211. |
| archive:104 "Synced" only after re-compare | **MUST** W§archive | WR archive "re-compares" | Anchored. |
| archive:105 counts from CLI | stock | — | openspec-archive-change:89-100. |
| archive:106 run check whenever deltas exist; second check already synced | W§archive + stock | — | openspec-archive-change:216. |
| archive:107 Sync now first unless blocked; all synced → archive | W§archive | WR archive | Anchored. |
| archive:108 `--skip-specs`; never `--no-validate`; never move by hand | **MUST** W§archive | WR archive "never passes --no-validate", "archives through the CLI" | Anchored. |
| archive:109 main checkout timing | W§archive (Where) | — | Anchored. |
