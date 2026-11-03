import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);

function read(path: string): string {
	return readFileSync(new URL(path, root), "utf8");
}

function exists(path: string): boolean {
	return existsSync(new URL(path, root));
}

function frontmatter(text: string): string {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	return match ? match[1] : "";
}

const SKILL = "skills/opsx-generate-specs/SKILL.md";
const PROMPT = "prompts/opsx-generate-specs.md";

describe("opsx-generate-specs command", () => {
	it("has a skill and prompt pair with matching names", () => {
		expect(exists(SKILL)).toBe(true);
		expect(exists(PROMPT)).toBe(true);
		expect(frontmatter(read(SKILL))).toMatch(/^name: opsx-generate-specs\s*$/m);
	});

	it("keeps the prompt as a short delegation", () => {
		const prompt = read(PROMPT);
		expect(prompt).toContain("opsx-generate-specs");
		expect(prompt).toContain("$@");
		expect(prompt.split(/\r?\n/).length).toBeLessThan(12);
	});

	it("uses no Claude tool names", () => {
		for (const path of [SKILL, PROMPT]) {
			const text = read(path);
			for (const banned of ["AskUserQuestion", "TodoWrite", "Task tool"]) {
				expect(text, `${path} contains ${banned}`).not.toContain(banned);
			}
		}
	});

	it("states the required rules and values", () => {
		const skill = read(SKILL);
		for (const needle of [
			"bootstrap-specs",
			"/opsx-ff bootstrap-specs",
			"Evidence:",
			"Confidence: inferred",
			"No design needed:",
			"pi-subagents",
			"ask_user_question",
			"openspec/specs/",
			"node_modules",
			"openspec validate bootstrap-specs --strict",
			"language",
			"12",
		]) {
			expect(skill, `skill lacks ${needle}`).toContain(needle);
		}
	});

	it("defines the scout contract and language before dispatch and passes them on", () => {
		const skill = read(SKILL);
		const contract = skill.indexOf("**Scout contract**");
		const language = skill.indexOf("**Language**");
		const dispatch = skill.indexOf("**SCOUT each capability**");
		expect(contract).toBeGreaterThan(-1);
		expect(language).toBeGreaterThan(-1);
		expect(dispatch).toBeGreaterThan(-1);
		expect(contract).toBeLessThan(dispatch);
		expect(language).toBeLessThan(dispatch);
		const section = skill.slice(dispatch, skill.indexOf("**Write the other artifacts**"));
		expect(section).toContain("specs/<capability>/spec.md");
		expect(section).toMatch(/scout contract/i);
		expect(section).toMatch(/document language/i);
		expect(section).toMatch(/every scout/i);
	});

	it("never writes tasks.md", () => {
		expect(read(SKILL)).toContain("Do not write tasks.md");
	});
	it("lists every prompt command in a table row of both READMEs, and --generate on the init row", () => {
		const names = readdirSync(new URL("prompts/", root))
			.filter((file) => /^opsx-.+\.md$/.test(file))
			.map((file) => file.replace(/\.md$/, ""));
		for (const readme of ["README.md", "README.vi.md"]) {
			const rows = read(readme)
				.split(/\r?\n/)
				.filter((line) => line.startsWith("|"));
			for (const name of names) {
				expect(
					rows.some((row) => row.includes(`\`/${name}\``)),
					`${readme} lacks a table row for /${name}`,
				).toBe(true);
			}
			const init = rows.find((row) => row.includes("`/opsx-init`"));
			expect(init, `${readme} lacks the init row`).toContain("--generate");
		}
	});
});
