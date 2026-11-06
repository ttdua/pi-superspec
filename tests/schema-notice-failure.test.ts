import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import superspec from "../extensions/superspec.ts";

vi.mock("../extensions/schema-notice.ts", () => ({
	schemaNotice: () => {
		throw new Error("boom");
	},
}));

const marked = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "marked");

describe("session_start when schema classification throws", () => {
	it("swallows the error, emits no schema notice and still probes", async () => {
		const handlers = new Map<string, (e: unknown, c: unknown) => unknown>();
		const notes: string[] = [];
		let execCalls = 0;
		superspec({
			on: (n: string, h: never) => handlers.set(n, h),
			registerCommand: () => {},
			getCommands: () => [{ name: "skill:brainstorming" }],
			exec: async () => (execCalls++, { code: 1 }),
		} as never);
		const ctx = { cwd: marked, hasUI: true, ui: { notify: (m: string) => notes.push(m) } };
		await expect(
			Promise.resolve(handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, ctx)),
		).resolves.toBeUndefined();
		expect(notes.filter((m) => m.includes("Schema superspec"))).toHaveLength(0);
		expect(execCalls).toBe(1);
	});
});
