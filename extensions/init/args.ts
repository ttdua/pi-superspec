import { validateLanguage } from "./config.ts";

export type InitArgs = { lang?: string; generate?: true; force?: true } | { error: string };

const USAGE = "/opsx-init [--lang <language>] [--generate] [--force]";

export function parseInitArgs(args: string): InitArgs {
	const input = args.trim();
	// `--generate` and `--force` are standalone tokens; `--force=x` or `--force x` fall through as unknown.
	const tokens = input.split(/\s+/);
	const present = { "--generate": false, "--force": false };
	let trimmed = input;
	for (const flag of ["--generate", "--force"] as const) {
		const count = tokens.filter((token) => token === flag).length;
		if (count > 1) return { error: `Repeated argument: ${flag}. Usage: ${USAGE}` };
		if (count === 1) {
			present[flag] = true;
			// Remove the token in place (not collapsing whitespace) so the --lang value is untouched.
			trimmed = trimmed.replace(new RegExp(`(^|\\s)${flag}(?=\\s|$)`), "$1").trim();
		}
	}
	const flags = {
		...(present["--generate"] ? { generate: true as const } : {}),
		...(present["--force"] ? { force: true as const } : {}),
	};
	if (trimmed === "") return flags;
	// Only `--lang` followed by whitespace, `=` or the end; `--language` is unknown.
	if (!/^--lang(?=$|[\s=])/.test(trimmed)) return { error: `Unknown argument: ${trimmed}. Usage: ${USAGE}` };
	let value = trimmed.slice("--lang".length);
	if (value.startsWith("=")) value = value.slice(1);
	value = value.trim();
	if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
		value = value.slice(1, -1);
	}
	const lang = validateLanguage(value);
	if (lang === undefined) return { error: "Invalid --lang value: use 1-64 characters without control characters, e.g. --lang vi" };
	return { lang, ...flags };
}
