import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { findProjectRoot, isActivated } from "./activation.ts";
import { runInit } from "./init/init.ts";
import type { InitIO } from "./init/io.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export default function (pi: ExtensionAPI) {
	pi.on("resources_discover", (event) => {
		const root = findProjectRoot(event.cwd);
		if (!root || !isActivated(root)) return {};
		return {
			skillPaths: [join(packageRoot, "skills")],
			promptPaths: [join(packageRoot, "prompts")],
		};
	});

	pi.registerCommand("opsx-init", {
		description: "Set up this repository for the Superspec workflow",
		handler: async (_args, ctx) => {
			const io: InitIO = {
				cwd: ctx.cwd,
				hasUI: ctx.hasUI,
				exec: async (command, args, cwd) => {
					const result = await pi.exec(command, args, { cwd: cwd ?? ctx.cwd });
					return { code: result.code, stdout: result.stdout, stderr: result.stderr };
				},
				confirm: (title, message) => ctx.ui.confirm(title, message),
				notify: (message, level) => ctx.ui.notify(message, level),
				reload: () => ctx.reload(),
				superpowersAvailable: () =>
					pi.getCommands().some((c) => c.name === "skill:brainstorming"),
			};
			await runInit(io, packageRoot);
		},
	});
}
