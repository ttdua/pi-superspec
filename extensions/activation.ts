import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const MARKER = /^x-pi-superspec:/m;

function isDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/** Nearest ancestor-or-self of `cwd` that contains an `openspec/` directory. */
export function findProjectRoot(cwd: string): string | undefined {
	let dir = cwd;
	while (true) {
		if (isDirectory(join(dir, "openspec"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

/** True when the project's superspec schema carries the `x-pi-superspec` marker. */
export function isActivated(root: string): boolean {
	try {
		const schema = join(root, "openspec", "schemas", "superspec", "schema.yaml");
		return MARKER.test(readFileSync(schema, "utf8"));
	} catch {
		return false;
	}
}
