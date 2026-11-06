import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { findProjectRoot, isActivated } from "./activation.ts";
import { availableChannels, channelParagraph } from "./interaction-channel.ts";
import { resolveLanguage } from "./init/config.ts";
import { runInit } from "./init/init.ts";
import type { InitIO } from "./init/io.ts";
import {
	createRoutingNoteMessage,
	hasSuperpowers,
	insertRoutingNote,
	SUPERPOWERS_MISSING_WARNING,
} from "./routing-note.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function createInitIO(pi: ExtensionAPI, ctx: ExtensionCommandContext): InitIO {
	return {
		cwd: ctx.cwd,
		hasUI: ctx.hasUI,
		exec: async (command, args, cwd) => {
			const result = await pi.exec(command, args, { cwd: cwd ?? ctx.cwd });
			return { code: result.code, stdout: result.stdout, stderr: result.stderr };
		},
		confirm: (title, message) => ctx.ui.confirm(title, message),
		prompt: (title, placeholder) => ctx.ui.input(title, placeholder),
		notify: (message, level) => ctx.ui.notify(message, level),
		// A session message (not notify) so it survives the chat rebuild on reload;
		// without triggerTurn it is appended to the session and starts no agent turn.
		report: (message) =>
			pi.sendMessage({ customType: "superspec-init", content: message, display: true }),
		reload: () => ctx.reload(),
		superpowersAvailable: () => hasSuperpowers(pi.getCommands()),
		backupRoot: join(homedir(), ".pi", "superspec-backups"),
	};
}

export default function (pi: ExtensionAPI) {
	// CLI probe state: reset on every activated session_start; a stale probe never overwrites a newer one.
	let cliAvailable = false;
	let probeGeneration = 0;

	pi.on("resources_discover", (event) => {
		const root = findProjectRoot(event.cwd);
		if (!root || !isActivated(root)) return {};
		return {
			skillPaths: [join(packageRoot, "skills")],
			promptPaths: [join(packageRoot, "prompts")],
		};
	});

	pi.on("context", (event, ctx) => {
		const root = findProjectRoot(ctx.cwd);
		if (!root || !isActivated(root)) return undefined;
		const tools = typeof pi.getActiveTools === "function" ? pi.getActiveTools() : [];
		const channelText = channelParagraph(availableChannels(tools, cliAvailable));
		const messages = insertRoutingNote(
			event.messages,
			createRoutingNoteMessage(resolveLanguage(root), channelText),
		);
		return messages && { messages };
	});

	pi.on("session_start", async (_event, ctx) => {
		const root = findProjectRoot(ctx.cwd);
		if (!root || !isActivated(root)) return;
		if (ctx.hasUI && !hasSuperpowers(pi.getCommands())) {
			ctx.ui.notify(SUPERPOWERS_MISSING_WARNING, "warning");
		}
		cliAvailable = false;
		const generation = ++probeGeneration;
		if (typeof pi.exec !== "function") return;
		try {
			const result = await pi.exec("sh", ["-c", "command -v plannotator"], { timeout: 5000 });
			if (generation === probeGeneration) cliAvailable = result.code === 0;
		} catch {
			// A failed probe (no sh, timeout) counts as unavailable.
		}
	});

	pi.registerCommand("opsx-init", {
		description: "Set up this repository for the Superspec workflow",
		handler: async (args, ctx) => {
			const io = createInitIO(pi, ctx);
			await runInit(io, packageRoot, args);
		},
	});
}
