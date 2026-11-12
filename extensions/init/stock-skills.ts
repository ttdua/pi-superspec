import { REQUIRED_WORKFLOWS, missingStockSkills } from "../stock-skills.ts";
import type { InitIO } from "./io.ts";

export type ProfileReadiness = { ready: true } | { ready: false; missing: string[]; reason?: string };

/** Ready iff `openspec config list --json` reports profile `custom` selecting every required workflow. */
export function profileReadiness(json: string): ProfileReadiness {
	const unreadable: ProfileReadiness = { ready: false, missing: [...REQUIRED_WORKFLOWS], reason: "unreadable" };
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return unreadable;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return unreadable;
	const { profile, workflows } = parsed as { profile?: unknown; workflows?: unknown };
	const selected = Array.isArray(workflows) ? workflows : [];
	const missing = REQUIRED_WORKFLOWS.filter((id) => !selected.includes(id));
	if (profile === "custom" && missing.length === 0) return { ready: true };
	return { ready: false, missing };
}

function stopMessage(readiness: Extract<ProfileReadiness, { ready: false }>): string {
	const what =
		readiness.reason === "unreadable"
			? "The OpenSpec profile is unreadable (`openspec config list --json` failed or printed invalid JSON)."
			: `The OpenSpec profile does not select these required workflows: ${readiness.missing.join(", ")}.`;
	return [
		`${what} pi-superspec needs the stock OpenSpec skills for all eight workflows.`,
		"1. Run `openspec config profile` and select explore, new, continue, ff, apply, verify, sync and archive.",
		"2. Run /opsx-init again.",
		"Nothing was changed.",
	].join("\n");
}

/**
 * Check the stock skills on disk first; read the OpenSpec profile only when some are missing.
 * Never runs `openspec config set|profile|reset`.
 */
export async function ensureStockSkills(io: InitIO, root: string): Promise<"present" | "install" | { stop: string }> {
	if (missingStockSkills(root).length === 0) return "present";
	let stdout = "";
	try {
		const result = await io.exec("openspec", ["config", "list", "--json"], root);
		if (result.code === 0) stdout = result.stdout;
	} catch {
		// treated as unreadable below
	}
	const readiness = profileReadiness(stdout);
	return readiness.ready ? "install" : { stop: stopMessage(readiness) };
}
