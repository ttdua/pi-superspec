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
		const fallbacks: Record<string, RegExp> = {
			"@tintinweb/pi-subagents": /executing-plans/,
			"pi-subagents": /executing-plans/,
			"@gotgenes/pi-subagents": /executing-plans/,
			"rpiv-ask-user-question": /(plain question|câu hỏi thường)[^|]*(numbered|đánh số)/,
			"rpiv-todo": /(checklist)/,
		};
		for (const [name, text] of [["README.md", en], ["README.vi.md", vi]] as const) {
			for (const [pkg, fallback] of Object.entries(fallbacks)) {
				const row = text.split("\n").find((l) => l.startsWith(`| \`${pkg}\``));
				expect(row, `${name} ${pkg} row`).toBeDefined();
				expect(row, `${name} ${pkg} fallback`).toMatch(fallback);
			}
		}
	});

	it("Subagent plugin support stated", () => {
		const rowOf = (text: string, pkg: string): string => text.split("\n").find((l) => l.startsWith(`| \`${pkg}\``)) ?? "";
		expect(rowOf(en, "@tintinweb/pi-subagents")).toMatch(/bundled agents are supplied/);
		expect(rowOf(en, "pi-subagents")).toMatch(/bundled agents are supplied/);
		expect(rowOf(en, "@gotgenes/pi-subagents")).toMatch(/no bundled agents[^|]*own agents/i);
		expect(rowOf(vi, "@tintinweb/pi-subagents")).toMatch(/agent đi kèm được cấp/);
		expect(rowOf(vi, "pi-subagents")).toMatch(/agent đi kèm được cấp/);
		expect(rowOf(vi, "@gotgenes/pi-subagents")).toMatch(/không nhận agent đi kèm[^|]*agent riêng/i);
		expect(en).toMatch(/gotgenes[^\n]*own agents/i);
		expect(vi).toMatch(/gotgenes[^\n]*agent (riêng|của nó)/i);
	});

	it("inline fallback follows the integration paragraph, not the subagent tool", () => {
		for (const text of [en, vi]) {
			const absent = text.split("\n").find((l) => l.startsWith("- **Absent versus")) ?? text.split("\n").find((l) => l.startsWith("- **Vắng mặt")) ?? "";
			expect(absent).toContain("Subagent integration");
			expect(absent).not.toMatch(/`subagent` tool/);
		}
	});

	it("no doc sentence makes the bundled agents required", () => {
		for (const file of ["README.md", "README.vi.md", "docs/usage-guide.md", "docs/workflow.md"]) {
			for (const line of read(file).split("\n")) {
				expect(line, file).not.toMatch(/\b(requires?|required|must (use|have))\b[^.\n]*`superspec\.(scout|spec-reviewer|plan-reviewer|implementer|task-reviewer|verifier)`/i);
			}
		}
	});

	it("READMEs keep the same headings in the same order", () => {
		const headings = (text: string): string[] => text.split("\n").filter((l) => /^#{1,6} /.test(l));
		const map: Record<string, string> = {
			"# pi-superspec": "# pi-superspec",
			"## What it is": "## Giới thiệu",
			"## Prerequisites": "## Yêu cầu",
			"## Install": "## Cài đặt",
			"## Optional subagent integration": "## Tích hợp subagent tùy chọn",
			"## Quick start": "## Bắt đầu nhanh",
			"## Commands": "## Các lệnh",
			"## Uninstall": "## Gỡ cài đặt",
			"## Credits and license": "## Ghi công và giấy phép",
		};
		expect(headings(vi)).toEqual(headings(en).map((h) => map[h] ?? `unmapped: ${h}`));
	});
});
