import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { findProjectRoot, isActivated } from "./activation.ts";

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
}
