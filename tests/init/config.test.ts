import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyConfig, mergeConfig, parseLanguage, readLanguage, validateLanguage } from "../../extensions/init/config.ts";

describe("mergeConfig", () => {
	it("replaces spec-driven", () => {
		expect(mergeConfig("schema: spec-driven\n")).toBe("schema: superspec\n");
	});
	it("prepends when missing", () => {
		expect(mergeConfig("context: |\n  x\n")).toBe("schema: superspec\ncontext: |\n  x\n");
	});
	it("handles a leading BOM", () => {
		expect(mergeConfig("\uFEFFschema: spec-driven\nx: 1\n")).toBe("\uFEFFschema: superspec\nx: 1\n");
		expect(mergeConfig("\uFEFFx: 1\n")).toBe("\uFEFFschema: superspec\nx: 1\n");
		expect(mergeConfig("\uFEFFschema: superspec\n")).toBe("\uFEFFschema: superspec\n");
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

describe("validateLanguage", () => {
	it("trims a valid value", () => {
		expect(validateLanguage("  vi ")).toBe("vi");
		expect(validateLanguage("Tiếng Việt")).toBe("Tiếng Việt");
		expect(validateLanguage("a".repeat(64))).toBe("a".repeat(64));
	});
	it("rejects empty, too long and multi-line values", () => {
		expect(validateLanguage("")).toBeUndefined();
		expect(validateLanguage("   ")).toBeUndefined();
		expect(validateLanguage("a".repeat(65))).toBeUndefined();
		expect(validateLanguage("a\nb")).toBeUndefined();
	});
});

describe("parseLanguage / readLanguage", () => {
	it("reads a top-level language", () => {
		expect(parseLanguage("schema: superspec\nlanguage: vi\n")).toBe("vi");
		expect(parseLanguage("language: vi\r\n")).toBe("vi");
		expect(parseLanguage("\uFEFFlanguage: vi\n")).toBe("vi");
	});
	it("handles quoted values and comments", () => {
		expect(parseLanguage('language: "zh: simplified"\n')).toBe("zh: simplified");
		expect(parseLanguage("language: vi # note\n")).toBe("vi");
	});
	it("ignores nested, empty and invalid values", () => {
		expect(parseLanguage("x:\n  language: vi\n")).toBeUndefined();
		expect(parseLanguage("language: \n")).toBeUndefined();
		expect(parseLanguage('language: ""\n')).toBeUndefined();
		expect(parseLanguage('language: "abc\n')).toBeUndefined();
	});
	it("readLanguage reads the file, missing file is undefined", () => {
		const root = mkdtempSync(join(tmpdir(), "lang-"));
		expect(readLanguage(root)).toBeUndefined();
		mkdirSync(join(root, "openspec"));
		writeFileSync(join(root, "openspec", "config.yaml"), "schema: superspec\nlanguage: vi\n");
		expect(readLanguage(root)).toBe("vi");
	});
});
