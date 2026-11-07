import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	detectSubagentAdapter,
	pickSpawnTool,
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
		expect(subagentParagraph("pi-subagents")).toMatch(/no thinking level/i);
	});
	it("Report collection per adapter", () => {
		expect(subagentParagraph("pi-subagents")).toMatch(/output[^.]*scratch/i);
		for (const adapter of ["tintinweb", "gotgenes"] as const) {
			expect(subagentParagraph(adapter)).toMatch(/scratch file[^.]*before[^.]*evidence/i);
		}
		expect(subagentParagraph("tintinweb")).toContain("get_subagent_result");
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
	});
	it("Pure functions", () => {
		expect(subagentParagraph("tintinweb")).toBe(subagentParagraph("tintinweb"));
	});
});
