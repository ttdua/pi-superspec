import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (file: string): string => readFileSync(resolve(root, file), "utf8");

function section(text: string, heading: string): string {
	const start = text.indexOf(heading);
	expect(start, `${heading} present`).toBeGreaterThanOrEqual(0);
	const rest = text.slice(start + heading.length);
	const next = rest.indexOf("\n## ");
	return next < 0 ? rest : rest.slice(0, next);
}

describe("README prerequisites", () => {
	it("READMEs name the coding-standards prerequisite", () => {
		const en = section(read("README.md"), "## Prerequisites");
		expect(en).toContain("coding-standards");
		expect(en).toMatch(/implementer/i);
		expect(en).toMatch(/reviewer/i);
		expect(en).toContain(".agents/skills/");
		expect(en).toMatch(/project conventions/i);
		expect(en).toMatch(/(does not|never) stop/i);

		const vi = section(read("README.vi.md"), "## Yêu cầu");
		expect(vi).toContain("coding-standards");
		expect(vi).toContain(".agents/skills/");
		expect(vi).toMatch(/implementer/i);
		expect(vi).toMatch(/reviewer/i);
		expect(vi).toMatch(/convention của project/i);
		expect(vi).toMatch(/không dừng/i);
	});

	it("architecture and workflow docs mention coding-standards", () => {
		expect(read("docs/architecture.md")).toContain("coding-standards");
		expect(read("docs/workflow.md")).toContain("coding-standards");
	});
});

describe("README install and optional packages", () => {
	const en = read("README.md");
	const vi = read("README.vi.md");

	it("Required install commands present", () => {
		const install = section(en, "## Install");
		const order = [
			"brew install openspec",
			"pi install git:github.com/obra/superpowers",
			"pi install https://github.com/ttdua/pi-superspec",
		].map((cmd) => install.indexOf(cmd));
		for (const at of order) expect(at).toBeGreaterThanOrEqual(0);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it("Optional packages explained", () => {
		for (const [name, text] of [["README.md", en], ["README.vi.md", vi]] as const) {
			for (const pkg of ["@tintinweb/pi-subagents", "pi-subagents", "@gotgenes/pi-subagents", "rpiv-ask-user-question", "rpiv-todo"]) {
				expect(text, `${name} ${pkg}`).toContain(pkg);
			}
		}
	});

	it("Subagent plugin support stated", () => {
		expect(en).toMatch(/gotgenes[^\n]*own agents/i);
		expect(vi).toMatch(/gotgenes[^\n]*agent (riêng|của nó)/i);
	});

	it("READMEs keep the same section headings in the same order", () => {
		const headings = (text: string): number => text.split("\n").filter((l) => l.startsWith("## ")).length;
		expect(headings(vi)).toBe(headings(en));
	});
});
