import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
	expectStockPrompt,
	STOCK_SKILL,
	type PromptCommand,
} from "./helpers/stock-prompt.ts";
import { flatSection, sentences, workflow } from "./helpers/workflow.ts";

const root = new URL("..", import.meta.url);
const rootPath = fileURLToPath(root);

const COMMANDS: readonly PromptCommand[] = ["apply", "verify", "sync", "archive"];
const SUPERPOWERS_RULE = "STOP and tell the user to install Superpowers";

function read(path: string): string {
	return readFileSync(new URL(path, root), "utf8");
}

function exists(path: string): boolean {
	return existsSync(new URL(path, root));
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

const apply = () => flatSection("apply");
const verify = () => flatSection("verify");
const sync = () => flatSection("sync");
const archive = () => flatSection("archive");

describe("execution commands: package layout", () => {
	it("Prompts exist without package skills", () => {
		for (const c of COMMANDS) {
			expect(exists(`prompts/opsx-${c}.md`)).toBe(true);
			expect(exists(`skills/opsx-${c}`), c).toBe(false);
		}
	});

	it("Prompt maps to its stock skill", () => {
		for (const c of COMMANDS) {
			expectStockPrompt(read(`prompts/opsx-${c}.md`), c);
			expect(read(`prompts/opsx-${c}.md`)).toContain(`\`${STOCK_SKILL[c]}\``);
		}
	});

	it("Mapped stock skill missing", () => {
		for (const c of COMMANDS) {
			const prompt = read(`prompts/opsx-${c}.md`);
			expect(prompt).toContain(`If \`${STOCK_SKILL[c]}\` is not in the available skills list`);
			expect(prompt).toContain("stop without");
		}
	});

	it("Excluded commands absent", () => {
		for (const c of ["propose", "bulk-archive"]) {
			expect(exists(`skills/opsx-${c}`), c).toBe(false);
			expect(exists(`prompts/opsx-${c}.md`), c).toBe(false);
		}
	});

	it("contains no Claude tool names", () => {
		const files = [
			...walk(join(rootPath, "skills")),
			...walk(join(rootPath, "prompts")),
		];
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			expect(readFileSync(file, "utf8"), file).not.toMatch(
				/AskUserQuestion|TodoWrite|Task tool/,
			);
			expect(readFileSync(file, "utf8"), file).not.toMatch(
				/ask_user_question|plannotator/i,
			);
		}
	});

	it("frontmatter of every skill and prompt parses like pi does", () => {
		const skills = walk(join(rootPath, "skills")).filter((f) =>
			f.endsWith("SKILL.md"),
		);
		const prompts = walk(join(rootPath, "prompts")).filter((f) =>
			f.endsWith(".md"),
		);
		expect(skills.length).toBeGreaterThan(0);
		expect(prompts.length).toBeGreaterThan(0);
		for (const file of [...skills, ...prompts]) {
			const { frontmatter } = parseFrontmatter(readFileSync(file, "utf8"));
			expect(typeof frontmatter.description, file).toBe("string");
			expect(String(frontmatter.description).trim(), file).not.toBe("");
			if (skills.includes(file)) {
				expect(typeof frontmatter.name, file).toBe("string");
				expect(String(frontmatter.name).trim(), file).not.toBe("");
			}
		}
	});
});

describe("execution rules in workflow.md", () => {
	describe("Apply follows the schema apply block", () => {
		it("Blocked change", () => {
			expect(apply()).toContain("`blocked`: change no code. Missing artifacts: point to `/opsx-continue`.");
		});

		it("Blocked by a missing tracking file", () => {
			expect(apply()).toContain("Missing tracking file: report it, offer to repair it and start no implementation.");
		});

		it("Stops after the receipt", () => {
			expect(apply()).toContain("write and commit `apply.md` in the worktree");
			expect(apply()).toContain("Then stop, report the executor and the commit range, and point to `/opsx-verify`.");
			expect(apply()).toContain("Apply never opens the code review gate");
			expect(flatSection("Shared rules")).toContain("No command invokes `finishing-a-development-branch`");
		});

		it("Schema apply block replaces the stock loop", () => {
			expect(apply()).toContain("in place of the stock skill's task loop");
			expect(apply()).toContain("(the step 0 commit, the `<change-name>` worktree, the executor, the `apply.md` receipt)");
			expect(apply()).toContain("The first apply and every fix iteration before finalize implement only in the `<change-name>` worktree; post-PR mode works on the feature branch.");
		});

		it("apply re-enters the existing worktree and handles a verify FAIL", () => {
			expect(apply()).toContain("git worktree list --porcelain");
			expect(apply()).toContain("refs/heads/<change-name>");
			expect(apply()).toContain("Fix-iteration trigger");
			expect(apply()).toContain("`verify.md` reports `FAIL`");
			expect(apply()).toContain("systematic-debugging");
		});
	});

	describe("Executor depends on subagent availability", () => {
		it("With pi-subagents", () => {
			const t = apply();
			expect(t).toContain("If delegation is available through the Subagent integration paragraph, read `subagent-driven-development`");
			expect(t).toContain("implementer role");
			expect(t).toContain("task reviewer role");
			expect(t).toMatch(/one combined spec[^\n]*quality[^\n]*task reviewer role/i);
			expect(t).toMatch(/final whole-branch review is one more task reviewer seat/i);
			expect(t).toContain("no duplicate generic reviewer");
			expect(t).toContain("one implementation writer per worktree");
			expect(t).toMatch(/configured models/i);
			expect(t).toMatch(/overrides any conflicting generic model-pinning advice/);
			expect(t).toMatch(/parent keeps the `todo` progress, ticks `tasks.md`/);
			expect(t).toMatch(/BASE\.\.HEAD/);
			expect(t).toContain("Select and announce an agent");
		});

		it("Without pi-subagents", () => {
			const t = apply();
			expect(t).toMatch(/Subagent integration paragraph says delegation is unavailable, read `executing-plans`/);
			expect(t).toContain("whole-branch review (`requesting-code-review`) over the full commit range");
			expect(flatSection("Shared rules")).toMatch(/Never invent subagent calls/);
		});

		it("Unusable delegated executor", () => {
			const t = apply();
			expect(t).toMatch(/no available agent meets a role[^.]*stop the affected lane/i);
			expect(t).toMatch(/mid-run \(runtime failure\)/);
			expect(t).toContain("no generic replacement or substitute and never silently go inline");
		});

		it("apply applies the same policy to fix-iteration and post-PR delegation", () => {
			expect(apply()).toContain("Fix-iteration and post-PR modes use the same policy and seats wherever they delegate.");
		});

		it("apply overrides the sequential-only rule of SDD for child worktree lanes", () => {
			expect(apply()).toMatch(/parallel writer lanes are allowed only in separate child worktrees/);
			expect(apply()).toMatch(/inside one worktree its sequential rule stands/);
		});

		it("apply schedules plan tasks in lanes", () => {
			expect(apply()).toContain("schedule one lane per plan task as the reference's Lanes section describes");
			expect(apply()).toMatch(/escalated lane waits: the parent does neither merge nor tick it/);
			const lanes = read("schema/superspec/subagent-routing.md").replace(/\s+/g, " ");
			expect(lanes).toMatch(/every task named in its `Blocked by` is merged/);
			expect(lanes).toMatch(/plan without `Blocked by` metadata runs its tasks one after another/);
			expect(lanes).toMatch(/the plan governs scheduling/);
		});
	});

	describe("Post-PR feedback loop", () => {
		it("Feedback after a PR is open", () => {
			const t = apply();
			expect(t).toContain("Read `receiving-code-review`");
			expect(t).toContain("append a `post-PR iteration N+1` entry with the new commit range to `apply.md`");
			expect(t).toContain("tell the user to run `/opsx-verify`, then update `finalize.md`");
			expect(t).toContain("a policy in the project `AGENTS.md` overrides it");
		});

		it("post-PR trigger precedes the blocked and all_done stops", () => {
			expect(apply().indexOf("Post-PR trigger")).toBeLessThan(apply().indexOf("`blocked`: change no code"));
		});
	});

	describe("Verify runs in the worktree", () => {
		it("Missing apply receipt", () => {
			expect(verify()).toContain("If `apply.md` does not exist, stop and point to `/opsx-apply`.");
		});

		it("Verify in the worktree", () => {
			expect(verify()).toContain("Every `openspec` call and check, including the test run, uses that working directory");
			expect(verify()).toContain("openspec instructions verify --change <name> --json");
			expect(verify()).toContain("record the command, exit status and counts");
		});

		it("Failing verify", () => {
			expect(verify()).toContain("point to `/opsx-apply` (a fix iteration)");
			expect(apply()).toContain("read `systematic-debugging`");
			expect(verify()).toContain("Stop after 5 iterations");
		});

		it("verify points to /opsx-continue and handles the post-finalize case", () => {
			expect(verify()).toContain("/opsx-continue");
			expect(verify()).toContain("`finalize.md` exists");
		});
	});

	describe("Sync merges delta specs without archiving", () => {
		it("Sync only", () => {
			expect(sync()).toContain("never archive, move or delete the change");
			expect(sync()).toContain("RENAMED, REMOVED, MODIFIED, then ADDED");
		});

		it("Project rules applied", () => {
			expect(sync()).toContain(
				"Read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints on the text you write; never copy the `rules` into any spec.",
			);
		});

		it("Instructions unavailable", () => {
			expect(sync()).toContain("If reading the instructions fails, stop and report the error without writing any spec.");
		});

		it("sync replaces whole MODIFIED blocks and matches headers exactly", () => {
			expect(sync()).toContain("A MODIFIED block replaces the whole requirement block");
			expect(sync()).toContain("case-sensitive");
			expect(sync()).toContain("counts as already applied and is skipped silently");
		});
	});

	describe("Archive performs the delta-sync check", () => {
		it("Unsynced deltas", () => {
			expect(archive()).toContain('offer "Sync now (recommended)", "Archive without syncing" and "Cancel"');
		});

		it("Already synced", () => {
			expect(archive()).toContain('All synced: report "already synced" and archive without syncing or asking.');
		});

		it("Incomplete artifacts", () => {
			expect(archive()).toContain(
				"Incomplete artifacts or tasks: warn, ask the user to confirm and archive only on confirmation.",
			);
		});

		it("Sync verified before archive", () => {
			expect(archive()).toContain("After a sync, compare every delta again with its main spec");
			expect(archive()).toContain('Report "Synced" only if all match; if any differs, stop and do not archive.');
		});

		it("Missing main spec", () => {
			expect(archive()).toContain(
				"A missing main spec is not unsynced by itself; decide by the delta operations as the sync section and the stock sync skill define.",
			);
		});

		it("Task counts from the CLI", () => {
			expect(archive()).toContain(
				"Take task counts from `openspec list --json`; if that output is invalid or omits the change, stop with an error and do not archive.",
			);
		});

		it("Skipped artifact", () => {
			expect(archive()).toContain("An artifact with status `skipped` counts as complete.");
		});

		it("Delta specs found by status or by listing", () => {
			expect(archive()).toContain(
				"Find the delta specs from `artifactPaths.specs.existingOutputPaths`, or by listing `specs/<capability>/spec.md` in the change directory when that entry is missing or empty; this overrides the stock rule that `existingOutputPaths` is the only source.",
			);
		});

		it("Unclear answer", () => {
			expect(archive()).toContain("An answer that is none of the offered choices is asked again and never archives.");
		});

		it("Archive through the CLI", () => {
			expect(archive()).toContain('openspec archive "<name>" --skip-specs -y');
			const mv = sentences(archive()).filter((s) => s.includes("`mv`"));
			expect(mv.length).toBeGreaterThan(0);
			for (const s of mv) expect(s).toMatch(/\bNever\b/);
			expect(archive()).toContain("Never pass `--no-validate`.");
		});

		it("archive blocks unsafe sync choices and keeps the fallback re-compare", () => {
			expect(archive()).toContain('Any capability blocked: offer only "Archive without syncing" or "Cancel", never "Sync now".');
			expect(archive()).toContain('after "Archive without syncing", still re-compare the capabilities that were not blocked');
			expect(archive()).toContain(
				'"Sync blocked: <capabilities>, archived without syncing"',
			);
		});
	});

	describe("Superpowers-backed steps", () => {
		it("Skill missing", () => {
			expect(flatSection("Superpowers rule")).toContain(SUPERPOWERS_RULE);
		});
	});

	describe("Apply uses task locations", () => {
		it("Located tick", () => {
			expect(apply()).toContain("at the `sourcePath` and `line` the apply instruction returns");
		});

		it("Checkbox changed", () => {
			expect(apply()).toContain("after checking that the checkbox there still matches the task; if not, re-read the tracking file and do not tick a different task");
		});

		it("Partial behavior", () => {
			expect(apply()).toContain("Mark `[x]` only when the behavior is fully implemented.");
		});
	});

	describe("Apply pauses on scope changes", () => {
		it("Added scope", () => {
			expect(apply()).toContain("pause and ask before adding scope no artifact specifies");
		});

		it("Deferred behavior", () => {
			expect(apply()).toContain("or narrowing or deferring specified behavior");
		});

		it("Tracking file missing", () => {
			expect(apply()).toContain("offer to repair it and start no implementation");
		});

		it("All tracked tasks done", () => {
			expect(apply()).toContain("`all_done`: say the tracked tasks are complete, point to `/opsx-verify` and then `/opsx-archive`");
		});
	});

	describe("Verify never implements and reports skipped checks", () => {
		it("Verify stays read-only", () => {
			expect(verify()).toContain("Do not implement or archive anything during verify.");
		});

		it("Progress from apply", () => {
			expect(verify()).toContain(
				"Read task progress from the apply instruction (`progress`); an unavailable tracking file makes the tasks check not verified.",
			);
		});

		it("Skipped check", () => {
			const schema = read("schema/superspec/schema.yaml").replace(/\s+/g, " ");
			expect(schema).toContain("A check that could not run is recorded as not verified with its reason and never counts as passing; the outcome is then at most PASS_WITH_WARNINGS.");
		});
	});

	describe("Apply enforces plan contracts", () => {
		it("Executor briefed on contracts", () => {
			expect(apply()).toContain("Brief the executor to read the Contracts section of `plan.md` and to follow the apply instruction's per-task contract order");
		});

		it("Public contract needs a change", () => {
			expect(apply()).toContain("A `public` contract stops the executor and goes to the user");
		});

		it("Internal contract change recorded", () => {
			expect(apply()).toContain("for an internal contract straight away, the entry is updated in `plan.md` with the reason and recorded in `apply.md` under \"Contract deviations\"");
			expect(apply()).toContain("carrying over the cumulative \"Contract deviations\"");
		});
	});

	describe("Verify compares contracts", () => {
		it("Matching contracts", () => {
			expect(verify()).toContain("Compare Contracts read-only; a recorded deviation is the expected state, so compare against it.");
		});

		it("Mismatched contract", () => {
			const schema = read("schema/superspec/schema.yaml").replace(/\s+/g, " ");
			expect(schema).toContain("A mismatch is a warning only, never a FAIL by itself.");
		});

		it("Contract cannot be compared", () => {
			const schema = read("schema/superspec/schema.yaml").replace(/\s+/g, " ");
			expect(schema).toContain("A Contracts entry that cannot be compared with the code is recorded as not verified with its reason");
		});
	});

	describe("Delegated verify evidence with parent receipt", () => {
		it("Fresh delegated evidence", () => {
			const t = verify();
			expect(t).toContain("verifier role");
			expect(t).toContain("hand it the authoritative worktree as cwd");
			expect(t).toContain("only the parent writes and commits the receipt");
			expect(t).toMatch(/command, cwd, exit status, counts and file evidence collected in this invocation/);
		});

		it("Failing or missing evidence", () => {
			const t = verify();
			expect(t).toContain("Failing fresh tests are `FAIL`.");
			expect(t).toContain("The verifier never fixes or modifies code");
			expect(t).toContain("reject old apply or verify results and any earlier output");
			expect(t).toMatch(/never trusts report-only success/);
		});

		it("Inline verify fallback", () => {
			expect(verify()).toContain("When delegation is absent, the parent runs the same checks inline and never fabricates child evidence.");
		});
	});
});

describe("execution specialist routing", () => {
	it("Delegation through the paragraph: no plugin or tool names in workflow.md", () => {
		const banned =
			/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./;
		const allowed =
			/Subagent integration paragraph|subagent-driven-development|subagent routing|subagent-routing\.md|subagent calls/g;
		expect(workflow()).not.toMatch(banned);
		expect(workflow().replace(allowed, "")).not.toMatch(/subagent/i);
		for (const c of COMMANDS) {
			expect(read(`prompts/opsx-${c}.md`), c).not.toMatch(banned);
		}
	});

	it("apply and verify refer delegation to the Subagent integration paragraph", () => {
		expect(apply()).toMatch(/If delegation is available through the Subagent integration paragraph/);
		expect(apply()).toMatch(/If the Subagent integration paragraph says delegation is unavailable/);
		expect(flatSection("Shared rules")).toMatch(/Spawning, waiting and report collection follow the routing note's Subagent integration paragraph/);
	});

	it("keeps worktree reuse, iteration cap and receipts", () => {
		expect(apply()).toContain("Re-runs never redo step 0 or recreate the branch.");
		expect(apply()).toContain("if it is already 5, stop");
		expect(verify()).toContain("Stop after 5 iterations");
		expect(verify()).toContain("`PASS_WITH_WARNINGS`");
	});

	it("usage guide explains seats, evidence, absence vs failure, fresh tests and parent receipts", () => {
		const g = read("docs/usage-guide.md");
		const executors = g.slice(g.indexOf("## Executors"), g.indexOf("## Existing schemas"));
		expect(executors).toMatch(/bundled `superspec\.\*` agents are bundled candidates for every role, including the implementer and task reviewer apply uses, but get no precedence/);
		expect(g).not.toMatch(/`superspec\.(implementer|task-reviewer|verifier)`/);
		expect(g).toMatch(/absent[^.\n]*inline/i);
		expect(g).toMatch(/(disabled|incompatible)[^.\n]*stop/i);
		expect(g).toMatch(/runtime failure[^.\n]*mid-run|mid-run[^.\n]*runtime failure/i);
		expect(g).toMatch(/command[^.\n]*cwd[^.\n]*exit[^.\n]*count/i);
		expect(g).toMatch(/parent[^.\n]*(writes|owns)[^.\n]*(apply\.md|receipt)/i);
		expect(g).toMatch(/no (merge|push)|never (merge|push)/i);
	});
});
