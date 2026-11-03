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
			for (const line of text.split("\n")) {
				expect(line.trim()).not.toMatch(
					/^(Load|Invoke|Run|Use)\b.*finishing-a-development-branch/i,
				);
			}
			expect(text).not.toContain("Verification");
		});

		it("apply names worktree branch and worktree authority", () => {
			const text = applyInstruction();
			expect(text).toContain("branch named <change-name>");
			expect(text).toContain("authoritative");
		});

		it("fallback executor still requests a whole-branch review", () => {
			expect(applyInstruction()).toMatch(
				/requesting-code-review[\s\S]*whole-branch|whole-branch[\s\S]*requesting-code-review/,
			);
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
});
