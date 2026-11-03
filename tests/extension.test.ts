import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import superspec from "../extensions/superspec.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type Handler = (event: { cwd: string; reason: string }) => unknown;

interface Command {
	description?: string;
	handler: (args: string, ctx: unknown) => Promise<void>;
}

function loadAll(): { handlers: Map<string, Handler>; commands: Map<string, Command> } {
	const handlers = new Map<string, Handler>();
	const commands = new Map<string, Command>();
	superspec({
		on: (name: string, h: Handler) => handlers.set(name, h),
		registerCommand: (name: string, options: Command) => commands.set(name, options),
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
			existsSync(join(result.skillPaths[0], "superspec-placeholder", "SKILL.md")),
		).toBe(true);
		expect(existsSync(join(result.promptPaths[0], "opsx-placeholder.md"))).toBe(
			true,
		);
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
