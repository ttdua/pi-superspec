import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA_DIR = fileURLToPath(
	new URL("../../schema/superspec", import.meta.url),
);

export interface TempProject {
	dir: string;
	openspec(args: string[]): { status: number; stdout: string; stderr: string };
	cleanup(): void;
}

export function hasOpenspec(): boolean {
	const res = spawnSync("openspec", ["--version"], { encoding: "utf8" });
	if (res.status !== 0) return false;
	const m = /(\d+)\.(\d+)/.exec(res.stdout);
	if (!m) return false;
	const major = Number(m[1]);
	const minor = Number(m[2]);
	return major > 1 || (major === 1 && minor >= 4);
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
