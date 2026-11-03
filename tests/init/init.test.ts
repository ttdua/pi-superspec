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
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toBe("schema: superspec\nlanguage: en\n");
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
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toBe("schema: superspec\nlanguage: en\n");
		expect(existsSync(join(root, "openspec", "schemas", "superspec", "schema.yaml"))).toBe(true);
		expect(existsSync(join(nested, "openspec"))).toBe(false);
		expect(calls.find(isValidate)?.cwd).toBe(root);
	});

	describe("language", () => {
		const configPath = (root: string) => join(root, "openspec", "config.yaml");
		const withExisting = (root: string, text: string) => {
			mkdirSync(join(root, "openspec"), { recursive: true });
			writeFileSync(configPath(root), text);
		};

		it.each(["--lang", `--lang ${"a".repeat(65)}`])(
			"returns invalid-arguments without touching anything for %j",
			async (args) => {
				const root = tmp();
				const { io, calls } = recording(root);
				expect(await runInit(io, packageRoot, args)).toBe("invalid-arguments");
				expect(calls).toEqual([]);
				expect(readdirSync(root)).toEqual([]);
				expect(io.notes.length).toBeGreaterThan(0);
				expect(io.reloads).toBe(0);
			},
		);

		it("writes the flag language directly after the schema line", async () => {
			const root = tmp();
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--lang vi")).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: vi\n");
		});

		it("overwrites an existing language with the flag", async () => {
			const root = tmp();
			withExisting(root, "schema: superspec\nlanguage: vi\n");
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--lang=en")).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: en\n");
		});

		it("prompts when no language is set and writes the answer", async () => {
			const root = tmp();
			const asked: Array<[string, string | undefined]> = [];
			const { io } = recording(root, undefined, {
				async prompt(title, placeholder) {
					asked.push([title, placeholder]);
					return " vi ";
				},
			});
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(asked).toEqual([["Document language (empty for en)", "e.g. en, vi, Tiếng Việt"]]);
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: vi\n");
		});

		it.each([undefined, "", "   "])("falls back to en silently when the prompt answer is %j", async (answer) => {
			const root = tmp();
			const { io } = recording(root, undefined, { prompt: async () => answer });
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: en\n");
			expect(io.notes).toEqual([]);
		});

		it("warns and falls back to en when the prompt answer is invalid", async () => {
			const root = tmp();
			const { io } = recording(root, undefined, { prompt: async () => "a".repeat(100) });
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: en\n");
			expect(io.notes.join("\n")).toContain("not used");
		});

		it("does not prompt when a valid language exists", async () => {
			const root = tmp();
			withExisting(root, "schema: superspec\nlanguage: vi\n");
			let prompts = 0;
			const { io } = recording(root, undefined, {
				async prompt() {
					prompts += 1;
					return "en";
				},
			});
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(prompts).toBe(0);
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: vi\n");
		});

		it("offers en in the prompt placeholder", async () => {
			const root = tmp();
			let placeholder: string | undefined;
			const { io } = recording(root, undefined, {
				async prompt(_title, ph) {
					placeholder = ph;
					return "";
				},
			});
			await runInit(io, packageRoot);
			expect(placeholder).toContain("en");
		});

		it("writes en without prompting and without a UI", async () => {
			const root = tmp();
			let prompts = 0;
			const { io } = recording(root, undefined, {
				hasUI: false,
				async prompt() {
					prompts += 1;
					return "vi";
				},
			});
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(prompts).toBe(0);
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: en\n");
		});

		it("prompts when the language on disk is invalid", async () => {
			const root = tmp();
			withExisting(root, `schema: superspec\nlanguage: ${"a".repeat(100)}\n`);
			let prompts = 0;
			const { io } = recording(root, undefined, {
				async prompt() {
					prompts += 1;
					return "vi";
				},
			});
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(prompts).toBe(1);
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: vi\n");
		});

		it("replaces an invalid language on disk with en when there is no UI", async () => {
			const root = tmp();
			withExisting(root, `schema: superspec\nlanguage: ${"a".repeat(100)}\n`);
			const { io } = recording(root, undefined, { hasUI: false });
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe("schema: superspec\nlanguage: en\n");
		});

		it("changes no file on a second run without a flag", async () => {
			const root = tmp();
			expect(await runInit(recording(root, undefined, { hasUI: false }).io, packageRoot)).toBe("activated");
			const first = readFileSync(configPath(root), "utf8");
			expect(first).toBe("schema: superspec\nlanguage: en\n");
			expect(await runInit(recording(root).io, packageRoot)).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe(first);
		});

		it("leaves config.yaml byte-identical on reruns", async () => {
			const root = tmp();
			expect(await runInit(recording(root).io, packageRoot, "--lang vi")).toBe("activated");
			expect(await runInit(recording(root).io, packageRoot, "--lang vi")).toBe("activated");
			const after = readFileSync(configPath(root), "utf8");
			expect(await runInit(recording(root).io, packageRoot)).toBe("activated");
			expect(readFileSync(configPath(root), "utf8")).toBe(after);
			expect(after).toBe("schema: superspec\nlanguage: vi\n");
		});

		it("writes no language and does not prompt when blocked", async () => {
			const root = tmp();
			cpSync(join(fixtures, "unmarked"), root, { recursive: true });
			let prompts = 0;
			const { io } = recording(root, undefined, {
				async prompt() {
					prompts += 1;
					return "vi";
				},
			});
			expect(await runInit(io, packageRoot, "--lang vi")).toBe("blocked");
			expect(await runInit(io, packageRoot)).toBe("blocked");
			const quiet = recording(root, undefined, { hasUI: false });
			expect(await runInit(quiet.io, packageRoot)).toBe("blocked");
			expect(prompts).toBe(0);
			expect(readFileSync(configPath(root), "utf8")).not.toContain("language:");
		});
	});
});
