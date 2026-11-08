import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	detectSubagentAdapter,
	pickSpawnTool,
	resolveSubagentIntegration,
	type SubagentAdapter,
	subagentParagraph,
	type SubagentToolInfo,
} from "../extensions/subagent-integration.ts";

function tool(name: string, keys: string[], source?: string): SubagentToolInfo {
	return {
		name,
		parameters: { type: "object", properties: Object.fromEntries(keys.map((k) => [k, {}])) },
		sourceInfo: source ? { source } : undefined,
	};
}

const tintinweb = () => tool("Agent", ["subagent_type", "prompt"]);
const piSubagents = () => tool("subagent", ["agent", "task"]);
const gotgenes = () => tool("subagent", ["subagent_type", "prompt"]);

describe("detectSubagentAdapter", () => {
	it("tintinweb detected", () => {
		expect(detectSubagentAdapter([tintinweb()])).toBe("tintinweb");
	});
	it("pi-subagents detected", () => {
		expect(detectSubagentAdapter([piSubagents()])).toBe("pi-subagents");
	});
	it("gotgenes detected by schema, not name", () => {
		expect(detectSubagentAdapter([gotgenes()])).toBe("gotgenes");
	});
	it("Helper only", () => {
		expect(detectSubagentAdapter([{ name: "subagents_enable" }])).toBe("pi-subagents-helper");
	});
	it("Several plugins active", () => {
		expect(detectSubagentAdapter([piSubagents(), tintinweb()])).toBe("tintinweb");
	});
	it("extra task parameter with subagent_type is not pi-subagents", () => {
		expect(detectSubagentAdapter([tool("subagent", ["subagent_type", "prompt", "task"])])).toBe("gotgenes");
	});
	it("Nothing detected", () => {
		expect(detectSubagentAdapter([])).toBe("none");
	});
	it("Same name, schema decides", () => {
		expect(detectSubagentAdapter([gotgenes(), piSubagents()])).toBe("pi-subagents");
	});
	it("Same name and schema, provenance decides", () => {
		const tools = [tool("subagent", ["agent", "task"], "local"), tool("subagent", ["agent", "task"], "npm:pi-subagents")];
		expect(detectSubagentAdapter(tools)).toBe("pi-subagents");
		expect(pickSpawnTool(tools, "pi-subagents")?.sourceInfo?.source).toBe("npm:pi-subagents");
	});
	it("resolveSubagentIntegration returns the provenance-picked tool", () => {
		const tools = [tool("mcp__x__subagent", ["agent", "task"], "npm:pi-subagents"), tool("subagent", ["agent", "task"], "local")];
		const { adapter, tool: picked } = resolveSubagentIntegration(tools);
		expect(adapter).toBe("pi-subagents");
		expect(picked?.name).toBe("mcp__x__subagent");
		expect(resolveSubagentIntegration([])).toEqual({ adapter: "none" });
		expect(resolveSubagentIntegration([{ name: "subagents_enable" }])).toEqual({ adapter: "pi-subagents-helper" });
	});
	it("paragraph names a non-default tool name and is unchanged without one", () => {
		expect(subagentParagraph("pi-subagents", "mcp__x__subagent")).toContain("`mcp__x__subagent({ agent");
		expect(subagentParagraph("pi-subagents", "subagent")).toBe(subagentParagraph("pi-subagents"));
		expect(subagentParagraph("tintinweb", "Agent")).toBe(subagentParagraph("tintinweb"));
	});
	it("No side effects", () => {
		const here = dirname(fileURLToPath(import.meta.url));
		const source = readFileSync(join(here, "..", "extensions", "subagent-integration.ts"), "utf8");
		expect(source).not.toMatch(/node:fs/);
		expect(detectSubagentAdapter(Object.freeze([tintinweb()]))).toBe("tintinweb");
	});
	it("tolerates a tool without parameters", () => {
		expect(detectSubagentAdapter([{ name: "Agent" }, { name: "subagent" }])).toBe("none");
	});
	it("reads plain-object parameters", () => {
		expect(detectSubagentAdapter([{ name: "subagent", parameters: { agent: {}, task: {} } }])).toBe("pi-subagents");
	});
	it("matches an MCP-prefixed name", () => {
		expect(detectSubagentAdapter([tool("mcp__x__subagent", ["agent", "task"])])).toBe("pi-subagents");
	});
});

const PARAGRAPH_ADAPTERS: Record<SubagentAdapter, true> = {
	tintinweb: true,
	"pi-subagents": true,
	gotgenes: true,
	"pi-subagents-helper": true,
	none: true,
};

describe("subagentParagraph", () => {
	const spawning = ["tintinweb", "pi-subagents", "gotgenes"] as const;

	it("Paragraph per adapter", () => {
		for (const adapter of spawning) {
			const text = subagentParagraph(adapter);
			expect(text.startsWith(`Subagent integration: ${adapter}.`)).toBe(true);
			for (const re of [/spawn/i, /list/i, /thinking/i, /report/i, /wait/i, /escalat/i]) expect(text).toMatch(re);
		}
	});
	it("Thinking on pi-subagents", () => {
		const text = subagentParagraph("pi-subagents");
		expect(text).toMatch(/no thinking level/i);
		expect(text).toMatch(/model suffix/i);
		expect(text).toMatch(/model is not pinned/i);
	});
	it("Report collection per adapter", () => {
		expect(subagentParagraph("pi-subagents")).toMatch(/output[^.]*scratch/i);
		for (const adapter of ["tintinweb", "gotgenes"] as const) {
			expect(subagentParagraph(adapter)).toMatch(/scratch file[^.]*before[^.]*evidence/i);
		}
		expect(subagentParagraph("tintinweb")).toContain("get_subagent_result");
		for (const adapter of ["tintinweb", "gotgenes"] as const) {
			expect(subagentParagraph(adapter)).toContain("get_subagent_result({ agent_id, wait: true })");
		}
		expect(subagentParagraph("pi-subagents")).toMatch(/status action[^.]*background/i);
	});
	it("Escalation channels", () => {
		expect(subagentParagraph("pi-subagents")).toContain("contact_supervisor");
		expect(subagentParagraph("gotgenes")).toContain("ask_parent");
		expect(subagentParagraph("gotgenes")).toContain("resume");
		const t = subagentParagraph("tintinweb");
		expect(t).toMatch(/Blockers/);
		expect(t).toContain("steer_subagent");
		expect(t).toContain("resume");
	});
	it("Helper activation", () => {
		const text = subagentParagraph("pi-subagents-helper");
		expect(text).toContain("subagents_enable");
		expect(text).toMatch(/next turn/i);
	});
	it("Unavailable delegation", () => {
		const text = subagentParagraph("none");
		expect(text).toMatch(/unavailable/i);
		expect(text).toMatch(/inline/i);
		expect(text).not.toMatch(/Agent\(|subagent\(|contact_supervisor/);
	});
	it("gotgenes has no bundled agents", () => {
		expect(subagentParagraph("gotgenes")).toMatch(/no bundled agents/i);
		expect(subagentParagraph("gotgenes")).toMatch(/pick from the registered agent types/i);
	});
	it("gives bundled agents no default or precedence", () => {
		for (const adapter of Object.keys(PARAGRAPH_ADAPTERS) as SubagentAdapter[]) {
			expect(subagentParagraph(adapter)).not.toMatch(/superspec\./i);
		}
	});
	it("states how to read each agent's tools and skills", () => {
		for (const adapter of spawning) {
			const text = subagentParagraph(adapter);
			expect(text).toMatch(/tools/i);
			expect(text).toMatch(/skills/i);
			expect(text).toMatch(/frontmatter/i);
			expect(text).toMatch(/unknown[^.]*read-only/i);
		}
		expect(subagentParagraph("tintinweb")).toContain("/agents");
		expect(subagentParagraph("tintinweb")).toContain(".agents/agents/");
		expect(subagentParagraph("gotgenes")).toContain("~/.pi/agent/agents/");
		expect(subagentParagraph("gotgenes")).toMatch(/built-in/i);
		expect(subagentParagraph("pi-subagents")).toMatch(/management/i);
	});
	it("Helper paragraph does not send the parent inline", () => {
		const text = subagentParagraph("pi-subagents-helper");
		expect(text).not.toMatch(/inline/i);
		expect(text).toMatch(/list/i);
		expect(text).toMatch(/do not start/i);
	});
	it("Pure functions", () => {
		expect(subagentParagraph("tintinweb")).toBe(subagentParagraph("tintinweb"));
	});
});
