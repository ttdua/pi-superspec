export const BOOTSTRAP_MARKER = "superpowers:using-superpowers bootstrap for pi";
export const ROUTING_NOTE_MARKER = "pi-superspec routing note";

export const ROUTING_NOTE = `${ROUTING_NOTE_MARKER}

This project uses OpenSpec with the superspec schema. Route work as follows:

- Work that adds or changes behaviour MUST first be proposed as a change with /opsx-new, before brainstorming.
- Small work that changes no spec (a bug fix restoring specified behaviour, a typo, a refactor) is done directly with TDD and no change directory.
- Do NOT write design docs or plans to docs/superpowers/; they live in the change directory instead.`;

function role(message: unknown): unknown {
	return (message as { role?: unknown } | null | undefined)?.role;
}

/** Text values of a message: its string content, or each text part. */
function texts(message: unknown): string[] {
	const content = (message as { content?: unknown } | null | undefined)?.content;
	if (typeof content === "string") return [content];
	if (!Array.isArray(content)) return [];
	const out: string[] = [];
	for (const part of content) {
		if (
			part &&
			typeof part === "object" &&
			(part as { type?: unknown }).type === "text" &&
			typeof (part as { text?: unknown }).text === "string"
		) {
			out.push((part as { text: string }).text);
		}
	}
	return out;
}

function isRoutingNote(message: unknown): boolean {
	return role(message) === "user" && texts(message).some((t) => t === ROUTING_NOTE || t.startsWith(ROUTING_NOTE_MARKER));
}

function isBootstrap(message: unknown): boolean {
	return role(message) === "user" && texts(message).some((t) => t.includes(BOOTSTRAP_MARKER));
}

function insertionIndex(messages: unknown[]): number {
	const bootstrap = messages.findIndex(isBootstrap);
	if (bootstrap >= 0) return bootstrap + 1;
	let index = 0;
	while (role(messages[index]) === "compactionSummary") index++;
	return index;
}

/** Returns a new array with `note` inserted, or `undefined` when the note is already present. */
export function insertRoutingNote<T>(messages: T[], note: T): T[] | undefined {
	if (messages.some(isRoutingNote)) return undefined;
	const index = insertionIndex(messages);
	return [...messages.slice(0, index), note, ...messages.slice(index)];
}

export function createRoutingNoteMessage(): {
	role: "user";
	content: { type: "text"; text: string }[];
	timestamp: number;
} {
	return { role: "user", content: [{ type: "text", text: ROUTING_NOTE }], timestamp: Date.now() };
}

/** True when the Superpowers plugin is installed (it registers a `skill:brainstorming` command). */
export function hasSuperpowers(commands: { name: string }[]): boolean {
	return commands.some((command) => command.name === "skill:brainstorming");
}

export const SUPERPOWERS_MISSING_WARNING =
	"pi-superspec needs Superpowers, which is not installed. Install it with: pi install git:github.com/obra/superpowers";
