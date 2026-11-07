import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { channelParagraph } from "../extensions/interaction-channel.ts";
import { subagentParagraph } from "../extensions/subagent-integration.ts";
import { ROUTING_NOTE, ROUTING_NOTE_MARKER, routingNote } from "../extensions/routing-note.ts";
import { hashTree } from "../extensions/init/schema-install.ts";
import superspec, { createInitIO } from "../extensions/superspec.ts";
import { project, type State } from "./helpers/notice-project.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type Handler = (event: any, ctx?: any) => unknown;

interface Command {
	description?: string;
	handler: (args: string, ctx: unknown) => Promise<void>;
}

function loadAll(
	getCommands: () => { name: string }[] = () => [],
	extra: Record<string, unknown> = {},
): {
	handlers: Map<string, Handler>;
	commands: Map<string, Command>;
} {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, Command>();
	superspec({
		on: (name: string, h: Handler) => handlers.set(name, h),
		registerCommand: (name: string, options: Command) => commands.set(name, options),
		getCommands,
		...extra,
	} as never);
	return { handlers, commands };
}

function load(): Handler {
	const { handlers } = loadAll();
	const handler = handlers.get("resources_discover");
	if (!handler) throw new Error("resources_discover handler not registered");
	return handler;
}

const discover = (cwd: string) => load()({ cwd, reason: "startup" });

describe("superspec extension", () => {
	it("returns package skills and prompts paths in a marked project", () => {
		const result = discover(join(fixtures, "marked", "src", "nested")) as {
			skillPaths: string[];
			promptPaths: string[];
		};
		expect(isAbsolute(result.skillPaths[0])).toBe(true);
		expect(result.skillPaths[0]).toMatch(/[\\/]skills$/);
		expect(result.promptPaths[0]).toMatch(/[\\/]prompts$/);
		expect(
			existsSync(join(result.skillPaths[0], "opsx-new", "SKILL.md")),
		).toBe(true);
		expect(existsSync(join(result.promptPaths[0], "opsx-new.md"))).toBe(true);
		expect(
			existsSync(join(result.skillPaths[0], "opsx-apply", "SKILL.md")),
		).toBe(true);
		expect(existsSync(join(result.promptPaths[0], "opsx-apply.md"))).toBe(true);
	});

	it("returns nothing in an unmarked project", () => {
		expect(discover(join(fixtures, "unmarked"))).toEqual({});
	});

	it("returns nothing outside any project", () => {
		expect(discover(mkdtempSync(join(tmpdir(), "ps-")))).toEqual({});
	});

	it("registers the opsx-init command in a directory with no openspec/", () => {
		const dir = mkdtempSync(join(tmpdir(), "ps-"));
		const { handlers, commands } = loadAll();
		expect(existsSync(join(dir, "openspec"))).toBe(false);
		expect(handlers.get("resources_discover")?.({ cwd: dir, reason: "startup" })).toEqual({});
		const command = commands.get("opsx-init");
		expect(command).toBeDefined();
		expect(typeof command?.handler).toBe("function");
		expect(command?.description).toBe("Set up this repository for the Superspec workflow");
	});
});

const BOOTSTRAP = {
	role: "user",
	content: [{ type: "text", text: "superpowers:using-superpowers bootstrap for pi" }],
	timestamp: 1,
};
const PROMPT = { role: "user", content: "hello", timestamp: 2 };

function handler(name: string, getCommands?: () => { name: string }[]): Handler {
	const h = loadAll(getCommands).handlers.get(name);
	if (!h) throw new Error(`${name} handler not registered`);
	return h;
}

const hasNote = (message: unknown) => JSON.stringify(message).includes(ROUTING_NOTE_MARKER);

describe("context handler", () => {
	const context = (cwd: string, messages: unknown[]) =>
		handler("context")({ type: "context", messages }, { cwd }) as { messages: unknown[] } | undefined;

	it("injects the routing note after the bootstrap message in a marked project", () => {
		const result = context(join(fixtures, "marked", "src"), [BOOTSTRAP, PROMPT]);
		expect(result?.messages).toHaveLength(3);
		expect(result?.messages[0]).toBe(BOOTSTRAP);
		expect(hasNote(result?.messages[1])).toBe(true);
		expect(result?.messages[2]).toBe(PROMPT);
	});

	it("leaves messages unchanged in an unmarked project", () => {
		expect(context(join(fixtures, "unmarked"), [BOOTSTRAP, PROMPT])).toBeUndefined();
	});

	it("leaves messages unchanged outside any project", () => {
		expect(context(mkdtempSync(join(tmpdir(), "ps-")), [BOOTSTRAP, PROMPT])).toBeUndefined();
	});

	it("keeps exactly one routing note across repeated context events", () => {
		const cwd = join(fixtures, "marked");
		const first = context(cwd, [BOOTSTRAP, PROMPT]);
		const messages = first?.messages ?? [];
		const second = context(cwd, messages);
		const final = second?.messages ?? messages;
		expect(final.filter(hasNote)).toHaveLength(1);
	});

	it("registers no tool_call handler", () => {
		expect(loadAll().handlers.has("tool_call")).toBe(false);
	});

	describe("document language", () => {
		function project(config?: string): { dir: string; setConfig(text: string): void } {
			const dir = mkdtempSync(join(tmpdir(), "ps-"));
			cpSync(join(fixtures, "marked"), dir, { recursive: true });
			const setConfig = (text: string) => {
				mkdirSync(join(dir, "openspec"), { recursive: true });
				writeFileSync(join(dir, "openspec", "config.yaml"), text);
			};
			if (config !== undefined) setConfig(config);
			return { dir, setConfig };
		}
		const noteText = (cwd: string, run = context) => {
			const result = run(cwd, [BOOTSTRAP, PROMPT]);
			return JSON.stringify(result?.messages[1]);
		};

		it("adds the language paragraph when config.yaml sets a language", () => {
			const { dir } = project("schema: superspec\nlanguage: vi\n");
			const message = context(dir, [BOOTSTRAP, PROMPT])?.messages[1] as { content: { text: string }[] };
			expect(message.content[0].text).toBe(routingNote("vi", channelParagraph(["plain"]), subagentParagraph("none")));
		});

		it("picks up a config edit on the next event without reload", () => {
			const { dir, setConfig } = project("language: vi\n");
			const h = handler("context");
			const run = (cwd: string, messages: unknown[]) =>
				h({ type: "context", messages }, { cwd }) as { messages: unknown[] } | undefined;
			expect(noteText(dir, run)).toContain('\\"vi\\"');
			setConfig("language: en\n");
			const text = noteText(dir, run);
			expect(text).toContain('\\"en\\"');
			expect(text).not.toContain('\\"vi\\"');
		});

		const injected = (dir: string) =>
			(context(dir, [BOOTSTRAP, PROMPT])?.messages[1] as { content: { text: string }[] }).content[0].text;

		it("names en when config.yaml has no language", () => {
			const { dir } = project("schema: superspec\n");
			expect(injected(dir)).toBe(routingNote("en", channelParagraph(["plain"]), subagentParagraph("none")));
			expect(injected(dir)).toContain('"en"');
			expect(injected(dir)).not.toBe(ROUTING_NOTE);
		});

		it("names en when config.yaml is missing", () => {
			const { dir } = project();
			expect(injected(dir)).toBe(routingNote("en", channelParagraph(["plain"]), subagentParagraph("none")));
		});

		it("names en and does not throw when config.yaml is unreadable", () => {
			const { dir } = project();
			mkdirSync(join(dir, "openspec", "config.yaml"), { recursive: true });
			expect(injected(dir)).toBe(routingNote("en", channelParagraph(["plain"]), subagentParagraph("none")));
		});

		it("names en for an invalid on-disk language", () => {
			const { dir } = project(`language: ${"x".repeat(100)}\n`);
			expect(injected(dir)).toBe(routingNote("en", channelParagraph(["plain"]), subagentParagraph("none")));
		});
	});
});

describe("session_start handler", () => {
	function start(cwd: string, commands: { name: string }[], hasUI = true) {
		const calls: [string, string | undefined][] = [];
		const ctx = {
			cwd,
			hasUI,
			ui: { notify: (message: string, level?: string) => calls.push([message, level]) },
		};
		handler("session_start", () => commands)({ type: "session_start", reason: "startup" }, ctx);
		return calls;
	}

	function startSuperpowers(cwd: string, commands: { name: string }[], hasUI = true) {
		return start(cwd, commands, hasUI).filter(([m]) => m.includes("Superpowers"));
	}

	function startCodingStandards(cwd: string, commands: { name: string }[], hasUI = true) {
		return start(cwd, commands, hasUI).filter(([m]) => m.includes("coding-standards"));
	}

	it("warns once with the install command when Superpowers is missing", () => {
		const calls = startSuperpowers(join(fixtures, "marked"), []);
		expect(calls).toHaveLength(1);
		expect(calls[0][0]).toContain("pi install git:github.com/obra/superpowers");
		expect(calls[0][1]).toBe("warning");
	});

	it("does not warn when Superpowers is discoverable", () => {
		expect(startSuperpowers(join(fixtures, "marked"), [{ name: "skill:brainstorming" }])).toHaveLength(0);
	});

	it("does not warn in an unmarked project", () => {
		expect(startSuperpowers(join(fixtures, "unmarked"), [])).toHaveLength(0);
	});

	it("does not warn without a UI", () => {
		expect(startSuperpowers(join(fixtures, "marked"), [], false)).toHaveLength(0);
	});

	it("warns once when the coding standard is missing", () => {
		const calls = startCodingStandards(join(fixtures, "marked"), [{ name: "skill:brainstorming" }]);
		expect(calls).toHaveLength(1);
		expect(calls[0][1]).toBe("warning");
	});

	it("does not warn when the coding standard is discoverable", () => {
		const commands = [{ name: "skill:brainstorming" }, { name: "skill:coding-standards" }];
		expect(startCodingStandards(join(fixtures, "marked"), commands)).toHaveLength(0);
	});

	it("does not warn about the coding standard in an unmarked project", () => {
		expect(startCodingStandards(join(fixtures, "unmarked"), [])).toHaveLength(0);
	});

	it("does not warn about the coding standard without a UI", () => {
		expect(startCodingStandards(join(fixtures, "marked"), [], false)).toHaveLength(0);
	});

	it("warns separately when Superpowers and the coding standard are both missing", () => {
		const calls = start(join(fixtures, "marked"), []);
		expect(calls.filter(([m]) => m.includes("Superpowers"))).toHaveLength(1);
		expect(calls.filter(([m]) => m.includes("coding-standards"))).toHaveLength(1);
	});

	describe("schema notice", () => {
		const sp = [{ name: "skill:brainstorming" }, { name: "skill:coding-standards" }];
		const run = (state: State, hasUI = true) => {
			const { root, schema } = project(state);
			const before = hashTree(schema);
			const calls = start(root, sp, hasUI);
			expect(hashTree(schema)).toEqual(before);
			return calls;
		};

		it("notifies once at info for an upgradable schema", () => {
			const calls = run("upgradable");
			expect(calls).toHaveLength(1);
			expect(calls[0][1]).toBe("info");
			expect(calls[0][0]).toContain("v6");
			expect(calls[0][0]).toContain("v7");
			expect(calls[0][0]).toContain("/opsx-init");
			expect(calls[0][0]).not.toContain("--force");
		});

		it("notifies with --force for an older schema with edits", () => {
			const calls = run("older");
			expect(calls).toHaveLength(1);
			expect(calls[0][0]).toContain("/opsx-init --force");
		});

		it("notifies with --force for an edited schema", () => {
			const calls = run("edited");
			expect(calls).toHaveLength(1);
			expect(calls[0][0]).toContain("/opsx-init --force");
		});

		it("says nothing for an identical schema", () => {
			expect(run("identical")).toHaveLength(0);
		});

		it("says nothing without a UI", () => {
			expect(run("upgradable", false)).toHaveLength(0);
		});
	});
});

describe("interaction channel wiring", () => {
	const marked = join(fixtures, "marked");
	const never = () => new Promise<never>(() => {});
	type Exec = (command: string, args: string[], options?: unknown) => Promise<{ code: number }>;

	function setup(extra: Record<string, unknown> = {}) {
		const h = loadAll(() => [], extra).handlers;
		const notes: [string, string | undefined][] = [];
		const ctx = (cwd: string, hasUI = true) => ({
			cwd,
			hasUI,
			ui: { notify: (m: string, l?: string) => notes.push([m, l]) },
		});
		const start = (cwd = marked, hasUI = true) =>
			h.get("session_start")?.({ type: "session_start", reason: "startup" }, ctx(cwd, hasUI)) as Promise<void>;
		const note = (messages: unknown[] = [BOOTSTRAP, PROMPT]) => {
			const result = h.get("context")?.({ type: "context", messages }, { cwd: marked }) as
				| { messages: unknown[] }
				| undefined;
			return result && JSON.stringify(result.messages[1]);
		};
		return { start, note, notes, h };
	}

	it("probes once per session and caches the result across context events", async () => {
		const calls: [string, string[], unknown][] = [];
		const exec: Exec = async (c, a, o) => (calls.push([c, a, o]), { code: 0 });
		const { start, note } = setup({ exec, getActiveTools: () => [] });
		await start();
		note();
		note();
		note();
		expect(calls).toHaveLength(1);
		expect(calls[0][0]).toBe("sh");
		expect(calls[0][1].join(" ")).toContain("command -v plannotator");
	});

	it("probes without a UI", async () => {
		let n = 0;
		const { start } = setup({ exec: async () => (n++, { code: 1 }) });
		await start(marked, false);
		expect(n).toBe(1);
	});

	it("does not probe in an unmarked project", async () => {
		let n = 0;
		const { start } = setup({ exec: async () => (n++, { code: 0 }) });
		await start(join(fixtures, "unmarked"));
		expect(n).toBe(0);
	});

	it("keeps plain while the probe is pending", () => {
		const { start, note } = setup({ exec: never, getActiveTools: () => [] });
		void start();
		expect(note()).toContain("Interaction channel: plain.");
	});

	it("does not select the CLI when the probe exits non-zero", async () => {
		const { start, note } = setup({ exec: async () => ({ code: 1 }), getActiveTools: () => [] });
		await start();
		expect(note()).not.toContain("plannotator-cli");
	});

	it("swallows a rejected probe without a notification", async () => {
		const { start, note, notes } = setup({
			exec: () => Promise.reject(new Error("no sh")),
			getActiveTools: () => [],
		});
		await expect(start()).resolves.toBeUndefined();
		expect(notes.filter(([m]) => !m.includes("Superpowers") && !m.includes("coding-standards") && !m.includes("Schema superspec"))).toHaveLength(0);
		expect(note()).not.toContain("plannotator-cli");
	});

	it("selects plannotator-cli when the probe finds it", async () => {
		const { start, note } = setup({ exec: async () => ({ code: 0 }), getActiveTools: () => [] });
		await start();
		expect(note()).toContain("Interaction channel: plannotator-cli.");
	});

	it("ignores a stale probe result from a previous start", async () => {
		let release: (r: { code: number }) => void = () => {};
		const first = new Promise<{ code: number }>((r) => (release = r));
		const results = [first, Promise.resolve({ code: 1 })];
		const { start, note } = setup({ exec: () => results.shift(), getActiveTools: () => [] });
		const p1 = start();
		await start();
		release({ code: 0 });
		await p1;
		expect(note()).not.toContain("plannotator-cli");
	});

	it("does not throw and uses plain when exec is unavailable", async () => {
		const { start, note } = setup({ getActiveTools: () => [] });
		await expect(start()).resolves.toBeUndefined();
		expect(note()).toContain("Interaction channel: plain.");
	});

	it("uses plain when getActiveTools is missing", () => {
		expect(setup().note()).toContain("Interaction channel: plain.");
	});

	it("does not select a channel whose tool is not active", () => {
		expect(setup({ getActiveTools: () => ["read"] }).note()).toContain("Interaction channel: plain.");
	});

	it("follows the active tool set mid-session", () => {
		const sets = [[], ["plannotator_inbox"]];
		const { note } = setup({ getActiveTools: () => sets.shift() });
		expect(note()).toContain("Interaction channel: plain.");
		expect(note()).toContain("Interaction channel: inbox.");
	});

	it("picks up a lazily registered subagent tool", () => {
		const sets = [[], ["Agent"]];
		const all = [{ name: "Agent", parameters: { type: "object", properties: { subagent_type: {}, prompt: {} } } }];
		const { note } = setup({ getActiveTools: () => sets.shift(), getAllTools: () => all });
		expect(note()).toContain("Subagent integration: none.");
		expect(note()).toContain("Subagent integration: tintinweb.");
	});

	it("reports none when getAllTools is missing", () => {
		expect(setup({ getActiveTools: () => ["Agent"] }).note()).toContain("Subagent integration: none.");
	});

	it("does not add a second note after the channel changes", () => {
		const sets = [[], ["plannotator_inbox"]];
		const { h } = setup({ getActiveTools: () => sets.shift() });
		const run = (messages: unknown[]) =>
			h.get("context")?.({ type: "context", messages }, { cwd: marked }) as { messages: unknown[] } | undefined;
		const first = run([BOOTSTRAP, PROMPT]);
		expect(run(first?.messages ?? [])).toBeUndefined();
	});
});

describe("createInitIO", () => {
	function io(input: (title: string, placeholder?: string) => Promise<string | undefined>) {
		const pi = {} as Parameters<typeof createInitIO>[0];
		const ctx = { cwd: "/tmp/x", hasUI: true, ui: { input } } as unknown as Parameters<typeof createInitIO>[1];
		return createInitIO(pi, ctx);
	}

	it("prompt delegates to ctx.ui.input with title and placeholder", async () => {
		const calls: unknown[][] = [];
		const result = await io(async (...args) => {
			calls.push(args);
			return "vi";
		}).prompt("Language", "e.g. Vietnamese");
		expect(result).toBe("vi");
		expect(calls).toEqual([["Language", "e.g. Vietnamese"]]);
	});

	it("prompt resolves undefined when the user cancels", async () => {
		expect(await io(async () => undefined).prompt("Language")).toBeUndefined();
	});

	it("keeps backups under ~/.pi/superspec-backups", () => {
		expect(io(async () => undefined).backupRoot).toBe(join(homedir(), ".pi", "superspec-backups"));
	});
});
