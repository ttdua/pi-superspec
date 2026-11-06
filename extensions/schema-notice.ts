import { join } from "node:path";
import { classifySchema, markerVersion } from "./init/schema-install.ts";

const FORCE_TAIL = "Run /opsx-init --force to replace it (a backup is kept).";

/** `v<n>` for a marker version; a readable fallback instead of `vundefined`. */
export function versionLabel(version: number | undefined): string {
	return version === undefined ? "an unknown version" : `v${version}`;
}

/** Session-start notice text when the project schema is outdated or edited; read-only. */
export function schemaNotice(root: string, packageRoot: string): string | undefined {
	const bundled = join(packageRoot, "schema", "superspec");
	const project = join(root, "openspec", "schemas", "superspec");
	const state = classifySchema(project, bundled);
	if (state !== "upgradable" && state !== "older" && state !== "edited") return undefined;
	const m = versionLabel(markerVersion(bundled));
	if (state === "edited") return `Schema superspec differs from the bundled ${m} (local edits). ${FORCE_TAIL}`;
	const n = versionLabel(markerVersion(project));
	if (state === "older") {
		return `Schema superspec ${n} is older than the bundled ${m} and has local edits. ${FORCE_TAIL}`;
	}
	return `Schema superspec ${n} is older than the bundled ${m}. Run /opsx-init to upgrade.`;
}
