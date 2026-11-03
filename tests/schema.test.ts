import {
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	hasOpenspec,
	makeProject,
	SCHEMA_DIR,
	type TempProject,
} from "./helpers/project.js";

const available = hasOpenspec();
if (!available) {
	console.warn("openspec >= 1.4 not found on PATH; skipping schema tests");
}
const run = available ? describe : describe.skip;

run("bundled schema", () => {
	let project: TempProject;
	beforeAll(() => {
		project = makeProject();
		const res = project.openspec(["new", "change", "x"]);
		if (res.status !== 0) throw new Error(res.stdout + res.stderr);
		const change = join(project.dir, "openspec", "changes", "x");
		writeFileSync(join(change, "plan.md"), "");
		writeFileSync(join(change, "tasks.md"), "- [ ] 1.1 placeholder\n");
	});
	afterAll(() => {
		project?.cleanup();
	});

	const schemaYaml = () =>
		readFileSync(join(SCHEMA_DIR, "schema.yaml"), "utf8");
	const schemaText = () => {
		const dir = join(SCHEMA_DIR, "templates");
		return [
			schemaYaml(),
			...readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")),
		].join("\n");
	};

	it("identity: name, version and marker", () => {
		const text = schemaYaml();
		expect(text).toMatch(/^name: superspec$/m);
		expect(text).toMatch(/^version: 5$/m);
		expect(text).toMatch(/^x-pi-superspec:\n\s+version: 5$/m);
	});

	it("openspec schema validate superspec passes", () => {
		const res = project.openspec(["schema", "validate", "superspec"]);
		expect(res.status, res.stdout + res.stderr).toBe(0);
	});

	it("credits upstream and ships LICENSE", () => {
		expect(existsSync(join(SCHEMA_DIR, "LICENSE"))).toBe(true);
		const text = schemaYaml();
		expect(text).toContain("Superspec");
		expect(text).toContain("e1c8f417");
	});

	it("schema text has no harness-specific tool names", () => {
		const text = schemaText();
		for (const term of [
			"AskUserQuestion",
			"rpiv-",
			"pi-subagents",
			"Skill tool",
			"/opsx:",
			"Claude Code",
			"Cursor",
			"OpenCode",
			"Task-tool",
		]) {
			expect(text, term).not.toContain(term);
		}
	});

	it("design instruction has the No design needed stub", () => {
		const out = project.openspec([
			"instructions",
			"design",
			"--change",
			"x",
			"--json",
		]);
		expect(out.status, out.stdout + out.stderr).toBe(0);
		const json = JSON.parse(out.stdout);
		expect(json.instruction).toContain("No design needed:");
	});

	describe("apply block", () => {
		const applyInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"apply",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};

		it("openspec instructions apply returns the apply block", () => {
			expect(applyInstruction()).toContain("worktree");
		});

		it("apply stops after final review without finishing-a-development-branch", () => {
			const text = applyInstruction();
			expect(text).toContain("stops after the final");
			expect(text).toMatch(
				/does NOT invoke[^.]*finishing-a-development-branch/,
			);
			const flat = text.replace(/\s+/g, " ");
			const hits = [...flat.matchAll(/finishing-a-development-branch/g)];
			expect(hits).toHaveLength(1);
			const before = flat.slice(0, hits[0].index);
			expect(before).toMatch(/does NOT invoke [`*\w:-]*$/);
			expect(text.toLowerCase()).not.toContain("verification");
		});

		it("apply names worktree branch and worktree authority", () => {
			const text = applyInstruction();
			expect(text).toContain("branch named <change-name>");
			expect(text).toContain("authoritative");
		});

		it("fallback executor still requests a whole-branch review", () => {
			const text = applyInstruction();
			const start = text.indexOf("2b.");
			const end = text.indexOf("3. **Receipt");
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			const flat = text.slice(start, end).replace(/\s+/g, " ");
			expect(flat).toContain("requesting-code-review");
			expect(flat).toContain("whole-branch review");
		});

		it("apply.md template records branch facts", () => {
			const tpl = readFileSync(
				join(SCHEMA_DIR, "templates", "apply.md"),
				"utf8",
			);
			for (const field of [
				"Worktree path",
				"Worktree branch",
				"Feature branch",
				"Base branch",
				"Range",
				"Iteration",
				"Executor",
				"Completed",
			]) {
				expect(tpl, field).toContain(field);
			}
		});
	});

	describe("verify artifact", () => {
		const verifyInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"verify",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};
		const verifyTemplate = () =>
			readFileSync(join(SCHEMA_DIR, "templates", "verify.md"), "utf8");

		it("verify has the six checks and no sync check", () => {
			const instruction = verifyInstruction();
			const template = verifyTemplate();
			for (const [name, text] of [
				["instruction", instruction],
				["template", template],
			]) {
				expect(text, name).toContain("openspec validate <change>");
				expect(text, name).not.toContain("--all");
				expect(text.toLowerCase(), name).not.toContain("delta spec sync");
			}
			expect(instruction).toContain("PASS_WITH_WARNINGS");
			expect(instruction).toContain("5 iterations");
			expect(instruction).toContain("systematic-debugging");
			for (let n = 1; n <= 6; n++) {
				expect(instruction, `check ${n}`).toMatch(
					new RegExp(`^\\s*${n}\\. \\*\\*`, "m"),
				);
				expect(template, `section ${n}`).toMatch(
					new RegExp(`^## ${n}\\. `, "m"),
				);
			}
			expect(template).not.toMatch(/^## 7\. /m);
			expect(template).toContain("## Overall Decision");
			expect(instruction.replace(/\s+/g, " ")).toContain(
				"project test command",
			);
		});

		it("sync check is deferred to archive", () => {
			const flat = verifyInstruction().replace(/\s+/g, " ");
			const sentences = flat.split(/(?<=\.)\s/);
			expect(
				sentences.some((s) => s.includes("/opsx-archive") && /sync/.test(s)),
			).toBe(true);
		});
	});

	describe("finalize artifact", () => {
		const finalizeInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"finalize",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};

		it("finalize reads apply.md, not git log", () => {
			const instruction = finalizeInstruction();
			expect(instruction).toContain("git worktree list --porcelain");
			expect(instruction).toContain("apply.md");
			expect(instruction).toContain("refs/heads/<change-name>");
			expect(instruction).not.toContain('git -C "$WORKTREE" log');
			expect(instruction).not.toContain("rev-list --count");
		});

		it("finalize honours AGENTS.md", () => {
			const instruction = finalizeInstruction();
			expect(instruction).toContain("AGENTS.md");
			expect(instruction).toContain("overrides");
		});

		it("finalize template points to archive and sync in one sentence", () => {
			const flat = readFileSync(
				join(SCHEMA_DIR, "templates", "finalize.md"),
				"utf8",
			).replace(/\s+/g, " ");
			const sentences = flat.split(/(?<=\.)\s/);
			expect(
				sentences.some((s) => s.includes("/opsx-archive") && /sync/.test(s)),
			).toBe(true);
		});
	});
});
