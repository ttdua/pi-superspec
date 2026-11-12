export const BOOTSTRAP_MARKER = "superpowers:using-superpowers bootstrap for pi";
export const ROUTING_NOTE_MARKER = "pi-superspec routing note";

export const ROUTING_NOTE = `${ROUTING_NOTE_MARKER}

This project uses OpenSpec with the superspec schema. Choose the path that fits the work:

- No spec change (a small mistake, a typo, a fix restoring specified behaviour, a refactor): work directly with TDD and no change directory. Before treating work as a fix, confirm the behaviour in the living specs under openspec/specs/; behaviour not specified there makes it a spec change.
- Spec change with clear requirements: use /opsx-ff.
- Spec change that needs careful step-by-step review: use /opsx-new, then /opsx-continue.
- Questions, research and reviews: answer directly, without proposing a change.

Before starting, state the path you chose and a one-line reason.

Do NOT write design docs or plans to docs/superpowers/; they live in the change directory instead.`;

export const STOCK_SKILLS_PARAGRAPH = `Stock skills: each /opsx-<cmd> command runs a stock OpenSpec skill from .agents/skills/: /opsx-explore → openspec-explore, /opsx-new → openspec-new-change, /opsx-continue → openspec-continue-change, /opsx-ff → openspec-ff-change, /opsx-apply → openspec-apply-change, /opsx-verify → openspec-verify-change, /opsx-sync → openspec-sync-specs, /opsx-archive → openspec-archive-change. Where openspec/schemas/superspec/workflow.md differs from a stock skill, workflow.md overrides it. openspec-propose, openspec-update-change, openspec-bulk-archive-change and openspec-onboard are not part of this workflow; suggest the matching /opsx-* path instead.`;

/** The routing note, with the stock skills and document language paragraphs. */
export function routingNote(language: string, channelText = "", subagentText = ""): string {
	const base = `${ROUTING_NOTE}

${STOCK_SKILLS_PARAGRAPH}

Document language: write the prose of OpenSpec documents (change artifacts and main specs) in ${JSON.stringify(language)}. Keep headings, requirement and scenario names, WHEN/THEN/SHALL/MUST, checkbox syntax, delta operation headers, and file and capability names in English. Code, code comments and commit messages are not affected. If the user asks to change the document language, update \`language:\` in openspec/config.yaml.`;
	return [base, channelText, subagentText].filter((part) => part !== "").join("\n\n");
}

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

export function createRoutingNoteMessage(
	language: string,
	channelText = "",
	subagentText = "",
): {
	role: "user";
	content: { type: "text"; text: string }[];
	timestamp: number;
} {
	return { role: "user", content: [{ type: "text", text: routingNote(language, channelText, subagentText) }], timestamp: Date.now() };
}

/** True when the Superpowers plugin is installed (it registers a `skill:brainstorming` command). */
export function hasSuperpowers(commands: { name: string }[]): boolean {
	return commands.some((command) => command.name === "skill:brainstorming");
}

export const SUPERPOWERS_MISSING_WARNING =
	"pi-superspec needs Superpowers, which is not installed. Install it with: pi install git:github.com/obra/superpowers";

/** True when a coding standard skill is installed (it registers a `skill:coding-standards` command). */
export function hasCodingStandards(commands: { name: string }[]): boolean {
	return commands.some((command) => command.name === "skill:coding-standards");
}

export const CODING_STANDARDS_MISSING_WARNING =
	"pi-superspec agents use a coding-standards skill, which was not found. Without it the implementer and reviewers fall back to project conventions (AGENTS.md, contributing guide). Add your own under ~/.agents/skills/coding-standards/ or .agents/skills/coding-standards/.";
