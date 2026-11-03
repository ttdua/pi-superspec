import { describe, expect, it } from "vitest";
import {
	checkOpenspec,
	collectWarnings,
	INSTALL_LINE,
	parseOpenspecVersion,
} from "../../extensions/init/preflight.ts";
import { fakeIO } from "../helpers/io.ts";

const execOut = (code: number, stdout: string) => async () => ({ code, stdout, stderr: "" });

describe("parseOpenspecVersion", () => {
	it("parses major and minor", () => {
		expect(parseOpenspecVersion("1.4.1\n")).toEqual({ major: 1, minor: 4 });
	});
	it("returns undefined for garbage", () => {
		expect(parseOpenspecVersion("nope")).toBeUndefined();
	});
});

describe("checkOpenspec", () => {
	it("accepts 1.4.1 and 2.0.0", async () => {
		expect(await checkOpenspec(fakeIO({ exec: execOut(0, "1.4.1\n") }))).toEqual({ ok: true });
		expect(await checkOpenspec(fakeIO({ exec: execOut(0, "2.0.0\n") }))).toEqual({ ok: true });
	});
	it("rejects 1.3.9 with the install line", async () => {
		const r = await checkOpenspec(fakeIO({ exec: execOut(0, "1.3.9\n") }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain(INSTALL_LINE);
	});
	it("rejects unparsable output", async () => {
		const r = await checkOpenspec(fakeIO({ exec: execOut(0, "garbage") }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain(INSTALL_LINE);
	});
	it("rejects when exec returns 127", async () => {
		const r = await checkOpenspec(fakeIO({ exec: execOut(127, "") }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toContain(INSTALL_LINE);
	});
	it("rejects when exec throws", async () => {
		const r = await checkOpenspec(
			fakeIO({
				exec: async () => {
					throw new Error("ENOENT");
				},
			}),
		);
		expect(r.ok).toBe(false);
	});
});

describe("collectWarnings", () => {
	it("warns about git when not in a work tree", async () => {
		const calls: string[][] = [];
		const io = fakeIO({
			exec: async (_c, args) => {
				calls.push(args);
				return { code: 128, stdout: "", stderr: "" };
			},
		});
		const w = await collectWarnings(io);
		expect(w).toHaveLength(1);
		expect(w[0]).toContain("git");
		expect(calls[0]).toEqual(["rev-parse", "--is-inside-work-tree"]);
	});
	it("warns about Superpowers when unavailable", async () => {
		const w = await collectWarnings(fakeIO({ superpowersAvailable: () => false }));
		expect(w).toHaveLength(1);
		expect(w[0]).toContain("Superpowers");
	});
	it("returns nothing when all fine", async () => {
		expect(await collectWarnings(fakeIO())).toEqual([]);
	});
});
