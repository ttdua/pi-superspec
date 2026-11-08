import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const rootPath = fileURLToPath(root);

const COMMANDS = ["apply", "verify", "sync", "archive"] as const;
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

function frontmatter(text: string): string {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	return match ? match[1] : "";
}

const skill = (c: string) => read(`skills/opsx-${c}/SKILL.md`);

describe("execution commands", () => {
	it("ships all four skill and prompt pairs", () => {
		for (const c of COMMANDS) {
			expect(exists(`skills/opsx-${c}/SKILL.md`)).toBe(true);
			expect(exists(`prompts/opsx-${c}.md`)).toBe(true);
			const fm = frontmatter(skill(c));
			expect(fm).toMatch(new RegExp(`^name: opsx-${c}\\s*$`, "m"));
			expect(fm).toMatch(/^description:\s*\S+/m);
		}
	});

	it("prompts delegate to their skill and pass $@", () => {
		for (const c of COMMANDS) {
			const prompt = read(`prompts/opsx-${c}.md`);
			expect(prompt).toContain(`opsx-${c}`);
			expect(prompt).toContain("SKILL.md");
			expect(prompt).toContain("$@");
			expect(prompt.trimEnd().split("\n").length).toBeLessThanOrEqual(15);
		}
	});

	it("does not ship opsx-propose or opsx-bulk-archive", () => {
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

	it("skills ask through the Interaction channel", () => {
		for (const c of COMMANDS) {
			const text = skill(c);
			expect(text, c).toContain("Interaction channel");
			expect(text, c).toContain("numbered options");
		}
	});

	it("apply handles blocked and all_done states", () => {
		const text = skill("apply");
		expect(text).toContain("openspec instructions apply");
		expect(text).toContain("blocked");
		expect(text).toContain("all_done");
	});

	it("apply uses task locations and scope pauses", () => {
		const text = skill("apply");
		expect(text).toContain("sourcePath");
		expect(text).toContain("fully implemented");
		expect(text).toContain("adds scope");
		expect(text).toContain("tracking file");
		expect(text).toContain("tracked tasks are complete");
		expect(text.replace(/\s+/g, " ")).toContain(
			"after checking that the checkbox there still matches the task",
		);
	});

	it("apply stops after the receipt without finishing the branch", () => {
		const text = skill("apply");
		expect(text).toContain("finishing-a-development-branch");
		expect(text).toContain("Do NOT invoke");
	});

	it("apply selects subagent-driven-development when the subagent tool exists", () => {
		const text = skill("apply");
		expect(text).toContain("subagent");
		expect(text).toContain("subagent-driven-development");
	});

	it("apply overrides the sequential-only rule of SDD for child worktree lanes", () => {
		const text = skill("apply").replace(/\s+/g, " ");
		expect(text).toMatch(/parallel writer lanes[^.]*only in separate child worktrees/i);
		expect(text).toMatch(/inside one worktree[^.]*sequential rule stands/i);
	});

	it("apply falls back to executing-plans with a whole-branch review", () => {
		const text = skill("apply");
		expect(text).toContain("executing-plans");
		expect(text).toContain("whole-branch review");
	});

	it("apply documents the post-PR iteration", () => {
		const text = skill("apply");
		expect(text).toContain("post-PR");
		expect(text).toContain("receiving-code-review");
		expect(text).toContain("iteration");
	});

	it("apply briefs the executor on Contracts and keeps deviations", () => {
		const text = skill("apply");
		const section = (from: string, to: string) => {
			const start = text.indexOf(from);
			const end = text.indexOf(to, start + from.length);
			expect(start, from).toBeGreaterThanOrEqual(0);
			expect(end, to).toBeGreaterThan(start);
			return text.slice(start, end);
		};
		const step5 = section("5. **Choose the executor**", "6. **Write the receipt");
		expect(step5).toContain("Contracts");
		expect(step5).toContain("public");
		expect(step5).toContain("plan.md");
		expect(step5).toContain("per-task contract order");
		expect(step5.replace(/\s+/g, " ")).toContain("in `plan.md` with the reason");
		const step6 = section("6. **Write the receipt", "7. **Post-PR mode**");
		expect(step6).toContain("Contract deviations");
		const postPr = section("7. **Post-PR mode**", "8. **Fix-iteration mode**");
		expect(postPr).toContain("Contract deviations");
		const fix = section("8. **Fix-iteration mode**", "\n**Superpowers rule**\n");
		expect(fix).toContain("Contract deviations");
	});

	it("verify runs in the worktree and requires apply.md", () => {
		const text = skill("verify");
		expect(text).toContain("openspec instructions verify");
		expect(text).toContain("worktree");
		expect(text).toContain("apply.md");
		expect(text).toContain("systematic-debugging");
		expect(text).toContain("5 iterations");
		expect(text).not.toContain("delta-sync");
	});

	it("verify stays read-only, reads progress from apply and reports skipped checks as not verified", () => {
		const flat = skill("verify").replace(/\s+/g, " ");
		expect(flat).toContain("Do NOT implement or archive anything during verify; the apply state is context only.");
		expect(flat).toContain("Read task progress from the apply instruction (`progress`)");
		expect(flat).toContain("if a tracking file is unavailable, record the tasks check as not verified");
		expect(flat).toContain(
			"is recorded as not verified with its reason and is never scored as passing; the outcome is then at most `PASS_WITH_WARNINGS`",
		);
	});

	it("verify compares Contracts as a warning and marks uncomparable ones not verified", () => {
		const text = skill("verify").replace(/\s+/g, " ");
		const section = (from: string, to: string) => {
			const start = text.indexOf(from);
			const end = text.indexOf(to, start + from.length);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(end).toBeGreaterThan(start);
			return text.slice(start, end);
		};
		const step5 = section("5. **Read context and follow the verify instruction**", "6. **Write `verify.md`");
		expect(step5).toContain("Contracts");
		expect(step5).toContain("Contract deviations");
		expect(step5).toContain("A mismatch is a warning");
		expect(step5).toContain("not verified");
		expect(step5).toContain("never FAIL by itself");
		expect(step5).toContain("read-only");
		const step6 = section("6. **Write `verify.md`", "7. **Handle the outcome**");
		expect(step6).toContain("Contracts");
		expect(step6).toContain("files compared");
	});

	it("sync merges deltas and does not archive", () => {
		const text = skill("sync");
		for (const op of ["RENAMED", "REMOVED", "MODIFIED", "ADDED"]) {
			expect(text, op).toContain(op);
		}
		expect(text).toContain("openspec validate");
		expect(text).toContain("Do NOT archive");
	});

	it("sync reads the specs instructions once and applies rules without copying them", () => {
		const flat = skill("sync").replace(/\s+/g, " ");
		expect(flat).toContain(
			"Read `openspec instructions specs --change <name> --json` once and apply its `rules` as constraints on the text you write; never copy the `rules` into any spec.",
		);
		expect(flat).toContain(
			"If reading the instructions fails, STOP and report the error without writing any spec.",
		);
		expect(flat).not.toContain("or list `specs/<capability>/spec.md`");
	});

	it("sync keeps the delta Purpose for new capabilities", () => {
		const flat = skill("sync").replace(/\s+/g, " ");
		expect(flat).toContain(
			"copy the delta's `## Purpose` text verbatim and title the spec `# <capability> Specification`",
		);
		expect(flat).toContain(
			"If the delta has no `## Purpose`, write `TBD` as the Purpose and flag it in the report.",
		);
		expect(flat).toContain("Never overwrite the Purpose of an existing main spec.");
		expect(flat).toContain("Never write delta section headers into a main spec.");
	});

	it("sync blocks unsafe merges", () => {
		const flat = skill("sync").replace(/\s+/g, " ");
		expect(flat).toContain(
			"If the delta has MODIFIED or RENAMED operations, or only REMOVED ones, and the main spec does not exist, report the capability as blocked and write nothing.",
		);
		expect(flat).toContain(
			"If applying the delta would leave `## Requirements` empty, STOP, write no empty section, and report it.",
		);
		expect(flat).toContain(
			"delete the spec only when the change's `.openspec.yaml` sets `retire_capabilities: true`, then report its Purpose and say it can be restored with git",
		);
	});

	it("archive performs the delta-sync check", () => {
		const text = skill("archive");
		expect(text).toContain("delta-sync");
		expect(text).toContain("openspec archive");
		expect(text).toContain("sync");
		expect(text).toContain("confirm");
	});

	it("archive handles retirement and the fallback re-compare", () => {
		const flat = skill("archive").replace(/\s+/g, " ");
		expect(flat).toContain(
			"a missing main spec with only REMOVED requirements and `retire_capabilities: true` in the change's `.openspec.yaml` counts as synced (retired)",
		);
		expect(flat).toContain(
			"after the user chooses \"Archive without syncing\", still run item 2 (the re-compare) for the capabilities that were not blocked",
		);
		expect(flat).toContain(
			"On this predicted (pre-sync) path, other capabilities that are not synced are not synced either.",
		);
	});

	it("archive verifies the sync and reads counts from the CLI", () => {
		const flat = skill("archive").replace(/\s+/g, " ");
		expect(flat).toContain(
			"Compare every delta again with its main spec. Report \"Synced\" only if all match; if any differs, stop and do not archive.",
		);
		expect(flat).toContain(
			"take `completedTasks` and `totalTasks` from `openspec list --json`; if that output is invalid, stop with an error",
		);
		expect(flat).toContain("An artifact with status `skipped` counts as complete.");
		expect(flat).toContain(
			"A missing main spec is not unsynced by itself; decide by the delta operations as `opsx-sync` defines",
		);
		expect(flat).toContain(
			"report the blocked capabilities and offer only \"Archive without syncing\" or \"Cancel\" (ask as in step 1); never offer \"Sync now\" for a blocked capability. If the answer is none of the offered choices, ask again and do not archive.",
		);
		expect(flat).toContain(
			"**Sync blocked** (checked before \"Not synced\"): if the sync is blocked for any capability, either predicted from the delta operations above",
		);
		expect(flat).toContain(
			"(no capability blocked): report the differences per capability (what would be added, modified, removed, renamed), then ask the user how to proceed with options \"Sync now (recommended)\", \"Archive without syncing\", \"Cancel\" (ask as in step 1, recommended first). If the answer is none of the offered choices, ask again and do not archive.",
		);
		expect(flat).toContain(
			"Capabilities reported Blocked are excluded from this re-compare",
		);
		expect(flat).toContain("If `totalTasks` is 0 (no tasks), skip this check.");
		expect(flat).toContain("(if it is not listed, stop and report)");
		expect(flat).toContain(
			"\"Sync blocked: <capabilities>, archived without syncing\"",
		);
		expect(flat).toContain(
			"Offer \"Sync now\" first, except when a capability is blocked (then only \"Archive without syncing\" or \"Cancel\")",
		);
	});

	it("apply and verify carry the Superpowers rule", () => {
		for (const c of ["apply", "verify"]) {
			expect(skill(c), c).toContain(SUPERPOWERS_RULE);
		}
	});

	it("archive skips CLI spec sync and owns the spec update", () => {
		const text = skill("archive");
		expect(text).toContain("--skip-specs");
		expect(text).toMatch(/CLI also updates main specs/);
		expect(text).toMatch(/skill owns the spec update/);
		expect(text).toContain("already synced");
		expect(text).toContain("never pass `--no-validate`");
	});

	it("verify points to opsx-continue and handles the post-finalize case", () => {
		const text = skill("verify");
		expect(text).toContain("/opsx-continue");
		expect(text).toContain("finalize.md");
		expect(text).toContain("/opsx-apply");
	});

	it("apply re-enters the existing worktree and handles a verify FAIL", () => {
		const text = skill("apply");
		expect(text).toContain("git worktree list --porcelain");
		expect(text).toContain("refs/heads/<change-name>");
		expect(text).toContain("Fix-iteration");
		expect(text).toContain("`FAIL`");
		expect(text).toContain("systematic-debugging");
	});
});

describe("execution specialist routing", () => {
	const REF = "../references/subagent-routing.md";
	const noCopy = (t: string) => {
		expect(t).not.toContain("## Availability");
		expect(t).not.toContain("Helper-only");
	};

	it("SA-E01 apply maps SDD seats to canonical implementer and task-reviewer", () => {
		const t = skill("apply");
		expect(t).toContain(REF);
		expect(t).toMatch(/shared (routing )?(policy|reference)[^.\n]*before (choosing|selecting) the executor/i);
		expect(t).toContain("implementer role");
		expect(t).toContain("task reviewer role");
		expect(t).toMatch(/one combined spec[^\n]*quality[^\n]*task reviewer role/i);
		expect(t).toMatch(/final whole-branch[^.\n]*task reviewer role/i);
		expect(t).toMatch(/no duplicate generic reviewer|never[^.\n]*generic (Superpowers )?reviewer/i);
		expect(t).toMatch(/one implementation writer per worktree/i);
		expect(t).toMatch(/configured model/i);
		expect(t).toMatch(/overrides?[^.\n]*(model|generic)[^.\n]*(advice|pinning|guidance)/i);
		expect(t).toMatch(/parent[^.\n]*(todo|progress|tick)/i);
		expect(t).toMatch(/BASE\.\.HEAD/);
		noCopy(t);
	});

	it("SA-E01 apply applies the same policy to fix-iteration and post-PR delegation", () => {
		const t = skill("apply");
		expect(t).toMatch(/fix-iteration[^.\n]*post-PR[^.\n]*(same|shared)[^.\n]*(policy|seats)|(same|shared)[^.\n]*(policy|seats)[^.\n]*fix-iteration/i);
	});

	it("SA-E02 apply uses inline execution with whole-branch review when integration is absent", () => {
		const t = skill("apply");
		expect(t).toMatch(/Subagent integration paragraph[^.]*unavailable[^.]*executing-plans/i);
		expect(t).toContain("whole-branch review");
		expect(t).toMatch(/never invent subagent calls/i);
	});

	it("SA-E03 apply stops on a missing, disabled or failed canonical role without a replacement", () => {
		const t = skill("apply");
		expect(t).toMatch(/no available agent meets[^.]*stop/i);
		expect(t).toMatch(/launch (or|and) runtime failure|runtime failure/i);
		expect(t).toMatch(/mid-run/i);
		expect(t).toMatch(/no generic replacement or substitute/i);
		expect(t).toMatch(/never silently go inline/i);
	});

	it("SA-E04 verify loads shared policy and delegates collection to the verifier in the authoritative cwd", () => {
		const t = skill("verify");
		expect(t).toContain(REF);
		expect(t).toContain("verifier role");
		expect(t).toMatch(/authoritative (worktree|cwd)/i);
		expect(t).toMatch(/six checks/i);
		expect(t).toMatch(/only the parent writes[^\n]*receipt/i);
		noCopy(t);
	});

	it("SA-E05 verify accepts only current-invocation evidence and rejects old results", () => {
		const t = skill("verify");
		expect(t).toMatch(/command[^.\n]*cwd[^.\n]*exit[^.\n]*count/i);
		expect(t).toMatch(/this (verify )?invocation/i);
		expect(t).toMatch(/(reject|never accept|not accept)[^.\n]*(apply|earlier|old)[^.\n]*(result|output|verify)/i);
		expect(t).toMatch(/inspects?[^.\n]*report[^.\n]*files|report-only success/i);
	});

	it("SA-E06 verify pins failure, not-verified and no-fix rules", () => {
		const t = skill("verify");
		expect(t).toMatch(/failing (fresh )?tests?[^.\n]*FAIL/i);
		expect(t).toMatch(/unavailable[^.\n]*not verified[^.\n]*PASS_WITH_WARNINGS|not verified[^.\n]*at most `?PASS_WITH_WARNINGS/i);
		expect(t).toMatch(/verifier[^.\n]*(never|must not)[^.\n]*(fix|modify)[^.\n]*code/i);
		expect(t).toMatch(/mismatch[^.\n]*(is )?a warning[^.\n]*never FAIL/i);
	});

	it("SA-E07 verify runs the same checks inline when integration is absent", () => {
		const t = skill("verify");
		expect(t).toMatch(/absent[^.\n]*(inline|same)[^.\n]*(verify|checks)/i);
		expect(t).toMatch(/never fabricate/i);
	});

	it("keeps order, worktree reuse, iteration cap and receipts unchanged", () => {
		const a = skill("apply");
		expect(a).toContain("Re-runs reuse the existing `<change-name>` worktree");
		expect(a).toContain("Stop at 5 fix iterations");
		expect(a).toContain("a `public` contract stops the executor");
		const v = skill("verify");
		expect(v).toContain("Stop after 5 iterations");
		expect(v).toContain("`PASS_WITH_WARNINGS`");
	});

	it("Delegation through the paragraph: no plugin or tool names in skills and prompts", () => {
		const banned =
			/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./;
		const allowed =
			/Subagent integration paragraph|subagent-driven-development|subagent routing|subagent-routing\.md|subagent calls/g;
		for (const c of COMMANDS) {
			for (const text of [skill(c), read(`prompts/opsx-${c}.md`)]) {
				expect(text, c).not.toMatch(banned);
				expect(text.replace(allowed, ""), c).not.toMatch(/subagent/i);
			}
		}
	});

	it("apply schedules plan tasks in lanes", () => {
		const t = skill("apply");
		const flat = t.replace(/\s+/g, " ");
		expect(t).toMatch(/one lane per plan task/i);
		expect(t).toMatch(/Lanes/);
		expect(t).toContain("## Lanes");
		expect(t).toMatch(/merge[^.]*after[^.]*review/i);
		expect(flat).toMatch(/without[^.]*Blocked by[^.]*one after another/i);
		expect(flat).toMatch(/every task in its `Blocked by` is merged/i);
		expect(flat).toMatch(/plan[^.]*metadata[^.]*governs? scheduling/i);
		expect(flat).toMatch(/escalated lane waits[^.]*does neither merge/i);
		expect(flat).toMatch(/escalated lane waits[^.]*nor tick it/i);
	});

	it("apply and verify refer delegation to the Subagent integration paragraph", () => {
		const apply = skill("apply").replace(/\s+/g, " ");
		const step5 = apply.slice(apply.indexOf("5. **Choose the executor**"), apply.indexOf("6. **Write the receipt"));
		expect(step5).toMatch(/through the Subagent integration paragraph/);
		expect(step5).toMatch(/If delegation is available through the Subagent integration paragraph/);
		expect(step5).toMatch(/If the Subagent integration paragraph says delegation is unavailable/);
		const verify = skill("verify").replace(/\s+/g, " ");
		const ev = verify.slice(verify.indexOf("**Delegated evidence:**"), verify.indexOf("Beyond the instruction"));
		expect(ev).toMatch(/Delegate as the Subagent integration paragraph describes/);
		expect(ev).toMatch(/When the Subagent integration paragraph says delegation is absent/);
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
