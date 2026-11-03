import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ROUTING_NOTE, ROUTING_NOTE_MARKER, routingNote } from "../extensions/routing-note.ts";
import superspec from "../extensions/superspec.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type Handler = (event: any, ctx?: any) => unknown;

interface Command {
	description?: string;
	handler: (args: string, ctx: unknown) => Promise<void>;
}

function loadAll(getCommands: () => { name: string }[] = () => []): {
	handlers: Map<string, Handler>;
	commands: Map<string, Command>;
} {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, Command>();
	superspec({
		on: (name: string, h: Handler) => handlers.set(name, h),
		registerCommand: (name: string, options: Command) => commands.set(name, options),
		getCommands,
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
			expect(message.content[0].text).toBe(routingNote("vi"));
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

		it("injects exactly ROUTING_NOTE without a language", () => {
			const { dir } = project("schema: superspec\n");
			const message = context(dir, [BOOTSTRAP, PROMPT])?.messages[1] as { content: { text: string }[] };
			expect(message.content[0].text).toBe(ROUTING_NOTE);
		});

		it("treats an invalid on-disk language as absent", () => {
			const { dir } = project(`language: ${"x".repeat(100)}\n`);
			const message = context(dir, [BOOTSTRAP, PROMPT])?.messages[1] as { content: { text: string }[] };
			expect(message.content[0].text).toBe(ROUTING_NOTE);
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

	it("warns once with the install command when Superpowers is missing", () => {
		const calls = start(join(fixtures, "marked"), []);
		expect(calls).toHaveLength(1);
		expect(calls[0][0]).toContain("pi install git:github.com/obra/superpowers");
		expect(calls[0][1]).toBe("warning");
	});

	it("does not warn when Superpowers is discoverable", () => {
		expect(start(join(fixtures, "marked"), [{ name: "skill:brainstorming" }])).toHaveLength(0);
	});

	it("does not warn in an unmarked project", () => {
		expect(start(join(fixtures, "unmarked"), [])).toHaveLength(0);
	});

	it("does not warn without a UI", () => {
		expect(start(join(fixtures, "marked"), [], false)).toHaveLength(0);
	});
});
