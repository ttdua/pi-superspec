export type SubagentAdapter = "tintinweb" | "pi-subagents" | "gotgenes" | "pi-subagents-helper" | "none";

export interface SubagentToolInfo {
	name: string;
	parameters?: unknown;
	sourceInfo?: { source?: string; path?: string };
}

type SpawnAdapter = Exclude<SubagentAdapter, "pi-subagents-helper" | "none">;

interface SpawnRule {
	adapter: SpawnAdapter;
	toolName: string;
	/** Package name looked for in `sourceInfo.source` to break ties. */
	packageName: string;
	matches: (keys: Set<string>) => boolean;
}

/** Rules in detection order: the first adapter with a matching active tool wins. */
const SPAWN_RULES: readonly SpawnRule[] = [
	{
		adapter: "tintinweb",
		toolName: "Agent",
		packageName: "tintinweb",
		matches: (keys) => keys.has("subagent_type") && keys.has("prompt"),
	},
	{
		adapter: "pi-subagents",
		toolName: "subagent",
		packageName: "pi-subagents",
		matches: (keys) => keys.has("agent") || keys.has("task"),
	},
	{
		adapter: "gotgenes",
		toolName: "subagent",
		packageName: "gotgenes",
		matches: (keys) => keys.has("subagent_type") && keys.has("prompt"),
	},
];

const HELPER_TOOL = "subagents_enable";

const hasName = (tool: SubagentToolInfo, name: string): boolean =>
	tool.name === name || tool.name.endsWith(`__${name}`);

/** Parameter names of a tool schema: `properties` when it is an object, else the object's own keys. */
export function paramKeys(parameters: unknown): Set<string> {
	if (parameters === null || typeof parameters !== "object") return new Set();
	const properties = (parameters as { properties?: unknown }).properties;
	const source = properties !== null && typeof properties === "object" ? properties : parameters;
	return new Set(Object.keys(source as object));
}

function candidates(tools: readonly SubagentToolInfo[], rule: SpawnRule): SubagentToolInfo[] {
	return tools.filter((tool) => hasName(tool, rule.toolName) && rule.matches(paramKeys(tool.parameters)));
}

/** The spawn tool of an adapter; among several matches, prefers one whose source names the adapter's package. */
export function pickSpawnTool(
	tools: readonly SubagentToolInfo[],
	adapter: SubagentAdapter,
): SubagentToolInfo | undefined {
	const rule = SPAWN_RULES.find((r) => r.adapter === adapter);
	if (!rule) return undefined;
	const found = candidates(tools, rule);
	return found.find((tool) => tool.sourceInfo?.source?.includes(rule.packageName)) ?? found[0];
}

/** Which subagent plugin the active tools belong to, judged by parameter schema. */
export function detectSubagentAdapter(tools: readonly SubagentToolInfo[]): SubagentAdapter {
	const rule = SPAWN_RULES.find((r) => candidates(tools, r).length > 0);
	if (rule) return rule.adapter;
	return tools.some((tool) => hasName(tool, HELPER_TOOL)) ? "pi-subagents-helper" : "none";
}

const SHARED_THINKING_AND_WAIT =
	"Thinking: pass `thinking` on the spawn call. Wait: set `run_in_background: false`, or collect later with the result tool.";

const PARAGRAPHS: Record<SubagentAdapter, string> = {
	tintinweb: [
		"Subagent integration: tintinweb.",
		'Spawn: `Agent({ subagent_type, prompt, description, run_in_background, thinking })`; use `subagent_type: "superspec.<role>"` for the bundled roles.',
		"List: the available agents are listed in the `Agent` tool description.",
		SHARED_THINKING_AND_WAIT,
		"Report: collect the final result with `get_subagent_result({ agent_id, wait: true })`, then write it to a scratch file before checking evidence.",
		"Escalation: the child ends its turn with the question under Blockers. Answer with `steer_subagent` while the child runs, or `Agent({ resume, prompt })` after it ends. Treat an escalation as a pending question, not a completed report.",
	].join("\n"),
	"pi-subagents": [
		"Subagent integration: pi-subagents.",
		'Spawn: `subagent({ agent, task, cwd, context: "fresh", output })`; use `agent: "superspec.<role>"` for the bundled roles.',
		"List: list agents with the tool's documented management action; read the tool's own guide before using it.",
		"Thinking: there is no thinking level per call; do not pass one.",
		"Report: bind `output` to a scratch path and read the report from it before checking evidence.",
		"Wait: the call returns when the child finishes; use the tool's own status action for background runs.",
		'Escalation: the child calls `contact_supervisor` with `reason: "need_decision"`; reply on the supervisor channel. Treat an escalation as a pending question, not a completed report.',
	].join("\n"),
	gotgenes: [
		"Subagent integration: gotgenes.",
		"Spawn: `subagent({ subagent_type, prompt, description, run_in_background, thinking })`. There are no bundled agents; pick from the registered agent types.",
		"List: the available agents are listed in the `subagent` tool description.",
		SHARED_THINKING_AND_WAIT,
		"Report: collect the final result with `get_subagent_result({ agent_id, wait: true })`, then write it to a scratch file before checking evidence.",
		"Escalation: the child calls `ask_parent` and ends its turn. Answer with `subagent({ resume, prompt })`. Treat an escalation as a pending question, not a completed report.",
	].join("\n"),
	"pi-subagents-helper": [
		"Subagent integration: pi-subagents-helper.",
		"Only the activation helper is active. Call `subagents_enable`; the spawn tools become available from the next turn, when this paragraph is re-evaluated. Until then, take the inline path.",
	].join("\n"),
	none: [
		"Subagent integration: none.",
		"Subagent delegation is unavailable. Take the inline path: do the work in this session and review it yourself against the same evidence rules.",
	].join("\n"),
};

/** Fixed mechanics text for one adapter; the first line is `Subagent integration: <adapter>.`. */
export function subagentParagraph(adapter: SubagentAdapter): string {
	return PARAGRAPHS[adapter];
}
