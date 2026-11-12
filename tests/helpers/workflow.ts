import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const WORKFLOW_PATH = fileURLToPath(
	new URL("../../schema/superspec/workflow.md", import.meta.url),
);

export const WORKFLOW_SECTIONS = [
	"Shared rules",
	"explore",
	"new",
	"continue",
	"ff",
	"apply",
	"verify",
	"sync",
	"archive",
	"Review gate",
	"Superpowers rule",
	"Stock skills not used",
] as const;

export type WorkflowSection = (typeof WORKFLOW_SECTIONS)[number];

/** Full text of the bundled workflow rules file, or "" when it is missing. */
export function workflow(): string {
	return existsSync(WORKFLOW_PATH) ? readFileSync(WORKFLOW_PATH, "utf8") : "";
}

/** H2 headings of workflow.md, in file order. */
export function workflowHeadings(): string[] {
	return [...workflow().matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

/** Body of one H2 section of workflow.md (heading excluded), or "" when absent. */
export function workflowSection(name: WorkflowSection): string {
	const lines = workflow().split("\n");
	const start = lines.findIndex((l) => l.trim() === `## ${name}`);
	if (start === -1) return "";
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		if (/^## /.test(lines[i])) {
			end = i;
			break;
		}
	}
	return lines.slice(start + 1, end).join("\n");
}

/** Section text with whitespace collapsed, for phrase anchors that wrap. */
export function flatSection(name: WorkflowSection): string {
	return workflowSection(name).replace(/\s+/g, " ");
}

/** Split flattened text into sentences. */
export function sentences(text: string): string[] {
	return text.split(/(?<=[.!?])\s+(?=[A-Z`*"(-])/);
}
