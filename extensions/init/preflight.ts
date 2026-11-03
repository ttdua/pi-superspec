import type { InitIO } from "./io.ts";

export const INSTALL_LINE = "brew install openspec";

export function parseOpenspecVersion(
	stdout: string,
): { major: number; minor: number } | undefined {
	const m = /(\d+)\.(\d+)/.exec(stdout);
	if (!m) return undefined;
	return { major: Number(m[1]), minor: Number(m[2]) };
}

export async function checkOpenspec(
	io: InitIO,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const fail = (reason: string) => ({
		ok: false as const,
		message: `${reason}. Install or upgrade OpenSpec (>= 1.16): ${INSTALL_LINE}`,
	});
	let result;
	try {
		result = await io.exec("openspec", ["--version"]);
	} catch {
		return fail("openspec was not found");
	}
	if (result.code !== 0) return fail("openspec was not found");
	const v = parseOpenspecVersion(result.stdout);
	if (!v) return fail("Could not parse the openspec version");
	if (v.major < 1 || (v.major === 1 && v.minor < 16)) {
		return fail(`openspec ${v.major}.${v.minor} is too old`);
	}
	return { ok: true };
}

export async function collectWarnings(io: InitIO): Promise<string[]> {
	const warnings: string[] = [];
	let inGit = false;
	try {
		inGit = (await io.exec("git", ["rev-parse", "--is-inside-work-tree"])).code === 0;
	} catch {
		inGit = false;
	}
	if (!inGit) warnings.push("Not inside a git repository; continuing without git.");
	if (!io.superpowersAvailable()) {
		warnings.push("Superpowers skills were not found; install Superpowers for the full workflow.");
	}
	return warnings;
}
