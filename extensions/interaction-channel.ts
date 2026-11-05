export type Channel = "inbox" | "plannotator-tool" | "plannotator-cli" | "ask-tool" | "plain";

export const CHANNEL_ORDER: readonly Channel[] = [
	"inbox",
	"plannotator-tool",
	"plannotator-cli",
	"ask-tool",
	"plain",
];

const hasTool = (activeTools: readonly string[], tool: string): boolean =>
	activeTools.some((name) => name === tool || name.endsWith(`__${tool}`));

export function availableChannels(activeTools: readonly string[], cliAvailable: boolean): Channel[] {
	const present: Record<Channel, boolean> = {
		inbox: hasTool(activeTools, "plannotator_inbox"),
		"plannotator-tool": hasTool(activeTools, "plannotator"),
		"plannotator-cli": cliAvailable,
		"ask-tool": hasTool(activeTools, "ask_user_question"),
		plain: true,
	};
	return CHANNEL_ORDER.filter((channel) => present[channel]);
}

export function detectChannel(activeTools: readonly string[], cliAvailable: boolean): Channel {
	return availableChannels(activeTools, cliAvailable)[0] as Channel;
}

const DISMISSED_NEXT = "On dismissed, ask the user on this channel how to proceed; do not continue until they answer.";

const QUESTIONS_PLAIN = "Questions: ask in plain text with numbered options, recommended first, then wait for the answer.";

const BLOCKS: Record<Channel, string> = {
	inbox: [
		"Gate: send one plannotator_inbox send_message in a thread named after the change (a topic thread before a change exists). It carries a summary of what was produced and why, every reviewed file in attachments in artifact order, and one :::question with the choices Approve, Approve with notes and Request changes plus a Stakes: line. Then end your turn.",
		"Outcomes: Approve alone is approved. Approve with notes or annotations, or Approve with notes, is approved_with_notes. Request changes is changes_requested. Skipped, set aside or closed is dismissed. Anything unclear: ask again in the thread; never treat it as approval.",
		DISMISSED_NEXT,
		"Questions: a :::question with short context and a Recommended: line, then end your turn.",
		"Code review: send the commit range, git diff --stat and the full diff against the feature branch from apply.md, written to a scratch .patch file and attached.",
	].join("\n"),
	"plannotator-tool": [
		"Gate: call the plannotator tool with the gate enabled on the target files, end your turn, and take the decision message as the result.",
		"Outcomes: approval without notes is approved; approval with notes or comments is approved_with_notes; annotations are changes_requested; closed is dismissed; ambiguous means ask the user.",
		DISMISSED_NEXT,
		QUESTIONS_PLAIN,
		"Code review: call the review action on the worktree with the base set to the feature branch from apply.md and the gate enabled. Ask the reviewer to confirm it shows the full branch diff; if it does not, use the fallback.",
	].join("\n"),
	"plannotator-cli": [
		"Gate: run in the background `plannotator annotate <file>... --gate --json --result-file <fresh path>`, every reviewed file as an explicit path in artifact order. The result file is a path that does not exist yet, in the session scratch directory or a new `mktemp -d` directory, outside the change dir. No --require-approval. Wait for exit, then read it.",
		"Outcomes: classify from the `decision` field and `feedback`, never from message text or the exit code: approved with no feedback is approved; approved with feedback is approved_with_notes; annotated is changes_requested; dismissed is dismissed; an unknown decision is dismissed, and so is a result file that is missing or unreadable after exit 0.",
		"Failure: exit code 2, or a non-zero exit with no result file, means the gate failed to open.",
		DISMISSED_NEXT,
		QUESTIONS_PLAIN,
		"Code review: run in the background `plannotator review --base <feature branch from apply.md> --diff-type merge-base --gate --json <worktree>`, stdout redirected to a fresh scratch file (no --result-file). Decide approve-or-not from `decision` only: annotated is changes_requested, dismissed or unknown is dismissed. When approved, a bare \"Code review completed — no changes requested.\" message is approved; reviewer notes beyond it are approved_with_notes; unclear: ask the user. The JSON has no `feedback`, so use `message` as the reviewer's notes to apply.",
	].join("\n"),
	"ask-tool": [
		"Gate: ask_user_question with the three options Approve, Approve with notes and Request changes; notes as free text. Approve is approved, Approve with notes is approved_with_notes, Request changes is changes_requested, no answer is dismissed.",
		DISMISSED_NEXT,
		"Questions: ask_user_question with the options, recommended first.",
		"Code review: show git diff --stat and the commit range against the feature branch from apply.md, say the diff must be read in the user's own tool, then ask the three options.",
	].join("\n"),
	plain: [
		"Gate and questions: numbered options, recommended first (for a gate: Approve, Approve with notes, Request changes), then wait for the answer.",
		"Code review: show git diff --stat and the commit range against the feature branch from apply.md, then ask the three options.",
	].join("\n"),
};

export function channelParagraph(available: readonly Channel[]): string {
	const selected = available[0] ?? "plain";
	const fallback = available[1];
	const parts = [`Interaction channel: ${selected}.`, BLOCKS[selected]];
	if (fallback && fallback !== "plain") parts.push(`Fallback (${fallback}):\n${BLOCKS[fallback]}`);
	const next = fallback ? (fallback === "plain" ? "plain text" : fallback) : "plain text";
	if (selected !== "plain") {
		parts.push(
			`If ${selected} fails to open, tell the user and use ${next} without retrying the failed channel; as a last resort ask in plain text with numbered options.`,
		);
	}
	return parts.join("\n");
}
