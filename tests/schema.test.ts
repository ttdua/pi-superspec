import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	hasOpenspec,
	makeProject,
	SCHEMA_DIR,
	type TempProject,
} from "./helpers/project.js";

const available = hasOpenspec();
if (!available) {
	console.warn("openspec >= 1.4 not found on PATH; skipping schema tests");
}
const run = available ? describe : describe.skip;

run("bundled schema", () => {
	let project: TempProject;
	beforeAll(() => {
		project = makeProject();
	});
	afterAll(() => {
		project?.cleanup();
	});

	const schemaYaml = () =>
		readFileSync(join(SCHEMA_DIR, "schema.yaml"), "utf8");
	const schemaText = () => {
		const dir = join(SCHEMA_DIR, "templates");
		return [
			schemaYaml(),
			...readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")),
		].join("\n");
	};

	it("identity: name, version and marker", () => {
		const text = schemaYaml();
		expect(text).toMatch(/^name: superspec$/m);
		expect(text).toMatch(/^version: 5$/m);
		expect(text).toMatch(/^x-pi-superspec:\n\s+version: 5$/m);
	});

	it("openspec schema validate superspec passes", () => {
		const res = project.openspec(["schema", "validate", "superspec"]);
		expect(res.status, res.stdout + res.stderr).toBe(0);
	});

	it("credits upstream and ships LICENSE", () => {
		expect(existsSync(join(SCHEMA_DIR, "LICENSE"))).toBe(true);
		const text = schemaYaml();
		expect(text).toContain("Superspec");
		expect(text).toContain("e1c8f417");
	});

	it("schema text has no harness-specific tool names", () => {
		const text = schemaText();
		for (const term of [
			"AskUserQuestion",
			"rpiv-",
			"pi-subagents",
			"Skill tool",
			"/opsx:",
		]) {
			expect(text, term).not.toContain(term);
		}
	});

	it("design instruction has the No design needed stub", () => {
		const res = project.openspec(["new", "change", "x"]);
		expect(res.status, res.stdout + res.stderr).toBe(0);
		const out = project.openspec([
			"instructions",
			"design",
			"--change",
			"x",
			"--json",
		]);
		expect(out.status, out.stdout + out.stderr).toBe(0);
		const json = JSON.parse(out.stdout);
		expect(json.instruction).toContain("No design needed:");
	});
});
