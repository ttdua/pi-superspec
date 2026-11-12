import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isActivated } from "../../extensions/activation.ts";
import { runInit } from "../../extensions/init/init.ts";
import type { ExecResult } from "../../extensions/init/io.ts";
import { fakeIO } from "../helpers/io.ts";

const WORKFLOWS = '["explore","new","continue","ff","apply","verify","sync","archive"]';
const SKILL_IDS = [
	"openspec-explore",
	"openspec-new-change",
	"openspec-continue-change",
	"openspec-ff-change",
	"openspec-apply-change",
	"openspec-verify-change",
	"openspec-sync-specs",
	"openspec-archive-change",
];

/** Temp dirs removed by the afterEach hook and the process-exit hook (module-level probes). */
const dirs: string[] = [];
const hermeticDirs: string[] = [];
process.once("exit", () => {
	for (const d of hermeticDirs) rmSync(d, { recursive: true, force: true });
});

/** Every OpenSpec subprocess gets telemetry off and HOME/XDG/CODEX homes in a temp dir. */
function hermeticEnv(): NodeJS.ProcessEnv {
	const base = mkdtempSync(join(tmpdir(), "pi-superspec-home-"));
	hermeticDirs.push(base);
	const sub = (name: string) => {
		const d = join(base, name);
		mkdirSync(d, { recursive: true });
		return d;
	};
	return {
		OPENSPEC_TELEMETRY: "0",
		HOME: sub("home"),
		XDG_CONFIG_HOME: sub("config"),
		XDG_DATA_HOME: sub("data"),
		XDG_CACHE_HOME: sub("cache"),
		CODEX_HOME: sub("codex"),
	};
}

function openspecMajor(): number {
	const res = spawnSync("openspec", ["--version"], { encoding: "utf8", env: { ...process.env, ...hermeticEnv() } });
	if (res.status !== 0) return 0;
	return Number(/(\d+)\./.exec(res.stdout)?.[1] ?? 0);
}

/** Hermetic environment whose global OpenSpec profile selects the eight workflows. */
function isolatedEnv(): NodeJS.ProcessEnv {
	const env = hermeticEnv();
	for (const args of [
		["config", "set", "profile", "custom"],
		["config", "set", "workflows", WORKFLOWS],
	]) {
		const res = spawnSync("openspec", args, { encoding: "utf8", env: { ...process.env, ...env } });
		if (res.status !== 0) throw new Error(`openspec ${args.join(" ")} failed: ${res.stdout}${res.stderr}`);
	}
	return env;
}

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

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

function realIO(cwd: string, env: NodeJS.ProcessEnv) {
	return fakeIO({
		cwd,
		async exec(command: string, args: string[], execCwd?: string): Promise<ExecResult> {
			const res = spawnSync(command, args, { cwd: execCwd ?? cwd, encoding: "utf8", env: { ...process.env, ...env } });
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

describe.skipIf(openspecMajor() < 2)("opsx-init end to end", () => {
	it("activates an empty repository and is idempotent", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();
		const io = realIO(root, env);

		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(isActivated(root)).toBe(true);
		const validate = spawnSync("openspec", ["schema", "validate", "superspec"], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, ...env },
		});
		expect(validate.status, validate.stdout + validate.stderr).toBe(0);

		for (const id of SKILL_IDS) {
			expect(existsSync(join(root, ".agents", "skills", id, "SKILL.md")), id).toBe(true);
		}
		const before = snapshot(root);
		expect(Object.keys(before).length).toBeGreaterThan(0);
		expect(await runInit(realIO(root, env), packageRoot)).toBe("activated");
		expect(snapshot(root)).toEqual(before);
	}, 60_000);

	it("activates with --generate and is idempotent", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();
		const io = realIO(root, env);

		expect(await runInit(io, packageRoot, "--generate")).toBe("activated");
		expect(isActivated(root)).toBe(true);
		expect(io.reports[0]).toContain("/opsx-generate-specs");

		const before = snapshot(root);
		expect(await runInit(realIO(root, env), packageRoot, "--generate")).toBe("activated");
		expect(snapshot(root)).toEqual(before);
	}, 60_000);

	it("preserves custom keys and comments in an existing config.yaml", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();
		mkdirSync(join(root, "openspec"), { recursive: true });
		const config = join(root, "openspec", "config.yaml");
		writeFileSync(config, "# my project notes\ncontext: |\n  keep me\n");

		expect(await runInit(realIO(root, env), packageRoot)).toBe("activated");

		const text = readFileSync(config, "utf8");
		expect(text).toContain("# my project notes");
		expect(text).toContain("context: |\n  keep me\n");
		expect(text).toMatch(/^schema: superspec\s*$/m);
	}, 60_000);

	it("accepts a language key in config.yaml", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();

		expect(await runInit(realIO(root, env), packageRoot, "--lang vi")).toBe("activated");

		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("schema: superspec\nlanguage: vi\n");
		const validate = spawnSync("openspec", ["schema", "validate", "superspec"], { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
		expect(validate.status, validate.stdout + validate.stderr).toBe(0);
	}, 60_000);

	it("defaults the language to en without a flag", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();

		expect(await runInit(realIO(root, env), packageRoot)).toBe("activated");

		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("schema: superspec\nlanguage: en\n");
		const validate = spawnSync("openspec", ["schema", "validate", "superspec"], { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
		expect(validate.status, validate.stdout + validate.stderr).toBe(0);
	}, 60_000);

	it("restores a missing stock skill and leaves config and schema byte-identical", async () => {
		const root = emptyRepo();
		const env = isolatedEnv();
		expect(await runInit(realIO(root, env), packageRoot)).toBe("activated");
		const configPath = join(root, "openspec", "config.yaml");
		const config = readFileSync(configPath);
		const schemaBefore = snapshot(join(root, "openspec", "schemas", "superspec"));
		const skillDir = join(root, ".agents", "skills", "openspec-ff-change");
		rmSync(skillDir, { recursive: true });

		expect(await runInit(realIO(root, env), packageRoot)).toBe("activated");

		expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
		expect(readFileSync(configPath).equals(config)).toBe(true);
		expect(snapshot(join(root, "openspec", "schemas", "superspec"))).toEqual(schemaBefore);
	}, 60_000);
});
