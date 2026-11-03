import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { findProjectRoot, isActivated } from "./activation.ts";
import { readLanguage } from "./init/config.ts";
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
	};
}

export default function (pi: ExtensionAPI) {
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
		const messages = insertRoutingNote(event.messages, createRoutingNoteMessage(readLanguage(root)));
		return messages && { messages };
	});

	pi.on("session_start", (_event, ctx) => {
		const root = findProjectRoot(ctx.cwd);
		if (!root || !isActivated(root) || !ctx.hasUI) return;
		if (!hasSuperpowers(pi.getCommands())) ctx.ui.notify(SUPERPOWERS_MISSING_WARNING, "warning");
	});

	pi.registerCommand("opsx-init", {
		description: "Set up this repository for the Superspec workflow",
		handler: async (_args, ctx) => {
			const io = createInitIO(pi, ctx);
			await runInit(io, packageRoot);
		},
	});
}
