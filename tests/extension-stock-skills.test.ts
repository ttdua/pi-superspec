import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_STOCK_SKILLS } from "../extensions/stock-skills.ts";

const seam = vi.hoisted(() => ({ throwOnCheck: false }));

vi.mock("../extensions/stock-skills.ts", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../extensions/stock-skills.ts")>();
	return {
		...actual,
		missingStockSkills: (root: string) => {
			if (seam.throwOnCheck) throw new Error("boom");
			return actual.missingStockSkills(root);
		},
	};
});

const { default: superspec } = await import("../extensions/superspec.ts");

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const MARKER = "stock OpenSpec skills";

function start(cwd: string, hasUI = true) {
	const handlers = new Map<string, (event: unknown, ctx?: unknown) => unknown>();
	superspec({
		on: (name: string, h: never) => handlers.set(name, h),
		registerCommand: () => {},
		getCommands: () => [{ name: "skill:brainstorming" }, { name: "skill:coding-standards" }],
	} as never);
	const calls: [string, string | undefined][] = [];
	const ctx = { cwd, hasUI, ui: { notify: (m: string, l?: string) => calls.push([m, l]) } };
	return Promise.resolve(handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, ctx)).then(() =>
		calls.filter(([m]) => m.includes(MARKER)),
	);
}

function markedWithSkills(): string {
	const root = mkdtempSync(join(tmpdir(), "pi-superspec-skills-"));
	cpSync(join(fixtures, "marked", "openspec"), join(root, "openspec"), { recursive: true });
	for (const id of REQUIRED_STOCK_SKILLS) {
		mkdirSync(join(root, ".agents", "skills", id), { recursive: true });
		writeFileSync(join(root, ".agents", "skills", id, "SKILL.md"), "x");
	}
	return root;
}

describe("session_start stock skills check", () => {
	beforeEach(() => {
		seam.throwOnCheck = false;
	});

	it("warns once, naming openspec-explore, when the marked fixture has no skills", async () => {
		const calls = await start(join(fixtures, "marked"));
		expect(calls).toHaveLength(1);
		expect(calls[0][0]).toContain("openspec-explore");
		expect(calls[0][1]).toBe("warning");
	});

	it("does not warn when all eight skills exist", async () => {
		expect(await start(markedWithSkills())).toHaveLength(0);
	});

	it("does not warn without a UI", async () => {
		expect(await start(join(fixtures, "marked"), false)).toHaveLength(0);
	});

	it("does not warn in an unmarked project", async () => {
		expect(await start(join(fixtures, "unmarked"))).toHaveLength(0);
	});

	it("keeps the session starting when the check throws", async () => {
		seam.throwOnCheck = true;
		await expect(start(join(fixtures, "marked"))).resolves.toEqual([]);
	});
});
