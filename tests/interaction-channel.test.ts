import { describe, expect, it } from "vitest";
import { type Channel, availableChannels, channelParagraph, detectChannel } from "../extensions/interaction-channel.ts";

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

const TOOL_NAMES: Partial<Record<Channel, string>> = {
	inbox: "plannotator_inbox",
	"plannotator-tool": "plannotator",
	"ask-tool": "ask_user_question",
};

const namesFor = (channels: readonly Channel[]): string[] =>
	channels.flatMap((channel) => (TOOL_NAMES[channel] ? [TOOL_NAMES[channel] as string] : []));

describe("channelParagraph", () => {
	const cli = channelParagraph(["plannotator-cli", "plain"]);
	const inbox = channelParagraph(["inbox", "plain"]);

	it("starts with the selected channel", () => {
		expect(inbox.startsWith("Interaction channel: inbox.")).toBe(true);
	});

	it("cli gate and classification", () => {
		for (const text of [
			"--gate --json",
			"--result-file",
			"mktemp -d",
			"change dir",
			"decision",
			"feedback",
			"annotated",
			"changes_requested",
			"approved_with_notes",
			"unknown",
			"dismissed",
		]) {
			expect(cli).toContain(text);
		}
	});

	it("cli failure", () => {
		expect(cli).toContain("code 2");
		expect(cli).toContain("missing or unreadable");
		expect(cli).toContain("an unknown decision is dismissed");
	});

	it("cli code review", () => {
		expect(cli).toContain("plannotator review --base");
		expect(cli).toContain("--diff-type merge-base");
		expect(cli).toContain("stdout");
		expect(cli).toContain("Decide approve-or-not from `decision` only");
		expect(cli).toContain("use `message` as the reviewer's notes to apply");
	});

	it("fallback is next available", () => {
		const text = channelParagraph(["plannotator-tool", "ask-tool", "plain"]);
		expect(text).toContain("ask_user_question");
		expect(text).toContain("If plannotator-tool fails to open, tell the user and use ask-tool");
		expect(text).not.toContain("--result-file");
		expect(text).not.toContain("plannotator_inbox");
	});

	it("omits unavailable", () => {
		expect(inbox).toContain("plannotator_inbox");
		expect(inbox).toContain("attachments");
		expect(inbox).toContain("If inbox fails to open, tell the user and use plain text");
		expect(inbox).toContain("as a last resort ask in plain text with numbered options");
		expect(inbox).not.toContain("--result-file");
		expect(inbox).not.toContain("ask_user_question");
	});

	it("other mechanics absent", () => {
		const text = channelParagraph(["ask-tool", "plain"]);
		expect(text).toContain("three options");
		expect(text).toContain("git diff --stat");
		expect(text).not.toContain("--result-file");
		expect(text).not.toContain("plannotator_inbox");
	});

	it("inbox gate content", () => {
		for (const text of [
			"thread",
			"change",
			"attachments",
			"artifact order",
			":::question",
			"Approve",
			"Approve with notes",
			"Request changes",
			"Stakes:",
			"end your turn",
		]) {
			expect(inbox).toContain(text);
		}
	});

	it("inbox outcome mapping", () => {
		expect(inbox).toMatch(/annotations[^.]*approved_with_notes/);
		expect(inbox).toMatch(/set aside[^.]*dismissed/);
		expect(inbox).toMatch(/unclear[^.]*ask again/);
		expect(inbox).toMatch(/never[^.]*approval/);
		expect(inbox).toContain("ask the user on this channel how to proceed");
	});

	it("inbox questions", () => {
		expect(inbox).toContain("Recommended:");
	});

	it("inbox code review", () => {
		expect(inbox).toContain(".patch");
		expect(inbox).toContain("git diff --stat");
		expect(inbox).toContain("commit range");
	});

	it("tool gate and mapping", () => {
		const text = channelParagraph(["plannotator-tool", "plain"]);
		expect(text).toContain("gate");
		expect(text).toContain("end your turn");
		expect(text).toMatch(/comments[^.]*approved_with_notes/);
		expect(text).toMatch(/closed[^.]*dismissed/);
		expect(text).toContain("full branch diff");
		expect(text).toContain("if it does not, use the fallback");
	});

	it("plain questions", () => {
		const text = channelParagraph(["plain"]);
		expect(text).toContain("numbered options");
		expect(text).toContain("recommended first");
		expect(text).toContain("wait");
	});

	it("size cap", () => {
		const four: Channel[] = ["inbox", "plannotator-tool", "plannotator-cli", "ask-tool"];
		let max = 0;
		for (let mask = 0; mask < 16; mask++) {
			const subset = four.filter((_, i) => mask & (1 << i));
			const available = availableChannels(namesFor(subset), subset.includes("plannotator-cli"));
			const size = Buffer.byteLength(channelParagraph(available));
			max = Math.max(max, size);
			expect(size).toBeLessThanOrEqual(4096);
		}
		expect(max).toBeGreaterThan(0);
	});
});
