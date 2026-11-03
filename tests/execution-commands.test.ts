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

	it("skills that ask the user state a plain-text fallback", () => {
		for (const c of COMMANDS) {
			const text = skill(c);
			expect(text, c).toContain("ask_user_question");
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
		expect(text).toContain("line");
		expect(text).toContain("fully implemented");
		expect(text).toContain("adds scope");
		expect(text).toContain("tracking file");
		expect(text).toContain("tracked tasks are complete");
		expect(text).toContain("/opsx-continue");
		expect(text).toContain("/opsx-verify");
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
