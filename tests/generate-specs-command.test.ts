import { existsSync, readFileSync } from "node:fs";
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

	it("never writes tasks.md", () => {
		expect(read(SKILL)).toContain("Do not write tasks.md");
	});
});
