import { describe, expect, it } from "vitest";
import {
	BOOTSTRAP_MARKER,
	CODING_STANDARDS_MISSING_WARNING,
	createRoutingNoteMessage,
	hasCodingStandards,
	hasSuperpowers,
	insertRoutingNote,
	ROUTING_NOTE,
	ROUTING_NOTE_MARKER,
	routingNote,
	SUPERPOWERS_MISSING_WARNING,
} from "../extensions/routing-note.ts";

type Msg = { role: string; content: unknown };

const bootstrapParts: Msg = {
	role: "user",
	content: [{ type: "text", text: `<EXTREMELY_IMPORTANT>${BOOTSTRAP_MARKER}</EXTREMELY_IMPORTANT>` }],
};
const bootstrapString: Msg = { role: "user", content: `${BOOTSTRAP_MARKER} body` };
const summary: Msg = { role: "compactionSummary", content: "summary" };
const user: Msg = { role: "user", content: "hello" };
const note: Msg = { role: "user", content: [{ type: "text", text: ROUTING_NOTE }] };

describe("insertRoutingNote", () => {
	it("places the note directly after a parts-array bootstrap", () => {
		expect(insertRoutingNote([user, bootstrapParts, user], note)).toEqual([user, bootstrapParts, note, user]);
	});

	it("handles bootstrap with string content", () => {
		expect(insertRoutingNote([bootstrapString, user], note)).toEqual([bootstrapString, note, user]);
	});

	it("inserts after leading compaction summaries when no bootstrap", () => {
		expect(insertRoutingNote([summary, summary, user], note)).toEqual([summary, summary, note, user]);
	});

	it("orders summary, bootstrap, note, user", () => {
		expect(insertRoutingNote([summary, bootstrapParts, user], note)).toEqual([summary, bootstrapParts, note, user]);
	});

	it("returns [note] for an empty array", () => {
		expect(insertRoutingNote([], note)).toEqual([note]);
	});

	it("puts the note last when there are only summaries", () => {
		expect(insertRoutingNote([summary], note)).toEqual([summary, note]);
	});

	it("returns undefined when the marker is already present", () => {
		const existing: Msg = { role: "user", content: [{ type: "text", text: ROUTING_NOTE }] };
		expect(insertRoutingNote([existing, user], note)).toBeUndefined();
		expect(insertRoutingNote([{ role: "user", content: ROUTING_NOTE_MARKER }], note)).toBeUndefined();
	});

	it("still inserts when the marker is only quoted by non-user or mid-text", () => {
		const assistant: Msg = { role: "assistant", content: [{ type: "text", text: `see ${ROUTING_NOTE_MARKER}` }] };
		const toolResult: Msg = { role: "toolResult", content: [{ type: "text", text: ROUTING_NOTE }] };
		const midUser: Msg = { role: "user", content: `please explain the ${ROUTING_NOTE_MARKER} text` };
		expect(insertRoutingNote([assistant], note)).toEqual([note, assistant]);
		expect(insertRoutingNote([toolResult], note)).toEqual([note, toolResult]);
		expect(insertRoutingNote([midUser], note)).toEqual([note, midUser]);
	});

	it("treats a user message starting with the marker as the note", () => {
		expect(insertRoutingNote([{ role: "user", content: `${ROUTING_NOTE_MARKER}\nbody` }, user], note)).toBeUndefined();
		expect(insertRoutingNote([user, { role: "user", content: [{ type: "text", text: ROUTING_NOTE }] }], note)).toBeUndefined();
	});

	it("ignores bootstrap markers quoted by non-user messages", () => {
		const toolResult: Msg = { role: "toolResult", content: [{ type: "text", text: BOOTSTRAP_MARKER }] };
		const assistant: Msg = { role: "assistant", content: BOOTSTRAP_MARKER };
		expect(insertRoutingNote([summary, toolResult, assistant, user], note)).toEqual([summary, note, toolResult, assistant, user]);
	});

	it("places the note after the first user bootstrap message", () => {
		expect(insertRoutingNote([bootstrapParts, user, bootstrapString], note)).toEqual([bootstrapParts, note, user, bootstrapString]);
	});

	it("is stable regardless of handler order", () => {
		const first = insertRoutingNote([user], note);
		expect(first).toEqual([note, user]);
		const withBootstrap = [bootstrapParts, ...(first as Msg[])];
		expect(withBootstrap).toEqual([bootstrapParts, note, user]);
		expect(insertRoutingNote(withBootstrap, note)).toBeUndefined();
		expect(insertRoutingNote([bootstrapParts, user], note)).toEqual([bootstrapParts, note, user]);
	});

	it("does not mutate the input array", () => {
		const input = [user];
		insertRoutingNote(input, note);
		expect(input).toEqual([user]);
	});
});

describe("ROUTING_NOTE", () => {
	it("confirms specified behaviour before the fix path", () => {
		const line = ROUTING_NOTE.split("\n").find((l) => l.startsWith("- No spec change"));
		expect(line).toContain("confirm the behaviour in the living specs under openspec/specs/");
		expect(line).toContain("behaviour not specified there makes it a spec change");
	});

	it("begins with its marker and mentions the key guidance", () => {
		expect(ROUTING_NOTE.startsWith(ROUTING_NOTE_MARKER)).toBe(true);
		expect(ROUTING_NOTE).toContain("/opsx-ff");
		expect(ROUTING_NOTE).toContain("/opsx-new");
		expect(ROUTING_NOTE).toContain("docs/superpowers/");
		expect(ROUTING_NOTE).toContain("TDD");
		expect(ROUTING_NOTE).toContain("answer directly");
	});

	it("states path and reason", () => {
		expect(ROUTING_NOTE).toContain("state the path you chose and a one-line reason");
	});

	it("does not force a change", () => {
		expect(ROUTING_NOTE).not.toContain("MUST first be proposed");
		const lines = ROUTING_NOTE.split("\n").filter((l) => l.includes("/opsx-new"));
		expect(lines.length).toBeGreaterThan(0);
		for (const l of lines) expect(l).toContain("review");
	});

	it("builds a user message with a text part", () => {
		const message = createRoutingNoteMessage("en");
		expect(message.role).toBe("user");
		expect(message.content).toEqual([{ type: "text", text: routingNote("en") }]);
		expect(typeof message.timestamp).toBe("number");
	});
});

describe("hasSuperpowers", () => {
	it("is true when skill:brainstorming is registered", () => {
		expect(hasSuperpowers([{ name: "skill:brainstorming" }])).toBe(true);
	});

	it("is false without it", () => {
		expect(hasSuperpowers([])).toBe(false);
		expect(hasSuperpowers([{ name: "opsx-init" }])).toBe(false);
	});
});

describe("SUPERPOWERS_MISSING_WARNING", () => {
	it("mentions Superpowers and the install command", () => {
		expect(SUPERPOWERS_MISSING_WARNING).toContain("Superpowers");
		expect(SUPERPOWERS_MISSING_WARNING).toContain("pi install git:github.com/obra/superpowers");
	});
});

describe("routingNote", () => {
	it("requires a language", () => {
		const never = () => {
			// @ts-expect-error the language is required
			routingNote();
			// @ts-expect-error the language is required
			createRoutingNoteMessage();
		};
		expect(never).toBeTypeOf("function");
	});

	it("appends the document language paragraph", () => {
		const text = routingNote("vi");
		expect(text.startsWith(ROUTING_NOTE_MARKER)).toBe(true);
		expect(text.startsWith(ROUTING_NOTE)).toBe(true);
		for (const part of ['"vi"', "WHEN", "SHALL", "openspec/config.yaml", "language:"]) {
			expect(text).toContain(part);
		}
	});

	it("puts the language paragraph before the channel paragraph", () => {
		const text = routingNote("vi", "Interaction channel: plain.");
		expect(text).toContain('in "vi"');
		expect(text.endsWith("Interaction channel: plain.")).toBe(true);
		expect(text.indexOf('in "vi"')).toBeLessThan(text.indexOf("Interaction channel"));
		expect(routingNote("vi").endsWith("openspec/config.yaml.")).toBe(true);
	});

	it("quotes the language as JSON", () => {
		expect(routingNote("zh: simplified")).toContain('"zh: simplified"');
	});

	it("builds a message carrying the language", () => {
		expect(createRoutingNoteMessage("vi").content).toEqual([{ type: "text", text: routingNote("vi") }]);
	});

	it("is recognised as already present when created with a language", () => {
		const existing = createRoutingNoteMessage("vi");
		expect(insertRoutingNote([existing, user], createRoutingNoteMessage("vi"))).toBeUndefined();
	});

	it("still inserts when an assistant message only quotes the marker", () => {
		const assistant: Msg = { role: "assistant", content: [{ type: "text", text: routingNote("vi") }] };
		const withLang = createRoutingNoteMessage("vi");
		expect(insertRoutingNote([assistant], withLang)).toEqual([withLang, assistant]);
	});
});

describe("hasCodingStandards", () => {
	it("is true when the coding-standards skill command exists", () => {
		expect(hasCodingStandards([{ name: "skill:coding-standards" }])).toBe(true);
	});

	it("is false otherwise", () => {
		expect(hasCodingStandards([])).toBe(false);
		expect(hasCodingStandards([{ name: "skill:brainstorming" }])).toBe(false);
		expect(hasCodingStandards([{ name: "coding-standards" }])).toBe(false);
	});
});

describe("CODING_STANDARDS_MISSING_WARNING", () => {
	it("names the skill and the fallback", () => {
		expect(CODING_STANDARDS_MISSING_WARNING).toContain("coding-standards");
		expect(CODING_STANDARDS_MISSING_WARNING).toContain("project conventions");
	});

	it("does not tell the user to install a package or mention Superpowers", () => {
		expect(CODING_STANDARDS_MISSING_WARNING).not.toContain("pi install");
		expect(CODING_STANDARDS_MISSING_WARNING).not.toContain("Superpowers");
	});
});
