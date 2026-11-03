import { validateLanguage } from "./config.ts";

export type InitArgs = { lang?: string; generate?: true } | { error: string };

const USAGE = "/opsx-init [--lang <language>] [--generate]";

export function parseInitArgs(args: string): InitArgs {
	const input = args.trim();
	// `--generate` is a standalone token; `--generate=x` or `--generate x` fall through as unknown.
	const generateCount = input.split(/\s+/).filter((token) => token === "--generate").length;
	if (generateCount > 1) return { error: `Repeated argument: --generate. Usage: ${USAGE}` };
	const generate = generateCount === 1;
	// Remove the token in place (not collapsing whitespace) so the --lang value is untouched.
	const trimmed = generate ? input.replace(/(^|\s)--generate(?=\s|$)/, "$1").trim() : input;
	if (trimmed === "") return generate ? { generate: true } : {};
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
	return generate ? { lang, generate: true } : { lang };
}
