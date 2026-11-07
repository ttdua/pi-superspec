import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const read = (file: string): string => readFileSync(new URL(file, root), "utf8");

/** Text from `heading` (a line start) up to the next heading of the same or higher level. */
function section(text: string, heading: string): string {
	const level = heading.match(/^#+/)?.[0].length ?? 2;
	const start = text.indexOf(`\n${heading}`);
	expect(start, `${heading} present`).toBeGreaterThanOrEqual(0);
	const rest = text.slice(start + 1 + heading.length);
	const next = rest.search(new RegExp(`\\n#{1,${level}} `));
	return next < 0 ? rest : rest.slice(0, next);
}

const PLUGINS = ["@tintinweb/pi-subagents", "pi-subagents", "@gotgenes/pi-subagents"] as const;

describe("usage guide", () => {
	const guide = read("docs/usage-guide.md");

	it("Both executors described", () => {
		expect(guide).toMatch(/executing-plans/);
		expect(guide).toMatch(/whole-branch review/);
	});

	it("Parallel lanes described", () => {
		expect(guide).toMatch(/Blocked by/);
		expect(guide).toMatch(/Difficulty/);
		expect(guide).toMatch(/lane/i);
		expect(guide).toMatch(/worktree/i);
		expect(guide).toMatch(/Very Hard[^\n]*xhigh/);
		expect(guide).toMatch(/merge[^.\n]*after[^.\n]*review|after[^.\n]*review[^.\n]*merge/i);
	});

	it("Bootstrap path covered", () => {
		expect(guide).toMatch(/scouts?[^.]*(detected|subagent plugin)/i);
		expect(guide).toContain("openspec/changes/bootstrap-specs/");
		const bootstrap = section(guide, "## Existing codebase: bootstrap specs");
		const order = ["/opsx-init --generate", "/opsx-generate-specs", "/opsx-ff bootstrap-specs", "/opsx-apply"].map(
			(c) => bootstrap.indexOf(c),
		);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
		expect(order[0]).toBeGreaterThanOrEqual(0);
	});

	it("Inferred label explained", () => {
		expect(guide).toMatch(/Confidence: inferred[^.]*review/i);
	});

	it("names the optional tool fallbacks", () => {
		expect(guide).toContain("rpiv-ask-user-question");
		expect(guide).toContain("rpiv-todo");
	});
});

describe("e2e checklist", () => {
	const checklist = read("docs/e2e-checklist.md");

	it("Both runs covered", () => {
		expect(checklist).toMatch(/^## Run [A-Z] — with @tintinweb\/pi-subagents/m);
		expect(checklist).toMatch(/^## Run [A-Z] — with pi-subagents/m);
		expect(checklist).toMatch(/^## Run [A-Z] — without a subagent plugin/m);
		for (const run of ["with @tintinweb/pi-subagents", "with pi-subagents", "without a subagent plugin"]) {
			const body = section(checklist, checklist.match(new RegExp(`^## Run [A-Z] — ${run}`, "m"))?.[0] ?? "");
			for (const step of ["/opsx-init", "/opsx-apply", "/opsx-verify", "/opsx-archive"]) {
				expect(body, `${run} ${step}`).toContain(step);
			}
		}
	});

	it("gotgenes smoke", () => {
		const smoke = section(checklist, checklist.match(/^## [^\n]*@gotgenes\/pi-subagents[^\n]*/m)?.[0] ?? "");
		expect(smoke).toContain("ask_parent");
		expect(smoke).toContain("resume");
		expect(smoke).toMatch(/detect/i);
		expect(smoke).toMatch(/agent (choice|selection)|announce/i);
	});

	it("Parallel lanes observed", () => {
		const run = section(checklist, checklist.match(/^## Run [A-Z] — with @tintinweb\/pi-subagents/m)?.[0] ?? "");
		expect(run).toContain("## Lanes");
		expect(run).toMatch(/two (independent tasks|lane worktrees)/i);
		expect(run).toMatch(/merge[^\n]*after[^\n]*review|after[^\n]*review[^\n]*merge/i);
	});

	it("Expected results stated", () => {
		const items = checklist.split("\n").filter((l) => l.trimStart().startsWith("- [ ]"));
		expect(items.length).toBeGreaterThan(0);
		for (const item of items) {
			expect(item).toContain("Expected:");
		}
	});
});

describe("architecture", () => {
	it("Subagent compatibility names each plugin with its test status", () => {
		const text = section(read("docs/architecture.md"), "### Subagent compatibility");
		for (const plugin of PLUGINS) {
			const escaped = plugin.replace(/[/@]/g, (c) => `\\${c}`);
			expect(text, plugin).toMatch(new RegExp(`${escaped}[^\\n]*(inspected|smoke-tested)`));
		}
	});

});
