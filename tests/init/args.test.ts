import { describe, expect, it } from "vitest";
import { parseInitArgs } from "../../extensions/init/args.ts";

describe("parseInitArgs", () => {
	it("returns an empty result for empty or blank args", () => {
		expect(parseInitArgs("")).toEqual({});
		expect(parseInitArgs("   ")).toEqual({});
	});
	it("parses --lang with a space or an equals sign", () => {
		expect(parseInitArgs("--lang vi")).toEqual({ lang: "vi" });
		expect(parseInitArgs("--lang=vi")).toEqual({ lang: "vi" });
	});
	it("takes everything after the flag, trimmed", () => {
		expect(parseInitArgs("--lang Tiếng Việt")).toEqual({ lang: "Tiếng Việt" });
		expect(parseInitArgs("  --lang   vi  ")).toEqual({ lang: "vi" });
	});
	it("strips one pair of surrounding quotes", () => {
		expect(parseInitArgs('--lang "Tiếng Việt"')).toEqual({ lang: "Tiếng Việt" });
		expect(parseInitArgs("--lang 'x y'")).toEqual({ lang: "x y" });
		expect(parseInitArgs('--lang=""vi""')).toEqual({ lang: '"vi"' });
	});
	it("rejects a missing value", () => {
		for (const input of ["--lang", "--lang=", "--lang   ", '--lang ""']) {
			const result = parseInitArgs(input);
			expect("error" in result && result.error).toContain("--lang");
		}
	});
	it("rejects invalid values", () => {
		for (const input of [`--lang ${"a".repeat(65)}`, "--lang a\nb", "--lang a\u0007b", "--lang a\u0085b"]) {
			expect("error" in parseInitArgs(input)).toBe(true);
		}
		expect(parseInitArgs(`--lang ${"a".repeat(64)}`)).toEqual({ lang: "a".repeat(64) });
	});
	it("rejects unknown arguments, including flags that merely start with --lang", () => {
		for (const input of ["--force", "vi", "--language vi", "--langx", "--langx=vi"]) {
			const result = parseInitArgs(input);
			expect("error" in result && result.error).toContain("Unknown argument");
		}
	});
	it("parses a standalone --generate flag, alone or with --lang in either order", () => {
		expect(parseInitArgs("--generate")).toEqual({ generate: true });
		expect(parseInitArgs("--lang vi --generate")).toEqual({ lang: "vi", generate: true });
		expect(parseInitArgs("--generate --lang vi")).toEqual({ lang: "vi", generate: true });
		expect(parseInitArgs("--lang Tiếng Việt --generate")).toEqual({ lang: "Tiếng Việt", generate: true });
	});
	it("rejects a repeated, valued or mixed-with-unknown --generate", () => {
		for (const input of ["--generate --generate", "--generate=yes", "--generate x", "--force --generate"]) {
			const result = parseInitArgs(input);
			expect("error" in result && result.error).toMatch(/Unknown argument|Repeated argument/);
		}
		const repeated = parseInitArgs("--generate --generate");
		expect("error" in repeated && repeated.error).toBe("Repeated argument: --generate. Usage: /opsx-init [--lang <language>] [--generate]");
		const unknown = parseInitArgs("--force --generate");
		expect("error" in unknown && unknown.error).toContain("Unknown argument");
	});
});
