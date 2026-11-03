import { existsSync, readFileSync } from "node:fs";
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

	const schemaText = () =>
		readFileSync(join(SCHEMA_DIR, "schema.yaml"), "utf8");

	it("identity: name, version and marker", () => {
		const text = schemaText();
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
		const text = schemaText();
		expect(text).toContain("Superspec");
		expect(text).toContain("e1c8f417");
	});
});
