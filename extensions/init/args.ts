import { validateLanguage } from "./config.ts";

export type InitArgs = { lang?: string } | { error: string };

export function parseInitArgs(args: string): InitArgs {
	const trimmed = args.trim();
	if (trimmed === "") return {};
	// Only `--lang` followed by whitespace, `=` or the end; `--language` is unknown.
	if (!/^--lang(?=$|[\s=])/.test(trimmed)) return { error: `Unknown argument: ${trimmed}. Usage: /opsx-init [--lang <language>]` };
	let value = trimmed.slice("--lang".length);
	if (value.startsWith("=")) value = value.slice(1);
	value = value.trim();
	if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
		value = value.slice(1, -1);
	}
	const lang = validateLanguage(value);
	if (lang === undefined) return { error: "Invalid --lang value: use 1-64 characters without control characters, e.g. --lang vi" };
	return { lang };
}
