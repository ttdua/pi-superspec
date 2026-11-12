import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureStockSkills, profileReadiness } from "../../extensions/init/stock-skills.ts";
import { REQUIRED_STOCK_SKILLS, REQUIRED_WORKFLOWS } from "../../extensions/stock-skills.ts";
import { fakeIO } from "../helpers/io.ts";

describe("profileReadiness", () => {
	it("is ready for a custom profile with the eight workflows plus extras", () => {
		const json = JSON.stringify({ profile: "custom", workflows: [...REQUIRED_WORKFLOWS, "propose"] });
		expect(profileReadiness(json)).toEqual({ ready: true });
	});

	it("names the missing workflows under the core profile with null workflows", () => {
		const r = profileReadiness('{"profile":"core","workflows":null}');
		expect(r.ready).toBe(false);
		if (!r.ready) expect(r.missing).toEqual(expect.arrayContaining(["new", "continue", "ff", "verify"]));
	});

	it("names the other six when only two are selected", () => {
		const r = profileReadiness('{"profile":"custom","workflows":["explore","apply"]}');
		expect(r).toEqual({ ready: false, missing: ["new", "continue", "ff", "verify", "sync", "archive"] });
	});

	it("is not ready for a core profile that lists every workflow", () => {
		const json = JSON.stringify({ profile: "core", workflows: REQUIRED_WORKFLOWS });
		expect(profileReadiness(json).ready).toBe(false);
	});

	it.each(["garbage", "null", "[]", ""])("is unreadable for %j", (json) => {
		expect(profileReadiness(json)).toEqual({ ready: false, missing: [...REQUIRED_WORKFLOWS], reason: "unreadable" });
	});
});

describe("ensureStockSkills", () => {
	const dirs: string[] = [];
	afterEach(() => {
		for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
	});
	const project = (withSkills: boolean): string => {
		const root = mkdtempSync(join(tmpdir(), "pi-superspec-skills-"));
		dirs.push(root);
		if (withSkills) {
			for (const id of REQUIRED_STOCK_SKILLS) {
				mkdirSync(join(root, ".agents", "skills", id), { recursive: true });
				writeFileSync(join(root, ".agents", "skills", id, "SKILL.md"), "x");
			}
		}
		return root;
	};

	it("returns present without running anything when all skills exist", async () => {
		let calls = 0;
		const io = fakeIO({
			async exec() {
				calls += 1;
				return { code: 0, stdout: "", stderr: "" };
			},
		});
		expect(await ensureStockSkills(io, project(true))).toBe("present");
		expect(calls).toBe(0);
	});

	it("returns install when skills are missing and the profile is ready", async () => {
		const io = fakeIO({
			exec: async () => ({
				code: 0,
				stdout: JSON.stringify({ profile: "custom", workflows: REQUIRED_WORKFLOWS }),
				stderr: "",
			}),
		});
		expect(await ensureStockSkills(io, project(false))).toBe("install");
	});

	it("stops with both steps when the profile is not ready", async () => {
		const io = fakeIO({ exec: async () => ({ code: 0, stdout: '{"profile":"core"}', stderr: "" }) });
		const r = await ensureStockSkills(io, project(false));
		expect(r).toEqual({ stop: expect.stringContaining("openspec config profile") });
		expect((r as { stop: string }).stop).toContain("/opsx-init");
		expect((r as { stop: string }).stop).toContain("continue");
	});

	it("stops as unreadable when the command throws", async () => {
		const io = fakeIO({
			exec: async () => {
				throw new Error("ENOENT");
			},
		});
		const r = await ensureStockSkills(io, project(false));
		expect((r as { stop: string }).stop).toContain("unreadable");
	});
});
