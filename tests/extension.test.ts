import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import superspec from "../extensions/superspec.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type Handler = (event: { cwd: string; reason: string }) => unknown;

function load(): Handler {
	const handlers = new Map<string, Handler>();
	superspec({ on: (name: string, h: Handler) => handlers.set(name, h) } as never);
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
});
