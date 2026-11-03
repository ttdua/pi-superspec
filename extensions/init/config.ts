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
