import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyConfig, mergeConfig } from "../../extensions/init/config.ts";

describe("mergeConfig", () => {
	it("replaces spec-driven", () => {
		expect(mergeConfig("schema: spec-driven\n")).toBe("schema: superspec\n");
	});
	it("prepends when missing", () => {
		expect(mergeConfig("context: |\n  x\n")).toBe("schema: superspec\ncontext: |\n  x\n");
	});
	it("handles undefined and empty", () => {
		expect(mergeConfig(undefined)).toBe("schema: superspec\n");
		expect(mergeConfig("")).toBe("schema: superspec\n");
	});
	it("preserves surrounding content", () => {
		const input = "# top\n\nschema: old\n\n# c\nrules:\n  a: 1\n";
		expect(mergeConfig(input)).toBe("# top\n\nschema: superspec\n\n# c\nrules:\n  a: 1\n");
	});
	it("ignores indented schema keys", () => {
		expect(mergeConfig("x:\n  schema: foo\n")).toBe("schema: superspec\nx:\n  schema: foo\n");
	});
	it("preserves CRLF", () => {
		expect(mergeConfig("schema: a\r\nb: 1\r\n")).toBe("schema: superspec\r\nb: 1\r\n");
	});
	it("normalizes quoted and commented values", () => {
		expect(mergeConfig('schema: "superspec"\n')).toBe("schema: superspec\n");
		expect(mergeConfig("schema: superspec # c\n")).toBe("schema: superspec\n");
	});
});

describe("applyConfig", () => {
	const tmp = () => mkdtempSync(join(tmpdir(), "ps-cfg-"));
	it("creates the file when missing", () => {
		const root = tmp();
		expect(applyConfig(root)).toBe("written");
		expect(readFileSync(join(root, "openspec", "config.yaml"), "utf8")).toBe("schema: superspec\n");
	});
	it("does not write when unchanged", () => {
		const root = tmp();
		mkdirSync(join(root, "openspec"));
		const file = join(root, "openspec", "config.yaml");
		writeFileSync(file, "schema: superspec\n");
		utimesSync(file, 1000, 1000);
		expect(applyConfig(root)).toBe("unchanged");
		expect(statSync(file).mtimeMs).toBe(1000 * 1000);
		expect(existsSync(file)).toBe(true);
	});
	it("rewrites an existing value", () => {
		const root = tmp();
		mkdirSync(join(root, "openspec"));
		const file = join(root, "openspec", "config.yaml");
		writeFileSync(file, "schema: spec-driven\n");
		expect(applyConfig(root)).toBe("written");
		expect(readFileSync(file, "utf8")).toBe("schema: superspec\n");
	});
});
