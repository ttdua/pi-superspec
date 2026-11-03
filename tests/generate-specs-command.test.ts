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
			"`language:` from `openspec/config.yaml`",
			"at most 12 capability candidates",
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

	it("gives the scout a literal requirement template in validating order", () => {
		const skill = read(SKILL);
		const header = skill.indexOf("### Requirement: <name>");
		expect(header).toBeGreaterThan(-1);
		const shall = skill.indexOf("SHALL", header);
		const evidence = skill.indexOf("Evidence: <", header);
		const scenario = skill.indexOf("#### Scenario: <name>", header);
		expect(shall).toBeGreaterThan(header);
		expect(shall).toBeLessThan(evidence);
		expect(evidence).toBeLessThan(scenario);
		expect(skill).toContain("first line of the requirement body");
	});

	it("resumes per capability file and re-applies the name filter after confirm", () => {
		const skill = read(SKILL);
		expect(skill).toContain("specs/<capability>/spec.md` is missing");
		expect(skill).toMatch(/never rewrite one that exists/i);
		expect(skill).toMatch(/after the user's edits[^]*openspec\/specs\//i);
	});

	it("states that no product code changes and follows artifact instructions", () => {
		const skill = read(SKILL);
		expect(skill).toContain("No product code changes; tasks verify each spec against the code and its evidence");
		expect(skill).toContain("openspec instructions");
		expect(skill).toContain("### New Capabilities");
	});

	it("checks for an existing change before creating one", () => {
		const skill = read(SKILL);
		expect(skill.indexOf("openspec list --json")).toBeLessThan(skill.indexOf("openspec new change"));
	});

	it("keeps the evidence and header tokens in English", () => {
		const skill = read(SKILL);
		const language = skill.slice(skill.indexOf("**Language**"), skill.indexOf("**SCOUT each capability**"));
		for (const token of ["Evidence:", "Confidence: inferred", "### Requirement:", "#### Scenario:"]) {
			expect(language).toContain(token);
		}
	});

	it("confirms before scouting", () => {
		const skill = read(SKILL);
		expect(skill.indexOf("**CONFIRM once**")).toBeLessThan(skill.indexOf("**SCOUT each capability**"));
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
