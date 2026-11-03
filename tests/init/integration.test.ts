import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isActivated } from "../../extensions/activation.ts";
import { runInit } from "../../extensions/init/init.ts";
import type { ExecResult } from "../../extensions/init/io.ts";
import { fakeIO } from "../helpers/io.ts";
import { hasOpenspec } from "../helpers/project.ts";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

const dirs: string[] = [];
function emptyRepo(): string {
	const dir = mkdtempSync(join(tmpdir(), "pi-superspec-e2e-"));
	dirs.push(dir);
	const res = spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`git init failed: ${res.stderr}`);
	return dir;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function realIO(cwd: string) {
	return fakeIO({
		cwd,
		async exec(command: string, args: string[], execCwd?: string): Promise<ExecResult> {
			const res = spawnSync(command, args, { cwd: execCwd ?? cwd, encoding: "utf8" });
			return { code: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
		},
	});
}

function snapshot(root: string): Record<string, string> {
	const out: Record<string, string> = {};
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name === ".git") continue;
			const full = join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else out[relative(root, full)] = readFileSync(full).toString("base64");
		}
	};
	walk(root);
	return out;
}

describe.skipIf(!hasOpenspec())("opsx-init end to end", () => {
	it("activates an empty repository and is idempotent", async () => {
		const root = emptyRepo();
		const io = realIO(root);

		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(isActivated(root)).toBe(true);
		const validate = spawnSync("openspec", ["schema", "validate", "superspec"], {
			cwd: root,
			encoding: "utf8",
		});
		expect(validate.status, validate.stdout + validate.stderr).toBe(0);

		const before = snapshot(root);
		expect(Object.keys(before).length).toBeGreaterThan(0);
		expect(await runInit(realIO(root), packageRoot)).toBe("activated");
		expect(snapshot(root)).toEqual(before);
	}, 60_000);

	it("preserves custom keys and comments in an existing config.yaml", async () => {
		const root = emptyRepo();
		mkdirSync(join(root, "openspec"), { recursive: true });
		const config = join(root, "openspec", "config.yaml");
		writeFileSync(config, "# my project notes\ncontext: |\n  keep me\n");

		expect(await runInit(realIO(root), packageRoot)).toBe("activated");

		const text = readFileSync(config, "utf8");
		expect(text).toContain("# my project notes");
		expect(text).toContain("context: |\n  keep me\n");
		expect(text).toMatch(/^schema: superspec\s*$/m);
	}, 60_000);

	it("accepts a language key in config.yaml", async () => {
		const root = emptyRepo();

		expect(await runInit(realIO(root), packageRoot, "--lang vi")).toBe("activated");

		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("schema: superspec\nlanguage: vi\n");
		const validate = spawnSync("openspec", ["schema", "validate", "superspec"], { cwd: root, encoding: "utf8" });
		expect(validate.status, validate.stdout + validate.stderr).toBe(0);
	}, 60_000);
});
