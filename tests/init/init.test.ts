import {
	appendFileSync,
	chmodSync,
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
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../../extensions/init/init.ts";
import type { ExecResult, InitIO } from "../../extensions/init/io.ts";
import { fakeIO } from "../helpers/io.ts";
import { asV6 } from "../helpers/project.ts";

const V = Number(
	/^version:\s*(\d+)/m.exec(
		readFileSync(new URL("../../schema/superspec/schema.yaml", import.meta.url), "utf8"),
	)?.[1],
);
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
	respond: (call: Call) => ExecResult = () => ({ code: 0, stdout: "1.16.0\n", stderr: "" }),
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
			(c) => (isInit(c) ? { code: 1, stdout: "", stderr: "boom" } : { code: 0, stdout: "1.16.0\n", stderr: "" }),
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
			isValidate(c) ? { code: 1, stdout: "bad schema", stderr: "" } : { code: 0, stdout: "1.16.0\n", stderr: "" },
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
			(c) => (c.command === "git" ? { code: 128, stdout: "", stderr: "" } : { code: 0, stdout: "1.16.0\n", stderr: "" }),
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
		expect(notice).toContain("--force");
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

	describe("--generate", () => {
		const hint = "/opsx-generate-specs";

		it("adds the next step after the Next line", async () => {
			const root = tmp();
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--generate")).toBe("activated");
			const report = io.reports[0];
			expect(report).toContain("Next: /opsx-new <name>");
			expect(report).toContain(hint);
			expect(report.indexOf(hint)).toBeGreaterThan(report.indexOf("Next: /opsx-new <name>"));
			expect(report.split("\n").at(-1)).toBe(
				"For an existing codebase, run /opsx-generate-specs to draft specs from the code.",
			);
		});

		it("prints no hint without the flag", async () => {
			const root = tmp();
			const { io } = recording(root);
			expect(await runInit(io, packageRoot)).toBe("activated");
			expect(io.reports[0]).not.toContain(hint);
		});

		it("prints no hint when blocked", async () => {
			const root = tmp();
			cpSync(join(fixtures, "unmarked"), root, { recursive: true });
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--generate")).toBe("blocked");
			expect(io.reports).toEqual([]);
			expect(io.notes.join("\n")).not.toContain(hint);
		});

		it("prints no hint when validation fails", async () => {
			const root = tmp();
			const { io } = recording(root, (c) =>
				isValidate(c) ? { code: 1, stdout: "", stderr: "bad" } : { code: 0, stdout: "1.16.0\n", stderr: "" },
			);
			expect(await runInit(io, packageRoot, "--generate")).toBe("validation-failed");
			expect(io.reports).toEqual([]);
			expect(io.notes.join("\n")).not.toContain(hint);
		});

		it("prints no hint when openspec is missing", async () => {
			const root = tmp();
			const { io } = recording(root, () => ({ code: 127, stdout: "", stderr: "not found" }));
			expect(await runInit(io, packageRoot, "--generate")).toBe("preflight-failed");
			expect(io.reports).toEqual([]);
			expect(io.notes.join("\n")).not.toContain(hint);
		});

		it("rejects --generate=x without writing anything", async () => {
			const root = tmp();
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--generate=x")).toBe("invalid-arguments");
			expect(readdirSync(root)).toEqual([]);
		});

		it("keeps --lang when combined with --generate", async () => {
			const root = tmp();
			const { io } = recording(root);
			expect(await runInit(io, packageRoot, "--lang vi --generate")).toBe("activated");
			expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("language: vi");
		});

		it("writes the same config.yaml with and without --generate", async () => {
			const plain = tmp();
			const flagged = tmp();
			expect(await runInit(recording(plain).io, packageRoot)).toBe("activated");
			expect(await runInit(recording(flagged).io, packageRoot, "--generate")).toBe("activated");
			expect(readFileSync(join(flagged, "openspec", "config.yaml"), "utf8")).toBe(
				readFileSync(join(plain, "openspec", "config.yaml"), "utf8"),
			);
		});
	});
});

describe("existing schema", () => {
	const schemaDir = (root: string) => join(root, "openspec", "schemas", "superspec");
	const snap = (dir: string): Record<string, string> => {
		const out: Record<string, string> = {};
		const walk = (d: string) => {
			for (const e of readdirSync(d, { withFileTypes: true })) {
				const p = join(d, e.name);
				if (e.isDirectory()) walk(p);
				else out[relative(dir, p)] = readFileSync(p, "utf8");
			}
		};
		walk(dir);
		return out;
	};
	async function installed(): Promise<string> {
		const root = tmp();
		expect(await runInit(recording(root).io, packageRoot)).toBe("activated");
		return root;
	}
	const upgradable = async () => {
		const root = await installed();
		asV6(schemaDir(root));
		return root;
	};
	const edited = async () => {
		const root = await installed();
		appendFileSync(join(schemaDir(root), "schema.yaml"), "# local edit\n");
		return root;
	};
	const older = async () => {
		const root = await upgradable();
		appendFileSync(join(schemaDir(root), "schema.yaml"), "# local edit\n");
		return root;
	};
	const newer = async () => {
		const root = await installed();
		const f = join(schemaDir(root), "schema.yaml");
		writeFileSync(
			f,
			readFileSync(f, "utf8")
				.replace(/^version:\s*\d+/m, `version: ${V + 1}`)
				.replace(/(x-pi-superspec:\s*\n\s+version:\s*)\d+/, `$1${V + 1}`),
		);
		return root;
	};
	const foreign = () => {
		const root = tmp();
		cpSync(join(fixtures, "unmarked"), root, { recursive: true });
		return root;
	};
	const freshSnap = async () => snap(schemaDir(await installed()));
	const backupsOf = (bak: string) => {
		const projects = readdirSync(bak);
		return projects.flatMap((p) => readdirSync(join(bak, p)).map((b) => join(bak, p, b)));
	};

	it("confirmed upgrade replaces without backup and reloads", async () => {
		const root = await upgradable();
		const bak = tmp();
		const { io, calls } = recording(root, undefined, { backupRoot: bak, confirm: async () => true });
		expect(await runInit(io, packageRoot)).toBe("activated");
		expect(snap(schemaDir(root))).toEqual(await freshSnap());
		expect(readdirSync(bak)).toEqual([]);
		expect(io.reports[0]).toContain(`upgraded from v6 to v${V}`);
		expect(io.reports[0]).toContain("Commit openspec/schemas/superspec/");
		expect(calls.filter(isValidate)).toHaveLength(1);
		expect(io.reloads).toBe(1);
	});

	it("declined upgrade is blocked and untouched", async () => {
		const root = await upgradable();
		const before = snap(schemaDir(root));
		const { io, calls } = recording(root, undefined, { confirm: async () => false });
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(snap(schemaDir(root))).toEqual(before);
		expect(calls.some(isValidate)).toBe(false);
		expect(io.reloads).toBe(0);
	});

	it("without a UI never asks and names the upgrade steps", async () => {
		const root = await upgradable();
		const before = snap(schemaDir(root));
		let asked = 0;
		const { io } = recording(root, undefined, {
			hasUI: false,
			async confirm() {
				asked += 1;
				return true;
			},
		});
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(asked).toBe(0);
		expect(io.notes.join("\n")).toContain("/opsx-init");
		expect(io.notes.join("\n")).toContain("--force");
		expect(snap(schemaDir(root))).toEqual(before);
		expect(io.reloads).toBe(0);
	});

	it.each([
		["edited", edited],
		["older", older],
		["foreign", async () => foreign()],
	])("blocks a %s schema without --force", async (_name, make) => {
		const root = await make();
		const before = snap(schemaDir(root));
		const { io, calls } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(io.notes.join("\n")).toContain("--force");
		expect(snap(schemaDir(root))).toEqual(before);
		expect(calls.some(isValidate)).toBe(false);
		expect(io.reloads).toBe(0);
	});

	it("puts the config note right after the main blocked line, before details", async () => {
		const root = await newer();
		writeFileSync(join(root, "openspec", "config.yaml"), "schema: spec-driven\n");
		const { io } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		const lines = io.notes.join("\n").split("\n");
		expect(lines[0]).toMatch(/^Existing schema at openspec\/schemas\/superspec is newer;/);
		expect(lines[1]).toBe("Note: openspec/config.yaml now has `schema: superspec`.");
		expect(lines[2]).toMatch(/older than the project schema/);
	});

	it("blocks a newer schema and says the package is older", async () => {
		const root = await newer();
		const before = snap(schemaDir(root));
		const { io } = recording(root);
		expect(await runInit(io, packageRoot)).toBe("blocked");
		expect(io.notes.join("\n")).toContain("older than the project schema");
		expect(snap(schemaDir(root))).toEqual(before);
	});

	it("--force on an edited schema replaces it and keeps a backup", async () => {
		const root = await edited();
		const before = snap(schemaDir(root));
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		const [b] = backupsOf(bak);
		expect(snap(b)).toEqual(before);
		expect(basename(b)).toMatch(new RegExp(`^v${V}-`));
		expect(io.reports[0]).toContain("replaced");
		expect(io.reports[0]).toContain(b);
		expect(snap(schemaDir(root))).toEqual(await freshSnap());
		expect(io.reloads).toBe(1);
	});

	it("--force on a newer schema reports downgraded", async () => {
		const root = await newer();
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		expect(io.reports[0]).toContain(`downgraded from v${V + 1} to v${V}`);
		expect(backupsOf(bak)).toHaveLength(1);
	});

	it("--force on an older edited schema reports upgraded", async () => {
		const root = await older();
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		expect(io.reports[0]).toContain(`upgraded from v6 to v${V}`);
		expect(backupsOf(bak)).toHaveLength(1);
	});

	it("--force on a foreign schema backs up under a foreign label", async () => {
		const root = foreign();
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		const [b] = backupsOf(bak);
		expect(basename(b)).toMatch(/^foreign-/);
		expect(io.reports[0]).toContain("replaced");
	});

	it("--force on an upgradable schema does not ask and keeps a backup", async () => {
		const root = await upgradable();
		const bak = tmp();
		let asked = 0;
		const { io } = recording(root, undefined, {
			backupRoot: bak,
			async confirm() {
				asked += 1;
				return true;
			},
		});
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		expect(asked).toBe(0);
		expect(backupsOf(bak)).toHaveLength(1);
		expect(io.reports[0]).toContain(`upgraded from v6 to v${V}`);
	});

	it("--force on an absent schema installs fresh without backup", async () => {
		const root = tmp();
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		expect(readdirSync(bak)).toEqual([]);
		expect(snap(schemaDir(root))).toEqual(await freshSnap());
	});

	it("--force on an identical schema writes no backup", async () => {
		const root = await installed();
		const before = snap(schemaDir(root));
		const bak = tmp();
		const { io } = recording(root, undefined, { backupRoot: bak });
		expect(await runInit(io, packageRoot, "--force")).toBe("activated");
		expect(readdirSync(bak)).toEqual([]);
		expect(snap(schemaDir(root))).toEqual(before);
	});

	it("--force combined with --lang and --generate", async () => {
		const root = await edited();
		const { io } = recording(root, undefined, { backupRoot: tmp() });
		expect(await runInit(io, packageRoot, "--force --lang vi --generate")).toBe("activated");
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("language: vi");
		expect(io.reports[0]).toContain("/opsx-generate-specs");
	});

	it("a second run after a confirmed upgrade changes nothing", async () => {
		const root = await upgradable();
		expect(await runInit(recording(root).io, packageRoot)).toBe("activated");
		const before = snap(root);
		expect(await runInit(recording(root).io, packageRoot)).toBe("activated");
		expect(snap(root)).toEqual(before);
	});

	it("a second run after --force writes no backup and changes nothing", async () => {
		const root = await edited();
		const bak = tmp();
		expect(await runInit(recording(root, undefined, { backupRoot: bak }).io, packageRoot, "--force")).toBe("activated");
		const before = snap(root);
		const count = backupsOf(bak).length;
		expect(await runInit(recording(root, undefined, { backupRoot: bak }).io, packageRoot)).toBe("activated");
		expect(snap(root)).toEqual(before);
		expect(backupsOf(bak)).toHaveLength(count);
	});

	it("keeps replaced files and reports the backup when validation fails", async () => {
		const root = await edited();
		const bak = tmp();
		const { io } = recording(
			root,
			(c) => (isValidate(c) ? { code: 1, stdout: "bad", stderr: "" } : { code: 0, stdout: "1.16.0\n", stderr: "" }),
			{ backupRoot: bak },
		);
		expect(await runInit(io, packageRoot, "--force")).toBe("validation-failed");
		const [b] = backupsOf(bak);
		expect(io.notes.join("\n")).toContain(b);
		expect(snap(schemaDir(root))).toEqual(await freshSnap());
		expect(io.reloads).toBe(0);
	});

	it("returns replace-failed and leaves the schema alone when the backup fails", async () => {
		const root = await edited();
		const before = snap(schemaDir(root));
		const bakFile = join(tmp(), "file");
		writeFileSync(bakFile, "x");
		const { io, calls } = recording(root, undefined, { backupRoot: bakFile });
		expect(await runInit(io, packageRoot, "--force")).toBe("replace-failed");
		expect(snap(schemaDir(root))).toEqual(before);
		expect(calls.some(isValidate)).toBe(false);
		expect(io.reloads).toBe(0);
		expect(io.notes.join("\n")).toContain("Schema replacement failed");
		expect(io.notes.join("\n").split("Schema replacement failed")).toHaveLength(2);
	});

	it.skipIf(process.getuid?.() === 0)("blocks without throwing when the older schema is unreadable", async () => {
		const root = await upgradable();
		const file = join(schemaDir(root), "templates", "apply.md");
		const { io, calls } = recording(root);
		chmodSync(file, 0o000);
		try {
			expect(await runInit(io, packageRoot)).toBe("blocked");
		} finally {
			chmodSync(file, 0o644);
		}
		expect(io.notes.join("\n")).toContain("Could not read openspec/schemas/superspec:");
		expect(io.notes.join("\n")).toContain("Nothing was changed.");
		expect(calls.some(isValidate)).toBe(false);
		expect(io.reloads).toBe(0);
	});

	it("writes the language after a confirmed upgrade", async () => {
		const root = await upgradable();
		const { io } = recording(root, undefined, { confirm: async () => true });
		expect(await runInit(io, packageRoot, "--lang vi")).toBe("activated");
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toContain("language: vi");
	});
});
