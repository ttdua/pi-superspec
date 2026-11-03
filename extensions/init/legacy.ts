import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { InitIO } from "./io.ts";

const PROMPTS_DIR = ".pi/prompts";
const SKILLS_DIR = ".pi/skills";

function listDir(dir: string): string[] {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

export function findLegacy(root: string): string[] {
	const found: string[] = [];
	for (const name of listDir(join(root, PROMPTS_DIR))) {
		if (!/^opsx-.*\.md$/.test(name)) continue;
		const abs = join(root, PROMPTS_DIR, name);
		if (existsSync(abs) && statSync(abs).isFile()) found.push(`${PROMPTS_DIR}/${name}`);
	}
	for (const name of listDir(join(root, SKILLS_DIR))) {
		if (name.startsWith("openspec-")) found.push(`${SKILLS_DIR}/${name}`);
	}
	return found.sort();
}

export async function cleanLegacy(
	io: InitIO,
	root: string,
): Promise<{ found: string[]; deleted: string[] }> {
	const found = findLegacy(root);
	if (found.length === 0) return { found, deleted: [] };
	const list = found.join("\n");
	if (!io.hasUI) {
		io.notify(`Legacy openspec files found (not deleted, no interactive UI):\n${list}`, "warning");
		return { found, deleted: [] };
	}
	const ok = await io.confirm("Delete legacy openspec files?", `The following paths will be deleted:\n${list}`);
	if (!ok) return { found, deleted: [] };
	const deleted: string[] = [];
	for (const rel of found) {
		rmSync(join(root, rel), { recursive: true, force: true });
		deleted.push(rel);
	}
	return { found, deleted };
}
