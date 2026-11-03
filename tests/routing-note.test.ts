import { describe, expect, it } from "vitest";
import {
	BOOTSTRAP_MARKER,
	createRoutingNoteMessage,
	insertRoutingNote,
	ROUTING_NOTE,
	ROUTING_NOTE_MARKER,
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

	it("does not mutate the input array", () => {
		const input = [user];
		insertRoutingNote(input, note);
		expect(input).toEqual([user]);
	});
});

describe("ROUTING_NOTE", () => {
	it("begins with its marker and mentions the key guidance", () => {
		expect(ROUTING_NOTE.startsWith(ROUTING_NOTE_MARKER)).toBe(true);
		expect(ROUTING_NOTE).toContain("/opsx-new");
		expect(ROUTING_NOTE).toContain("docs/superpowers/");
		expect(ROUTING_NOTE).toContain("TDD");
	});

	it("builds a user message with a text part", () => {
		const message = createRoutingNoteMessage();
		expect(message.role).toBe("user");
		expect(message.content).toEqual([{ type: "text", text: ROUTING_NOTE }]);
		expect(typeof message.timestamp).toBe("number");
	});
});
