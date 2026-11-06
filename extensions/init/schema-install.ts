import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

export const LOCK_NAME = ".pi-superspec.json";

export interface SchemaLock {
	schemaVersion: number;
	packageVersion: string;
	files: Record<string, string>;
}

export type SchemaState = "absent" | "identical" | "upgradable" | "older" | "edited" | "newer" | "foreign";

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

export function treeDigest(dir: string): string {
	const h = createHash("sha256");
	for (const [path, sha] of Object.entries(hashTree(dir)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
		h.update(`${path}\0${sha}\n`);
	}
	return h.digest("hex");
}

export function markerVersion(schemaDir: string): number | undefined {
	const file = join(schemaDir, "schema.yaml");
	if (!existsSync(file)) return undefined;
	const m = MARKER_RE.exec(readFileSync(file, "utf8"));
	return m ? Number(m[1]) : undefined;
}

export function readLock(dir: string): SchemaLock | undefined {
	try {
		const raw: unknown = JSON.parse(readFileSync(join(dir, LOCK_NAME), "utf8"));
		if (typeof raw !== "object" || raw === null) return undefined;
		const { schemaVersion, packageVersion, files } = raw as Record<string, unknown>;
		if (typeof schemaVersion !== "number") return undefined;
		if (typeof files !== "object" || files === null || Array.isArray(files)) return undefined;
		if (!Object.values(files).every((v) => typeof v === "string")) return undefined;
		return { schemaVersion, packageVersion: String(packageVersion ?? ""), files: files as Record<string, string> };
	} catch {
		return undefined;
	}
}

export function isPristine(dir: string): boolean {
	const lock = readLock(dir);
	if (!lock || lock.schemaVersion !== markerVersion(dir)) return false;
	const have = hashTree(dir);
	const haveKeys = Object.keys(have);
	if (haveKeys.length !== Object.keys(lock.files).length) return false;
	return haveKeys.every((f) => Object.hasOwn(lock.files, f) && lock.files[f] === have[f]);
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
	if (found < bundled) return isPristine(projectSchemaDir) ? "upgradable" : "older";
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
