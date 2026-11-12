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
	const executors = section(guide, "## Executors");

	it("Both executors described", () => {
		const without = executors.split("\n").find((l) => l.includes("executing-plans")) ?? "";
		expect(without).toMatch(/Without a subagent plugin/);
		expect(without).toMatch(/whole-branch review/);
		const withPlugin = executors.split("\n").find((l) => l.includes("With a subagent plugin")) ?? "";
		expect(withPlugin).toMatch(/subagent-driven development/);
	});

	it("Parallel lanes described", () => {
		const lanes = executors.split("\n").find((l) => l.includes("**Parallel lanes.**")) ?? "";
		expect(lanes).toMatch(/Blocked by/);
		expect(lanes).toMatch(/at most three writer lanes/);
		expect(lanes).toContain("`<name>--task-<N>`");
		expect(lanes).toMatch(/merge after review/);
		expect(lanes).toMatch(/second conflict stops apply/);
		expect(executors).toMatch(/Difficulty/);
		for (const [difficulty, thinking] of [["Easy", "low"], ["Normal", "medium"], ["Hard", "high"], ["Very Hard", "xhigh"]]) {
			expect(executors, difficulty).toMatch(new RegExp(`\\| ${difficulty} \\| ${thinking} \\|`));
		}
	});

	it("states the apply merge boundary", () => {
		const stop = section(guide, "### 7. Apply").split("\n").find((l) => l.startsWith("- Stop:")) ?? "";
		expect(stop).toMatch(/merges reviewed lane branches into `<name>`/);
		expect(stop).toMatch(/never merges `<name>`/);
		expect(stop).toMatch(/never pushes/);
	});

	it("Bootstrap path covered", () => {
		const bootstrap = section(guide, "## Existing codebase: bootstrap specs");
		expect(bootstrap).toMatch(/scouts are delegated when a subagent plugin is detected/i);
		expect(bootstrap).toContain("openspec/changes/bootstrap-specs/");
		expect(bootstrap).toMatch(/No capability scout runs before you answer/);
		const order = ["/opsx-init --generate", "/opsx-generate-specs", "/skill:openspec-ff-change bootstrap-specs", "openspec-apply-change"].map(
			(c) => bootstrap.indexOf(c),
		);
		expect(order[0]).toBeGreaterThanOrEqual(0);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it("Inferred label explained", () => {
		const bootstrap = section(guide, "## Existing codebase: bootstrap specs");
		expect(bootstrap).toMatch(/Confidence: inferred[^.]*review/i);
	});

	it("names the optional tool fallbacks", () => {
		expect(executors).toMatch(/Without `rpiv-ask-user-question`[^.]*numbered options/);
		expect(executors).toMatch(/without `rpiv-todo`[^.]*checklist/);
	});
});

describe("e2e checklist", () => {
	const checklist = read("docs/e2e-checklist.md");

	it("Routing note expectation lists the current four paths", () => {
		const line = checklist.split("\n").find((l) => l.includes("pi-superspec routing note")) ?? "";
		expect(line).toMatch(/no spec change[^;.]*directly with TDD/i);
		expect(line).toContain("openspec-ff-change");
		expect(line).toMatch(/openspec-new-change[^.]*openspec-continue-change/);
		expect(line).toMatch(/questions[^.]*directly/i);
		expect(line).toContain("docs/superpowers/");
		expect(checklist).not.toContain("behaviour-changing work is first proposed with `/opsx-new`");
	});
	const RUNS = {
		tintinweb: /^## Run [A-Z] — with @tintinweb\/pi-subagents[^\n]*/m,
		"pi-subagents": /^## Run [A-Z] — with pi-subagents[^\n]*/m,
		none: /^## Run [A-Z] — without a subagent plugin[^\n]*/m,
	};
	const run = (key: keyof typeof RUNS): string => section(checklist, checklist.match(RUNS[key])?.[0] ?? "");
	const STEPS = ["/opsx-init", "brainstorm", "proposal", "design", "specs", "tasks", "plan", "apply", "verify", "finalize", "archive"];

	it("Both runs covered", () => {
		for (const key of Object.keys(RUNS) as (keyof typeof RUNS)[]) {
			const body = run(key).toLowerCase();
			for (const step of STEPS) expect(body, `${key} ${step}`).toContain(step);
			for (const command of [
				"/skill:openspec-new-change",
				"/skill:openspec-continue-change",
				"/skill:openspec-apply-change",
				"/skill:openspec-verify-change",
				"/skill:openspec-archive-change",
			]) {
				expect(body, `${key} ${command}`).toContain(command);
			}
		}
	});

	it("gotgenes smoke", () => {
		const smoke = section(checklist, checklist.match(/^## [^\n]*@gotgenes\/pi-subagents[^\n]*/m)?.[0] ?? "");
		expect(smoke).toContain("Subagent integration: gotgenes.");
		expect(smoke).toMatch(/announces once per stage which one it chose/);
		expect(smoke).toContain("ask_parent");
		expect(smoke).toContain("subagent({ resume, prompt })");
	});

	it("Parallel lanes observed", () => {
		const body = run("tintinweb");
		expect(body).toMatch(/two independent tasks/);
		expect(body).toContain("`e2e-a--task-1`");
		expect(body).toContain("`e2e-a--task-2`");
		expect(body).toMatch(/merge commit only after its task review passes/);
		expect(body).toContain("## Lanes");
	});

	it("keeps SM cases consistent with the adapters", () => {
		const sm03 = checklist.split("\n").find((l) => l.includes("**SM-03")) ?? "";
		expect(sm03).toMatch(/no subagent plugin and no activation helper/);
		expect(sm03).not.toMatch(/without `pi-subagents`/);
		const sm06 = checklist.split("\n").find((l) => l.includes("**SM-06")) ?? "";
		expect(sm06).toMatch(/meets the implementer role/);
		expect(sm06).not.toMatch(/namespaced implementer|no parallel writers/);
	});

	it("Expected results stated", () => {
		const items = checklist.split("\n").filter((l) => l.trimStart().startsWith("- [ ]"));
		expect(items.length).toBeGreaterThan(40);
		for (const item of items) expect(item).toContain("Expected:");
	});
});

describe("architecture", () => {
	it("describes roles, bundled candidates and where plugin mechanics live", () => {
		const arch = read("docs/architecture.md");
		const agents = arch.split("\n").find((l) => l.startsWith("| Package agents")) ?? "";
		expect(agents).toMatch(/bundled candidates/);
		const generate = arch.split("\n").find((l) => l.startsWith("| `opsx-generate-specs`")) ?? "";
		expect(generate).not.toContain("superspec.");
		expect(arch).toContain("Plugin-specific tool names live only in `extensions/subagent-integration.ts`");
		expect(arch).toMatch(/The escalation channel is not in the agent: the parent supplies it in the handoff/);
		expect(arch).not.toMatch(/both escalation dialects/);
	});

	it("Subagent compatibility names each plugin with its test status", () => {
		const text = section(read("docs/architecture.md"), "### Subagent compatibility");
		for (const plugin of PLUGINS) {
			const escaped = plugin.replace(/[/@]/g, (c) => `\\${c}`);
			expect(text, plugin).toMatch(new RegExp(`${escaped}[^\\n]*(inspected|smoke-tested)`));
		}
	});

});
