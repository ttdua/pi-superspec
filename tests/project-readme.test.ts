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
