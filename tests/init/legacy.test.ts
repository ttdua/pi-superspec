import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanLegacy, findLegacy } from "../../extensions/init/legacy.ts";
import { fakeIO } from "../helpers/io.ts";

const dirs: string[] = [];
function tmp(): string {
	const d = mkdtempSync(join(tmpdir(), "pi-superspec-legacy-"));
	dirs.push(d);
	return d;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function put(root: string, rel: string): void {
	const p = join(root, rel);
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, "x");
}

function legacyProject(): string {
	const root = tmp();
	put(root, ".pi/prompts/opsx-new.md");
	put(root, ".pi/prompts/custom.md");
	put(root, ".pi/prompts/opsx-new.txt");
	put(root, ".pi/skills/openspec-explore/SKILL.md");
	put(root, ".pi/skills/other/SKILL.md");
	return root;
}

const MATCHES = [".pi/prompts/opsx-new.md", ".pi/skills/openspec-explore"];

describe("findLegacy", () => {
	it("returns [] with no .pi", () => {
		expect(findLegacy(tmp())).toEqual([]);
	});
	it("matches only legacy patterns", () => {
		expect(findLegacy(legacyProject())).toEqual(MATCHES);
	});
});

describe("cleanLegacy", () => {
	it("deletes exactly the matches on confirm", async () => {
		const root = legacyProject();
		const asked: string[] = [];
		const io = fakeIO({
			async confirm(_t, m) {
				asked.push(m);
				return true;
			},
		});
		const r = await cleanLegacy(io, root);
		expect(r).toEqual({ found: MATCHES, deleted: MATCHES });
		for (const m of MATCHES) expect(asked[0]).toContain(m);
		expect(existsSync(join(root, ".pi/prompts/opsx-new.md"))).toBe(false);
		expect(existsSync(join(root, ".pi/skills/openspec-explore"))).toBe(false);
		expect(existsSync(join(root, ".pi/prompts/custom.md"))).toBe(true);
		expect(existsSync(join(root, ".pi/prompts/opsx-new.txt"))).toBe(true);
		expect(existsSync(join(root, ".pi/skills/other/SKILL.md"))).toBe(true);
	});
	it("deletes nothing when declined", async () => {
		const root = legacyProject();
		const r = await cleanLegacy(fakeIO({ confirm: async () => false }), root);
		expect(r).toEqual({ found: MATCHES, deleted: [] });
		expect(existsSync(join(root, ".pi/prompts/opsx-new.md"))).toBe(true);
		expect(existsSync(join(root, ".pi/skills/openspec-explore"))).toBe(true);
	});
	it("without UI deletes nothing, skips confirm and notifies paths", async () => {
		const root = legacyProject();
		let called = false;
		const io = fakeIO({
			hasUI: false,
			async confirm() {
				called = true;
				return true;
			},
		});
		const r = await cleanLegacy(io, root);
		expect(called).toBe(false);
		expect(r).toEqual({ found: MATCHES, deleted: [] });
		for (const m of MATCHES) expect(io.notes.join("\n")).toContain(m);
		expect(existsSync(join(root, ".pi/prompts/opsx-new.md"))).toBe(true);
	});
	it("does nothing when no matches", async () => {
		let called = false;
		const io = fakeIO({
			async confirm() {
				called = true;
				return true;
			},
		});
		const r = await cleanLegacy(io, tmp());
		expect(r).toEqual({ found: [], deleted: [] });
		expect(called).toBe(false);
		expect(io.notes).toEqual([]);
	});
});
