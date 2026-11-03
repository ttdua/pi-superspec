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
		for (const input of [`--lang ${"a".repeat(65)}`, "--lang a\nb", "--lang a\u0007b"]) {
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
});
