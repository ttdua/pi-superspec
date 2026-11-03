import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../../extensions/init/init.ts";
import type { ExecResult, InitIO } from "../../extensions/init/io.ts";
import { fakeIO } from "../helpers/io.ts";

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));
const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

const dirs: string[] = [];
function tmp(): string {
	const d = mkdtempSync(join(tmpdir(), "pi-superspec-init-"));
	dirs.push(d);
	return d;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

interface Call {
	command: string;
	args: string[];
	cwd?: string;
}

function recording(
	cwd: string,
	respond: (call: Call) => ExecResult = () => ({ code: 0, stdout: "1.4.1\n", stderr: "" }),
	overrides: Partial<InitIO> = {},
) {
	const calls: Call[] = [];
	const io = fakeIO({
		cwd,
		async exec(command, args, execCwd) {
			const call = { command, args, cwd: execCwd };
			calls.push(call);
			return respond(call);
		},
		...overrides,
	});
	return { io, calls };
}

const isInit = (c: Call) => c.command === "openspec" && c.args[0] === "init";
const isValidate = (c: Call) =>
	c.command === "openspec" && c.args.join(" ") === "schema validate superspec";

describe("runInit", () => {
	it("returns preflight-failed and writes nothing when openspec is missing", async () => {
		const root = tmp();
		const { io, calls } = recording(root, (c) =>
			c.args[0] === "--version" ? { code: 127, stdout: "", stderr: "not found" } : { code: 0, stdout: "", stderr: "" },
		);
		expect(await runInit(io, packageRoot)).toBe("preflight-failed");
		expect(readdirSync(root)).toEqual([]);
		expect(calls.some(isInit)).toBe(false);
		expect(io.notes.join("\n")).toContain("brew install openspec");
		expect(io.reloads).toBe(0);
	});

	it("runs openspec init --tools none when openspec/ is missing", async () => {
		const root = tmp();
		const { io, calls } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("activated");
		const init = calls.filter(isInit);
		expect(init).toHaveLength(1);
		expect(init[0].args).toEqual(["init", "--tools", "none"]);
		expect(init[0].cwd).toBe(root);
	});

	it("does not run openspec init when openspec/ exists", async () => {
		const root = tmp();
		mkdirSync(join(root, "openspec"));
		const { io, calls } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(calls.some(isInit)).toBe(false);
	});

	it("reports a failing openspec init as preflight-failed", async () => {
		const root = tmp();
		const errors: string[] = [];
		const { io } = recording(
			root,
			(c) => (isInit(c) ? { code: 1, stdout: "", stderr: "boom" } : { code: 0, stdout: "1.4.1\n", stderr: "" }),
			{
				notify(message, level) {
					if (level === "error") errors.push(message);
				},
			},
		);
		expect(await runInit(io, packageRoot)).toBe("preflight-failed");
		expect(errors.join("\n")).toContain("boom");
	});

	it("returns validation-failed without reloading when validation fails", async () => {
		const root = tmp();
		const { io, calls } = recording(root, (c) =>
			isValidate(c) ? { code: 1, stdout: "bad schema", stderr: "" } : { code: 0, stdout: "1.4.1\n", stderr: "" },
		);
		expect(await runInit(io, packageRoot)).toBe("validation-failed");
		expect(calls.filter(isValidate)).toHaveLength(1);
		expect(io.reloads).toBe(0);
		expect(io.notes.join("\n")).toContain("bad schema");
		expect(io.notes.join("\n")).toContain("next session start");
		expect(io.reports).toEqual([]);
	});

	it("activates, reloads once and prints the next step on success", async () => {
		const root = tmp();
		const { io, calls } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(io.reloads).toBe(1);
		expect(io.reports).toHaveLength(1);
		expect(io.reports[0]).toContain("Schema superspec is valid.");
		expect(io.reports[0]).toContain("Next: /opsx-new <name>");
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toBe("schema: superspec\n");
		expect(existsSync(join(root, "openspec", "schemas", "superspec", "schema.yaml"))).toBe(true);
		const v = calls.findIndex(isValidate);
		expect(v).toBeGreaterThan(-1);
		expect(calls[v].cwd).toBe(root);
	});

	it("does not touch io after reload (reload invalidates the ctx)", async () => {
		const root = tmp();
		let reloaded = false;
		const notes: string[] = [];
		const stale = () => {
			if (reloaded) throw new Error("ctx is stale after reload");
		};
		const { io } = recording(root, undefined, {
			notify(message) {
				stale();
				notes.push(message);
			},
			report(message) {
				stale();
				notes.push(message);
			},
			async reload() {
				stale();
				reloaded = true;
			},
		});
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(reloaded).toBe(true);
		expect(notes.some((n) => n.includes("/opsx-new"))).toBe(true);
	});

	it("emits warnings without stopping", async () => {
		const root = tmp();
		const warnings: string[] = [];
		const { io } = recording(
			root,
			(c) => (c.command === "git" ? { code: 128, stdout: "", stderr: "" } : { code: 0, stdout: "1.4.1\n", stderr: "" }),
			{
				superpowersAvailable: () => false,
				notify(message, level) {
					if (level === "warning") warnings.push(message);
				},
			},
		);
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(warnings).toHaveLength(2);
	});

	it("blocks on a foreign schema without validating or reloading", async () => {
		const root = tmp();
		cpSync(join(fixtures, "unmarked"), root, { recursive: true });
		const schemaFile = join(root, "openspec", "schemas", "superspec", "schema.yaml");
		const before = readFileSync(schemaFile, "utf8");
		const { io, calls } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(calls.some(isValidate)).toBe(false);
		expect(io.reloads).toBe(0);
		const notice = io.notes.join("\n");
		expect(notice).toContain("foreign");
		expect(notice).toContain("openspec/config.yaml now has `schema: superspec`");
		expect(notice).toContain("schema-auto-upgrade");
		expect(notice).toContain("remove openspec/schemas/superspec/");
		expect(readdirSync(dirname(schemaFile))).toEqual(["schema.yaml"]);
		expect(readFileSync(schemaFile, "utf8")).toBe(before);
	});

	it("does not mention config.yaml when blocked and config was already set", async () => {
		const root = tmp();
		cpSync(join(fixtures, "unmarked"), root, { recursive: true });
		writeFileSync(join(root, "openspec", "config.yaml"), "schema: superspec\n");
		const { io } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(io.notes.join("\n")).not.toContain("config.yaml");
	});

	it("includes warnings in the persisted report", async () => {
		const root = tmp();
		const { io } = recording(root, undefined, { superpowersAvailable: () => false });
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(io.reports[0]).toContain("Superpowers skills were not found");
	});

	it("still runs legacy cleanup when blocked", async () => {
		const root = tmp();
		cpSync(join(fixtures, "unmarked"), root, { recursive: true });
		mkdirSync(join(root, ".pi", "skills", "openspec-explore"), { recursive: true });
		const { io } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(existsSync(join(root, ".pi", "skills", "openspec-explore"))).toBe(false);
	});

	it("installs into the ancestor project root when cwd is nested", async () => {
		const root = tmp();
		mkdirSync(join(root, "openspec"));
		const nested = join(root, "a", "b");
		mkdirSync(nested, { recursive: true });
		const { io, calls } = recording(nested);
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(calls.some(isInit)).toBe(false);
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toBe("schema: superspec\n");
		expect(existsSync(join(root, "openspec", "schemas", "superspec", "schema.yaml"))).toBe(true);
		expect(existsSync(join(nested, "openspec"))).toBe(false);
		expect(calls.find(isValidate)?.cwd).toBe(root);
	});
});
