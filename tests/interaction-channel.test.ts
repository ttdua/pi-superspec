import { describe, expect, it } from "vitest";
import { availableChannels, detectChannel } from "../extensions/interaction-channel.ts";

describe("detectChannel", () => {
	it("inbox preferred", () => {
		expect(detectChannel(["plannotator_inbox", "plannotator", "ask_user_question"], true)).toBe("inbox");
	});

	it("plannotator tool without inbox", () => {
		expect(detectChannel(["plannotator", "ask_user_question"], true)).toBe("plannotator-tool");
	});

	it("cli only", () => {
		expect(detectChannel(["read"], true)).toBe("plannotator-cli");
	});

	it("ask tool only", () => {
		expect(detectChannel(["ask_user_question"], false)).toBe("ask-tool");
	});

	it("nothing available", () => {
		expect(detectChannel([], false)).toBe("plain");
	});

	it("inactive tools do not count", () => {
		expect(detectChannel(["read", "bash"], false)).toBe("plain");
	});

	it("prefixed inbox", () => {
		expect(detectChannel(["mcp__plannotator__plannotator_inbox"], false)).toBe("inbox");
	});

	it("prefixed plannotator is not inbox", () => {
		expect(detectChannel(["mcp__plannotator__plannotator"], false)).toBe("plannotator-tool");
	});

	it("look-alike name", () => {
		expect(detectChannel(["plannotator_inbox_legacy"], false)).toBe("plain");
	});

	it("available list", () => {
		expect(availableChannels(["plannotator", "ask_user_question"], false)).toEqual([
			"plannotator-tool",
			"ask-tool",
			"plain",
		]);
	});
});
