import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA_LINE = "schema: superspec";

export function mergeConfig(text: string | undefined): string {
	// Keep a leading BOM in place and match `schema:` on the line after it.
	if (text?.startsWith("\uFEFF")) return `\uFEFF${mergeConfig(text.slice(1))}`;
	if (text === undefined || text === "") return `${SCHEMA_LINE}\n`;
	// "." does not match "\r", so a CRLF line ending is left in place.
	if (/^schema:.*$/m.test(text)) return text.replace(/^schema:.*$/m, SCHEMA_LINE);
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	return `${SCHEMA_LINE}${eol}${text}`;
}

export function applyConfig(root: string): "written" | "unchanged" {
	const file = join(root, "openspec", "config.yaml");
	const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
	const next = mergeConfig(current);
	if (next === current) return "unchanged";
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, next);
	return "written";
}

export const DEFAULT_LANGUAGE = "en";
export const MAX_LANGUAGE_LENGTH = 64;

export function validateLanguage(value: string): string | undefined {
	const trimmed = value.trim();
	if (trimmed === "" || trimmed.length > MAX_LANGUAGE_LENGTH || /[\p{Cc}\u2028\u2029]/u.test(trimmed)) return undefined;
	return trimmed;
}

export function parseLanguage(text: string): string | undefined {
	// A leading BOM would stop `^` from matching the first line.
	const body = text.startsWith("\uFEFF") ? text.slice(1) : text;
	const match = /^language:(.*)$/m.exec(body);
	if (!match) return undefined;
	const raw = match[1].trim();
	if (raw.startsWith('"')) {
		// A double-quoted value may be followed by a trailing comment.
		const quoted = /^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/.exec(raw);
		if (!quoted) return undefined;
		try {
			const parsed: unknown = JSON.parse(quoted[1]);
			return typeof parsed === "string" ? validateLanguage(parsed) : undefined;
		} catch {
			return undefined;
		}
	}
	return validateLanguage(raw.replace(/\s+#.*$/, ""));
}

export function readLanguage(root: string): string | undefined {
	const file = join(root, "openspec", "config.yaml");
	if (!existsSync(file)) return undefined;
	try {
		return parseLanguage(readFileSync(file, "utf8"));
	} catch {
		return undefined;
	}
}

export function mergeLanguage(text: string | undefined, value: string): string {
	// Keep a leading BOM in place so `^` matches the first real line.
	if (text?.startsWith("\uFEFF")) return `\uFEFF${mergeLanguage(text.slice(1), value)}`;
	const formatted = /^[\p{L}\p{N}][\p{L}\p{N} _.()-]*$/u.test(value) ? value : JSON.stringify(value);
	const line = `language: ${formatted}`;
	if (text === undefined || text === "") return `${line}\n`;
	// "." does not match "\r", so a CRLF line ending is left in place.
	if (/^language:.*$/m.test(text)) return text.replace(/^language:.*$/m, () => line);
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const schema = /^schema:.*(?:\r?\n|$)/m.exec(text);
	if (!schema) return `${line}${eol}${text}`;
	const end = schema.index + schema[0].length;
	const head = text.slice(0, end);
	return `${head}${head.endsWith("\n") ? "" : eol}${line}${eol}${text.slice(end)}`;
}

export function applyLanguage(root: string, value: string): "written" | "unchanged" {
	const file = join(root, "openspec", "config.yaml");
	const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
	const next = mergeLanguage(current, value);
	if (next === current) return "unchanged";
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, next);
	return "written";
}
