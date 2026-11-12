import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOCK_NAME, hashTree, serializeLock } from "../../extensions/init/schema-install.ts";

export const SCHEMA_DIR = fileURLToPath(
	new URL("../../schema/superspec", import.meta.url),
);

export interface TempProject {
	dir: string;
	openspec(args: string[]): { status: number; stdout: string; stderr: string };
	cleanup(): void;
}

// The 1.16 floor is deliberate: the schema validates on 1.x too, so do not raise it to 2.0.
export function meetsOpenspecFloor(versionOutput: string): boolean {
	const m = /(\d+)\.(\d+)/.exec(versionOutput);
	if (!m) return false;
	const major = Number(m[1]);
	const minor = Number(m[2]);
	return major > 1 || (major === 1 && minor >= 16);
}

export function hasOpenspec(): boolean {
	const res = spawnSync("openspec", ["--version"], { encoding: "utf8" });
	if (res.status !== 0) return false;
	return meetsOpenspecFloor(res.stdout);
}

/** Turn a bundled-copy schema dir into a pristine v6 install (marker, version line, lock). */
export function asV6(schemaDir: string): void {
	const f = join(schemaDir, "schema.yaml");
	const text = readFileSync(f, "utf8")
		.replace(/^version:\s*\d+/m, "version: 6")
		.replace(/(x-pi-superspec:\s*\n\s+version:\s*)\d+/, "$16");
	writeFileSync(f, text);
	writeFileSync(
		join(schemaDir, LOCK_NAME),
		serializeLock({ schemaVersion: 6, packageVersion: "0.0.0-test", files: hashTree(schemaDir) }),
	);
}

export function makeProject(): TempProject {
	const dir = mkdtempSync(join(tmpdir(), "pi-superspec-"));
	const target = join(dir, "openspec", "schemas", "superspec");
	mkdirSync(target, { recursive: true });
	cpSync(SCHEMA_DIR, target, { recursive: true });
	writeFileSync(join(dir, "openspec", "config.yaml"), "schema: superspec\n");
	return {
		dir,
		openspec(args) {
			const res = spawnSync("openspec", args, { cwd: dir, encoding: "utf8" });
			return {
				status: res.status ?? -1,
				stdout: res.stdout ?? "",
				stderr: res.stderr ?? "",
			};
		},
		cleanup() {
			rmSync(dir, { recursive: true, force: true });
		},
	};
}
