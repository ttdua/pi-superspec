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
