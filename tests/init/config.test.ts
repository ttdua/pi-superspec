import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyConfig, applyLanguage, mergeConfig, mergeLanguage, parseLanguage, readLanguage, resolveLanguage, validateLanguage } from "../../extensions/init/config.ts";

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
	it("rejects control characters", () => {
		expect(validateLanguage("a\tb")).toBeUndefined();
		expect(validateLanguage("a\u0000b")).toBeUndefined();
		expect(validateLanguage("a\u007fb")).toBeUndefined();
	});
});

describe("validateLanguage separators", () => {
	it("rejects C1 control characters and Unicode line separators", () => {
		expect(validateLanguage("a\u0085b")).toBeUndefined();
		expect(validateLanguage("a\u2028b")).toBeUndefined();
		expect(validateLanguage("a\u2029b")).toBeUndefined();
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
	it("reads a quoted value followed by a comment", () => {
		expect(parseLanguage('language: "vi" # note\n')).toBe("vi");
		expect(parseLanguage('language: "Tiếng Việt" # docs\n')).toBe("Tiếng Việt");
		expect(parseLanguage('language: "a # b"\n')).toBe("a # b");
		expect(parseLanguage('language: "vi" junk\n')).toBeUndefined();
	});
	it("ignores quoted values with C1 controls or Unicode separators", () => {
		expect(parseLanguage('language: "a\u2028b"\n')).toBeUndefined();
		expect(parseLanguage('language: "a\u2029b"\n')).toBeUndefined();
		expect(parseLanguage('language: "a\u0085b"\n')).toBeUndefined();
		expect(parseLanguage('language: "a\\u0085b"\n')).toBeUndefined();
		expect(parseLanguage('language: "a\\u2028b"\n')).toBeUndefined();
	});
	it("round-trips values that start with a dash through quoting", () => {
		for (const value of ["-", "- vi"]) {
			const text = mergeLanguage("schema: superspec\n", value);
			expect(text).toBe(`schema: superspec\nlanguage: ${JSON.stringify(value)}\n`);
			expect(parseLanguage(text)).toBe(value);
		}
		expect(mergeLanguage(undefined, "vi-VN")).toBe("language: vi-VN\n");
		expect(mergeLanguage(undefined, "Tiếng Việt")).toBe("language: Tiếng Việt\n");
	});
	it("ignores nested, empty and invalid values", () => {
		expect(parseLanguage("x:\n  language: vi\n")).toBeUndefined();
		expect(parseLanguage("language: \n")).toBeUndefined();
		expect(parseLanguage('language: ""\n')).toBeUndefined();
		expect(parseLanguage('language: "abc\n')).toBeUndefined();
		expect(parseLanguage('language: "a\\u0000b"\n')).toBeUndefined();
		expect(parseLanguage('language: "vi\\u0007"\n')).toBeUndefined();
	});
	it("readLanguage reads the file, missing file is undefined", () => {
		const root = mkdtempSync(join(tmpdir(), "lang-"));
		expect(readLanguage(root)).toBeUndefined();
		mkdirSync(join(root, "openspec"));
		writeFileSync(join(root, "openspec", "config.yaml"), "schema: superspec\nlanguage: vi\n");
		expect(readLanguage(root)).toBe("vi");
	});
});

describe("readLanguage unreadable config", () => {
	it("is undefined when config.yaml is a directory", () => {
		const root = mkdtempSync(join(tmpdir(), "ps-"));
		mkdirSync(join(root, "openspec", "config.yaml"), { recursive: true });
		expect(readLanguage(root)).toBeUndefined();
	});
});

describe("resolveLanguage", () => {
	const root = (config?: string) => {
		const dir = mkdtempSync(join(tmpdir(), "ps-"));
		if (config !== undefined) {
			mkdirSync(join(dir, "openspec"));
			writeFileSync(join(dir, "openspec", "config.yaml"), config);
		}
		return dir;
	};
	it("returns the configured language", () => {
		expect(resolveLanguage(root("language: vi\n"))).toBe("vi");
	});
	it("returns en for a missing file", () => {
		expect(resolveLanguage(root())).toBe("en");
	});
	it("returns en without the key, with an empty value, or with an invalid value", () => {
		expect(resolveLanguage(root("schema: superspec\n"))).toBe("en");
		expect(resolveLanguage(root("language:\n"))).toBe("en");
		expect(resolveLanguage(root(`language: ${"x".repeat(100)}\n`))).toBe("en");
		expect(resolveLanguage(root('language: "a\\u2028b"\n'))).toBe("en");
	});
	it("returns en when config.yaml is a directory", () => {
		const dir = mkdtempSync(join(tmpdir(), "ps-"));
		mkdirSync(join(dir, "openspec", "config.yaml"), { recursive: true });
		expect(resolveLanguage(dir)).toBe("en");
	});
});

describe("mergeLanguage", () => {
	it("inserts after the schema line", () => {
		expect(mergeLanguage("schema: superspec\ncontext: |\n  x\n", "vi")).toBe("schema: superspec\nlanguage: vi\ncontext: |\n  x\n");
	});
	it("replaces an existing top-level language", () => {
		expect(mergeLanguage("schema: superspec\nlanguage: vi\nx: 1\n", "en")).toBe("schema: superspec\nlanguage: en\nx: 1\n");
	});
	it("quotes values that are not plain", () => {
		expect(mergeLanguage("schema: superspec\n", "zh: simplified")).toBe('schema: superspec\nlanguage: "zh: simplified"\n');
		expect(mergeLanguage("schema: superspec\n", "a # b")).toBe('schema: superspec\nlanguage: "a # b"\n');
		expect(mergeLanguage("schema: superspec\n", "Tiếng Việt")).toBe("schema: superspec\nlanguage: Tiếng Việt\n");
	});
	it("leaves a nested language key alone", () => {
		expect(mergeLanguage("schema: superspec\nx:\n  language: vi\n", "en")).toBe("schema: superspec\nlanguage: en\nx:\n  language: vi\n");
	});
	it("keeps CRLF line endings", () => {
		expect(mergeLanguage("schema: superspec\r\nb: 1\r\n", "vi")).toBe("schema: superspec\r\nlanguage: vi\r\nb: 1\r\n");
		expect(mergeLanguage("schema: superspec\r\nlanguage: vi\r\n", "en")).toBe("schema: superspec\r\nlanguage: en\r\n");
	});
	it("adds a newline when the schema line is last", () => {
		expect(mergeLanguage("schema: superspec", "vi")).toBe("schema: superspec\nlanguage: vi\n");
	});
	it("prepends without a schema line, keeping the BOM first", () => {
		expect(mergeLanguage("x: 1\n", "vi")).toBe("language: vi\nx: 1\n");
		expect(mergeLanguage("\uFEFFx: 1\n", "vi")).toBe("\uFEFFlanguage: vi\nx: 1\n");
		expect(mergeLanguage(undefined, "vi")).toBe("language: vi\n");
	});
	it("is idempotent", () => {
		const once = mergeLanguage("schema: superspec\nx: 1\n", "vi");
		expect(mergeLanguage(once, "vi")).toBe(once);
	});
	it("round-trips through parseLanguage", () => {
		for (const v of ["vi", "zh: simplified", "a # b", "Tiếng Việt", 'say "hi"']) {
			expect(parseLanguage(mergeLanguage("schema: superspec\n", v))).toBe(v);
		}
	});
});

describe("applyLanguage", () => {
	it("writes once, then reports unchanged", () => {
		const root = mkdtempSync(join(tmpdir(), "lang-"));
		mkdirSync(join(root, "openspec"));
		const file = join(root, "openspec", "config.yaml");
		writeFileSync(file, "schema: superspec\ncontext: |\n  x\n");
		expect(applyLanguage(root, "vi")).toBe("written");
		expect(readFileSync(file, "utf8")).toBe("schema: superspec\nlanguage: vi\ncontext: |\n  x\n");
		expect(applyLanguage(root, "vi")).toBe("unchanged");
	});
});
