import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const LOCK_NAME = ".pi-superspec.json";

export interface SchemaLock {
	schemaVersion: number;
	packageVersion: string;
	files: Record<string, string>;
}

export type SchemaState = "absent" | "identical" | "foreign" | "edited" | "older" | "newer";

const MARKER_RE = /^x-pi-superspec:\s*\n\s+version:\s*(\d+)/m;

function listFiles(dir: string): string[] {
	const out: string[] = [];
	const walk = (d: string) => {
		for (const entry of readdirSync(d, { withFileTypes: true })) {
			const p = join(d, entry.name);
			if (entry.isDirectory()) walk(p);
			else if (entry.isFile()) out.push(relative(dir, p).split("\\").join("/"));
		}
	};
	walk(dir);
	return out.filter((f) => f !== LOCK_NAME).sort();
}

function sha256(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}

export function hashTree(dir: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const f of listFiles(dir)) out[f] = sha256(readFileSync(join(dir, f)));
	return out;
}

function markerVersion(schemaDir: string): number | undefined {
	const file = join(schemaDir, "schema.yaml");
	if (!existsSync(file)) return undefined;
	const m = MARKER_RE.exec(readFileSync(file, "utf8"));
	return m ? Number(m[1]) : undefined;
}

export function buildLock(bundledDir: string, packageVersion: string): SchemaLock {
	return {
		schemaVersion: markerVersion(bundledDir) ?? 0,
		packageVersion,
		files: hashTree(bundledDir),
	};
}

export function serializeLock(lock: SchemaLock): string {
	return `${JSON.stringify(lock, null, 2)}\n`;
}

export function classifySchema(projectSchemaDir: string, bundledDir: string): SchemaState {
	if (!existsSync(projectSchemaDir)) return "absent";
	const found = markerVersion(projectSchemaDir);
	if (found === undefined) return "foreign";
	const bundled = markerVersion(bundledDir) ?? 0;
	if (found < bundled) return "older";
	if (found > bundled) return "newer";
	const have = hashTree(projectSchemaDir);
	const want = hashTree(bundledDir);
	for (const [f, h] of Object.entries(want)) {
		if (have[f] !== h) return "edited";
	}
	return "identical";
}

export function installSchema(root: string, packageRoot: string): SchemaState {
	const bundled = join(packageRoot, "schema", "superspec");
	const target = join(root, "openspec", "schemas", "superspec");
	const state = classifySchema(target, bundled);
	if (state !== "absent") return state;
	const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as { version: string };
	mkdirSync(target, { recursive: true });
	cpSync(bundled, target, { recursive: true });
	writeFileSync(join(target, LOCK_NAME), serializeLock(buildLock(bundled, pkg.version)));
	return state;
}
