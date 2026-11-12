import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	WORKFLOW_PATH,
	WORKFLOW_SECTIONS,
	flatSection,
	sentences,
	workflow,
	workflowHeadings,
	workflowSection,
} from "./helpers/workflow.ts";

const FORBIDDEN = [
	"AskUserQuestion",
	"rpiv-",
	"pi-subagents",
	"Skill tool",
	"/opsx:",
	"TodoWrite",
	"Task tool",
	"ask_user_question",
	"plannotator",
	"tintinweb",
	"gotgenes",
	"contact_supervisor",
	"subagents_enable",
	"get_subagent_result",
	"steer_subagent",
	"Agent(",
	"subagent(",
] as const;

const UNUSED_STOCK = [
	"openspec-propose",
	"openspec-update-change",
	"openspec-bulk-archive-change",
	"openspec-onboard",
] as const;

describe("workflow.md structure", () => {
	it("is shipped in the bundled schema directory", () => {
		expect(existsSync(WORKFLOW_PATH)).toBe(true);
	});

	it("has the twelve H2 sections in contract order", () => {
		expect(workflowHeadings()).toEqual([...WORKFLOW_SECTIONS]);
	});

	it("single gate section: exactly one Review gate heading", () => {
		expect(workflow().match(/^## Review gate$/gm) ?? []).toHaveLength(1);
		expect(workflow().match(/^#+ Review gate\s*$/gm) ?? []).toHaveLength(1);
	});

	it("planning sections: explore, new, continue and ff are present and non-empty", () => {
		for (const s of ["explore", "new", "continue", "ff"] as const) {
			expect(workflowSection(s).trim(), s).not.toBe("");
		}
	});

	it("execution sections: apply, verify, sync and archive are present and non-empty", () => {
		for (const s of ["apply", "verify", "sync", "archive"] as const) {
			expect(workflowSection(s).trim(), s).not.toBe("");
		}
	});

	it("forbidden names: no harness, plugin or tool names", () => {
		const text = workflow();
		for (const term of FORBIDDEN) {
			expect(text, term).not.toContain(term);
		}
		expect(text).not.toMatch(/plannotator|ask_user_question/i);
	});

	it("spells commands as /opsx-<cmd>", () => {
		expect(workflow()).not.toMatch(/\/opsx:/);
		expect(workflow()).toMatch(/\/opsx-continue/);
	});

	it("links subagent-routing.md relatively and the link resolves", () => {
		const link = /\]\((subagent-routing\.md)\)/.exec(workflow());
		expect(link).not.toBeNull();
		expect(existsSync(join(dirname(WORKFLOW_PATH), link![1]))).toBe(true);
	});

	it("referenced, not repeated: continue and ff refer to the Review gate without an outcome table", () => {
		for (const s of ["continue", "ff"] as const) {
			const text = workflowSection(s);
			expect(text, s).toContain("Review gate");
			expect(text, s).not.toMatch(/\| `approved` \|/);
			expect(text, s).not.toContain("| Outcome |");
		}
	});

	it("gate section tool names: none, and the result column is named for the channel", () => {
		const gate = workflowSection("Review gate");
		expect(gate).not.toMatch(/plannotator/i);
		expect(gate).not.toMatch(/ask_user_question/i);
		expect(gate).toContain("| Outcome | Result on the channel |");
	});
});

describe("shared rules", () => {
	const shared = () => flatSection("Shared rules");

	it("questions defer to the channel", () => {
		expect(shared()).toContain("Ask the user as the routing note's Interaction channel paragraph describes");
		expect(shared()).toContain("numbered options, recommended first");
	});

	it("todo fallback: the todo tool, a plain checklist, tasks.md stays official", () => {
		expect(shared()).toContain("the `todo` tool if available; otherwise state the checklist in your reply");
		expect(shared()).toContain("`tasks.md` stays the official status");
	});

	it("delegation names: refer to the Subagent integration paragraph and the reference", () => {
		expect(shared()).toContain("routing note's Subagent integration paragraph");
		expect(shared()).toContain("[subagent routing](subagent-routing.md)");
		expect(shared()).toMatch(/Never invent subagent calls/);
	});

	it("maps every command to its stock skill", () => {
		const map: Record<string, string> = {
			explore: "openspec-explore",
			new: "openspec-new-change",
			continue: "openspec-continue-change",
			ff: "openspec-ff-change",
			apply: "openspec-apply-change",
			verify: "openspec-verify-change",
			sync: "openspec-sync-specs",
			archive: "openspec-archive-change",
		};
		for (const [cmd, id] of Object.entries(map)) {
			expect(shared(), cmd).toContain(`\`/opsx-${cmd}\` runs \`${id}\``);
		}
	});

	it("never guesses the change when several exist", () => {
		expect(shared()).toContain("ask the user to choose");
		expect(shared()).toContain("most recently modified marked recommended; never guess");
	});

	it("stops in workspace-planning mode", () => {
		expect(shared()).toContain('`actionContext.mode: "workspace-planning"`');
		expect(shared()).toContain("stop before editing files");
	});

	it("workspace mode names verify, sync and archive; apply defers to its guard", () => {
		const t = shared();
		expect(t).toContain("verify, sync and archive are not supported here");
		expect(t).not.toMatch(/apply, verify, sync and archive are not supported/);
		expect(t).toContain("apply follows its workspace guard in the apply section");
	});
});

describe("explore", () => {
	const text = () => flatSection("explore");

	it("explore hand-off: points to /opsx-continue <name>, never recommends openspec-propose", () => {
		expect(text()).toContain("Then point to `/opsx-continue <name>`.");
		expect(text()).not.toContain("openspec-propose");
	});

	it("does not write brainstorm.md and runs no review gate", () => {
		expect(text()).toContain("do not write `brainstorm.md`");
		expect(text()).toContain("do not run a review gate in explore");
		expect(text()).toContain("Never create `openspec/changes/` by hand.");
	});

	it("never writes code and refuses schema edits", () => {
		expect(text()).toContain("Never write code.");
		expect(text()).toContain(
			"Editing a schema, a template or `config.yaml` counts as implementing: refuse it and point the user to creating a change",
		);
	});

	it("asks consent before the first write", () => {
		expect(text()).toContain(
			"Reading is free, but before the first write name the file and the scope and wait for a yes, unless the user asked for the capture.",
		);
	});

	it("overrides the stock capture: scaffold only, even when asked to capture", () => {
		expect(text()).toContain("This overrides the stock explore skill's \"capture the requested artifacts\" behaviour");
		expect(text()).toContain("even when the user asks to capture proposal or specs into a new change, scaffold only with `openspec new change <name>` and point to `/opsx-continue <name>`");
	});

	it("never captures brainstorm.md or plan.md", () => {
		expect(text()).toContain(
			"`brainstorm.md` and `plan.md` are never explore capture targets because they are written through `/opsx-continue <name>` with its review gate.",
		);
	});

	it("diagrams use ASCII only and the file is ASCII", () => {
		expect(text()).toContain("Diagrams use ASCII characters only.");
	});

	it("scout recon is bounded, evidence-only and optional", () => {
		const t = text();
		expect(t).toContain("scout role");
		expect(t).toMatch(/evidence-only and read-only/);
		expect(t).toMatch(/never write code, schema or official artifacts/);
		expect(t).toMatch(/Small conceptual exploration stays inline/);
		expect(t).toMatch(/availability alone does not trigger a call/);
		expect(t).toMatch(/user conversation stays with the parent/);
	});
});

describe("new", () => {
	const text = () => flatSection("new");

	it("suggests continue for an existing name and never passes --schema", () => {
		expect(text()).toContain("suggest `/opsx-continue <name>` and stop");
		expect(text()).toContain("Never pass `--schema`");
	});

	it("creates no artifact and overrides the stock closing prompt", () => {
		expect(text()).toContain("Create no artifact.");
		expect(text()).toContain("Run `/opsx-continue` to create the next artifact, or `/opsx-ff` to fast-forward.");
	});
});

describe("continue", () => {
	const text = () => flatSection("continue");

	it("only a human gate approval advances", () => {
		const s = sentences(text()).find((x) => x.includes("Only a human gate approval advances"));
		expect(s).toBeDefined();
		const rest = text().slice(text().indexOf("Only a human gate approval advances"));
		const next = sentences(rest).slice(0, 2).join(" ");
		expect(next).toContain("changes_requested");
		expect(next).toContain("dismissed");
		expect(next).toContain("internal review verdict");
	});

	it("gates each artifact, then advances without a new command", () => {
		const t = text();
		expect(t).toContain("Create exactly one artifact per gate, then run the Review gate");
		expect(t).toContain("create the next ready artifact, then gate it, without a new command");
	});

	it("stops before apply and falls back to isComplete", () => {
		const t = text();
		expect(t).toContain("`isPlanningComplete` is true (fall back to `isComplete` when it is absent)");
		expect(t).toContain("never create the `apply` artifact; point to `/opsx-apply`");
	});

	it("completes partial glob artifacts and treats skipped as satisfied", () => {
		const t = text();
		expect(t).toContain("Write only the missing files as that call's one artifact, then run the Review gate on them");
		expect(t).toContain("An artifact with status `skipped` is satisfied");
	});

	it("creates only finalize when planning is already complete", () => {
		expect(text()).toContain("Create nothing except a ready `finalize` artifact");
	});

	it("runs the code review gate for finalize before the closeout", () => {
		expect(text()).toContain("Run the code review gate while creating `finalize`, at its step 2b, before the git-side closeout");
		expect(text()).toContain("follow-up commit and push on the feature branch");
	});

	it("internal review: spec and plan reviewers, baseline main specs, advisory", () => {
		const t = text();
		expect(t).toContain("spec reviewer role");
		expect(t).toContain("plan reviewer role");
		expect(t).toContain(
			"the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename",
		);
		expect(t).toMatch(/no main spec as having no baseline/);
		expect(t).toMatch(/advisory, not a human approval/);
		expect(t).toMatch(/inline self-check compares the deltas with the same main specs/);
	});
});

describe("ff", () => {
	const text = () => flatSection("ff");

	it("brainstorm gate first, before later artifacts", () => {
		const t = text();
		expect(t).toContain("Right after `brainstorm.md` is written, run the Review gate on that one file.");
		expect(t).toContain("Create no later artifact until it is approved.");
	});

	it("keeps exactly two planned stops", () => {
		expect(text()).toContain("The brainstorm gate and the final gate are the only planned stops.");
		expect(text()).toMatch(/internal reviews add no extra human stop or approval/);
	});

	it("always creates design and lists skipped artifacts", () => {
		const t = text();
		expect(t).toContain("Always create `design`, even if its `instruction` calls it optional");
		expect(t).toContain("each other `skipped` artifact with its reason");
	});

	it("grounds tasks in the repository", () => {
		expect(text()).toContain('never a generic "explore the codebase" step');
	});

	it("final gate packet is an explicit ordered list without brainstorm.md", () => {
		const t = text();
		for (const s of [
			"`proposal.md`, `design.md`, every `specs/<capability>/spec.md` (each by path), `tasks.md` and `plan.md`",
			"explicit ordered list, never a folder",
			"does not repeat `brainstorm.md`",
		]) {
			expect(t, s).toContain(s);
		}
	});

	it("points to /opsx-apply only after the final gate is approved", () => {
		expect(text()).toContain("Point to `/opsx-apply` only after the final gate is approved.");
		expect(text()).toContain("do not start apply");
	});
});

describe("apply", () => {
	const text = () => flatSection("apply");

	it("schema apply block replaces the stock loop: step 0, worktree, executor, receipt", () => {
		const t = text();
		expect(t).toContain("step 0 commit");
		expect(t).toContain("`<change-name>` worktree");
		expect(t).toMatch(/in place of the stock skill's task loop/);
		expect(t).toContain("implement only in the `<change-name>` worktree");
		expect(t).toContain("post-PR mode works on the feature branch");
	});

	it("code review gate is finalize-only", () => {
		expect(text()).toContain("Apply never opens the code review gate; the code review gate belongs to finalize.");
	});

	it("trigger precedence: post-PR, then fix-iteration, before blocked and all_done", () => {
		const t = text();
		const postPr = t.indexOf("Post-PR trigger");
		const fix = t.indexOf("Fix-iteration trigger");
		const blocked = t.indexOf("`blocked`: change no code");
		const done = t.indexOf("`all_done`: say");
		expect(postPr).toBeGreaterThan(-1);
		expect(fix).toBeGreaterThan(postPr);
		expect(blocked).toBeGreaterThan(fix);
		expect(done).toBeGreaterThan(blocked);
		expect(t).toContain("skipping the `blocked` and `all_done` stops");
		expect(t).toContain("skipping the `all_done` stop");
	});

	it("workspace guard: workspace-planning with empty allowedEditRoots stops", () => {
		expect(text()).toContain(
			'If status reports `actionContext.mode: "workspace-planning"` and `allowedEditRoots` is empty, explain that full workspace apply is not supported here',
		);
	});

	it("reuses the existing worktree on re-runs", () => {
		expect(text()).toContain("`git worktree list --porcelain`");
		expect(text()).toContain("`branch refs/heads/<change-name>`");
		expect(text()).toContain("Re-runs never redo step 0 or recreate the branch.");
	});

	it("executor seats, lanes and failure rules", () => {
		const t = text();
		expect(t).toContain("subagent-driven-development");
		expect(t).toContain("implementer role");
		expect(t).toContain("one combined spec and quality review by the task reviewer role");
		expect(t).toContain("no duplicate generic reviewer");
		expect(t).toContain("one implementation writer per worktree");
		expect(t).toMatch(/overrides any conflicting generic model-pinning advice/);
		expect(t).toContain("BASE..HEAD");
		expect(t).toContain("parallel writer lanes are allowed only in separate child worktrees");
		expect(t).toContain("inside one worktree its sequential rule stands");
		expect(t).toMatch(/escalated lane waits: the parent does neither merge nor tick it/);
		expect(t).toContain("executing-plans");
		expect(t).toContain("whole-branch review");
		expect(t).toContain("no generic replacement or substitute and never silently go inline");
		expect(t).toContain("Fix-iteration and post-PR modes use the same policy and seats");
	});

	it("contracts, ticks and scope pauses", () => {
		const t = text();
		expect(t).toContain("per-task contract order");
		expect(t).toContain("A `public` contract stops the executor");
		expect(t).toContain('recorded in `apply.md` under "Contract deviations"');
		expect(t).toContain("after checking that the checkbox there still matches the task");
		expect(t).toContain("only when the behavior is fully implemented");
		expect(t).toContain("pause and ask before adding scope no artifact specifies");
	});

	it("receipt, post-PR and fix-iteration modes", () => {
		const t = text();
		expect(t).toContain("carrying over the cumulative \"Contract deviations\"");
		expect(t).toContain("Read `receiving-code-review`");
		expect(t).toContain("append a `post-PR iteration N+1` entry");
		expect(t).toContain("a policy in the project `AGENTS.md` overrides it");
		expect(t).toContain("if it is already 5, stop");
		expect(t).toContain("read `systematic-debugging`");
	});
});

describe("verify", () => {
	const text = () => flatSection("verify");

	it("5-iteration stop, and post-PR iterations do not count", () => {
		expect(text()).toContain("Stop after 5 iterations");
		expect(text()).toContain("Post-PR iterations are tracked separately in `apply.md` and do not count toward the 5.");
	});

	it("requires apply.md and runs in the worktree", () => {
		expect(text()).toContain("If `apply.md` does not exist, stop and point to `/opsx-apply`.");
		expect(text()).toContain("until finalize, never read the change from the main checkout");
		expect(text()).toContain("`finalize.md` exists");
	});

	it("fresh tests and the six checks replace the stock report", () => {
		expect(text()).toContain("six checks of `openspec instructions verify --change <name> --json`");
		expect(text()).toContain("never reuse earlier output or the result in `apply.md`");
		expect(text()).toContain("Failing fresh tests are `FAIL`.");
	});

	it("delegated evidence: fresh, parent-owned, no fixes", () => {
		const t = text();
		expect(t).toContain("verifier role");
		expect(t).toContain("The verifier never fixes or modifies code and never writes `verify.md`");
		expect(t).toContain("collected in this invocation");
		expect(t).toContain("reject old apply or verify results");
		expect(t).toContain("never fabricates child evidence");
	});

	it("is read-only and leaves the sync check to archive", () => {
		expect(text()).toContain("Do not implement or archive anything during verify.");
		expect(text()).toContain("The delta-spec sync check belongs to `/opsx-archive`");
	});
});

describe("sync", () => {
	const text = () => flatSection("sync");

	it("instructions unavailable: stop without writing any spec", () => {
		expect(text()).toContain(
			"If reading the instructions fails, stop and report the error without writing any spec.",
		);
		expect(text()).toContain("never copy the `rules` into any spec");
	});

	it("applies operations in order and matches headers exactly", () => {
		expect(text()).toContain("RENAMED, REMOVED, MODIFIED, then ADDED");
		expect(text()).toContain("case-sensitive");
		expect(text()).toContain("do not guess");
	});

	it("never archives", () => {
		expect(text()).toContain("never archive, move or delete the change");
	});
});

describe("archive", () => {
	const text = () => flatSection("archive");

	it("archives through the CLI with --skip-specs -y; mv only in a never sentence", () => {
		const t = text();
		expect(t).toContain('openspec archive "<name>" --skip-specs -y');
		const withMv = sentences(t).filter((s) => /`mv`/.test(s));
		expect(withMv.length).toBeGreaterThan(0);
		for (const s of withMv) expect(s, s).toMatch(/\bNever\b/);
	});

	it("delta spec fallback: lists specs/<capability>/spec.md when status has none, overriding stock", () => {
		expect(text()).toContain("or by listing `specs/<capability>/spec.md` in the change directory when that entry is missing or empty");
		expect(text()).toContain("this overrides the stock rule that `existingOutputPaths` is the only source");
	});

	it("never passes --no-validate", () => {
		expect(text()).toContain("Never pass `--no-validate`.");
	});

	it("re-compares after a sync and stops on a difference", () => {
		expect(text()).toContain("After a sync, compare every delta again with its main spec");
		expect(text()).toContain('Report "Synced" only if all match; if any differs, stop and do not archive.');
	});

	it("offers only safe choices when blocked and re-asks unclear answers", () => {
		expect(text()).toContain('offer only "Archive without syncing" or "Cancel", never "Sync now"');
		expect(text()).toContain("asked again and never archives");
	});
});

describe("Superpowers rule and stock skills", () => {
	it("brainstorm gate is the brainstorming skill's design-doc approval", () => {
		const t = flatSection("Superpowers rule");
		expect(t).toContain("The review gate on `brainstorm.md` is the brainstorming skill's design-doc approval; never ask for it separately.");
	});

	it("redirects output and stops when Superpowers is missing", () => {
		const t = flatSection("Superpowers rule");
		expect(t).toContain("drop the prefix");
		expect(t).toContain("never under `docs/superpowers/`");
		expect(t).toContain("STOP and tell the user to install Superpowers");
	});

	it("lists the four unused stock skills", () => {
		const t = flatSection("Stock skills not used");
		for (const id of UNUSED_STOCK) expect(t, id).toContain(`\`${id}\``);
		expect(t).toContain("suggest the `/opsx-*` path instead");
	});

	it("names openspec-propose nowhere but the unused list", () => {
		const outside = workflow().replace(workflowSection("Stock skills not used"), "");
		expect(outside).not.toContain("openspec-propose");
	});

	it("file is plain ASCII", () => {
		expect(workflow()).not.toBe("");
		expect(readFileSync(WORKFLOW_PATH, "utf8")).not.toMatch(/[^\x00-\x7F]/);
	});
});
