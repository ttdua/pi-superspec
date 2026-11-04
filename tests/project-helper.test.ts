import { describe, expect, it } from "vitest";
import { meetsOpenspecFloor } from "./helpers/project.js";

describe("meetsOpenspecFloor", () => {
	it.each(["1.16.0\n", "1.20.1", "2.0.0"])("accepts %s", (v) => {
		expect(meetsOpenspecFloor(v)).toBe(true);
	});
	it.each(["1.15.9", "1.4.1", "0.99.0", "garbage", ""])("rejects %s", (v) => {
		expect(meetsOpenspecFloor(v)).toBe(false);
	});
});
