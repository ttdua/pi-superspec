import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
	LOCK_NAME,
	classifySchema,
	hashTree,
	installSchema,
	isPristine,
	serializeLock,
	treeDigest,
	type SchemaLock,
} from "../../extensions/init/schema-install.ts";
import { SCHEMA_DIR, asV6 } from "../helpers/project.ts";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const UNMARKED = fileURLToPath(
	new URL("../fixtures/unmarked/openspec/schemas/superspec", import.meta.url),
);

const dirs: string[] = [];
function tmp(): string {
	const d = mkdtempSync(join(tmpdir(), "pi-superspec-si-"));
	dirs.push(d);
	return d;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function target(root: string): string {
	return join(root, "openspec", "schemas", "superspec");
}
function listFiles(dir: string): string[] {
	const out: string[] = [];
	const walk = (d: string) => {
		for (const e of readdirSync(d, { withFileTypes: true })) {
			const p = join(d, e.name);
			if (e.isDirectory()) walk(p);
			else out.push(relative(dir, p).split("\\").join("/"));
		}
	};
	walk(dir);
	return out.sort();
}
function snapshot(dir: string): Record<string, string> {
	const snap: Record<string, string> = {};
	for (const f of listFiles(dir)) snap[f] = readFileSync(join(dir, f)).toString("base64");
	return snap;
}
function readInstalledLock(root: string): SchemaLock {
	return JSON.parse(readFileSync(join(target(root), LOCK_NAME), "utf8"));
}
function sha(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}
function setMarker(t: string, v: number): void {
	const f = join(t, "schema.yaml");
	writeFileSync(f, readFileSync(f, "utf8").replace(/(x-pi-superspec:\s*\n\s+version:\s*)\d+/, `$1${v}`));
}
function copyBundled(root: string): string {
	const t = target(root);
	mkdirSync(t, { recursive: true });
	cpSync(SCHEMA_DIR, t, { recursive: true });
	return t;
}

describe("installSchema lock", () => {
	it("writes a lock matching the installed tree", () => {
		const root = tmp();
		expect(installSchema(root, PACKAGE_ROOT)).toBe("absent");
		const lock = readInstalledLock(root);
		const installed = listFiles(target(root)).filter((f) => f !== LOCK_NAME);
		expect(Object.keys(lock.files)).toEqual(installed);
		expect(installed).toEqual(listFiles(SCHEMA_DIR));
		for (const [f, h] of Object.entries(lock.files)) {
			expect(h).toBe(sha(readFileSync(join(target(root), f))));
		}
		expect(lock.schemaVersion).toBe(7);
		const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
		expect(lock.packageVersion).toBe(pkg.version);
	});

	it("is deterministic and newline-terminated", () => {
		const a = tmp();
		const b = tmp();
		installSchema(a, PACKAGE_ROOT);
		installSchema(b, PACKAGE_ROOT);
		const la = readFileSync(join(target(a), LOCK_NAME));
		expect(la.equals(readFileSync(join(target(b), LOCK_NAME)))).toBe(true);
		expect(la.toString().endsWith("\n")).toBe(true);
	});

	it("hashTree excludes the lock file", () => {
		const root = tmp();
		installSchema(root, PACKAGE_ROOT);
		expect(hashTree(target(root))).toEqual(readInstalledLock(root).files);
	});
});

describe("treeDigest", () => {
	it("is deterministic", () => {
		expect(treeDigest(SCHEMA_DIR)).toBe(treeDigest(SCHEMA_DIR));
	});
	it("changes when a file is renamed, added or removed", () => {
		const base = treeDigest(SCHEMA_DIR);
		const mutations: Array<(t: string) => void> = [
			(t) => renameSync(join(t, "schema.yaml"), join(t, "schema2.yaml")),
			(t) => writeFileSync(join(t, "extra.md"), "x\n"),
			(t) => rmSync(join(t, listFiles(t).find((f) => f !== "schema.yaml")!)),
		];
		for (const mutate of mutations) {
			const t = copyBundled(tmp());
			expect(treeDigest(t)).toBe(base);
			mutate(t);
			expect(treeDigest(t)).not.toBe(base);
		}
	});
	it("ignores the lock file", () => {
		const root = tmp();
		installSchema(root, PACKAGE_ROOT);
		expect(existsSync(join(target(root), LOCK_NAME))).toBe(true);
		expect(treeDigest(target(root))).toBe(treeDigest(SCHEMA_DIR));
	});
});

describe("classifySchema", () => {
	it("absent for a missing dir", () => {
		expect(classifySchema(join(tmp(), "nope"), SCHEMA_DIR)).toBe("absent");
	});
	it("identical for a fresh copy, with or without lock", () => {
		const root = tmp();
		const t = copyBundled(root);
		expect(classifySchema(t, SCHEMA_DIR)).toBe("identical");
		const root2 = tmp();
		installSchema(root2, PACKAGE_ROOT);
		expect(classifySchema(target(root2), SCHEMA_DIR)).toBe("identical");
	});
	it("foreign without marker", () => {
		expect(classifySchema(UNMARKED, SCHEMA_DIR)).toBe("foreign");
	});
	it("upgradable for a pristine v6 install", () => {
		const t = copyBundled(tmp());
		asV6(t);
		expect(classifySchema(t, SCHEMA_DIR)).toBe("upgradable");
	});
	it("older for a v6 install with an edited file", () => {
		const t = copyBundled(tmp());
		asV6(t);
		writeFileSync(join(t, listFiles(t).find((f) => f !== "schema.yaml" && f !== LOCK_NAME)!), "changed\n");
		expect(classifySchema(t, SCHEMA_DIR)).toBe("older");
	});
	it("older for a v4 marker without a lock", () => {
		const t = copyBundled(tmp());
		setMarker(t, 4);
		expect(classifySchema(t, SCHEMA_DIR)).toBe("older");
	});
	it("newer for a v8 marker", () => {
		const t = copyBundled(tmp());
		setMarker(t, 8);
		expect(classifySchema(t, SCHEMA_DIR)).toBe("newer");
	});
	it("classification writes nothing", () => {
		const cases: Array<(t: string) => void> = [
			() => {},
			(t) => asV6(t),
			(t) => {
				asV6(t);
				writeFileSync(join(t, "extra.md"), "x");
			},
			(t) => setMarker(t, 4),
			(t) => setMarker(t, 8),
			(t) => writeFileSync(join(t, listFiles(t).find((f) => f !== "schema.yaml")!), "x"),
		];
		for (const mutate of cases) {
			const t = copyBundled(tmp());
			mutate(t);
			const before = snapshot(t);
			classifySchema(t, SCHEMA_DIR);
			expect(snapshot(t)).toEqual(before);
		}
		const foreign = tmp();
		cpSync(UNMARKED, foreign, { recursive: true });
		const before = snapshot(foreign);
		classifySchema(foreign, SCHEMA_DIR);
		expect(snapshot(foreign)).toEqual(before);
	});
	it("edited when content differs or a bundled file is missing", () => {
		const t = copyBundled(tmp());
		const other = listFiles(t).find((f) => f !== "schema.yaml")!;
		writeFileSync(join(t, other), "changed\n");
		expect(classifySchema(t, SCHEMA_DIR)).toBe("edited");
		const t2 = copyBundled(tmp());
		rmSync(join(t2, other));
		expect(classifySchema(t2, SCHEMA_DIR)).toBe("edited");
	});
});

describe("isPristine", () => {
	function installed(): string {
		const root = tmp();
		installSchema(root, PACKAGE_ROOT);
		return target(root);
	}
	it("true for installSchema output", () => {
		expect(isPristine(installed())).toBe(true);
	});
	it("false when a file changed", () => {
		const t = installed();
		writeFileSync(join(t, listFiles(t).find((f) => f !== "schema.yaml" && f !== LOCK_NAME)!), "changed\n");
		expect(isPristine(t)).toBe(false);
	});
	it("false when .DS_Store was added", () => {
		const t = installed();
		writeFileSync(join(t, ".DS_Store"), "x");
		expect(isPristine(t)).toBe(false);
	});
	it("false when a file was removed", () => {
		const t = installed();
		rmSync(join(t, listFiles(t).find((f) => f !== "schema.yaml" && f !== LOCK_NAME)!));
		expect(isPristine(t)).toBe(false);
	});
	it("false when the lock is missing", () => {
		const t = installed();
		rmSync(join(t, LOCK_NAME));
		expect(isPristine(t)).toBe(false);
	});
	it("false when the lock is malformed JSON", () => {
		const t = installed();
		writeFileSync(join(t, LOCK_NAME), "{");
		expect(isPristine(t)).toBe(false);
	});
	it("false when files holds non-string values", () => {
		const t = installed();
		writeFileSync(join(t, LOCK_NAME), JSON.stringify({ schemaVersion: 7, packageVersion: "x", files: { a: 1 } }));
		expect(isPristine(t)).toBe(false);
	});
	it("false when lock schemaVersion differs from the marker", () => {
		const t = installed();
		const lock = JSON.parse(readFileSync(join(t, LOCK_NAME), "utf8")) as SchemaLock;
		writeFileSync(join(t, LOCK_NAME), serializeLock({ ...lock, schemaVersion: 6 }));
		expect(isPristine(t)).toBe(false);
	});
});

describe("installSchema on existing states", () => {
	it("leaves every non-absent state byte-identical", () => {
		const cases: Array<[string, (t: string) => void]> = [
			["identical", () => {}],
			["edited", (t) => writeFileSync(join(t, listFiles(t).find((f) => f !== "schema.yaml")!), "x")],
			["older", (t) => setMarker(t, 4)],
			["upgradable", (t) => asV6(t)],
			["newer", (t) => writeFileSync(join(t, "schema.yaml"), readFileSync(join(t, "schema.yaml"), "utf8").replace(/(x-pi-superspec:\s*\n\s+version:\s*)\d+/, "$18"))],
			["foreign", (t) => cpSync(UNMARKED, t, { recursive: true, force: true })],
		];
		for (const [state, mutate] of cases) {
			const root = tmp();
			const t = copyBundled(root);
			mutate(t);
			if (state === "foreign") {
				rmSync(t, { recursive: true });
				cpSync(UNMARKED, t, { recursive: true });
			}
			const before = snapshot(t);
			expect(installSchema(root, PACKAGE_ROOT)).toBe(state);
			expect(snapshot(t)).toEqual(before);
		}
	});
});
